/*!
 * Copyright 2012-2016 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

// NOTE This script uses modern JavaScript syntax (private class fields, optional chaining, etc.)
//   and will not parse — let alone boot — on older browsers. This is intentional.

(function() { // NOTE throwing an error or returning from this wrapper function prematurely aborts booting

var defaults = { // NOTE defaults also define the type of the associated config option
	"no_boot": false, 
	"no_frameset": false, // NOTE !(history.pushState && window.XMLHttpRequest) is enforced anyway
	"no_style": false,
	"file_access_from_files": false,
	"capturing": true,
	"hidden_timeout": 3000,
	"startup_timeout": 10000, // abort if startup takes longer than this
	"polling_interval": 1000/60, // obsolete
	"main_script": /[?&]dev($|[=&])/.test(location.search)
		? '{bootscriptdir}src/HyperFrameset.mjs'
		: '{bootscriptdir}HyperFrameset.js',
	"config_script": '{bootscriptdir}config.js'
}

/*
	HyperFrameset requires support for many built-in browser features.
	Ideally we would test directly for them all up-front,
	but many of them can be assumed based on presence of newer DOM APIs.

	The newest features used are:
		- WeakRef (Chrome 84, Safari 14.1, Firefox 90 — 2020/2021)
		- Private class fields (#) (Chrome 74, Safari 14.1, Firefox 90)
		- Optional chaining (?.) and nullish coalescing (??)
		- history.pushState
		- MutationObserver
		- XMLHttpRequest
		- Promises, globalThis, composedPath, ES modules

	WeakRef is the most recent, so testing for it implies all others.
	We also explicitly check history.pushState, MutationObserver, and
	XMLHttpRequest since they are architecturally central to HyperFrameset.
	XMLHttpRequest is used in preference to fetch for responseType='document'.
*/

if (!(window.WeakRef && window.MutationObserver && window.XMLHttpRequest && history.pushState)) {
	console.log('HyperFrameset depends on native browser features including WeakRef, MutationObserver, XMLHttpRequest, history.pushState');
	return;
}

var SELF_REL = 'self'; // TODO DRY with libHyperFrameset.js
var FRAMESET_REL = 'frameset'; // ditto

var Meeko = window.Meeko || (window.Meeko = {});

/*
 ### JS utilities
 */
/*
 ### Get options
 */

class Options {
	#sources = [];

	addSource(fn) {
		this.#sources.push(fn);
	}

	addStorageSource(name, key = 'Meeko.options') {
		try {
			let source = window[name];
			if (!source) return;
			let text = source.getItem(key);
			if (!text) return;
			let options = JSON.parse(text);
			if (options) this.#sources.push((name) => options[name]);
		} catch(e) {
			console.warn(name + ' inaccessible');
		}
	}

	getData(name, type) {
		for (let fn of this.#sources) {
			let val = fn(name);
			if (val == null) continue;
			switch (type) {
			case "string": return val;
			case "number": if (!isNaN(val)) return Number(val); break;
			case "boolean": return val;
			}
		}
		return null;
	}
}

var options = new Options();

// NOTE valueless params (e.g. ?no_boot) become empty string in URLSearchParams; treat as true
var searchParams = Object.fromEntries(
	[...new URLSearchParams(location.search)].map(([k, v]) => [k, v || true])
);

options.addSource((name) => searchParams[name]);
options.addStorageSource('sessionStorage');
options.addStorageSource('localStorage');
if (Meeko.options) options.addSource((name) => Meeko.options[name]);
options.addSource((name) => defaults[name]);

// sessionOptions is used for capture error-recovery (read/write during reload)
var sessionOptions = (function() {
	try {
		let text = sessionStorage.getItem('Meeko.options');
		let data = text ? JSON.parse(text) : {};
		return {
			getItem(key) { return data[key]; },
			setItem(key, value) {
				data[key] = value;
				sessionStorage.setItem('Meeko.options', JSON.stringify(data));
			}
		};
	} catch(e) { return null; }
})();

var bootOptions = Meeko.bootOptions = (function() {
	let result = {};
	for (let name in defaults) {
		result[name] = options.getData(name, typeof defaults[name]);
	}
	return result;
})();

