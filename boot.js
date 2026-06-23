/*!
 * Copyright 2012-2016 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

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

var vendorPrefix = "Meeko";

var Meeko = window.Meeko || (window.Meeko = {});

/*
 ### JS utilities
 */
function some(a, fn, context) {
	for (var n=a.length, i=0; i<n; i++) if (fn.call(context, a[i], i, a)) return true;
	return false;
}
function forEach(a, fn, context) { for (var n=a.length, i=0; i<n; i++) fn.call(context, a[i], i, a); }

var parseJSON = function(text) { // NOTE this allows code to run. This is a feature, not a bug. I think.
	try { return ( Function('return ( ' + text + ' );') )(); }
	catch (error) { return; }
}

/*
 ### Get options

 TODO It would be nice if all data sources had the same API
*/

var useSessionOptions = (function() {
	try {
		if (!window.sessionStorage) return false;
	}
	catch (error) {
		return false;
	}
	return true;
})();

var sessionOptions = useSessionOptions && (function() {

var optionsKey = 'Meeko.options';
var text = sessionStorage.getItem(optionsKey);
var options = parseJSON(text);
if (typeof options !== 'object' || options === null) options = {};

return {

getItem: function(key) {
	return options[key];
},

setItem: function(key, name) {
	options[key] = name;
	sessionStorage.setItem(optionsKey, JSON.stringify(options));
}

}

})();

var dataSources = [];

function addDataSource(name, key) {
	if (!key) key = vendorPrefix + '.options';
	try { // NOTE IE10 can throw on `localStorage.getItem()` - see http://stackoverflow.com/questions/13102116/access-denied-for-localstorage-in-ie10
		// Also Firefox on `window.localStorage` - see http://meyerweb.com/eric/thoughts/2012/04/25/firefox-failing-localstorage/
		var source = window[name] || Meeko[name];
		if (!source) return;
		var options = parseJSON(source.getItem(key));
		if (options) dataSources.push( function(name) { return options[name]; } );
	} catch(error) {
		console.warn(name + ' inaccessible');
	}
}

addDataSource('sessionStorage');
addDataSource('localStorage');
if (Meeko.options) dataSources.push( function(name) { return Meeko.options[name]; } )

var getData = function(name, type) {
	var data = null;
	some(dataSources, function(fn) {
		var val = fn(name);
		if (val == null) return false;
		switch (type) {
		case "string": data = val; // WARN this DOES NOT convert to String
			break;
		case "number":
			if (!isNaN(val)) data = 1 * val;
			// TODO else console.warn("incorrect config option " + val + " for " + name); 
			break;
		case "boolean":
			data = val; // WARN this does NOT convert to Boolean
			// if ([false, true, 0, 1].indexOf(val) < 0) console.warn("incorrect config option " + val + " for " + name); 
			break;
		}
		return (data !== null); 
	});
	return data;
}

var bootOptions = Meeko.bootOptions = (function() {
	var options = {};
	for (var name in defaults) {
		var def = options[name] = defaults[name];
		var val = getData(name, typeof def);
		if (val != null) options[name] = val;
	}
	return options;
})();


var searchParams = Object.fromEntries(
	[...new URLSearchParams(location.search)].map(([k, v]) => [k, v || true])
);

function isSet(option) {
	if (searchParams[option] || bootOptions[option]) return true;
}

// Don't even load HyperFrameset if "no_boot" is one of the search options (or true in Meeko.options)
if (isSet('no_boot')) return;

/*
 ### DOM utilities
 */

function getTagName(el) { return el && el.nodeType === 1 ? el.tagName.toLowerCase() : ''; }

function $$(selector, context) {
	context = context || document;
	var nodeList = [];
	forEach(context.getElementsByTagName(selector), function(el) { nodeList.push(el); });
	return nodeList;
}

function nextSiblings(el, callback) {
	var nodeList = [];
	for (var node=el.nextSibling; node; node=node.nextSibling) nodeList.push(node);
	if (callback) forEach(nodeList, callback);
	return nodeList;
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
	var allScripts = $$('script');
	script = allScripts[allScripts.length - 1];
	return script;
}

function resolveURL(url, params) {
	if (params) for (var name in params) {
		url = url.replace('{' + name + '}', params[name]);
	}
	return new URL(url, document.baseURI).href;
}

