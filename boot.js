/*!
 * Copyright 2012-2014 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

(function() { // NOTE throwing an error or returning from this wrapper function prematurely aborts booting

var defaults = { // NOTE defaults also define the type of the associated config option
	"no_boot": false, 
	"no_frameset": false, // NOTE !(history.pushState && window.XMLHttpRequest && window.sessionStorage && window.JSON && 'readyState' in document) is enforced anyway
	"no_style": false,
	"capturing": true,
	"log_level": "warn",
	"hidden_timeout": 3000,
	"startup_timeout": 10000, // abort if startup takes longer than this
	"polling_interval": 50,
	"html5_block_elements": 'article aside figcaption figure footer header hgroup main nav section',
	"html5_inline_elements": 'abbr mark output time audio video picture',
	"main_script": '{bootscriptdir}HyperFrameset.js',
	"config_script": '{bootscriptdir}config.js'
}

var SELF_REL = 'self'; // TODO DRY with libHyperFrameset.js
var FRAMESET_REL = 'frameset'; // ditto

var document = window.document;

var vendorPrefix = "Meeko";

var Meeko = window.Meeko || (window.Meeko = {});

// TODO up-front feature testing to prevent boot on unsupportable platorms
// e.g. where script.onload can't be used or faked

/*
	STAGING_DOCUMENT_IS_INERT indicates that resource URLs - like img@src -
	WILL NOT start downloading when the document they are in is parsed.
	If this is false then the `no_frameset` option applies.
*/

var STAGING_DOCUMENT_IS_INERT = (function() {

	try { var doc = document.implementation.createHTMLDocument(''); }
	catch (error) { return false; } // IE <= 8
	if (doc.URL !== document.URL) return true; // FF, Webkit, Chrome
	/*
		Use a data-uri image to see if browser will try to fetch.
		The smallest such image might be a 1x1 white gif,
		see http://proger.i-forge.net/The_smallest_transparent_pixel/eBQ
	*/
	var img = doc.createElement('img');
	img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=';
	doc.body.appendChild(img);

	// Sometimes the img check isn't ready on IE9, so one intermediate check
	var script = doc.createElement('script');
	if (!('readyState' in script)) script.onload = function() { this.readyState = 'complte'; };
	script.text = ';';
	doc.body.appendChild(script);
	if (script.readyState === 'complete') return false; // IE9

	if (img.width) return false; // IE9, Opera-12 will have width == 1 / height == 1 
	/* 
	if (img.complete) return false; 
	// Opera-12 sets this immediately. IE9 sets it after a delay, 
	// BUT on MS Edge it is always true (when `img` created by `doc`)
	*/

	return true; // Presumably IE10,11 or Edge
})();

/*
	SUPPORTS_MUTATION_OBSERVERS indicates that DOM mutation can be adequately observed.
	This is a requirement of DOMSprockets and element visibilitychange events.
	If this is false then the `no_frameset` option applies.
*/

var SUPPORTS_MUTATION_OBSERVERS = (function() {

	if (window.MutationObserver) return true;

	if (!window.addEventListener) return false;
	var supported = false;
	var div = document.createElement('div');
	div.addEventListener('DOMAttrModified', function(e) { supported = true; }, false);
	div.setAttribute('hidden', '');
	return supported;
	
})();

/*
 ### JS utilities
 */
function some(a, fn, context) { 
	for (var n=a.length, i=0; i<n; i++) if (fn.call(context, a[i], i, a)) return true;
	return false;
}
function forEach(a, fn, context) { for (var n=a.length, i=0; i<n; i++) fn.call(context, a[i], i, a); }

function words(text) { return text.split(/\s+/); }

var parseJSON = function(text) { // NOTE this allows code to run. This is a feature, not a bug. I think.
	try { return ( Function('return ( ' + text + ' );') )(); }
	catch (error) { return; }
}


/*
 ### logger defn and init
 */
var logger = Meeko.logger || (Meeko.logger = new function() {

var levels = this.levels = words("none error warn info debug");

forEach(levels, function(name, num) {

levels[name] = num;
this[name] = function() { this._log({ level: num, message: arguments }); }

}, this);

this._log = function(data) { 
	if (data.level > this.LOG_LEVEL) return;
	data.timeStamp = +(new Date);
        data.message = [].join.call(data.message, " ");
        if (this.write) this.write(data);
}

this.startTime = +(new Date);
var padding = "      ";

this.write = (window.console) && function(data) { 
	var offset = padding + (data.timeStamp - this.startTime), 
		first = offset.length-padding.length-1,
		offset = offset.substring(first);
	console.log(offset+"ms " + levels[data.level]+": " + data.message); 
}

this.LOG_LEVEL = levels[defaults['log_level']]; // DEFAULT. Options are read later

}); // end logger defn

/*
 ### Get options

 TODO It would be nice if all data sources had the same API
*/