// Don't even load HyperFrameset if "no_boot" is set
if (bootOptions['no_boot']) {
	console.info('HyperFrameset disabled (no_boot)');
	return;
}

/*
 ### DOM utilities
 */

/**
 * Iterate siblings after `el`, calling `callback` for each.
 * If `callback` returns true, stop and return that sibling.
 * Safe to use when the callback removes nodes.
 * @param {Node} el - Starting node (not visited).
 * @param {function(Node): boolean} callback
 * @returns {Node|undefined} The first matching sibling, or undefined.
 */
function findNextMatchingSibling(el, callback) {
	let node = el.nextSibling;
	while (node) {
		let next = node.nextSibling;
		if (callback(node)) return node;
		node = next;
	}
}

function getBootScript() {
	var script = document.currentScript;
	if (script) return script;
	/*
	WARN this assumes boot-script is the last in the document 
	This is guaranteed for the normal usage of:
	- the boot-script is in the markup of the document
	- the page is loaded normally
	- the script DOES NOT have @async or @defer
	In other cases - dynamic-insertion, document.write into an iframe -
	the inserting code must ensure the script is last in document.
	*/
	var allScripts = [...document.getElementsByTagName('script')];
	script = allScripts[allScripts.length - 1];
	return script;
}

function resolveURL(url, params) {
	if (params) for (var name in params) {
		url = url.replace('{' + name + '}', params[name]);
	}
	return new URL(url, document.baseURI).href;
}

// See https://gist.github.com/shogun70/5388420
// for testing document.readyState in different browsers
var domReadyPromise = document.readyState !== 'loading'
	? Promise.resolve()
	: new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));

var domReady = (fn) => domReadyPromise.then(() => setTimeout(fn));

/*
 ### async functions
 */

/*
 * NOTE historically this checked for script.onload and script.async support. Both are universal on modern browsers.
var testScript = document.createElement('script');
var supportsOnLoad = (testScript.setAttribute('onload', ';'), typeof testScript.onload === 'function');
var supportsSync = (testScript.async === true);
if (!supportsOnLoad) throw "script.onload not supported in this browser";
*/
class TaskQueue {
	#controller = new AbortController();