var domReady = (function() {
// WARN this function assumes document.readyState is available

var loaded = false;
var queue = [];

function domReady(fn) {
	if (typeof fn !== 'function') return;
	queue.push(fn);
	if (loaded) processQueue();
}

function processQueue() {
	forEach(queue, function(fn) { setTimeout(fn); });
	queue.length = 0;
}

// See https://gist.github.com/shogun70/5388420 
// for testing document.readyState in different browsers
if (/loaded|complete/.test(document.readyState)) loaded = true;
else {
	document.addEventListener('DOMContentLoaded', onLoaded, false);
	window.addEventListener('load', onLoaded, false);
}

return domReady;

function onLoaded(e) {
	loaded = true;
	document.removeEventListener('DOMContentLoaded', onLoaded, false);
	window.removeEventListener('load', onLoaded, false);
	processQueue();
}

})();


/*
 ### async functions
 */

var taskQueue = (function() {

var testScript = document.createElement('script');
var supportsOnLoad = (testScript.setAttribute('onload', ';'), typeof testScript.onload === 'function');
var supportsSync = (testScript.async === true);

if (!supportsOnLoad) throw "script.onload not supported in this browser";

function prepareScript(url, onload, onerror) { // create script (and insert if supportsSync)
	var script = document.createElement('script');
	script.onerror = onError;
	script.onload = onLoad;
	if (/\.mjs$/i.test(url)) script.type = 'module'; // FIXME find a better way to detect js module URLs.
	script.src = url;
	if (supportsSync) {
		script.async = false;
		document.head.append(script);
	}
	return script;

	// The following are hoisted
	function onLoad() {
		script.onerror = null;
		script.onload = null;
		onload();
	}
	
	function onError(errEvent) { 
		script.onerror = null;
		script.onload = null;
		onerror(Error('An error occured while loading ' + script.src));
	}	
}

function enableScript(script) { // insert script if not already done, i.e. !supportsSync
	// TODO assert (!!script.parentNode === supportsSync)
	if (supportsSync) return;
	document.head.append(script);
}

function disableScript(script) {
	if (!script.parentNode) return;
	script.parentNode.removeChild(script);
}

var list = [];
var oncomplete, onerror;
var aborted = false;

function queue(fnList, callback, errCallback) {
	if (aborted) {
		setTimeout(errCallback);
		return;
	}
	oncomplete = callback;
	onerror = errCallback;
	forEach(fnList, function(fn) {
		switch(typeof fn) {
		case "string":
			list.push(prepareScript(fn, queueback, errorback));
			break;
		case "function":
			list.push(fn);
			break;
		default: // TODO
			break;
		}
	});
	queueback();
}

function abort() {
	if (aborted) return;
	if (list.length <= 0) return;
	aborted = true;
	errorback(Error('Startup aborted'));
}

function errorback(err) {
	var fn;
	while (fn = list.shift()) {
		if (typeof fn == 'function') continue;
		// NOTE the only other option is a prepared script
		disableScript(fn);
	}
	
	if (onerror) try { onerror(err); } catch (oops) { }
	else setTimeout(function() { throw err; });

	if (!aborted) abort();
}

function queueback() {
	var fn;
	while (list.length) {
		fn = list.shift();
		if (typeof fn == "function") {
			try { fn(); continue; }
			catch(err) {
				errorback(err);
				return;
			}
		}
		else { // NOTE the only other option is a prepared script
			setTimeout(function() { enableScript(fn); });
			return;
		}
	}
	if (!aborted && oncomplete) oncomplete();
}

return {
	queue: queue,
	abort: abort
}

})();

/*
 ### Viewport hide / unhide
 */