var sessionOptions = window.sessionStorage && window.JSON && (function() {

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
		logger.warn(name + ' inaccessible');
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
			// TODO else logger.warn("incorrect config option " + val + " for " + name); 
			break;
		case "boolean":
			data = val; // WARN this does NOT convert to Boolean
			// if ([false, true, 0, 1].indexOf(val) < 0) logger.warn("incorrect config option " + val + " for " + name); 
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


var searchParams = (function() {
	var search = location.search,
		options = {}; 
	if (search) search.substr(1)
		.replace(/(?:^|&)([^&=]+)=?([^&]*)/g, function(m, key, val) {
			val = (val) ? decodeURIComponent(val) : true;
			options[key] = val;
		});
	return options;
})();

function isSet(option) {
	if (searchParams[option] || bootOptions[option]) return true;
}

// Don't even load HyperFrameset if "no_boot" is one of the search options (or true in Meeko.options)
if (isSet('no_boot')) return;

/*
 ### DOM utilities
 */

function getTagName(el) { return el && el.nodeType === 1 ? el.tagName.toLowerCase() : ""; }

function $$(selector, context) {
	context = context || document;
	var nodeList = [];
	forEach(context.getElementsByTagName(selector), function(el) { nodeList.push(el); });
	return nodeList;
}

function empty(el) {
	var node;
	while (node = el.firstChild) el.removeChild(node);
}

function nextSiblings(el, callback) {
	var nodeList = [];
	for (var node=el.nextSibling; node; node=node.nextSibling) nodeList.push(node);
	if (callback) forEach(nodeList, callback);
	return nodeList;
}

if (!document.head) document.head = $$('head')[0];
if (!document.head) throw 'ABORT: <head> not found. This implies a legacy browser.';

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
	if (url.substr(0,2) == '//') url = location.protocol + url;
	for (var name in params) {
		url = url.replace('{' + name + '}', params[name]); // WARN max of one reolace per param
	}
	// needs to be more complex for IE < 8
	var a = document.createElement('a');
	a.setAttribute('href', url);
	return a.href;
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

var head = document.head;
var testScript = document.createElement('script');
var supportsOnLoad = (testScript.setAttribute('onload', ';'), typeof testScript.onload === 'function');
var supportsSync = (testScript.async === true);

if (!supportsOnLoad) throw "script.onload not supported in this browser";

function prepareScript(url, onload, onerror) { // create script (and insert if supportsSync)
	var script = document.createElement('script');
	script.onerror = onError;
	script.onload = onLoad;
	script.src = url;
	if (supportsSync) {
		script.async = false;
		head.appendChild(script);
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
	head.appendChild(script);
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
 ### plugin functions for HyperFrameset
 */
var html5prepare = (function() {

var blockTags = words(bootOptions['html5_block_elements']);
var inlineTags = words(bootOptions['html5_inline_elements']);

function addStyles() {
	if (blockTags.length <= 0) return; // FIXME add a test for html5 support. TODO what about inline tags?

	var cssText = blockTags.join(', ') + ' { display: block; }\n';

	var head = document.head;
	var style = document.createElement("style");
	if ('textContent' in style) style.textContent = cssText; // standard: >=IE9
	else { // legacy: <=IE8
		var fragment = document.createDocumentFragment();
		fragment.appendChild(style); // NOTE on IE this realizes style.styleSheet 
		style.styleSheet.cssText = cssText;
	}
	
	head.insertBefore(style, head.firstChild);
}

function html5prepare(doc) {
	if (!doc) {
		doc = document;
		addStyles();
	}
	forEach(blockTags.concat(inlineTags), function(tag) {
		tag = tag.toUpperCase(); // NOTE https://github.com/aFarkas/html5shiv/issues/54
		doc.createElement(tag); 
	});
}

return html5prepare;

})();

/*
 ### Viewport hide / unhide
 */
var Viewport = (function() {

var head = document.head;
var fragment = document.createDocumentFragment();
var style = document.createElement("style");
fragment.appendChild(style); // NOTE on IE this realizes style.styleSheet 

// NOTE hide the page until the frameset is ready
var selector = 'body', property = 'visibility', value = 'hidden';

var cssText = selector + ' { ' + property + ': ' + value + '; }\n';
if (style.styleSheet) style.styleSheet.cssText = cssText;
else style.textContent = cssText;

function hide() {
	head.insertBefore(style, selfMarker);
}

function unhide() {
	var pollingInterval = bootOptions['polling_interval'];
	if (style.parentNode != head) return;
	head.removeChild(style);
	// NOTE on IE sometimes content stays hidden although 
	// the stylesheet has been removed.
	// The following forces the content to be revealed
	var el = $$(selector)[0];
	el.style[property] = value;
	setTimeout(function() { el.style[property] = ""; }, pollingInterval);
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
var Capture = (function() {

var capturedHTML = '';

var Capture = {
// TODO might be better to clone the partially loaded document at the start of booting so boot modifications don't get captured
start: function(strict) {
	var warnMsg = Capture.test(); // NOTE test() can also throw
	if (warnMsg) {
		if (strict) throw warnMsg;
		else logger.warn(warnMsg);
	}
	capturedHTML += getDocTypeTag(document); // WARN relies on document.doctype
	capturedHTML += toStartTag(document.documentElement); // WARN relies on element.outerHTML
	capturedHTML += toStartTag(document.head);
	document.write('<plaintext style="display: none;">');
},

test: function() { // return `false` for strict, otherwise warning message
	if (document.body) throw 'When capturing, boot-script MUST be in - or before - <head>';
	if ($$('script').length > 1) return 'When capturing, boot-script SHOULD be first <script>';
	var nodeList = nextSiblings(selfMarker);
	if (some(nodeList, function(node) { // return true if invalid node
		if (node.nodeType !== 1) return false; // comments and text-nodes are ok
		if (node === bootScript) return false; // boot-script is ok. TODO should be last node in <head>
		var tag = getTagName(node);
		if (tag === 'title' && node.firstChild === null) return false; // IE6 adds a dummy <title>
		if (tag !== 'meta') return true; 
		if (node.httpEquiv || node.getAttribute('charset')) return false; // <meta http-equiv> are ok
		return true;
	})) return 'When capturing, only <meta http-equiv> or <meta charset> nodes may precede boot-script';
	return false; 
},

getDocument: function() { // WARN this assumes HyperFrameset is ready
	return new Meeko.Promise(function(resolve, reject) {
		domReady(function() {
			var elts = $$('plaintext');
			var plaintext = elts[elts.length - 1]; // NOTE There should only be one, but take the last just to be sure
			var html = plaintext.firstChild.nodeValue;
			plaintext.parentNode.removeChild(plaintext);
			
			if (!/\s*<!DOCTYPE/i.test(html)) html = capturedHTML + html;
			resolve(new String(html));
		});
	})
	.then(function(text) {
		return Meeko.DOM.parseHTML(text, { url: document.URL, mustResolve: false });
	});
}

}

return Capture;

function toStartTag(el) { // WARN outerHTML not available before Firefox 11
	var html = el.outerHTML;
	return html.substr(0, html.indexOf('>') + 1);
}

function getDocTypeTag(doc) { // WARN doctype not available before IE 9
	var doctype = doc.doctype;
	return (doctype) ?

		'<!DOCTYPE ' + doctype.name +
		(doctype.publicId ? ' PUBLIC "' + doctype.publicId + '"': '') +
		(doctype.systemId ? ' "' + doctype.systemId + '"' : '') +
		'>\n' :

		'<!DOCTYPE html>\n';
}


})();


/*
 ## Boot configuration
*/

var bootScript;
if (Meeko.bootScript) bootScript = Meeko.bootScript; // hook for meeko-panner
else {
	bootScript = Meeko.bootScript = getBootScript();
	if (document.body) logger.warn("Boot-script SHOULD be in <head> and MUST NOT have @async or @defer");
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

html5prepare(); // no doc arg means use document and add block element styles


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
if (no_frameset) return; // TODO logger.info()
if (!(history.pushState && window.XMLHttpRequest && 'readyState' in document && 
	window.sessionStorage && window.JSON &&
	STAGING_DOCUMENT_IS_INERT && SUPPORTS_MUTATION_OBSERVERS)) {
	logger.debug('HyperFrameset depends on native XMLHttpRequest, history.pushState, sessionStorage, JSON and MutationObserver');
	return;
}


var capturing = bootOptions['capturing'];
if (capturing === 'auto') capturing = !document.body;

if (capturing) {
	Capture.start(capturing === 'strict');
}


// Capturing uses document.write, but after this point document.write, etc is forbidden
document.write = document.writeln = document.open = document.close = function()  { throw 'document.write(), etc is incompatible with HyperFrameset'; }


var hidden_timeout = bootOptions["hidden_timeout"];
if (hidden_timeout > 0) {
	Viewport.hide();
	setTimeout(Viewport.unhide, hidden_timeout);
}

var log_index = logger.levels[bootOptions["log_level"]];
if (log_index != null) logger.LOG_LEVEL = log_index;

function config() {
	Meeko.DOM.ready = domReady;
	Meeko.Promise.pollingInterval = bootOptions["polling_interval"];
}

function start() {
	var startFu;
	if (capturing) startFu = Meeko.framer.start({
		contentDocument: Capture.getDocument()
	});
	else startFu = Meeko.framer.start({
		contentDocument: new Meeko.Promise(function(resolve, reject) { // FIXME this is bound to have cross-browser failures
			var dstDoc = document.cloneNode(true);
			var dstHead = dstDoc.head;
			empty(dstHead);
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
				dstHead.appendChild(node);
			});
			empty(document.body);
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

})();