	#loadScript(url) {
		let script = document.createElement('script');
		if (/\.mjs$/i.test(url)) script.type = 'module'; // FIXME find a better way to detect js module URLs
		script.async = false;
		script.src = url;
		let promise = new Promise((resolve, reject) => {
			script.onload = () => { script.onload = script.onerror = null; resolve(); };
			script.onerror = () => { script.onload = script.onerror = null; reject(Error('Failed to load ' + url)); };
		});
		document.head.append(script);
		return promise;
	}

	async queue(fnList, callback, errCallback) {
		try {
			// Prepare all scripts upfront (parallel download, sequential execution)
			let steps = fnList.map(fn =>
				typeof fn === 'string' ? { run: null, loaded: this.#loadScript(fn) } : { run: fn, loaded: null }
			);
			for (let step of steps) {
				if (this.#controller.signal.aborted) throw Error('Startup aborted');
				if (step.loaded) await step.loaded;
				else step.run();
			}
			callback();
		} catch (err) {
			errCallback(err);
		}
	}

	abort() {
		this.#controller.abort();
	}
}

var taskQueue = new TaskQueue();

/*
 ### Viewport hide / unhide
 */
class Viewport {
	#style = document.createElement("style");

	constructor() {
		// NOTE hide the page until the frameset is ready
		var selector = 'body', property = 'visibility', value = 'hidden';
		var cssText = selector + ' { ' + property + ': ' + value + '; }\n';
		this.#style.textContent = cssText;
		/*
		// NOTE on IE the following realizes style.styleSheet
		var fragment = document.createDocumentFragment();
		fragment.append(style);
		if (style.styleSheet) style.styleSheet.cssText = cssText;
		*/
	}

	hide() {
		document.head.insertBefore(this.#style, selfMarker);
	}

	unhide() {
		if (this.#style.parentNode !== document.head) return;
		document.head.removeChild(this.#style);
		/*
		// NOTE on IE sometimes content stays hidden although
		// the stylesheet has been removed.
		// The following forces the content to be revealed
		var el = $$(selector)[0];
		el.style[property] = value;
		var pollingInterval = bootOptions['polling_interval'];
		setTimeout(function() { el.style[property] = ""; }, pollingInterval);
		*/
	}
}

var viewport = new Viewport();

/*
 ### Capturing
     See https://hacks.mozilla.org/2013/03/capturing-improving-performance-of-the-adaptive-web/
 */
class Capture {

	#capturedHTML = '';

	// TODO might be better to clone the partially loaded document at the start of booting so boot modifications don't get captured
	start(strict) {
		var warnMsg = this.test();
		if (warnMsg) {
			if (strict) throw warnMsg;
			else console.warn(warnMsg);
		}
		this.#capturedHTML += this.#getDocTypeTag(document);
		this.#capturedHTML += this.#toStartTag(document.documentElement);
		this.#capturedHTML += this.#toStartTag(document.head);
		document.write('<plaintext style="display: none;">');
	}

	test() {
		if (document.body) throw 'When capturing, boot-script MUST be in - or before - <head>';
		if (document.getElementsByTagName('script').length > 1) return 'When capturing, boot-script SHOULD be first <script>';
		let invalid = findNextMatchingSibling(selfMarker, function(node) {
			if (node.nodeType !== 1) return false; // comments and text-nodes are ok
			if (node === bootScript) return false; // boot-script is ok. TODO should be last node in <head>
			if (node.localName === 'title' && node.firstChild === null) return false; // IE6 adds a dummy <title>
			if (node.localName !== 'meta') return true;
			if (node.httpEquiv || node.getAttribute('charset')) return false; // <meta http-equiv> are ok
			return true;
		});
		if (invalid) return 'When capturing, only <meta http-equiv> or <meta charset> nodes may precede boot-script';
		return false;
	}

	getDocument() {
		return new Promise((resolve) => {
			domReady(() => {
				var plaintext = document.querySelector('plaintext:last-of-type');
				var html = plaintext.firstChild.nodeValue;
				plaintext.remove();
				if (!/\s*<!DOCTYPE/i.test(html)) html = this.#capturedHTML + html;
				resolve(String(html));
			});
		})
		.then((text) => Meeko.htmlParser.parse(text, { url: document.URL, mustResolve: false }));
	}

	#toStartTag(el) { // WARN outerHTML not available before Firefox 11
		var html = el.outerHTML;
		return html.slice(0, html.indexOf('>') + 1);
	}

	#getDocTypeTag(doc) { // WARN doctype not available before IE 9
		var doctype = doc.doctype;
		return doctype ?
			'<!DOCTYPE ' + doctype.name +
			(doctype.publicId ? ' PUBLIC "' + doctype.publicId + '"': '') +
			(doctype.systemId ? ' "' + doctype.systemId + '"' : '') +
			'>\n' :
			'<!DOCTYPE html>\n';
	}
}

var capture = new Capture();


/*
 ## Boot configuration
*/

var bootScript;
if (Meeko.bootScript) bootScript = Meeko.bootScript; // hook for meeko-panner
else {
	bootScript = Meeko.bootScript = getBootScript();
	if (document.body) console.warn("Boot-script SHOULD be in <head> and MUST NOT have @async or @defer");
}


var urlParams = Meeko.bootParams = { // WARN this dictionary can be modified during the boot sequence
	bootscriptdir: resolveURL(bootScript.src).replace(/\/[^\/]*$/, '/') // NOTE on IE9 in IE7-mode bootScript.src is NOT already resolved
}

if (Meeko.bootConfig) Meeko.bootConfig(); // TODO try / catch ??

/*
        The self-marker is inserted by HyperFrameset (if not already present)
        to mark the head elements associated with the content document
        as opposed to frameset elements or others.
        This boot-script inserts one which means <style>, etc inserted above
        are protected from HyperFrameset
        WARN The self-marker is used extensively by this boot-script
*/

var selfMarker = document.createElement('link');
selfMarker.rel = SELF_REL;
selfMarker.href = document.URL;
// FIXME should be inserted after <meta http-equiv>, before anything else
document.head.insertBefore(selfMarker, document.head.firstChild);


/*
 ## Startup
*/


if (bootOptions['no_style']) {
	domReady(() => {
		findNextMatchingSibling(selfMarker, (node) => {
			switch (node.localName) {
			case 'style': break;
			case 'link':
				if (/\bSTYLESHEET\b/i.test(node.rel)) break;
				return;
			default: return;
			}
			node.remove();
		});
	});
	return;
}

if (bootOptions['no_frameset']) { console.info('HyperFrameset disabled (no_frameset)'); return; }

if (location.protocol === 'file:') {
	if (!bootOptions['file_access_from_files']) {
		console.warn('HyperFrameset is not recommended for `file:` URLs. Aborting.');
		return;
	}
	else {
		console.warn('HyperFrameset is not recommended for `file:` URLs. Continuing anyway.');
	}
}


class Launcher {
	#options;
	#capturing;
	#mainScript;
	#configScripts;

	constructor(options) {
		this.#options = options;
		this.#capturing = this.#resolveCapturing();
		this.#mainScript = this.#resolveMainScript();
		this.#configScripts = this.#resolveConfigScripts();
	}

	#resolveCapturing() {
		let capturing = this.#options['capturing'];
		if (capturing === 'auto') capturing = !document.body;
		// WARN startup failure will reload the page (if capturing is enabled)
		//   but without sessionOptions the reload will (probably) cause the same failure again.
		if (!sessionOptions) capturing = false;
		return capturing;
	}

	#resolveMainScript() {
		let url = this.#options['main_script'];
		if (typeof url !== 'string') throw 'HyperFrameset script URL is not configured';
		return resolveURL(url, urlParams);
	}

	#resolveConfigScripts() {
		let scripts = this.#options['config_script'];
		if (!Array.isArray(scripts)) scripts = [scripts];
		return scripts.map(s => typeof s === 'string' ? resolveURL(s, urlParams) : s ?? (() => {}));
	}

	launch() {
		if (this.#capturing) {
			capture.start(this.#capturing === 'strict');
		}

		// Capturing uses document.write, but after this point document.write, etc is forbidden
		document.write = document.writeln = document.open = document.close =
			() => { throw 'document.write(), etc is incompatible with HyperFrameset'; };

		let hidden_timeout = this.#options['hidden_timeout'];
		if (hidden_timeout > 0) {
			viewport.hide();
			setTimeout(() => viewport.unhide(), hidden_timeout);
		}

		if (this.#capturing) {
			domReady(() => {
				if (window.stop) window.stop();
				setTimeout(() => this.#init(() => this.#start()));
			});
		} else {
			setTimeout(() => this.#init(() => domReady(() => this.#start())));
		}

		let timeout = this.#options['startup_timeout'];
		if (timeout > 0) setTimeout(() => taskQueue.abort(), timeout);
	}

	#init(callback) {
		let sequence = [this.#mainScript, ...this.#configScripts];
		taskQueue.queue(sequence, callback, (err) => {
			setTimeout(() => { throw err; });
			if (this.#capturing) domReady(() => {
				if (sessionOptions.getItem('no_frameset') === false) return;
				sessionOptions.setItem('no_frameset', true);
				location.reload();
			});
			else viewport.unhide();
		});
	}

	#start() {
		let startFu;
		if (this.#capturing) {
			startFu = Meeko.framer.start({ contentDocument: capture.getDocument() });
		} else {
			startFu = Meeko.framer.start({ contentDocument: this.#cloneDocument() });
		}
		startFu.then(() => viewport.unhide(), (error) => {
			viewport.unhide();
			throw error;
		});
	}

	#cloneDocument() {
		return new Promise((resolve) => {
			let dstDoc = document.cloneNode(true);
			let dstHead = dstDoc.head;
			dstHead.replaceChildren();
			findNextMatchingSibling(selfMarker, (srcNode) => {
				let node = dstDoc.importNode(srcNode, true);
				switch (srcNode.localName) {
				case null:
				case undefined:
					break;
				case 'script':
					if (!srcNode.type || /^text\/javascript$/i.test(srcNode.type)) break;
					// fall-thru
				default:
					srcNode.remove();
					break;
				}
				dstHead.append(node);
			});
			document.body.replaceChildren();
			resolve(dstDoc);
		});
	}
}

new Launcher(bootOptions).launch();

}).call();