var Viewport = (function() {

var style = document.createElement("style");

// NOTE hide the page until the frameset is ready
var selector = 'body', property = 'visibility', value = 'hidden';

var cssText = selector + ' { ' + property + ': ' + value + '; }\n';
style.textContent = cssText;
/*
// NOTE on IE this realizes style.styleSheet
var fragment = document.createDocumentFragment();
fragment.append(style);
if (style.styleSheet) style.styleSheet.cssText = cssText;
*/

function hide() {
	document.head.insertBefore(style, selfMarker);
}

function unhide() {
	if (style.parentNode !== document.head) return;
	document.head.removeChild(style);
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

return {
	hide: hide,
	unhide: unhide
}

})();

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
		if ($$('script').length > 1) return 'When capturing, boot-script SHOULD be first <script>';
		var nodeList = nextSiblings(selfMarker);
		if (some(nodeList, function(node) { // return true if invalid node
			if (node.nodeType !== 1) return false; // comments and text-nodes are ok
			if (node === bootScript) return false; // boot-script is ok. TODO should be last node in <head>
			if (node.localName === 'title' && node.firstChild === null) return false; // IE6 adds a dummy <title>
			if (node.localName !== 'meta') return true;
			if (node.httpEquiv || node.getAttribute('charset')) return false; // <meta http-equiv> are ok
			return true;
		})) return 'When capturing, only <meta http-equiv> or <meta charset> nodes may precede boot-script';
		return false;
	}

	getDocument() {
		return new Promise((resolve) => {
			domReady(() => {
				var plaintext = document.querySelector('plaintext:last-of-type');
				var html = plaintext.firstChild.nodeValue;
				plaintext.remove();
				if (!/\s*<!DOCTYPE/i.test(html)) html = this.#capturedHTML + html;
				resolve(new String(html));
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


if (isSet('no_style')) {
	domReady(function() {
		var parent = selfMarker.parentNode;
		nextSiblings(selfMarker, function(node) {
			switch (getTagName(node)) {
			case 'style': break;
			case 'link':
				if (/\bSTYLESHEET\b/i.test(node.rel))  break;
				return;
			default: return;
			}
			parent.removeChild(node);
		});
	});
	return;	
}

var no_frameset = isSet('no_frameset');
if (no_frameset) return; // TODO console.info()
if (location.protocol === 'file:') {
	if (!isSet('file_access_from_files')) {
		console.debug('HyperFrameset is not recommended for `file:` URLs. Aborting.');
		return;
	}
	else {
		console.warn('HyperFrameset is not recommended for `file:` URLs. Continuing anyway.');
	}
}


var capturing = bootOptions['capturing'];
if (capturing === 'auto') capturing = !document.body;
// WARN startup failure will reload the page (if capturing is enabled)
// but without sessionOptions the reload will (probably) cause the same failure again.
if (!sessionOptions) capturing = false; 

if (capturing) {
	capture.start(capturing === 'strict');
}

// Capturing uses document.write, but after this point document.write, etc is forbidden
document.write = document.writeln = document.open = document.close = function()  { throw 'document.write(), etc is incompatible with HyperFrameset'; }


var hidden_timeout = bootOptions["hidden_timeout"];
if (hidden_timeout > 0) {
	Viewport.hide();
	setTimeout(Viewport.unhide, hidden_timeout);
}

function config() {
	Meeko.DOM.ready = domReady;
}

function start() {
	var startFu;
	if (capturing) startFu = Meeko.framer.start({
		contentDocument: capture.getDocument()
	});
	else startFu = Meeko.framer.start({
		contentDocument: new Promise(function(resolve, reject) { // FIXME this is bound to have cross-browser failures
			var dstDoc = document.cloneNode(true);
			var dstHead = dstDoc.head;
			dstHead.replaceChildren();
			nextSiblings(selfMarker, function(srcNode) {
				var node = dstDoc.importNode(srcNode, true);
				switch (getTagName(srcNode)) {
				case '':
					break;
				case 'script':
					if (!srcNode.type || /^text\/javascript$/i.test(srcNode.type)) break;
					// else fall-thru
				default:
					srcNode.parentNode.removeChild(srcNode);
					break;
				}
				dstHead.append(node);
			});
			document.body.replaceChildren();
			resolve(dstDoc);
		}) 
	});
	startFu.then(Viewport.unhide, function(error) {
		Viewport.unhide();
		throw error;
	});
}

function resolveScript(script) {
	switch (typeof script) {
	case "string": return resolveURL(script, urlParams);
	case "function": return script;
	default: return function() { /* dummy */ };
	}
}

var main_script = bootOptions['main_script'];
if (typeof main_script !== 'string') throw 'HyperFrameset script URL is not configured';
main_script = bootOptions['main_script'] = resolveURL(main_script, urlParams);

var config_script = bootOptions['config_script'];
if (config_script instanceof Array) forEach(config_script, function(script, i, list) {
	list[i] = resolveScript(script);
});
else {
	config_script = [ resolveScript(config_script) ];
	bootOptions['config_script'] = config_script;
}

var initSequence = [].concat(
	main_script,
	config,
	config_script
);

function init(callback) {
	taskQueue.queue(initSequence, callback, function(err) {
		setTimeout(function() { throw err; });
		if (capturing) domReady(function() { // TODO would it be better to do this with document.write()?
			if (sessionOptions.getItem('no_frameset') === false) return; // ignore failure if `no_frameset` is *explicitly* `false` in sessionOptions
			sessionOptions.setItem('no_frameset', true);
			location.reload();
		});
		else Viewport.unhide();
	});
}

if (capturing) { // wait for DOMReady then do init and start
	domReady(function() {
		if (window.stop) window.stop();
		setTimeout(function() {
			init(start);
		});
	});
}
else setTimeout(function() { // init immediately but wait for DOMReady before start
	init(function() {
		domReady(start);
	});
});

var startup_timeout = bootOptions["startup_timeout"];
if (startup_timeout > 0) {
	setTimeout(function() {
		taskQueue.abort(); // if the queue is not empty this will trigger its error callback		
	}, startup_timeout);
}

}).call(this);
