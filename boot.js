/*!
 * Copyright 2012-2014 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

(function() { // NOTE throwing an error or returning from this wrapper function prematurely aborts booting

var defaults = { // NOTE defaults also define the type of the associated config option
	"no_boot": false, 
	"no_frameset": false, // NOTE !(window.XMLHttpRequest && window.sessionStorage && window.JSON && 'readyState' in document) is enforced anyway
	"no_style": false,
	"capturing": true, // FIXME this must be true for now
	"log_level": "warn",
	"hidden_timeout": 0, // 3000, FIXME 
	"startup_timeout": 10000, // abort if startup takes longer than this
	"polling_interval": 50,
	"html5_block_elements": 'article aside figcaption figure footer header hgroup main nav section',
	"html5_inline_elements": 'abbr mark output time audio video picture',
	"main_script": '{bootscriptdir}HyperFrameset.js',
	"config_script": '{bootscriptdir}config.js'
}

var vendorPrefix = "Meeko";

var Meeko = window.Meeko || (window.Meeko = {});

// TODO up-front feature testing to prevent boot on unsupportable platorms
// e.g. where script.onload can't be used or faked

/*
 ### JS utilities
 */
var document = window.document;

function each(object, fn, context) { // WARN doesn't check hasOwnProperty()
	for (var slot in object) fn.call(context, slot, object[slot], object);
}

function some(a, fn, context) { 
	for (var n=a.length, i=0; i<n; i++) if (fn.call(context, a[i], i, a)) return true;
	return false;
}
var forEach = some; // WARN some() is forEach() ONLY IF fn() always returns falsish (including nothing)

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

document.head = $$('head')[0];
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

function resolveURL(url, params) { // works for all browsers including IE < 8
	if (url.substr(0,2) == '//') url = location.protocol + url;
	for (var name in params) {
		url = url.replace('{' + name + '}', params[name]); // WARN max of one reolace per param
	}
	var div = document.createElement('div');
	div.innerHTML = '<a href="' + url + '"></a>';
	return div.firstChild.href;
}

var addEvent = 
	document.addEventListener && function(node, event, fn) { return node.addEventListener(event, fn, false); } ||
	document.attachEvent && function(node, event, fn) { return node.attachEvent("on" + event, fn); } ||
	function(node, event, fn) { node["on" + event] = fn; };

var removeEvent = 
	document.removeEventListener && function(node, event, fn) { return node.removeEventListener(event, fn, false); } ||
	document.detachEvent && function(node, event, fn) { try { return node.detachEvent("on" + event, fn); } catch(error) {} } ||
	function(node, event, fn) { if (node["on" + event] == fn) node["on" + event] = null; };

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

var events = {
	'readystatechange': document,
	'DOMContentLoaded': document,
	'load': window
}

if (document.readyState === 'complete') loaded = true;
else addListeners(events, onChange);

return domReady;

function onChange(e) {
	switch(e.type) {
	case "DOMContentLoaded": case "load": 
		loaded = true;
		break;
	case "readystatechange":
		if (/loaded|complete/.test(document.readyState)) loaded = true;
		break;
	}
	if (!loaded) return;
	removeListeners(events, onChange);
	processQueue();
}

function addListeners(events, handler) {
	each(events, function(type, node) { addEvent(node, type, handler); });
}

function removeListeners(node, types, handler) {
	each(events, function(type, node) { removeEvent(node, type, handler); });
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

if (!supportsOnLoad && !testScript.readyState) throw "script.onload not supported in this browser";

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
	
	function onError(err) { 
		script.onerror = null;
		script.onload = null;
		onerror(err);
	}	
}

function enableScript(script) { // insert script (if not already done). Insertion is delayed if preloading
	// TODO assert (!!script.parentNode === supportsSync)
	if (supportsSync) return;

	if (supportsOnLoad) {
		head.appendChild(script);
		return;
	}

	/*
		IE <= 8 don't implement script.onload, script.onerror.
		But they do implement script preloading:
			http://wiki.whatwg.org/wiki/Dynamic_Script_Execution_Order#readyState_.22preloading.22
		Preloading starts as soon as `script.src` is set.
		If the script isn't inserted then it completes when `script.readyState === 'loaded'`.
		If the script is then inserted the readyState signals success as 'complete' and failure as 'loading'.
	*/
	script.onreadystatechange = onChange;
	if (script.readyState == 'loaded') onChange();

	function onChange() {
		var readyState = script.readyState;
		if (!script.parentNode) {
			if (readyState === 'loaded') head.appendChild(script);
			return;
		}
		switch (readyState) {
		case "complete": // NOTE successfully loaded
			script.onreadystatechange = null;
			script.onload();
			break;
		case "loading": // NOTE load failure
			script.onreadystatechange = null;
			script.onerror();
			break;
		default: break;
		}
	}

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
	aborted = true;
	if (list.length) errorback();
}

function errorback(err) {
	var fn;
	while (fn = list.shift()) {
		if (typeof fn == 'function') continue;
		// NOTE the only other option is a prepared script
		disableScript(fn);
	}
	if (onerror) onerror(err);
	else setTimeout(function() { throw err; });

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
	if (oncomplete) oncomplete();
	return;
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

	var head = document.head;
	var fragment = document.createDocumentFragment();
	var style = document.createElement("style");
	fragment.appendChild(style); // NOTE on IE this realizes style.styleSheet 
	
	var cssText = blockTags.join(', ') + ' { display: block; }\n';
	if (style.styleSheet) style.styleSheet.cssText = cssText;
	else style.textContent = cssText;
	
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
selfMarker.rel = 'self';
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
if (no_frameset || !(window.XMLHttpRequest && sessionOptions && 'readyState' in document)) {
	if (!no_frameset) throw 'Capturing depends on native XMLHttpRequest and sessionStorage and JSON';
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
	Meeko.HTMLParser.prototype.prepare = html5prepare;
	Meeko.Promise.pollingInterval = bootOptions["polling_interval"];
	Meeko.framer.config({
		ready: Viewport.unhide
	});
}

function start() {
	if (capturing) Meeko.framer.start({
		contentDocument: Capture.getDocument()
	});
	else Meeko.framer.start({
		contentDocument: new Meeko.Promise(function(resolve, reject) { // FIXME this is bound to have cross-browser failures
			var dstDoc = document.cloneNode(true);
			var dstHead = dstDoc.head;
			empty(dstHead);
			nextSiblings(selfMarker, function(srcNode) {
				var node = srcNode.cloneNode(true);
				switch (getTagName(srcNode)) {
				case '':
					break;
				case 'script':
					if (srcNode.type || /^text\/javascript$/i.test(srcNode.type)) break;
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
