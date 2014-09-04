/*!
 * Copyright 2009-2014 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

/* TODO
    + substantial error handling and notification needs to be added
    + <link rel="self" />
    + Would be nice if more of the internal functions were called as method, eg DOM.ready()...
        this would allow the boot-script to modify them as appropriate
    + Up-front feature testing to prevent boot on unsupportable platorms...
        e.g. can't create HTML documents
    + use requestAnimationFrame() when available
 */

// WARN for IE7, IE8 sometimes XMLHttpRequest is in a detectable but not callable state
// This is usually fixed by refreshing, or by the following DISABLED work-around.
// var XMLHttpRequest = window.XMLHttpRequest; 

(function() {

var window = this;
var document = window.document;

if (!window.XMLHttpRequest) throw "HyperFrameset requires native XMLHttpRequest";
if (!document.documentElement.hasAttribute) throw "HyperFrameset requires Element#hasAttribute()";

var defaultOptions = { // NOTE defaults also define the type of the associated config option
	"log_level": "warn",
	"polling_interval": 50
}

var vendorPrefix = "meeko";

var Meeko = window.Meeko || (window.Meeko = {});

/*
 ### Utility functions
 These might (or might not) be lodash equivalents
 */

var uc = function(str) { return str ? str.toUpperCase() : ''; }
var lc = function(str) { return str ? str.toLowerCase() : ''; }

var contains = function(a, item) {
	for (var n=a.length, i=0; i<n; i++) if (a[i] === item) return true;
	return false;
}

var toArray = function(coll) { var a = []; for (var n=coll.length, i=0; i<n; i++) a[i] = coll[i]; return a; }

var forEach = function(a, fn, context) { for (var n=a.length, i=0; i<n; i++) fn.call(context, a[i], i, a); }

var some = function(a, fn, context) { for (var n=a.length, i=0; i<n; i++) { if (fn.call(context, a[i], i, a)) return true; } return false; }

var every = function(a, fn, context) { for (var n=a.length, i=0; i<n; i++) { if (!fn.call(context, a[i], i, a)) return false; } return true; }

var map = function(a, fn, context) {
	var output = [];
	for (var n=a.length, i=0; i<n; i++) output[i] = fn.call(context, a[i], i, a);
	return output;
}

var filter = function(a, fn, context) {
	var output = [];
	for (var n=a.length, i=0; i<n; i++) {
		var success = fn.call(context, a[i], i, a);
		if (success) output.push(a[i]);
	}
	return output;
}

var words = function(text) { return text.split(/\s+/); }

var forOwn = (Object.keys) ? // TODO is this feature detection worth-while?
function(object, fn, context) {
	forEach(Object.keys(object), function(key) { fn.call(context, object[key], key, object); });
} : 
function(object, fn, context) { // WARN won't work on native objects in old IE
	for (slot in object) {
		if (object.hasOwnProperty && object.hasOwnProperty(slot)) fn.call(context, object[slot], slot, object);
	}
}

var defaults = function(dest, src) {
	forOwn(src, function(val, key) { if (typeof dest[key] === 'undefined') dest[key] = val; });
	return dest;
}

var assign = function(dest, src) {
	forOwn(src, function(val, key) { dest[key] = val; });
	return dest;
}

var trim = ''.trim ?
function(str) { return str.trim(); } :
function(str) { return str.replace(/^\s+/, '').replace(/\s+$/, ''); }

var _ = Meeko.stuff = {};
defaults(_, {
	uc: uc, lc: lc, trim: trim, words: words, // string
	contains: contains, toArray: toArray, forEach: forEach, some: some, every: every, map: map, filter: filter, // array
	forOwn: forOwn, defaults: defaults, assign: assign, extend: assign // object
});


/*
 ### Logger (minimal implementation - can be over-ridden)
 */
var logger = Meeko.logger || (Meeko.logger = new function() {

var levels = this.levels = _.words("none error warn info debug");

_.forEach(levels, function(name, num) {
	
levels[name] = num;
this[name] = !window.console && function() {} ||
	console[name] && function() { if (num <= this.LOG_LEVEL) console[name].apply(console, arguments); } ||
	function() { if (num <= this.LOG_LEVEL) console.log.apply(console, arguments); }

}, this);

this.LOG_LEVEL = levels[defaultOptions['log_level']]; // DEFAULT

}); // end logger defn


/*
 ### Task queuing and isolation
 */

// NOTE Task.asap could use window.setImmediate, except for
// IE10 CPU contention bugs http://codeforhire.com/2013/09/21/setimmediate-and-messagechannel-broken-on-internet-explorer-10/

var Task = (function() {

var asapQueue = [];
var deferQueue = [];
var scheduled = false;
var processing = false;

function asap(fn) {
	asapQueue.push(fn);
	if (processing) return;
	if (scheduled) return;
	schedule(processTasks);
	scheduled = true;
}

function defer(fn) {
	if (processing) {
		deferQueue.push(fn);
		return;
	}
	asap(fn);
}

function delay(fn, timeout) {
	if (timeout <= 0 || timeout == null) {
		defer(fn);
		return;
	}

	setTimeout(function() {
		isolate(fn);
		processTasks();
	}, timeout);
}

// NOTE schedule used to be approx: setImmediate || postMessage || setTimeout
var schedule = window.setTimeout;

function processTasks() {
	processing = true;
	var task;
	while (asapQueue.length) {
		task = asapQueue.shift();
		if (typeof task !== 'function') continue;
		var success = isolate(task); // FIXME does success (or failure) have any consequence??
	}
	scheduled = false;
	processing = false;
	
	asapQueue = deferQueue;
	deferQueue = [];
	if (asapQueue.length) {
		schedule(processTasks);
		scheduled = true;
	}
}


var isolate = (function() { // TODO maybe it isn't worth isolating on platforms that don't have dispatchEvent()

var evType = vendorPrefix + "-isolate";
var testFn, complete = [], wrapper, isolate;
wrapper = function() {
	var i = complete.length;
	complete.push(false);
	testFn();
	complete[i] = true;
}
if (window.dispatchEvent) {
	window.addEventListener(evType, wrapper, false);
	isolate = function(fn) {
		testFn = fn;
		var e = document.createEvent("Event");
		e.initEvent(evType, true, true);
		window.dispatchEvent(e);
		return complete.pop();
	}
}
else if ("onpropertychange" in document) { // TODO this is for IE <= 8. Might be better with the re-throw solution
	var meta = document.createElement("meta");
	meta[evType] = 0;
	meta.onpropertychange = function(e) { e = e || window.event; if (e.propertyName === evType) wrapper() }
	isolate = function(fn) { // by inserting meta every time, it doesn't matter if some code removes meta
		testFn = fn;
		if (!meta.parentNode) document.head.appendChild(meta);
		meta[evType]++;
		if (meta.parentNode) document.head.removeChild(meta);
		return complete.pop();
	}
}
else isolate = function(fn) {
	var complete = false;
	try { fn(); complete = true; }
	catch(error) { setTimeout(function() { throw error; }); }
	return complete;
}

return isolate;
})();


return {
	asap: asap,
	defer: defer,
	delay: delay,
	isolate: isolate
};

})(); // END Task

/*
 ### Promise
 WARN: This was based on early DOM Futures specification. This has been evolved towards ES6 Promises.
 */

var Promise = Meeko.Promise = function(init) { // `init` is called as init(resolve, reject)
	if (!(this instanceof Promise)) return new Promise(init);
	
	var promise = this;
	promise._initialize();

	if (init === undefined) return;

	function resolve(result) { promise._resolve(result); }
	function reject(error) { promise._reject(error); }

	try { init(resolve, reject); }
	catch(error) { reject(error); }
	// NOTE promise is returned by `new` invocation
}

_.defaults(Promise.prototype, {

_initialize: function() {
	var promise = this;
	promise._acceptCallbacks = [];
	promise._rejectCallbacks = [];
	promise._accepted = null;
	promise._result = null;
	promise._willCatch = false;
	promise._processing = false;
},

_accept: function(result, sync) { // NOTE equivalent to "accept algorithm". External calls MUST NOT use sync
	var promise = this;
	if (promise._accepted != null) return;
	promise._accepted = true;
	promise._result = result;
	promise._requestProcessing(sync);
},

_resolve: function(value, sync) { // NOTE equivalent to "resolve algorithm". External calls MUST NOT use sync
	var promise = this;
	if (promise._accepted != null) return;
	if (value != null && typeof value.then === 'function') {
		try {
			value.then(
				function(result) { promise._resolve(result); },
				function(error) { promise._reject(error); }
			);
		}
		catch(error) {
			promise._reject(error, sync);
		}
		return;
	}
	// else
	promise._accept(value, sync);
},

_reject: function(error, sync) { // NOTE equivalent to "reject algorithm". External calls MUST NOT use sync
	var promise = this;
	if (promise._accepted != null) return;
	promise._accepted = false;
	promise._result = error;
	if (!promise._willCatch) {
		Task.asap(function() {
			if (!promise._willCatch) throw error;
		});
	}
	else promise._requestProcessing(sync);
},

_requestProcessing: function(sync) { // NOTE schedule callback processing. TODO may want to disable sync option
	var promise = this;
	if (promise._accepted == null) return;
	if (promise._processing) return;
	if (sync) {
		promise._processing = true;
		promise._process();
		promise._processing = false;
	}
	else {
		Task.asap(function() {
			promise._processing = true;
			promise._process();
			promise._processing = false;
		});
	}
},

_process: function() { // NOTE process a promises callbacks
	var promise = this;
	var result = promise._result;
	var callbacks, cb;
	if (promise._accepted) {
		promise._rejectCallbacks.length = 0;
		callbacks = promise._acceptCallbacks;
	}
	else {
		promise._acceptCallbacks.length = 0;
		callbacks = promise._rejectCallbacks;
	}
	while (callbacks.length) {
		cb = callbacks.shift();
		if (typeof cb === 'function') cb(result);
	}
},

then: function(acceptCallback, rejectCallback) {
	var promise = this;
	return new Promise(function(resolve, reject) {
		var acceptWrapper = acceptCallback ?
			wrapResolve(acceptCallback, resolve, reject) :
			function(value) { resolve(value); }
	
		var rejectWrapper = rejectCallback ? 
			wrapResolve(rejectCallback, resolve, reject) :
			function(error) { reject(error); }
	
		promise._acceptCallbacks.push(acceptWrapper);
		promise._rejectCallbacks.push(rejectWrapper);
	
		promise._willCatch = true;
	
		promise._requestProcessing();
		
	});
},

'catch': function(rejectCallback) { // WARN 'catch' is unexpected identifier in IE8-
	var promise = this;
	return promise.then(null, rejectCallback);
}

});


/* Functional composition wrapper for `then` */
function wrapResolve(callback, resolve, reject) {
	return function() {
		try {
			var value = callback.apply(undefined, arguments); 
			resolve(value);
		} catch(error) {
			reject(error);
		}
	}
}


_.defaults(Promise, {

resolve: function(value) {
return new Promise(function(resolve, reject) {
	resolve(value);
});
},

reject: function(error) {
return new Promise(function(resolve, reject) {
	reject(error);
});
}

});


/*
 ### Async functions
   wait(test) waits until test() returns true
   asap(fn) returns a promise which is fulfilled / rejected by fn which is run asap after the current micro-task
   delay(timeout) returns a promise which fulfils after timeout ms
   pipe(startValue, [fn1, fn2, ...]) will call functions sequentially
 */
var wait = (function() { // TODO wait() isn't used much. Can it be simpler?
	
var tests = [];

function wait(fn) {
return new Promise(function(resolve, reject) {
	var test = { fn: fn, resolve: resolve, reject: reject };
	asapTest(test);
});
}

function asapTest(test) {
	return asap(test.fn)
	.then(function(done) {
		if (done) test.resolve();
		else deferTest(test);
	},
	function(error) {
		test.reject(error);
	});
}

function deferTest(test) {
	var started = tests.length > 0;
	tests.push(test);
	if (!started) Task.delay(poller, Promise.pollingInterval); // NOTE polling-interval is configured below
}

function poller() {
	var currentTests = tests;
	tests = [];
	preach(currentTests, function(i, test) {
		return asapTest(test);
	});
}

return wait;

})();

var asap = function(fn) { return Promise.resolve().then(fn); }

function delay(timeout) {
return new Promise(function(resolve, reject) {
	if (timeout <= 0 || timeout == null) Task.defer(resolve);
	else Task.delay(resolve, timeout);
});
}

function pipe(startValue, fnList) {
	var promise = Promise.resolve(startValue);
	while (fnList.length) { 
		var fn = fnList.shift();
		promise = promise.then(fn);
	}
	return promise;
}

function preach(src, fn) {
return new Promise(function(resolve, reject) {

	var mode =
		(typeof src === 'function') ? 'function' :
		(src == null) ? 'null' :
		('length' in src) ? 'array' :
		'object';
	if (mode === 'null') throw 'src cannot be null in preach(src, fn)';
	if (mode === 'object') {
		var keys = [], n = 0;
		_.forOwn(src, function(v, k) { keys[n++] = k; });
	}

	var i = 0;
	next();
	return;

	function next() {
		asap(callback)['catch'](errCallback);		
	}
	function callback() {
		var key, value;
		switch (mode) {
		case 'function':
			key = i;
			value = src(key);
			break;
		case 'array':
			if (i >= src.length) {
				resolve();
				return;
			}
			key = i;
			value = src[key];
			break;
		case 'object':
			if (i >= keys.length) {
				resolve();
				return;
			}
			key = keys[i];
			value = src[key];
			break;
		}
		i++;
		var current = Promise.resolve(value)
		.then(function(val) {
			if (mode === 'function' && val == null) {
				resolve();
				return;
			}
			var result = fn(key, val, src);
			current.then(next);
			return result;
		});
		return current;
	}
	function errCallback(error) {
		reject(error);
	}
	
});
}

Promise.pollingInterval = defaultOptions['polling_interval'];

_.defaults(Promise, {
	asap: asap, delay: delay, wait: wait, pipe: pipe
});



/*
 ### DOM utility functions
 */
var getTagName = (typeof document.documentElement.scopeName !== 'string') ?
function(el) {
	return el && el.nodeType === 1 ? _.lc(el.tagName) : "";
} :
function(el) {
	if (!el || el.nodeType !== 1) return '';
	var tag = _.lc(el.tagName);
	var scopeName = _.lc(el.scopeName); // IE8, IE9
	if (!scopeName || scopeName === 'html') return tag;
	var prefix = scopeName + ':';
	if (tag.indexOf(prefix) === 0) return tag;
	return prefix + tag;
}

var $id = function(id, doc) {
	if (!id) return;
	if (!doc) doc = document;
	if (!doc.getElementById) throw 'Context for $id must be a Document node';
	return doc.getElementById(id);
	// WARN would need a work around for broken getElementById in IE <= 7
}

var $ = function(selector, context) { // WARN assumes document.querySelector
	context = context || document;
	return context.querySelector(selector);
}

var $$ = function(selector, context) { // WARN assumes document.querySelectorAll
	context = context || document;
	return _.toArray(context.querySelectorAll(selector));
}

var siblings = function(conf, refNode, conf2, refNode2) {
	
	conf = _.lc(conf);
	if (conf2) {
		conf2 = _.lc(conf2);
		if (conf === 'ending' || conf === 'before') throw 'siblings() startNode looks like stopNode';
		if (conf2 === 'starting' || conf2 === 'after') throw 'siblings() stopNode looks like startNode';
		if (!refNode2 || refNode2.parentNode !== refNode.parentNode) throw 'siblings() startNode and stopNode are not siblings';
	}
	
	var nodeList = [];
	if (!refNode || !refNode.parentNode) return nodeList;
	var node, stopNode, first = refNode.parentNode.firstChild;

	switch (conf) {
	case "starting": node = refNode; break;
	case "after": node = refNode.nextSibling; break;
	case "ending": node = first; stopNode = refNode.nextSibling; break;
	case "before": node = first; stopNode = refNode; break;
	default: throw conf + " is not a valid configuration in siblings()";
	}
	if (conf2) switch (conf2) {
	case "ending": stopNode = refNode2.nextSibling; break;
	case "before": stopNode = refNode2; break;
	}
	
	if (!node) return nodeList; // FIXME is this an error??
	for (;node && node!==stopNode; node=node.nextSibling) nodeList.push(node);
	return nodeList;
}
var matchesElement = function(selector, node) { // WARN only matches by tagName
	var tag = _.lc(selector);
	var matcher = function(el) {
		return (el.nodeType == 1 && getTagName(el) == tag);
	}
	return (node) ? matcher(node) : matcher;
}
var firstChild = function(parent, matcher) {
	var fn = (typeof matcher == "function") ? 
		matcher : 
		matchesElement(matcher);
	var nodeList = parent.childNodes;
	for (var n=nodeList.length, i=0; i<n; i++) {
		var node = nodeList[i];
		if (fn(node)) return node;
	}
}
var insertNode = function(conf, refNode, node) { // like imsertAdjacentHTML but with a node and auto-adoption
	var doc = refNode.ownerDocument;
	if (doc.adoptNode) node = doc.adoptNode(node); // Safari 5 was throwing because imported nodes had been added to a document node
	switch(conf) {
	case "beforebegin": refNode.parentNode.insertBefore(node, refNode); break;
	case "afterend": refNode.parentNode.insertBefore(node, refNode.nextSilbing); break;
	case "afterbegin": refNode.insertBefore(node, refNode.firstChild); break;
	case "beforeend": refNode.appendChild(node); break;
	case "replace": refNode.parentNode.replaceChild(node, refNode);
	}
	return refNode;
}

var composeNode = function(srcNode, context) { // document.importNode() NOT available on IE <= 8
	if (!context) context = document;
	if (context.nodeType !== 9 && context.nodeType !== 11) throw 'Non-document context in composeNode()';
	if (srcNode.nodeType != 1) return;
	var tag = getTagName(srcNode);
	var node = context.createElement(tag);
	copyAttributes(node, srcNode);
	switch(tag) {
	case "title":
		if (srcNode.innerHTML === "") node = null;
		else node.innerText = srcNode.innerHTML;
		break;
	case "style":
		var frag = context.createDocumentFragment();
		frag.appendChild(node);
		node.styleSheet.cssText = srcNode.styleSheet.cssText;
		frag.removeChild(node);
		break;
	case "script":
		node.text = srcNode.text;
		break;
	default: // meta, link, base have no content
		// FIXME what to do with <base>?
		break;
	}
	return node;
}

var textContent = document.documentElement.textContent ?
function(el, text) { // NOTE https://developer.mozilla.org/en-US/docs/Web/API/Node.textContent#Differences_from_innerText
	if (typeof text === "undefined") return el.textContent;
	el.textContent = text;
} :
function(el, text) {
	if (typeof text === "undefined") return el.innerText;
	el.innerText = text;
}

var scriptText = (function() {

var script = document.createElement('script');
return ('text' in script) ? standard :
	('textContent' in script) ? alternate :
	legacy;

function standard(el, val) { // all IE, current non-IE
	if (val === null) val = '';
	if (typeof val === 'undefined') return el.text;
	el.text = val;
}

function alternate(el, val) { // old non-IE
	if (val === null) val = '';
	if (typeof val === 'undefined') return el.textContent;
	el.textContent = val;
}

function legacy(el, val) { // really old non-IE
	if (val === null) val = '';
	var textNode = el.firstChild;
	if (typeof val === 'undefined') return textNode ? textNode.nodeValue : '';
	if (textNode) el.removeChild(textNode);
	el.appendChild(document.createTextNode(val));
}

})();
	
var hasAttribute = function(node, attrName) { // WARN needs to be more complex for IE <= 7
	return node.hasAttribute(attrName);
}

var copyAttributes = function(node, srcNode) { // helper for composeNode()
	_.forEach(_.toArray(srcNode.attributes), function(attr) {
		node.setAttribute(attr.name, attr.value); // WARN needs to be more complex for IE <= 7
	});
	return node;
}

var removeAttributes = function(node) {
	_.forEach(_.toArray(node.attributes), function(attrName) {
		node.removeAttribute(attrName); // WARN might not work for @class on IE <= 7
	});
	return node;
}

var createDocument = // TODO this doesn't handle old non-IE browsers
document.implementation.createHTMLDocument && function() { // modern browsers
	var doc = document.implementation.createHTMLDocument("");
	doc.removeChild(doc.documentElement);
	return doc;
} ||
document.createDocumentFragment().getElementById && function(options) { // IE <= 8 
	var doc = document.createDocumentFragment();
	if (options && options.prepare) options.prepare(doc);
	return doc;
} ||
function(options) {  // old IE
	var doc = document.cloneNode(false);
	if (options && options.prepare) options.prepare(doc);
	return doc;
}

var createHTMLDocument = document.implementation.createHTMLDocument && function(title) {
	return document.implementation.createHTMLDocument(title);
} ||
function(titleText) {
	var doc = createDocument();
	var parent = doc;
	var docEl;
	// the following is equivalent of `doc.innerHTML = '<html><head><title>' + titleText + '</title></head><body></body></html>';`
	_.forEach(_.words('html head title body'), function(tagName) {
		var el = doc.createElement(tagName);
		parent.appendChild(el);
		switch (tagName) {
		case 'title':
			el.appendChild(doc.createTextNode(titleText));
			parent = docEl;
			break;
		case 'html':
			docEl = el;
			// fall-thru
		default:
			parent = el;
			break;
		}
	});
	return doc;
};

var cloneDocument = document.importNode ?
function(srcDoc, options) {
	var doc = createDocument(options);
	var docEl = document.importNode(srcDoc.documentElement, true);
	doc.appendChild(docEl);
	polyfill(doc);

	// WARN sometimes IE9 doesn't read the content of inserted <style>
	_.forEach($$("style", doc), function(node) {
		if (node.styleSheet && node.styleSheet.cssText == "") node.styleSheet.cssText = node.innerHTML;		
	});
	
	return doc;
} :
function(srcDoc, options) {
	var doc = createDocument(options);

	var docEl = importSingleNode(srcDoc.documentElement, doc),
		docHead = importSingleNode(srcDoc.head, doc),
		docBody = importSingleNode(srcDoc.body, doc);

	docEl.appendChild(docHead);
	_.forEach (_.toArray(srcDoc.head.childNodes), function(srcNode) {
		if (srcNode.nodeType !== 1) return;
		var node = importSingleNode(srcNode, doc);
		if (node) docHead.appendChild(node);
	});

	docEl.appendChild(docBody);
	
	doc.appendChild(docEl);
	polyfill(doc);

	/*
	 * WARN on IE6 `element.innerHTML = ...` will drop all leading <script> and <style>
	 * Work-around this by prepending some benign element to the src <body>
	 * and removing it from the dest <body> after the copy is done
	 */

	// NOTE we can't just use srcBody.cloneNode(true) because html5shiv doesn't work
	var srcBody = srcDoc.body;
	srcBody.insertBefore(srcDoc.createElement('wbr'), srcBody.firstChild);

	var html = srcBody.innerHTML; // NOTE timing the innerHTML getter and setter showed that all the overhead is in the iframe
	docBody.innerHTML = html; // setting innerHTML in the pseudoDoc has minimal overhead.

	docBody.removeChild(docBody.firstChild); // TODO assert firstChild.tagName == 'wbr'

	return doc;
}

var importSingleNode = document.importNode ? // NOTE only for single nodes, especially elements in <head>. 
function(srcNode, context) {
	if (!context) context = document;
	if (context.nodeType !== 9 && context.nodeType !== 11) throw 'Non-document context for importSingleNode()';
	return context.importNode(srcNode, false);
} :
composeNode; 


var scrollToId = function(id) {
	if (id) {
		var el = $id(id);
		if (el) el.scrollIntoView(true);
	}
	else window.scroll(0, 0);
}

var addEvent = 
	document.addEventListener && function(node, event, fn) { return node.addEventListener(event, fn, false); } ||
	document.attachEvent && function(node, event, fn) { return node.attachEvent("on" + event, fn); } ||
	function(node, event, fn) { node["on" + event] = fn; }

var removeEvent = 
	document.removeEventListener && function(node, event, fn) { return node.removeEventListener(event, fn, false); } ||
	document.detachEvent && function(node, event, fn) { return node.detachEvent("on" + event, fn); } ||
	function(node, event, fn) { if (node["on" + event] == fn) node["on" + event] = null; }

var readyStateLookup = { // used in domReady() and checkStyleSheets()
	"uninitialized": false,
	"loading": false,
	"interactive": false,
	"loaded": true,
	"complete": true
}

var domReady = (function() { // WARN this assumes that document.readyState is valid or that content is ready...

var readyState = document.readyState;
var loaded = readyState ? readyStateLookup[readyState] : true;
var queue = [];

function domReady(fn) {
	if (typeof fn !== 'function') return;
	queue.push(fn);
	if (loaded) processQueue();
}

function processQueue() {
	_.forEach(queue, function(fn) { setTimeout(fn); });
	queue.length = 0;
}

var events = {
	"DOMContentLoaded": document,
	"load": window
};

if (!loaded) _.forOwn(events, function(node, type) { addEvent(node, type, onLoaded); });

return domReady;

// NOTE the following functions are hoisted
function onLoaded(e) {
	loaded = true;
	_.forOwn(events, function(node, type) { removeEvent(node, type, onLoaded); });
	processQueue();
}

})();


var overrideDefaultAction = function(e, fn) {
	// Shim the event to detect if external code has called preventDefault(), and to make sure we call it (but late as possible);
	e[vendorPrefix + '-event'] = true;
	var defaultPrevented = false;
	e._preventDefault = e.preventDefault;
	e.preventDefault = function(event) { defaultPrevented = true; this._preventDefault(); } // TODO maybe we can just use defaultPrevented?
	e._stopPropagation = e.stopPropagation;
	e.stopPropagation = function() { // WARNING this will fail to detect event.defaultPrevented if event.preventDefault() is called afterwards
		if (this.defaultPrevented) defaultPrevented = true; // FIXME is defaultPrevented supported on pushState enabled browsers? https://developer.mozilla.org/en-US/docs/Web/API/event.defaultPrevented
		this._preventDefault();
		this._stopPropagation();
	}
	if (e.stopImmediatePropagation) {
		e._stopImmediatePropagation = e.stopImmediatePropagation;
		e.stopImmediatePropagation = function() {
			if (this.defaultPrevented) defaultPrevented = true;
			this._preventDefault();
			this._stopImmediatePropagation();
		}
	}
	
	function backstop(event) {
		if (event.defaultPrevented)  defaultPrevented = true;
		event._preventDefault();
	}
	window.addEventListener(e.type, backstop, false);
	
	asap(function() {
		window.removeEventListener(e.type, backstop, false);
		if (defaultPrevented) return;
		fn(e);
	});
}

/* 
NOTE:  for more details on how checkStyleSheets() works cross-browser see 
http://aaronheckmann.blogspot.com/2010/01/writing-jquery-plugin-manager-part-1.html
TODO: does this still work when there are errors loading stylesheets??
*/
var checkStyleSheets = function() { // TODO would be nice if this didn't need to be polled
	// check that every <link rel="stylesheet" type="text/css" /> 
	// has loaded
	return _.every($$("link"), function(node) {
		if (!node.rel || !/^stylesheet$/i.test(node.rel)) return true;
		if (node.type && !/^text\/css$/i.test(node.type)) return true;
		if (node.disabled) return true;
		
		// handle IE
		if (node.readyState) return readyStateLookup[node.readyState];

		var sheet = node.sheet || node.styleSheet;

		// handle webkit
		if (!sheet) return false;

		try {
			// Firefox should throw if not loaded or cross-domain
			var rules = sheet.rules || sheet.cssRules;
			return true;
		} 
		catch (error) {
			// handle Firefox cross-domain
			switch(error.name) {
			case "NS_ERROR_DOM_SECURITY_ERR": case "SecurityError":
				return true;
			case "NS_ERROR_DOM_INVALID_ACCESS_ERR": case "InvalidAccessError":
				return false;
			default:
				return true;
			}
		} 
	});
}

var polyfill = function(doc) { // NOTE more stuff could be added here if *necessary*
	if (!doc) doc = document;
	if (!doc.head) doc.head = firstChild(doc.documentElement, "head");
}


var DOM = Meeko.DOM || (Meeko.DOM = {});
_.defaults(DOM, {
	getTagName: getTagName, hasAttribute: hasAttribute, matchesElement: matchesElement, // properties
	$id: $id, $: $, $$: $$, siblings: siblings, firstChild: firstChild, // selections
	copyAttributes: copyAttributes, removeAttributes: removeAttributes, textContent: textContent, scriptText: scriptText, // attrs
	composeNode: composeNode, importSingleNode: importSingleNode, insertNode: insertNode, // nodes
	ready: domReady, addEvent: addEvent, removeEvent: removeEvent, overrideDefaultAction: overrideDefaultAction, // events
	createDocument: createDocument, createHTMLDocument: createHTMLDocument, cloneDocument: cloneDocument, // documents
	scrollToId: scrollToId,
	polyfill: polyfill
});

/* loadHTML & parseHTML are AJAX utilities */
var loadHTML = function(url) { // WARN only performs GET
	var htmlLoader = new HTMLLoader();
	var method = 'get';
	return htmlLoader.load(method, url, null, { method: method, url: url });
}

var parseHTML = function(html, details) {
	var parser = new HTMLParser();
	return parser.parse(html, details);
}

/* A few feature-detect constants for HTML loading & parsing */

/*
	HTML_IN_XHR indicates if XMLHttpRequest supports HTML parsing
*/
var HTML_IN_XHR = (function() { // FIXME more testing, especially Webkit
	if (!window.XMLHttpRequest) return false;
	var xhr = new XMLHttpRequest;
	if (!('responseType' in xhr)) return false;
	if (!('response' in xhr)) return false;
	xhr.open('get', document.URL, true);

	try { xhr.responseType = 'document'; } // not sure if any browser throws for this, but they should
	catch (err) { return false; }

	try { if (xhr.responseText == '') return false; } // Opera-12. Other browsers will throw
	catch(err) { }

	try { if (xhr.status) return false; } // this should be 0 but throws on Chrome and Safari-5.1
	catch(err) { // Chrome and Safari-5.1
		xhr.abort(); 
		try { xhr.responseType = 'document'; } // throws on Safari-5.1 which doesn't support HTML requests 
		catch(err2) { return false; }
	}

	return true;
})();

/*
	HTML_IN_DOMPARSER indicates if DOMParser supports 'text/html' parsing. Historically only Firefox did.
	Cross-browser support coming? https://developer.mozilla.org/en-US/docs/Web/API/DOMParser#Browser_compatibility
*/
var HTML_IN_DOMPARSER = (function() {

	try {
		var doc = (new DOMParser).parseFromString('', 'text/html');
		return !!doc;
	}
	catch(err) { return false; }

})();

/*
	STAGING_DOCUMENT_IS_INERT indicates whether resource URLs - like img@src -
	need to be neutralized so they don't start downloading until after transforms have been applied. 
	The transforms  might discard them in which case downloading is a waste. 
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
	if (img.complete) img.src = 'data:'; // Opera-12
	if (img.complete) return false; // paranoia
	img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=';
	if (img.width) return false; // IE9, Opera-12 will have width == 1 / height == 1 
	if (img.complete) return false; // Opera-12 sets this immediately. IE9 sets it after a delay.
	// Sometimes the img check isn't ready on IE9, so one more check
	var script = doc.createElement('script');
	scriptText(script, ';');
	doc.head.appendChild(script);
	if (script.readyState === 'complete') return false; // IE9
	return true; // Presumably IE10

})();

/*
	IE9 swallows <source> elements that aren't inside <video> or <audio>
	See http://www.w3.org/community/respimg/2012/03/06/js-implementation-problem-with/
	Safari-4 also has this issue
*/
var IE9_SOURCE_ELEMENT_BUG = (function() { 
	var frag = document.createDocumentFragment();
	var doc = frag.createElement ? frag : document;
	doc.createElement('source'); // See html5shiv
	var div = doc.createElement('div');
	frag.appendChild(div);
	div.innerHTML = '<div><source /><div>';
	return 'source' !== getTagName(div.firstChild.firstChild);
})();



_.defaults(DOM, {
	loadHTML: loadHTML, parseHTML: parseHTML,
	HTML_IN_XHR: HTML_IN_XHR, HTML_IN_DOMPARSER: HTML_IN_DOMPARSER,
	STAGING_DOCUMENT_IS_INERT: STAGING_DOCUMENT_IS_INERT, IE9_SOURCE_ELEMENT_BUG: IE9_SOURCE_ELEMENT_BUG
});


var URL = Meeko.URL = (function() {

// TODO is this URL class compatible with the proposed DOM4 URL class??

var URL = function(str) {
	if (!(this instanceof URL)) return new URL(str);
	this.parse(str);
}

var keys = ["source","protocol","hostname","port","pathname","search","hash"];
var parser = /^([^:\/?#]+:)?(?:\/\/([^:\/?#]*)(?::(\d*))?)?([^?#]*)?(\?[^#]*)?(#.*)?$/;

URL.prototype.parse = function parse(str) {
	str = _.trim(str);
	var	m = parser.exec(str);

	for (var n=keys.length, i=0; i<n; i++) this[keys[i]] = m[i] || '';
	this.protocol = _.lc(this.protocol);
	this.supportsResolve = /^(http|https|ftp|file):$/i.test(this.protocol);
	if (!this.supportsResolve) return;
	this.hostname = _.lc(this.hostname);
	this.host = this.hostname;
	if (this.port) this.host += ':' + this.port;
	this.origin = this.protocol + '//' + this.host;
	if (this.pathname == '') this.pathname = '/';
	var pathParts = this.pathname.split('/'); // creates an array of at least 2 strings with the first string empty: ['', ...]
	pathParts.shift(); // leaves an array of at least 1 string [...]
	this.filename = pathParts.pop(); // filename could be ''
	this.basepath = pathParts.length ? '/' + pathParts.join('/') + '/' : '/'; // either '/rel-path-prepended-by-slash/' or '/'
	this.base = this.origin + this.basepath;
	this.nosearch = this.origin + this.pathname;
	this.nohash = this.nosearch + this.search;
	this.href = this.nohash + this.hash;
	this.toString = function() { return this.href; }
};

URL.prototype.resolve = function resolve(relURL) {
	relURL = _.trim(relURL);
	if (!this.supportsResolve) return relURL;
	var substr1 = relURL.charAt(0), substr2 = relURL.substr(0,2);
	var absURL =
		/^[a-zA-Z0-9-]+:/.test(relURL) ? relURL :
		substr2 == '//' ? this.protocol + relURL :
		substr1 == '/' ? this.origin + relURL :
		substr1 == '?' ? this.nosearch + relURL :
		substr1 == '#' ? this.nohash + relURL :
		substr1 != '.' ? this.base + relURL :
		substr2 == './' ? this.base + relURL.replace('./', '') :
		(function() {
			var myRel = relURL;
			var myDir = this.basepath;
			while (myRel.substr(0,3) == '../') {
				myRel = myRel.replace('../', '');
				myDir = myDir.replace(/[^\/]+\/$/, '');
			}
			return this.origin + myDir + myRel;
		}).call(this);
	return absURL;
}


return URL;

})();

var neutralProtocol = vendorPrefix + '-href:';
var neutralProtocolLen = neutralProtocol.length;
function neutralizeURL(url) {
	return neutralProtocol + url;
}
function deneutralizeURL(url) {
	var confirmed = url.indexOf(neutralProtocol) === 0;
	if (confirmed) return url.substr(neutralProtocolLen);
	return url;
}

_.defaults(URL, {
	neutralProtocol: neutralProtocol,
	neutralize: neutralizeURL,
	deneutralize: deneutralizeURL
});


var HTMLLoader = Meeko.HTMLLoader = (function() {

var HTMLLoader = function(options) {
	if (!(this instanceof HTMLLoader)) return new HTMLLoader(options);
	if (!options) return;
	var htmlLoader = this;
	_.forOwn(options, function(val, key) {
		if (key === 'load') return;
		if (!(key in htmlLoader)) return;
		htmlLoader[key] = val;
	});
}

_.defaults(HTMLLoader.prototype, {

load: function(method, url, data, extras) {
	var htmlLoader = this;
	var details = {};
	if (typeof extras === 'object') _.defaults(details, extras);

	if (!details) details = {};
	if (!details.method) details.method = method;	
	if (!details.url) details.url = url;
	
	return htmlLoader.request(method, url, data, details);
},

serialize: function(data, details) { return ""; },  // WARN unused / untested

request: function(method, url, data, details) {
	var sendText = null;
	method = _.lc(method);
	if ('post' == method) {
		throw "POST not supported"; // FIXME proper error handling
		sendText = this.serialize(data, details);
	}
	else if ('get' == method) {
		// no-op
	}
	else {
		throw _.uc(method) + ' not supported';
	}
	return doRequest(method, url, sendText, details);
}

});

var doRequest = function(method, url, sendText, details) {
return new Promise(function(resolve, reject) {
	var xhr = new XMLHttpRequest;
	xhr.onreadystatechange = onchange;
	xhr.open(method, url, true);
	if (HTML_IN_XHR) xhr.responseType = 'document';
	xhr.send(sendText);
	function onchange() {
		if (xhr.readyState != 4) return;
		if (xhr.status != 200) { // FIXME what about other status codes?
			reject(xhr.status); // FIXME what should status be??
			return;
		}
		asap(onload); // Use delay to stop the readystatechange event interrupting other event handlers (on IE). 
	}
	function onload() {
		var doc;
		if (HTML_IN_XHR) {
			var doc = xhr.response;
			normalize(doc, details);
			resolve(doc);
		}
		else {
			var parserFu = parseHTML(new String(xhr.responseText), details);
			resolve(parserFu);
		}
	}
});
}

return HTMLLoader;

})();


var urlAttributes = URL.attributes = (function() {
	
var AttributeDescriptor = function(tagName, attrName, loads, compound) {
	var testEl = document.createElement(tagName);
	var supported = attrName in testEl;
	var lcAttr = _.lc(attrName); // NOTE for longDesc, etc
	var neutralize = // 0 is no, -1 is yes, 1 is yes and stay-neutral
		!supported ? 0 :
		!loads ? 0 :
		STAGING_DOCUMENT_IS_INERT ? -1 :
		1;
	_.defaults(this, { // attrDesc
		tagName: tagName,
		attrName: attrName,
		loads: loads,
		compound: compound,
		supported: supported,
		neutralize: neutralize
	});
}

_.defaults(AttributeDescriptor.prototype, {

resolve: function(el, baseURL, neutralized, stayNeutral) {
	var attrName = this.attrName;
	var url = el.getAttribute(attrName);
	if (url == null) return;
	var finalURL = this.resolveURL(url, baseURL, neutralized, stayNeutral)
	if (finalURL !== url) el.setAttribute(attrName, finalURL);
},

resolveURL: function(url, baseURL, neutralized, stayNeutral) {
	var relURL = _.trim(url);
	if (neutralized) {
		relURL = deneutralizeURL(url);
		if (relURL === url) logger.warn('Expected neutralized attribute: ' + this.tagName + '@' + this.attrName);
	}
	var finalURL = relURL;
	switch (relURL.charAt(0)) {
		case '': // empty, but not null. TODO should this be a warning??
			break;
		
		default:
			finalURL = baseURL.resolve(relURL);
			break;
	}
	if (stayNeutral) finalURL = neutralizeURL(finalURL);
	return finalURL;
}

});

var urlAttributes = {};
_.forEach(_.words("link@<href script@<src img@<longDesc,<src,+srcset iframe@<longDesc,<src object@<data embed@<src video@<poster,<src audio@<src source@<src,+srcset input@formAction,<src button@formAction,<src a@+ping,href area@href q@cite blockquote@cite ins@cite del@cite form@action"), function(text) {
	var m = text.split("@"), tagName = m[0], attrs = m[1];
	var attrList = urlAttributes[tagName] = {};
	_.forEach(attrs.split(','), function(attrName) {
		var downloads = false;
		var compound = false;
		var modifier = attrName.charAt(0);
		switch (modifier) {
		case '<':
			downloads = true;
			attrName = attrName.substr(1);
			break;
		case '+':
			compound = true;
			attrName = attrName.substr(1);
			break;
		}
		attrList[attrName] = new AttributeDescriptor(tagName, attrName, downloads, compound);
	});
});

function resolveSrcset(urlSet, baseURL) { // img@srcset will never be neutralized
	var urlList = urlSet.split(/\s*,\s*/); // WARN this assumes URLs don't contain ','
	_.forEach(urlList, function(urlDesc, i) {
		urlList[i] = urlDesc.replace(/^\s*(\S+)(?=\s|$)/, function(all, url) { return baseURL.resolve(url); });
	});
	return urlList.join(', ');
}

urlAttributes['img']['srcset'].resolveURL = resolveSrcset;
urlAttributes['source']['srcset'].resolveURL = resolveSrcset;

urlAttributes['a']['ping'].resolveURL = function(urlSet, baseURL) { // a@ping will never be neutralized
	var urlList = urlSet.split(/\s+/);
	_.forEach(urlList, function(url, i) {
		urlList[i] = baseURL.resolve(url);
	});
	return urlList.join(' ');
}

return urlAttributes;

})();

/*
	resolveAll() resolves all URL attributes and conditionally deneutralizes URL attributes.
*/
var resolveAll = function(doc, baseURL, isNeutralized) {

	_.forOwn(urlAttributes, function(attrList, tag) {
		var elts;
		_.forOwn(attrList, function(attrDesc, attrName) {
			var neutralized = isNeutralized && !!attrDesc.neutralize;
			var stayNeutral = !STAGING_DOCUMENT_IS_INERT && attrDesc.neutralize > 0;

			if (!elts) elts = $$(tag, doc);
			_.forEach(elts, function(el) {
				attrDesc.resolve(el, baseURL, neutralized, stayNeutral);
			});
		});
	});
	
	return !STAGING_DOCUMENT_IS_INERT;
}

if (IE9_SOURCE_ELEMENT_BUG) {

var _resolveAll = resolveAll;
resolveAll = function(doc) {
	
	_.forEach($$('img[meeko-tag]', doc), function(el) {
		var realTag = el.getAttribute('meeko-tag');
		el.removeAttribute('meeko-tag');
		var realEl = doc.createElement(realTag);
		copyAttributes(realEl, el);
		el.parentNode.replaceChild(realEl, el);
	});
	
	return _resolveAll.apply(null, arguments);
}

} // end if IE9_SOURCE_ELEMENT_BUG


var deneutralizeAll = function(doc) {

	_.forOwn(urlAttributes, function(attrList, tag) {
		var elts;

		_.forOwn(attrList, function(attrDesc, attrName) {
			var neutralized = attrDesc.neutralize > 0;

			if (!neutralized) return;

			if (!elts) elts = $$(tag, doc);
			_.forEach(elts, function(el) {
				var url = el.getAttribute(attrName);
				if (url == null) return;
				var finalURL = deneutralizeURL(url, tag, attrName);
				if (finalURL !== url) el.setAttribute(attrName, finalURL);
			});
		});
	});
}

/*
	normalize() is called between html-parsing (internal) and document normalising (external function).
	It is called after using the native parser:
	- with DOMParser#parseFromString(), see HTMLParser#nativeParser()
	- with XMLHttpRequest & xhr.responseType='document', see HTMLLoader#request()
	The iframe parser implements similar functionality
*/
function normalize(doc, details) { 
	polyfill(doc);

	_.forEach($$('script', doc), function(node) {
		if (!node.type || /^text\/javascript$/i.test(node.type)) node.type = "text/javascript?disabled";
	});

	_.forEach($$("style", doc.body), function(node) { // TODO support <style scoped>
		doc.head.appendChild(node);
	});

	var baseURL = URL(details.url);
	resolveAll(doc, baseURL, false);

	return doc;	
}


var HTMLParser = Meeko.HTMLParser = (function() {
// This class allows external code to provide a `prepare(doc)` method for before content parsing.
// The main reason to do this is the so called `html5shiv`. 

var HTMLParser = function() { // TODO should this receive options like HTMLLoader??
	if (this instanceof HTMLParser) return;
	return new HTMLParser();
}

function nativeParser(html, details) {

	return pipe(null, [
		
	function() {
		var doc = (new DOMParser).parseFromString(html, 'text/html');
		normalize(doc, details);
		return doc;		
	}
	
	]);

}

function iframeParser(html, details) {
	var parser = this;
	
	var iframe = document.createElement("iframe");
	iframe.name = "meeko-parser";
	var iframeHTML = '';

	function prepare(doc) { 
		if (parser.prepare) parser.prepare(doc); // FIXME need a guard on this external call
		if (details.prepare) details.prepare(doc);
		return doc;
	}
	
	return pipe(null, [
	
	function() {
		html = preparse(html);

		var bodyIndex = html.search(/<body(?=\s|>)/); // FIXME assumes "<body" not in a script or style comment somewhere 
		bodyIndex = html.indexOf('>', bodyIndex) + 1;
		iframeHTML = html.substr(0, bodyIndex);
		html = html.substr(bodyIndex);

		var head = document.head;
		head.insertBefore(iframe, head.firstChild);
		var iframeDoc = iframe.contentWindow.document;
		iframeDoc.open('text/html', 'replace');
		return iframeDoc;
	},
	
	function(iframeDoc) {
		return prepare(iframeDoc);
	},		

	function(iframeDoc) {
		return new Promise(function(resolve, reject) {
			// NOTE need to wait for iframeWin.onload on Android 2.3, others??
			var iframeWin = iframe.contentWindow, complete = false;
			iframeWin.onload = iframeDoc.onreadystatechange = function() { // WARN sometimes `onload` doesn't fire on IE6
				if (complete) return;
				var readyState = iframeDoc.readyState;
				if (readyState && readyState !== 'complete') return;
				complete = true;
				resolve(iframeDoc);
			}

			iframeDoc.write(iframeHTML);
			iframeDoc.close();
		});
	},
	
	function(iframeDoc) {

		polyfill(iframeDoc);
		if (iframeDoc.namespaces) { // IE8, IE9
			_.forEach(iframeDoc.namespaces, function(ns) {
				iframeDoc.documentElement.setAttribute('xmlns:' + ns.name, ns.urn);
			});
		}

		var baseURL = URL(details.url);
		
		// TODO not really sure how to handle <base href="..."> already in doc.
		// For now just honor them if present
		// TODO also not sure how to handle <base target="...">, etc
		var baseHref;
		_.forEach ($$("base", iframeDoc.head), function(node) {
			var href = node.getAttribute("href");
			if (!href) return;
			baseHref = href;
			node.removeAttribute('href');
		});
		if (baseHref) baseURL = URL(baseURL.resolve(baseHref));

		var doc = cloneDocument(iframeDoc, { prepare: prepare });

		document.head.removeChild(iframe);

		doc.body.innerHTML = '<wbr />' + html; // one simple trick to get IE <= 8 to behave
		doc.body.removeChild(doc.body.firstChild);

		_.forEach($$("style", doc.body), function(node) { // TODO support <style scoped>
			doc.head.appendChild(node);
		});

		details.isNeutralized = resolveAll(doc, baseURL, true);
		return doc;
	}

	]);	
	
}

var preparse = (function() {

var urlTags = [];

_.forOwn(urlAttributes, function(attrList, tagName) {
	var neutralized = false;
	_.forOwn(attrList, function(attrDesc, attrName) {
		if (attrDesc.neutralize) neutralized = true;
		_.defaults(attrDesc, {
			regex: new RegExp('(\\s)(' + attrName + ')\\s*=\\s*([\'"])?\\s*(?=\\S)', 'ig') // captures preSpace, attrName, quote. discards other space
		});
	});
	if (neutralized) urlTags.push(tagName);
});

var preparseRegex = new RegExp('(<)(' + urlTags.join('|') + '|\\/script|style|\\/style)(?=\\s|\\/?>)([^>]+)?(>)', 'ig');

function preparse(html) { // neutralize URL attrs @src, @href, etc

	var mode = 'html';
	html = html.replace(preparseRegex, function(tagString, lt, tag, attrsString, gt) {
		var tagName = _.lc(tag);
		if (!attrsString) attrsString = '';
		if (tagName === '/script') {
			if (mode === 'script') mode = 'html';
			return tagString;
		}
		if (tagName === '/style') {
			if (mode === 'style') mode = 'html';
			return tagString;
		}
		if (mode === 'script' || mode === 'style') {
			return tagString;
		}
		if (tagName === 'style') {
			mode = 'style';
			return tagString;
		}
		if (IE9_SOURCE_ELEMENT_BUG && tagName === 'source') {
			tag = 'img meeko-tag="source"';
		}
		_.forOwn(urlAttributes[tagName], function(attrDesc, attrName) {
			if (attrDesc.neutralize) attrsString = attrsString.replace(attrDesc.regex, function(all, preSpace, attrName, quote) {
				return preSpace + attrName + '=' + (quote || '') + neutralProtocol;
			});
		});
		if (tagName === 'script') {
			mode = 'script';
			attrsString = disableScript(attrsString);
		}
		return lt + tag + attrsString + gt;
	});

	return new String(html);
	
	function disableScript(attrsString) {
		var hasType = false;
		var attrs = attrsString.replace(/(\stype=)['"]?([^\s'"]*)['"]?(?=\s|$)/i, function(m, $1, $2) {
			hasType = true;
			var isJS = ($2 === '' || /^text\/javascript$/i.test($2));
			return isJS ? $1 + '"text/javascript?disabled"' : m;
		}); 
		return hasType ? attrs : attrsString + ' type="text/javascript?disabled"';
	}

}

return preparse;

})();


_.defaults(HTMLParser.prototype, {
	parse: HTML_IN_DOMPARSER ? nativeParser : iframeParser
});

return HTMLParser;

})();


var scriptQueue = new function() {

/*
 WARN: This description comment was from the former scriptQueue implementation.
 It is still a correct description of behavior,
 but doesn't give a great insight into the current Promises-based implementation.
 
 We want <script>s to execute in document order (unless @async present)
 but also want <script src>s to download in parallel.
 The script queue inserts scripts until it is paused on a blocking script.
 The onload (or equivalent) or onerror handlers of the blocking script restart the queue.
 Inline <script> and <script src="..." async> are never blocking.
 Sync <script src> are blocking, but if `script.async=false` is supported by the browser
 then only the last <script src> (in a series of sync scripts) needs to pause the queue. See
	http://wiki.whatwg.org/wiki/Dynamic_Script_Execution_Order#My_Solution
 Script preloading is always initiated, even if the browser doesn't support it. See
	http://wiki.whatwg.org/wiki/Dynamic_Script_Execution_Order#readyState_.22preloading.22
	
 FIXME scriptQueue.push should also accept functions
*/
var queue = [],
	emptying = false;

var testScript = document.createElement('script'),
	supportsOnLoad = (testScript.setAttribute('onload', ';'), typeof testScript.onload === 'function'),
	supportsSync = (testScript.async === true);

this.push = function(node) {
	if (emptying) throw 'Attempt to append script to scriptQueue while emptying';
	
	// TODO assert node is in document

	var completeRe, completeFu = new Promise(function(resolve, reject) { completeRe = { resolve: resolve, reject: reject }; });	

	if (!/^text\/javascript\?disabled$/i.test(node.type)) {
		completeRe.resolve();
		logger.info("Unsupported script-type " + node.type);
		return completeFu;
	}

	var script = document.createElement("script");

	// preloadedFu is needed for IE <= 8
	// On other browsers (and for inline scripts) it is pre-accepted
	var preloadedRe, preloadedFu = new Promise(function(resolve, reject) { preloadedRe = { resolve: resolve, reject: reject }; }); 
	if (!node.src || supportsOnLoad) preloadedRe.resolve(); // WARN must use `node.src` because attrs not copied to `script` yet
	if (node.src) addListeners(); // WARN must use `node.src` because attrs not copied to `script` yet
	
	copyAttributes(script, node); 

	scriptText(script, scriptText(node));

	if (script.getAttribute('defer')) { // @defer is not appropriate. Implement as @async
		script.removeAttribute('defer');
		script.setAttribute('async', '');
		logger.warn('@defer not supported on scripts');
	}
	if (supportsSync && script.src && !hasAttribute(script, 'async')) script.async = false;
	script.type = "text/javascript";
	
	// enabledFu resolves after script is inserted
	var enabledRe, enabledFu = new Promise(function(resolve, reject) { enabledRe = { resolve: resolve, reject: reject }; }); 
	
	var prev = queue[queue.length - 1], prevScript = prev && prev.script;

	var triggerFu; // triggerFu allows this script to be enabled, i.e. inserted
	if (prev) {
		if (hasAttribute(prevScript, 'async') || supportsSync && !hasAttribute(script, 'async')) triggerFu = prev.enabled;
		else triggerFu = prev.complete; 
	}
	else triggerFu = Promise.resolve();
	
	triggerFu.then(enable, enable);

	var current = { script: script, complete: completeFu, enabled: enabledFu };
	queue.push(current);
	return completeFu;

	// The following are hoisted
	function enable() {
		preloadedFu.then(_enable, function(err) { logger.error('Script preloading failed'); });
	}
	function _enable() {
		insertNode('replace', node, script);
		enabledRe.resolve(); 
		if (!script.src) {
			spliceItem(queue, current);
			completeRe.resolve();
		}
	}
	
	function onLoad(e) {
		removeListeners();
		spliceItem(queue, current);
		completeRe.resolve();
	}

	function onError(e) {
		removeListeners();
		spliceItem(queue, current);
		completeRe.reject('NetworkError'); // FIXME throw DOMError()
	}

	function addListeners() {
		if (supportsOnLoad) {
			addEvent(script, "load", onLoad);
			addEvent(script, "error", onError);
		}
		else addEvent(script, 'readystatechange', onChange);
	}
	
	function removeListeners() {
		if (supportsOnLoad) {
			removeEvent(script, "load", onLoad);
			removeEvent(script, "error", onError);
		}
		else removeEvent(script, 'readystatechange', onChange);
	}
	
	function onChange(e) { // for IE <= 8 which don't support script.onload
		var readyState = script.readyState;
		if (!script.parentNode) {
			if (readyState === 'loaded') preloadedRe.resolve(); 
			return;
		}
		switch (readyState) {
		case "complete":
			onLoad(e);
			break;
		case "loading":
			onError(e);
			break;
		default: break;
		}	
	}

	function spliceItem(a, item) {
		for (var n=a.length, i=0; i<n; i++) {
			if (a[i] !== item) continue;
			a.splice(i, 1);
			return;
		}
	}

}

this.empty = function() {
return new Promise(function(resolve, reject) {
	
	emptying = true;
	if (queue.length <= 0) {
		emptying = false;
		resolve();
		return;
	}
	_.forEach(queue, function(value, i) {
		var acceptCallback = function() {
			if (queue.length <= 0) {
				emptying = false;
				resolve();
			}
		}
		value.complete.then(acceptCallback, acceptCallback);
	});

});
}

} // end scriptQueue


// wrapper for `history` mostly to provide locking around state-updates and throttling of popstate events
var historyManager = (function() {

var historyManager = {};

var stateTag = "HyperFrameset";
var currentState;
var popStateHandler;
var started = false;

_.defaults(historyManager, {

getState: function() {
	return currentState;
},

start: function(data, title, url, onNewState, onPopState) { // FIXME this should call onPopState if history.state is defined
return scheduler.now(function() {
	if (started) throw 'historyManager has already started';
	started = true;
	popStateHandler = onPopState;
	var newState = State.create(data, title, url);
	if (history.replaceState) {
		history.replaceState(newState.settings, title, url);
	}
	currentState = newState;
	return onNewState(newState);
});
},

newState: function(data, title, url, useReplace, callback) {
return scheduler.now(function() {
	var newState = State.create(data, title, url);
	if (history.replaceState) {
		if (useReplace) history.replaceState(newState.settings, title, url);
		else history.pushState(newState.settings, title, url);
	}
	currentState = newState;
	if (callback) return callback(newState);
});
},

replaceState: function(data, title, url, callback) {
	return this.newState(data, title, url, true, callback);
},

pushState: function(data, title, url, callback) {
	return this.newState(data, title, url, false, callback);
}

});

window.addEventListener('popstate', function(e) {
		if (e.stopImmediatePropagation) e.stopImmediatePropagation();
		else e.stopPropagation();
		
		var newSettings = e.state;
		if (!newSettings[stateTag]) {
			logger.warn('Ignoring invalid PopStateEvent');
			return;
		}
		scheduler.reset(function() {
			currentState = new State(newSettings);
			if (!popStateHandler) return;
			return popStateHandler(currentState);
		});
	}, true);

function State(settings) {
	if (!settings[stateTag]) throw 'Invalid settings for new State';
	this.settings = settings;
}

State.create = function(data, title, url) {
	var timeStamp = +(new Date);
	var settings = {
		title: title,
		url: url,
		timeStamp: timeStamp,
		data: data
	};
	settings[stateTag] = true;
	return new State(settings);
}

_.defaults(State.prototype, {

getData: function() {
	return this.settings.data;
},

update: function(data, callback) {
	var state = this;
	return Promise.resolve(function() {
		if (state !== currentState) throw 'Cannot update state: not current';
		return scheduler.now(function() {
			if (history.replaceState) history.replaceState(state.settings, title, url);
			return callback(state);
		});
	});
}

});

function createState(data, title, url) {
	var timeStamp = +(new Date);
	var state = {
		title: title,
		url: url,
		timeStamp: timeStamp,
		data: data
	};
	state[stateTag] = true;
	return state;
}

return historyManager;

})();


var scheduler = (function() { // NOTE only used in historyManager

var queue = [];
var maxSize = 1;
var processing = false;

function bump() {
	if (processing) return;
	processing = true;
	process();
}

function process() {
	if (queue.length <= 0) {
		processing = false;
		return;
	}
	var task = queue.shift();
	var promise = asap(task.fn);
	promise.then(process, process);
	promise.then(task.resolve, task.reject);
}

var scheduler = {
	
now: function(fn, fail) {
	return this.whenever(fn, fail, 0);
},

reset: function(fn) {
	queue.length = 0;
	return this.whenever(fn, null, 1);
},

whenever: function(fn, fail, max) {
return new Promise(function(resolve, reject) {

	if (max == null) max = maxSize;
	if (queue.length > max || (queue.length === max && processing)) {
		if (fail) asap(fail).then(resolve, reject);
		else reject();
		return;
	}
	queue.push({ fn: fn, resolve: resolve, reject: reject });

	bump();
});
}

}

return scheduler;

})();


/* BEGIN HFrameset code */

polyfill();


var framer = Meeko.framer = (function(classNamespace) {

var CustomDOM = (function() {

function CustomDOM(options) {
	var style = options.namespaceStyle = _.lc(options.namespaceStyle);
	if (!CustomDOM.separator[style]) throw 'Unexpected namespaceStyle: ' + style;
	var ns = options.namespace = _.lc(options.namespace);
	if (!ns) throw 'Unexpected namespace: ' + ns;
	this.init(options);
}

CustomDOM.separator = {
	'vendor': '-',
	'xml': ':'
};

CustomDOM.getNamespaces = function(doc) { // NOTE modelled on IE8, IE9 document.namespaces interface
	var namespaces = [];
	var xmlnsPrefix = 'xmlns:';
	var xmlnsLength = xmlnsPrefix.length;
	_.forEach(_.toArray(doc.documentElement.attributes), function(attr) {
		var fullName = _.lc(attr.name);
		if (fullName.indexOf(xmlnsPrefix) !== 0) return;
		var name = fullName.substr(xmlnsLength);
		namespaces.push({
			name: name,
			urn: attr.value
		});
	});
	return namespaces;
}

_.defaults(CustomDOM.prototype, {
	
init: function(options) {
	var cdom = this;
	if (options) _.assign(cdom, options);
	var separator = CustomDOM.separator[cdom.namespaceStyle];
	cdom.prefix = cdom.namespace + separator;
	cdom.selectorPrefix = cdom.namespace + (separator === ':' ? '\\:' : separator);
},

attr: function(el, attrName, value) {
	if (typeof value === 'undefined') return el.getAttribute(attrName);
	el.setAttribute(attrName, value);
},

match$: function(el, selector) {
	var cdom = this;
	var tag = getTagName(el);
	if (!tag) return false;
	selector = _.lc(selector);
	var fullSelector = cdom.prefix + selector;
	if (tag === fullSelector) return true; // modern browsers
	if (cdom.namespaceStyle !== 'xml') return false;
	var scopeName = el.scopeName; // IE8 xml
	if (!scopeName) return false;
	scopeName = _.lc(scopeName);
	if (scopeName === cdom.namespace) return true;
	return false;
},

$$: function(selector, context) {
	var cdom = this;
	selector = cdom.selectorPrefix + selector;
	return DOM.$$(selector, context);
}

});

return CustomDOM;

})();

var hfTags = _.words('frame body transform');
var hfDefaults = {
	namespace: 'hf',
	namespaceStyle: 'vendor'
}

var hfVendorStyleTags = _.map(hfTags, function(tag) { return hfDefaults.namespace + '-' + tag; }); // only for vendor-style elements
var hfXmlStyleTags = _.map(hfTags, function(tag) { return hfDefaults.namespace + ':' + tag; }); // only for xml-style elements
var hfHeadTags = _.words('title meta link style script');

function hfParserPrepare(doc) {
	_.forEach(hfVendorStyleTags, function(tag) { doc.createElement(_.uc(tag)); });
	_.forEach(hfXmlStyleTags, function(tag) { doc.createElement(_.uc(tag)); });
}

var HFrameDefinition = (function() {

function HFrameDefinition(el, frameset) {
	if (!el) return; // in case of inheritance
	this.frameset = frameset;
	this.init(el);
}

_.defaults(HFrameDefinition, {

/*
 Paging handlers are either a function, or an object with `before` and / or `after` listeners. 
 This means that before and after listeners are registered as a pair, which is desirable.
*/
options: { 
	duration: 0,
	load: function(method, url, data, details) {
		var frameOptions = this;
		var loader = new HTMLLoader(frameOptions);
		return loader.load(method, url, data, details);
	}

	/* The following options are also available *
	entering: { before: hide, after: show },
	leaving: { before: hide, after: show }
	/**/
}

});

_.defaults(HFrameDefinition.prototype, {

config: function(options) {
	var frameDef = this;
	_.assign(frameDef.options, options);
},

init: function(el) {
    var frameDef = this;
	var frameset = frameDef.frameset;
	var cdom = frameset.cdom;
	_.defaults(frameDef, {
		options: _.defaults({}, HFrameDefinition.options),
		element: el,
		id: el.id,
		type: cdom.attr(el, 'type'),
		mainSelector: cdom.attr(el, 'main') // TODO consider using a hash in `@src`
    });
	var bodies = frameDef.bodies = [];
	_.forEach(_.toArray(el.childNodes), function(node) {
		var tag = getTagName(node);
		if (!tag) return;
		if (_.contains(hfHeadTags, tag)) return; // ignore typical <head> elements
		if (cdom.match$(node, 'body')) {
			bodies.push(new HBodyDefinition(node, frameset));
			return;
		}
		logger.warn('Unexpected element in HFrame: ' + tag);
		return;
	});
},

render: function(doc, conditions) {
	var frameDef = this;
	var frameset = frameDef.frameset;
	var cdom = frameset.cdom;
	var bodyDef = frameDef.bodies[0]; // FIXME use .condition
	var options = {
		mainSelector: frameDef.mainSelector,
		type: frameDef.type
	}
	return bodyDef.render(doc, options);
}
	
});

return HFrameDefinition;
})();


var HFrameDeclaration = (function() {

function HFrameDeclaration(el, frameset) {
	this.frameset = frameset;
	this.init(el);
}

_.defaults(HFrameDeclaration.prototype, {

init: function(el) {
    var frame = this;
	var frameset = frame.frameset;
	var cdom = frameset.cdom;
	_.defaults(frame, {
		element: el,
		name: cdom.attr(el, 'name'),
		src: cdom.attr(el, 'src'),
		mainSelector: cdom.attr(el, 'main') // TODO consider using a hash in `@src`
    });
	var defId = cdom.attr(el, 'def');
	frame.definition = frameset.frames[defId];
}
	
});

return HFrameDeclaration;
})();


var HBodyDefinition = (function() {
	
function HBodyDefinition(el, frameset) {
	if (!el) return; // in case of inheritance
	this.frameset = frameset;
	this.init(el);
}

_.defaults(HBodyDefinition.prototype, {

init: function(el) {
	var bodyDef = this;
	var frameset = bodyDef.frameset;
	var cdom = frameset.cdom;
	_.defaults(bodyDef, {
		element: el,
		condition: cdom.attr(el, 'condition') || 'success',
		transforms: []
	});
	_.forEach(_.toArray(el.childNodes), function(node) {
		var tagName = getTagName(node);
		if (!tagName) return;
		if (!cdom.match$(node, 'transform')) {
			logger.warn('Unexpected element in HBody: ' + tagName);
			return;
		}
		bodyDef.transforms.push(new HTransformDefinition(node, frameset));
	});
},

render: function(doc, options) {
	var bodyDef = this;
	var frameset = bodyDef.frameset;
	var cdom = frameset.cdom;
	var fragment = doc;
	if (options.mainSelector) fragment = $(options.mainSelector, doc);
	_.forEach(bodyDef.transforms, function(transform) {
		fragment = transform.process(fragment);
	});
	var el = bodyDef.element.cloneNode(false);
	var result = new HBodyResult(el, frameset);
	result.compose(fragment);
	return result;
}

});

return HBodyDefinition;
})();


var HTransformDefinition = (function() {
	
function HTransformDefinition(el, frameset) {
	if (!el) return; // in case of inheritance
	this.frameset = frameset;
	this.init(el);
}

_.defaults(HTransformDefinition.prototype, {

init: function(el) {
	var transform = this;
	var frameset = transform.frameset;
	var cdom = frameset.cdom;
	_.defaults(transform, {
		element: el,
		type: cdom.attr(el, 'type') || 'main',
		format: cdom.attr(el, 'format')
    });
	if (transform.type === 'main') transform.format = '';
	var frag = frameset.document.createDocumentFragment();
	var node;
	while (node = el.firstChild) frag.appendChild(node);
	var processor = transform.processor = framer.createProcessor(transform.type);
	processor.loadTemplate(frag);
},

process: function(srcNode) {
	var transform = this;
	var frameset = transform.frameset;
	var cdom = frameset.cdom;
	var decoder;
	if (transform.format) {
		decoder = framer.createDecoder(transform.format);
		decoder.init(srcNode);
	}
	else decoder = {
		srcNode: srcNode
	}
	var processor = transform.processor;
	var output = processor.transform(decoder);
	return output;
}

});

return HTransformDefinition;
})();


var HBodyResult = (function() {
	
function HBodyResult(el, frameset) {
	if (!el) return; // in case of inheritance
	this.frameset = frameset;
	this.init(el);
}

_.defaults(HBodyResult.prototype, {

init: function(el) {
	var result = this;
	var frameset = result.frameset;
	var cdom = frameset.cdom;
	_.defaults(result, {
		element: el,
		condition: cdom.attr(el, 'condition')
    });
},

compose: function(output) {
	var result = this;
	var frameset = result.frameset;
	var cdom = frameset.cdom;
	var el = result.element;
	var frames;
	if (output.nodeType) {
		el.appendChild(output);
		frames = cdom.$$('frame', el);
	}
	else {
		el.appendChild(output.fragment);
		frames = output.frames;
	}
	result.frames = _.map(frames, function(el) {
		return new HFrameDeclaration(el, frameset);
	});
}

});

return HBodyResult;
})();


var HFramesetDefinition = (function() {

function HFramesetDefinition(doc, settings) {
	if (!doc) return; // in case of inheritance
	this.init(doc, settings);
}

_.defaults(HFramesetDefinition, {

options: {
	// lookup: function(url, details) {},
	// detect: function(doc, details) {}
}

});

_.defaults(HFramesetDefinition.prototype, {

config: function(options) {
	var frameset = this;
	_.assign(frameset.options, options);
},

lookup: function(url, details) {
	var frameset = this;
	var options = frameset.options;
	if (!options.lookup) return;
	var partial = options.lookup(url, details);
	return inferChangeset(url, partial);
},

detect: function(doc, details) {
	var frameset = this;
	var options = frameset.options;
	if (!options.detect) return;
	var partial = options.detect(doc, details);
	return inferChangeset(details.url, partial);
},

init: function(doc, settings) {
	var frameset = this;
	_.defaults(frameset, {
		options: _.defaults({}, HFramesetDefinition.options),
		frames: {} // all hyperframe definitions. Indexed by @id (which may be auto-generated)
	});

	var cdom;
	var xmlns;
	frameset.namespaces = CustomDOM.getNamespaces(doc);
	_.some(frameset.namespaces, function(ns) {
		if (_.lc(ns.urn) !== 'hyperframeset') return false;
		xmlns = ns.name;
		return true;
	});
	
	if (xmlns) cdom = new CustomDOM({
		namespace: xmlns,
		namespaceStyle: 'xml'
	});
	else cdom = new CustomDOM(hfDefaults);
	frameset.cdom = cdom;
	
	// NOTE first rebase scope: urls
	var scopeURL = URL(settings.scope);
	rebase(doc, scopeURL);
	
	frameset.document = doc;
	var frameElts = cdom.$$('frame', doc);
	var frameRefElts = [];
	_.forEach(frameElts, function(el, index) { // FIXME hyperframes can't be outside of <body> OR descendants of repetition blocks
		// NOTE first rebase @src with scope: urls
		var src = cdom.attr(el, 'src');
		if (src) {
			var newSrc = rebaseURL(src, scopeURL);
			if (newSrc != src) cdom.attr(el, 'src', newSrc);
		}
		
		var id = el.getAttribute('id');
		var defId = cdom.attr(el, 'def');
		if (defId && defId !== id) {
			frameRefElts.push(el);
			return;
		}
		var placeholder = el.cloneNode(false);
		el.parentNode.replaceChild(placeholder, el);
		if (!id) {
			id = '__frame_' + index + '__'; // FIXME should be a function at top of module
			el.setAttribute('id', id);
		}
		if (!defId) {
			defId = id;
			cdom.attr(placeholder, 'def', defId);
		}
		frameset.frames[id] = new HFrameDefinition(el, frameset);
	});
	_.forEach(frameRefElts, function(el) {
		var defId = cdom.attr(el, 'def');
		if (!frameset.frames[defId]) {
			throw "Hyperframe references non-existant frame #" + defId;
		}
		var placeholder = el.cloneNode(false);
		el.parentNode.replaceChild(placeholder, el);
	});
},

render: function() {
	var frameset = this;
	var cdom = frameset.cdom;
	var srcDoc = cloneDocument(frameset.document);
	var result = new HFramesetResult(srcDoc, frameset);
	return result;
}

});

/*
 Rebase scope URLs:
	scope:{path}
 is rewritten with `path` being relative to the current scope.
 */

function rebase(doc, scopeURL) {
	_.forOwn(urlAttributes, function(attrName, tag) {
		_.forEach($$(tag, doc), function(el) {
			var relURL = el.getAttribute(attrName);
			if (relURL == null) return;
			var url = rebaseURL(relURL, baseURL);
			if (url != relURL) el[attrName] = url;
		});
	});
}

function rebaseURL(url, baseURL) {
	var relURL = url.replace(/^scope:/i, '');
	if (relURL == url) return url;
	return baseURL.resolve(relURL);
}


return HFramesetDefinition;	
})();


var HFramesetResult = (function() {

function HFramesetResult(doc, frameset) {
	this.frameset = frameset;
	this.init(doc);
}

_.defaults(HFramesetResult.prototype, {

init: function(doc) {
	var result = this;
	var frameset = result.frameset;
	var cdom = frameset.cdom;
	polyfill(doc);
	var frames = cdom.$$('frame', doc);
	frames = _.map(frames, function(el) {
		return new HFrameDeclaration(el, frameset);
	});
	_.defaults(result, {
		document: doc,
		frames: frames
	});
}

});

return HFramesetResult;	
})();


var HFrame = (function() {

function HFrame(declaration, frameset) {
	this.frameset = frameset;
	this.init(declaration);
}

_.defaults(HFrame.prototype, {
	
init: function(declaration) {
	var frame = this;
	var frameset = frame.frameset;
	var srcEl = declaration.element;
	var el = frameset.document.createElement('div');
	el.setAttribute('is', getTagName(srcEl));
	insertNode("replace", srcEl, el);
	_.defaults(frame, declaration);
	frame.element = el;
	frame.bodyElement = null;
	// NOTE now we drop declaration, including declaration.element
},

navigate: function(src) { // FIXME need a teardown method that releases child-frames	
	var frame = this;
	var frameset = frame.frameset;
	if (src) frame.src = src;
	else src = frame.src;
	frame.fetch(src)
	.then(function(doc) { return frame.render(doc); })
	.then(function(result) {
		frame.insert(result);
		return frame.renderFrames(result.frames);
	});
},

fetch: function(src) {
	var frame = this;
	var frameset = frame.frameset;
	return frame.definition.options.load('get', src, null, {});
},

render: function(doc) { // FIXME need a teardown method that releases child-frames	
	var frame = this;
	var frameset = frame.frameset;
	return frame.definition.render(doc);
},

insert: function(result) { // FIXME need a teardown method that releases child-frames	
	var frame = this;
	var frameset = frame.frameset;
	var src = frame.src;
	if (!src) return;
	if (!STAGING_DOCUMENT_IS_INERT) deneutralizeAll(result.element);
	
	// FIXME .bodyElement will probably become .bodies[] for transition animations.
	if (frame.bodyElement) frame.element.removeChild(frame.bodyElement);
	var bodyEl = frameset.document.createElement('div');
	bodyEl.setAttribute('is', getTagName(result.element));
	var node;
	while (node = result.element.firstChild) bodyEl.appendChild(node);
	frame.bodyElement = bodyEl;
	frame.element.appendChild(bodyEl);
},


renderFrames: function(frames) {
	var frame = this;
	var hframeset = frame.frameset;
	frame.frames = [];
	_.forEach(frames, function(declaration) {
		var childFrame = new HFrame(declaration, hframeset);
		frame.frames.push(childFrame);
		var src;
		if (childFrame.name === framer.currentChangeset.target) src = framer.currentChangeset.url;
		childFrame.navigate(src); // FIXME promisify
	});
}

});

return HFrame;	
})();


var HFrameset = (function() {
	
function HFrameset(dstDoc) {
	if (!dstDoc) return; // in case of inheritance
	this.init(dstDoc);
}

_.defaults(HFrameset.prototype, {

init: function(dstDoc) {
	var hframeset = this;
	_.defaults(hframeset, {
		frameset: hframeset,
		srcTree: null, // NOTE temporary store between prepare() and render()
		document: dstDoc,
		src: null,
		definition: null
	});
},

load: function(url, options) {
	var hframeset = this;
	hframeset.src = url;
	hframeset.scope = options.scope;
	var method = 'get';
	return framer.options.load(method, url, null, { method: method, url: url, prepare: hfParserPrepare })
	.then(function(framesetDoc) {
		return new HFramesetDefinition(framesetDoc, options);
	})
	.then(function(definition) {
		hframeset.definition = definition;
		return hframeset.prepare();
	});
},

prepare: function() {
	var hframeset = this;
	var dstDoc = hframeset.document;
	var definition = hframeset.definition;

	var srcTree = hframeset.srcTree;
	if (!srcTree) {
		srcTree = definition.render();
		if (!STAGING_DOCUMENT_IS_INERT) deneutralizeAll(srcTree.document);
	}
	var srcDoc = srcTree.document;

	hframeset.srcTree = srcTree;
	
	if (getFramesetMarker(dstDoc)) throw "The HFrameset has already been applied";

	var selfMarker;
	
	return pipe(null, [

	function() {
		selfMarker = getSelfMarker(dstDoc);
		if (selfMarker) return;
		selfMarker = dstDoc.createElement("link");
		selfMarker.rel = selfRel;
		selfMarker.href = dstDoc.URL;
		dstDoc.head.insertBefore(selfMarker, dstDoc.head.firstChild);
	},

	function() {
		var framesetMarker = dstDoc.createElement("link");
		framesetMarker.rel = framesetRel;
		framesetMarker.href = hframeset.src;
		dstDoc.head.insertBefore(framesetMarker, selfMarker);
	},
	
	function() {
		mergeElement(dstDoc.documentElement, srcDoc.documentElement);
		mergeElement(dstDoc.head, srcDoc.head);
		mergeHead(dstDoc, srcDoc.head, true);
		// allow scripts to run. FIXME scripts should always be appended to document.head
		_.forEach($$("script", dstDoc.head), function(script) {
			var forAttr = script.getAttribute('for');
			if (!forAttr) {
				scriptQueue.push(script);
				return;
			}
			if (script.src) {
				logger.warn('Ignoring <script> declaration - @for not compatible with @src');
				return;
			}
			var forOptions;
			try {
				forOptions = (Function('return (' + scriptText(script) + ');'))();
			}
			catch(err) { return; } // FIXME log a warning
			
			var nsPrefix = hframeset.definition.cdom.prefix;
			switch(forAttr) {
			case nsPrefix + 'frameset':
				framer.frameset.definition.config(forOptions);
				break;
			case nsPrefix + 'frame':
				_.assign(HFrameDefinition.options, forOptions);
				break;
			default:
				logger.warn('Unsupported value of @for on <script>: ' + forAttr);
			}
		}); // FIXME this breaks if a script inserts other scripts
		return scriptQueue.empty();
	}
	]);

	
},

renderFrames: HFrame.prototype.renderFrames,

render: function() {

	var hframeset = this;
	var dstDoc = hframeset.document;
	var definition = hframeset.definition;

	var srcTree = hframeset.srcTree;
	var srcDoc = srcTree.document;
	hframeset.srcTree = null;
	
	return pipe(null, [

	function() {
		var srcBody = srcDoc.body;
		mergeElement(dstDoc.body, srcBody);

		var contentStart = dstDoc.body.firstChild;
		var framesetEnd = dstDoc.createElement('plaintext');
		framesetEnd.setAttribute('style', 'display: none;');
		dstDoc.body.insertBefore(framesetEnd, contentStart);

 		frameset_insertBody(dstDoc, srcBody);
		hframeset.renderFrames(srcTree.frames); // FIXME promisify
	},
	function() {
		return notify({
			module: "frameset",
			stage: "after",
			type: "entering",
			node: dstDoc
		});
	},
	function() { // this doesn't stall the Promise returned by render() 
		wait(function() { return checkStyleSheets(dstDoc); })
		.then(function() {
			return notify({
				module: "frameset",
				stage: "after",
				type: "ready",
				node: dstDoc
			});
		});
	}

	]);

}
	
});

function separateHead(dstDoc, isFrameset) {
	var dstHead = dstDoc.head;
	var framesetMarker = getFramesetMarker(dstDoc);
	if (!framesetMarker) throw 'No ' + framesetRel + ' marker found. ';

	var selfMarker = getSelfMarker(dstDoc);
	// remove frameset / page elements except for <script type=text/javascript>
	if (isFrameset) _.forEach(siblings("after", framesetMarker, "before", selfMarker), remove);
	else _.forEach(siblings("after", selfMarker), remove);
	
	function remove(node) {
		if (getTagName(node) == "script" && (!node.type || node.type.match(/^text\/javascript/i))) return;
		dstHead.removeChild(node);
	}
}

function mergeHead(dstDoc, srcHead, isFrameset) {
	var baseURL = URL(dstDoc.URL);
	var dstHead = dstDoc.head;
	var framesetMarker = getFramesetMarker();
	if (!framesetMarker) throw 'No ' + framesetRel + ' marker found. ';
	var selfMarker = getSelfMarker();

	separateHead(dstDoc, isFrameset);

	_.forEach(_.toArray(srcHead.childNodes), function(srcNode) {
		if (srcNode.nodeType != 1) return;
		switch (getTagName(srcNode)) {
		case "title":
			if (isFrameset) return; // ignore <title> in frameset. FIXME what if topic content has no <title>?
			if (!srcNode.innerHTML) return; // IE will add a title even if non-existant
			break;
		case "link": // FIXME no duplicates @rel, @href pairs
			break;
		case "meta": // FIXME no duplicates, warn on clash
			if (srcNode.httpEquiv) return;
			if (/^\s*viewport\s*$/i.test(srcNode.name)) srcNode = composeNode(srcNode); // TODO Opera mobile was crashing. Is there another way to fix this?
			break;
		case "style": 
			break;
		case "script":  // FIXME no duplicate @src
			break;
		}
		if (isFrameset) insertNode('beforebegin', selfMarker, srcNode);
		else insertNode('beforeend', dstHead, srcNode);
		if (getTagName(srcNode) == "link") srcNode.href = srcNode.getAttribute("href"); // Otherwise <link title="..." /> stylesheets don't work on Chrome
	});
}

function frameset_insertBody(dstDoc, srcBody) {
	var dstBody = dstDoc.body;
	var content = dstBody.firstChild;
	_.forEach(_.toArray(srcBody.childNodes), function(node) {
		insertNode("beforebegin", content, node);
	});
}

function mergeElement(dst, src) { // NOTE this removes all dst (= landing page) attrs and imports all src (= frameset) attrs.
	removeAttributes(dst);
	copyAttributes(dst, src);
	dst.removeAttribute('style'); // FIXME is this appropriate? There should at least be a warning
}

var framesetRel = 'frameset'; // NOTE http://lists.w3.org/Archives/Public/www-html/1996Dec/0143.html
var selfRel = 'self';
var framesetRelRegex = new RegExp('\\b' + framesetRel + '\\b', 'i');
function getFramesetMarker(doc) {
	if (!doc) doc = document;
	var marker = firstChild(doc.head, function(el) {
		return el.nodeType == 1 &&
			getTagName(el) == "link" &&
			framesetRelRegex.test(el.rel);
	});
	return marker;
}

var selfRelRegex = new RegExp('\\b' + selfRel + '\\b', 'i');
function getSelfMarker(doc) {
	if (!doc) doc = document;
	var marker = firstChild(doc.head, function(el) {
		return el.nodeType == 1 &&
			getTagName(el) == "link" &&
			selfRelRegex.test(el.rel);
	});
	return marker;
}

return HFrameset;
})();


var notify = function(msg) {
	var module;
	switch (msg.module) {
	case 'frameset': module = framer.frameset.definition.options; break;
	case 'frame': module = HFrameDefinition.options; break;
	default: return Promise.resolve();
	}
	var handler = module[msg.type];
	if (!handler) return Promise.resolve();
	var listener;

	if (handler[msg.stage]) listener = handler[msg.stage];

	else switch(msg.module) {
	case "frame":
		listener =	(msg.type == "leaving") ?
			(msg.stage == "before") ? handler : null :
			(msg.stage == "after") ? handler : null;
		break;
	case "frameset":
		listener = (msg.type == "leaving") ?
			(msg.stage == "before") ? handler : null :
			(msg.stage == "after") ? handler : null;
		break;
	default:
		throw msg.module + " is invalid module";
		break;
	}

	if (typeof listener == "function") {
		var promise = asap(function() { listener(msg); }); // TODO isFunction(listener)
		promise['catch'](function(err) { throw err; });
		return promise;
	}
	else return Promise.resolve();
}


var framer = {};

_.defaults(framer, {

frameset: new HFrameset(document),

started: false,

landingDocument: null,

start: function(startOptions) {
	var framer = this;
	
	if (framer.started) throw "Already started";
	if (!startOptions || !startOptions.contentDocument) throw "No contentDocument passed to start()";

	framer.started = true;
	startOptions.contentDocument
	.then(function(doc) {
		framer.landingDocument = doc;
	});
	
	return pipe(null, [
		
	function() { // sanity check
		return wait(function() { return !!document.body; });		
	},

	function() { // lookup or detect framesetURL
		var framerConfig;
		framerConfig = framer.lookup(document.URL);
		if (framerConfig) return framerConfig;
		return startOptions.contentDocument
			.then(function(doc) {
				return framer.detect(doc);
			});
	},

	function(framerConfig) { // initiate fetch of framesetURL
		if (!framerConfig) throw "No frameset could be determined for this page";
		return framer.frameset.load(framerConfig.framesetURL, framerConfig);
	},
	
	function() { resolveURLs(); }, // FIXME this assumes the landing document wasn't captured or cloned.
	
	function() { // FIXME this should in framer.start()
		var url = document.URL;
		var changeset = framer.currentChangeset = framer.frameset.definition.lookup(url, {
			referrer: document.referrer
		});
		return historyManager.start(changeset, '', document.URL,
				function(state) { return framer.frameset.render(); }, // FIXME what if render fails??
				function(state) { return framer.onPopState(state.getData()); }
			);
	},
	
	function() {
		// NOTE fortuitously all the browsers that support pushState() also support addEventListener() and dispatchEvent()
		window.addEventListener("click", function(e) { framer.onClick(e); }, true);
		window.addEventListener("submit", function(e) { framer.onSubmit(e); }, true);
	}
	
	]);

	// start() returns now. The following are hoisted
	
	function resolveURLs() { // NOTE resolve URLs in landing page
		// TODO could be merged with code in parseHTML
		var baseURL = URL(document.URL);
		function _resolveAttr(el, attrName) {
			var relURL = el.getAttribute(attrName);
			if (relURL == null) return;
			var absURL = baseURL.resolve(relURL);
			el.setAttribute(attrName, absURL);
		}
		
		function resolveAttr(el, attrName) {
			if (getTagName(el) != 'script') return _resolveAttr(el, attrName);		
			var scriptType = el.type;
			var isJS = (!scriptType || /^text\/javascript/i.test(scriptType));
			if (isJS) el.type = "text/javascript?complete"; // FIXME not needed any more - IE6 and IE7 will re-execute script if @src is modified (even to same path)
			_resolveAttr(el, attrName);
		}
		
		_.forEach(_.toArray(document.head.childNodes), function(node) {
			switch (getTagName(node)) {
			case 'script':
				resolveAttr(node, 'src');
				break;
			case 'link':
				resolveAttr(node, 'href');
				break;
			}
		});
	}

},

onClick: function(e) {
	var framer = this;
	// NOTE only pushState enabled browsers use this
	// We want panning to be the default behavior for clicks on hyperlinks - <a href>
	// Before panning to the next page, have to work out if that is appropriate
	// `return` means ignore the click

	if (!framer.options.lookup) return; // no panning if can't lookup frameset of next page. FIXME test result of framer.lookup(url)
	
	if (e.button != 0) return; // FIXME what is the value for button in IE's W3C events model??
	if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return; // FIXME do these always trigger modified click behavior??

	// Find closest <a> to e.target
	for (var target=e.target; target!=document; target=target.parentNode) if (getTagName(target) == "a") break;
	if (getTagName(target) != "a") return; // only handling hyperlink clicks
	var href = target.getAttribute("href");
	if (!href) return; // not really a hyperlink

	// test hyperlinks
	if (target.target) return; // no iframe
	var baseURL = URL(document.URL);
	var url = baseURL.resolve(href); // TODO probably don't need to resolve on browsers that support pushstate
	var oURL = URL(url);
	if (oURL.origin != baseURL.origin) return; // no external urls

	var details = { element: target }; // TODO more details?? event??
	
	// TODO perhaps should test same-site and same-page links
	var isPageLink = (oURL.nohash == baseURL.nohash); // TODO what about page-links that match the current hash?
	// From here on we effectively take over the default-action of the event
	overrideDefaultAction(e, function(event) {
		if (isPageLink) framer.onPageLink(url, details);
		else framer.onSiteLink(url, details);
	});
},

onPageLink: function(url, details) {
	var framer = this;
	alert('Ignoring on-same-page links for now.'); // FIXME
},

onSiteLink: function(url, details) {	// Now attempt to pan
	var framer = this;
	var changeset = framer.frameset.definition.lookup(url, details);
	framer.assign(url, changeset);
},

onSubmit: function(e) {
	var framer = this;
	// NOTE only pushState enabled browsers use this
	// We want panning to be the default behavior for <form> submission
	// Before panning to the next page, have to work out if that is appropriate
	// `return` means ignore the submit

	if (!framer.options.lookup) return; // no panning if can't lookup frameset of next page FIXME need to check return value of framer.lookup(action)
	
	// test submit
	var form = e.target;
	if (form.target) return; // no iframe
	var baseURL = URL(document.URL);
	var url = baseURL.resolve(form.action); // TODO probably don't need to resolve on browsers that support pushstate
	var oURL = URL(url);
	if (oURL.origin != baseURL.origin) return; // no external urls
	
	var method = _.lc(form.method);
	switch(method) {
	case 'get': break;
	default: return; // TODO handle POST
	}
	
	// From here on we effectively take over the default-action of the event
	overrideDefaultAction(e, function() {
		framer.onForm(form);
	});
},

onForm: function(form) {
	var framer = this;
	var method = _.lc(form.method);
	switch(method) {
	case 'get':
		var baseURL = URL(document.URL);
		var action = baseURL.resolve(form.action); // TODO probably not needed on browsers that support pushState
		var oURL = URL(action);
		var query = encode(form);
		var url = oURL.nosearch + (oURL.search || '?') + query + oURL.hash;
		framer.onSiteLink(url, {
			element: form
		});
		break;
	default: return; // TODO handle POST
	}	

	function encode(form) {
		var data = [];
		_.forEach(_.toArray(form.elements), function(el) {
			if (!el.name) return;
			data.push(el.name + '=' + encodeURIComponent(el.value));
		});
		return data.join('&');
	}
},

assign: function(url, changeset) {
	// changeset.replace = false;
	return this.navigate(url, changeset);
},

navigate: function(url, changeset) {

	var framer = this;	
	return historyManager.pushState(changeset, '', url, function(state) {
		var frameset = framer.frameset;
		var frames = [];
		var target = changeset.target;
		walkFrames(frameset, function(frame) { if (frame.name === target) frames.push(frame); });
		// FIXME warning if more than one frame??
		_.forEach(frames, function(frame) {
			frame.navigate(url);
		});
	});

	function walkFrames(current, callback) {
		_.forEach(current.frames, function(frame) { callback(frame); walkFrames(frame, callback); });
	}

},

onPopState: function(changeset) {
	var framer = this;
	var frameset = framer.frameset;
	var frames = [];
	var url = changeset.url;
	if (url !== document.URL) {
		logger.warn('Popped state URL does not match address-bar URL.');
		// FIXME needs an optional error recovery, perhaps reloading document.URL
	}
	var target = changeset.target;
	walkFrames(frameset, function(frame) { if (frame.name === target) frames.push(frame); });
	// FIXME warning if more than one frame??
	_.forEach(frames, function(frame) {
		frame.navigate(url);
	});

	function walkFrames(current, callback) {
		_.forEach(current.frames, function(frame) { callback(frame); walkFrames(frame, callback); });
	}
}

});


_.defaults(framer, {

lookup: function(docURL) {
	var framer = this;
	if (!framer.options.lookup) return;
	var result = framer.options.lookup(docURL);
	if (result == null) return null;

	// FIXME error if `result` is a relative URL
	if (typeof result === 'string') result = implyFramesetScope(result, docURL);
	if (typeof result !== 'object' || !result.scope || !result.framesetURL) throw 'Unexpected result from frameset lookup';
	return result;
},

detect: function(srcDoc) {
	var framer = this;
	if (!framer.options.detect) return;
	var result = framer.options.detect(srcDoc);
	if (result == null) return null;

	// FIXME error if `result` is a relative URL
	if (typeof result === 'string') result = implyFramesetScope(result, document.URL);
	if (typeof result !== 'object' || !result.scope || !result.framesetURL) throw 'Unexpected result from frameset detect';
	return result;
},

compareFramesetScope: function(settings) {
	var framer = this;
	if (framer.frameset.src !== settings.framesetURL) return false;
	if (framer.frameset.scope !== settings.scope) return false;
}

});

function implyFramesetScope(framesetSrc, docSrc) {
	var docURL = URL(docSrc);
	var docSiteURL = URL(docURL.origin);
	var framesetSrc = docSiteURL.resolve(framesetSrc);
	var scope = implyScope(framesetSrc, docSrc);
	return {
		scope: scope,
		framesetURL: framesetSrc
	}
}

function implyScope(framesetSrc, docSrc) {
	var docURL = URL(docSrc);
	var framesetURL = URL(framesetSrc);
	var scope = docURL.base;
	var framesetBase = framesetURL.base;
	if (scope.indexOf(framesetBase) >= 0) scope = framesetBase;
	return scope;
}

function inferChangeset(url, partial) {
	var inferred = {
		url: url
	}
	
	switch (typeof partial) {
	case 'string':
		inferred.target = partial;
		break;
	case 'object':
		/*
		if (partial instanceof Array) {
			inferred.target = partial[0];
			inferred.targets = partial.slice(0);
			break;
		}
		*/
	default:
		throw 'Invalid changeset returned from lookup()';
		break;
	}
	
	return inferred;
}


_.defaults(framer, {

options: {
	load: function(method, url, data, details) {
		var framesetOptions = this;
		var loader = new HTMLLoader(framesetOptions);
		return loader.load(method, url, data, details);
	}
	/* The following options are also available (unless otherwise indicated) *
	lookup: function(url) {},
	detect: function(document) {},
	entering: { before: noop, after: noop },
	leaving: { before: noop, after: noop }, // TODO not called at all
	ready: noop // TODO should this be entering:complete ??
	/**/
},

config: function(options) {
	var framer = this;
	_.assign(framer.options, options);
}

});


_.defaults(framer, {

decoders: {},

registerDecoder: function(type, constructor) {
	this.decoders[type] = constructor;
},

createDecoder: function(type) {
	return new this.decoders[type];	
},

processors: {},

registerProcessor: function(type, constructor) {
	this.processors[type] = constructor;
},

createProcessor: function(type) {
	return new this.processors[type];	
}

});

_.defaults(classNamespace, {

	CustomDOM: CustomDOM,
	HFrameDefinition: HFrameDefinition,
	HFramesetDefinition: HFramesetDefinition,
	HFrame: HFrame,
	HFrameset: HFrameset

});

return framer;

})(Meeko);


var MainProcessor = (function() {

function MainProcessor() {}

_.defaults(MainProcessor.prototype, {

loadTemplate: function(template) {
	if (/\S+/.test(textContent(template))) logger.warn('"main" transforms do not use templates');
},

transform: function(provider) {
	var frag = document.createDocumentFragment();
	var srcDoc = provider.srcNode;
	var srcNode;
	if (!srcDoc.body) srcNode = srcDoc;
	if (!srcNode) srcNode = $('main, [role=main]', srcDoc);
	if (!srcNode) srcNode = srcDoc.body;
	var node;
	while (node = srcNode.firstChild) frag.appendChild(node);
	return frag;
}
	
});

return MainProcessor;
})();

framer.registerProcessor('main', MainProcessor);


var ScriptProcessor = (function() {

function ScriptProcessor() {}

_.defaults(ScriptProcessor.prototype, {

loadTemplate: function(template) {
	var script;
	_.forEach(_.toArray(template.childNodes), function(node) {
		switch (node.nodeType) {
		case 1: // Element
			switch (getTagName(node)) {
			case "script":
				if (script) logger.warn('Ignoring secondary <script> in "script" transform template');
				else script = node;
				return;
			default:
				logger.warn('Ignoring unexpected non-<script> element in "script" transform template');
				return;
			}
			break; // should never reach here
		case 3: // Text
			if (/\S+/.test(node.nodeValue)) logger.warn('"script" transforms should not have non-empty text-nodes');
			return;
		case 8: // Comment
			return;
		default:
			logger.warn('Unexpected node in "script" transform template');
			return;
		}
	});
	if (!script) {
		logger.warn('No <script> found in "script" transform template');
		return;
	}
	try { this.processor = (Function('return (' + scriptText(script) + ')'))(); }
	catch(err) { }
	
	if (!this.processor || !this.processor.transform) {
		logger.warn('"script" transform template did not produce valid transform object');
		return;
	}
},

transform: function(provider) {
	var srcNode = provider.srcNode;
	var processor = this.processor;
	if (!this.processor || !this.processor.transform) {
		logger.warn('"script" transform template did not produce valid transform object');
		return;
	}
	try {
		return this.processor.transform(srcNode);
	}
	catch(err) { // FIXME should trigger a fallback rendering
		logger.warn(err); 
		return srcNode;
	}
}
	
});


return ScriptProcessor;
})();

framer.registerProcessor('script', ScriptProcessor);


// NOTE textAttr & htmlAttr used in HTemplateProcessor & CSSDecoder
var textAttr = '_text';
var htmlAttr = '_html';

var HTemplateProcessor = (function() {

var htNamespace = 'ht';
var htAttrPrefix = htNamespace + ':';
var exprNamespace = 'expr';
var exprPrefix = exprNamespace + ':';
var mexprNamespace = 'mexpr';
var mexprPrefix = mexprNamespace + ':';
var exprTextAttr = exprPrefix + textAttr;
var exprHtmlAttr = exprPrefix + htmlAttr;

function htAttr(el, attr) {
	var htAttrName = htAttrPrefix + attr;
	if (!el.hasAttribute(htAttrName)) return false;
	var value = el.getAttribute(htAttrName);
	el.removeAttribute(htAttrName);
	return value;
}

function HTemplateProcessor() {}

_.defaults(HTemplateProcessor.prototype, {
	
loadTemplate: function(template) {
	this.template = template;
},

transform: function(provider) {
	var clone = this.template.cloneNode(true);
	return transformNode(clone, provider, null, {});
}

});

function transform(el, provider, context, variables) {
	
	var ht_if = htAttr(el, 'if');
	var ht_forEach = htAttr(el, 'for-each');
	var ht_var = htAttr(el, 'var');
	
	if (ht_forEach === false) {

		if (ht_if !== false) {
			var keep = provider.evaluate(ht_if, context, variables, 'boolean');
			if (!keep) return null;
		}
	
		var newEl = transformNode(el, provider, context, variables); // NOTE newEl === el
		return newEl;
	}
	
	// handle for-each
	var subVars = _.defaults({}, variables);
	var subContexts = provider.evaluate(ht_forEach, context, variables, 'array');
	var result = document.createDocumentFragment(); // FIXME which is the right doc to create this frag in??
	
	_.forEach(subContexts, function(subContext) {
		if (ht_var) subVars[ht_var] = subContext;
		if (ht_if !== false) {
			var keep = provider.evaluate(ht_if, subContext, subVars, 'boolean');
			if (!keep) return;
		}
		var srcEl = el.cloneNode(true);
		var newEl = transformNode(srcEl, provider, subContext, subVars); // NOTE newEl === srcEl
		result.appendChild(newEl);
	});
	
	return result;
}

function transformNode(node, provider, context, variables) {
	var nodeType = node.nodeType;
	if (!nodeType) return node;
	if (nodeType !== 1 && nodeType !== 11) return node;
	var deep = true;
	if (nodeType === 1 && (hasAttribute(node, exprTextAttr) || hasAttribute(node, exprHtmlAttr))) deep = false;
	if (nodeType === 1) transformSingleElement(node, provider, context, variables);
	if (!deep) return node;

	_.forEach(_.toArray(node.childNodes), function(current) {
		if (current.nodeType !== 1) return;
		var newChild = transform(current, provider, context, variables);
		if (newChild !== current) {
			if (newChild && newChild.nodeType) node.replaceChild(newChild, current);
			else node.removeChild(current); // FIXME warning if newChild not empty
		}
	});
	return node;
}

function transformSingleElement(el, provider, context, variables) {
	_.forEach(_.toArray(el.attributes), function(attr) {
		var attrName;
		var prefix = false;
		_.some([ exprPrefix, mexprPrefix ], function(prefixText) {
			if (attr.name.indexOf(prefixText) !== 0) return false;
			prefix = prefixText;
			attrName = attr.name.substr(prefixText.length);
			return true;
		});
		if (!prefix) return;
		el.removeAttribute(attr.name);
		var expr = attr.value;
		var type = (attrName === htmlAttr) ? 'node' : 'text';
		var value = (prefix === mexprPrefix) ?
			evalMExpression(expr, provider, context, variables, type) :
			evalExpression(expr, provider, context, variables, type);
		setAttribute(el, attrName, value);
	});
}

function setAttribute(el, attrName, value) {	
	switch (attrName) {
	case textAttr:
		textContent(el, value);
		break;
	case htmlAttr:
		el.innerHTML = '';
		if (value && value.nodeType) el.appendChild(value);
		else el.innerHTML = value;
		break;
	default:
		switch (typeof value) {
		case 'boolean':
			if (value) el.removeAttribute(attrName);
			else el.setAttribute(attrName, '');
			break;
		default:
			el.setAttribute(attrName, value.toString());
			break;
		}
	}
}

function evalMExpression(mexpr, provider, context, variables, type) { // FIXME mexpr not compatible with type === 'node'
	return mexpr.replace(/\{\{((?:[^}]|\}(?=\}\})|\}(?!\}))*)\}\}/g, function(all, expr) {
		return evalExpression(expr, provider, context, variables, type);
	});
}

function evalExpression(expr, provider, context, variables, type) { // FIXME robustness
	var exprParts = expr.split('|');
	var value = provider.evaluate(exprParts.shift(), context, variables, type);

	switch (type) {
	case 'text':
		if (value && value.nodeType) value = textContent(value);
		break;
	case 'node':
		var frag = document.createDocumentFragment();
		if (value && value.nodeType) frag.appendChild(value.cloneNode(true));
		else {
			var div = document.createElement('div');
			div.innerHTML = value;
			var node;
			while (node = div.firstChild) frag.appendChild(node);
		}
		value = frag;
		break;
	default: // FIXME should never occur. logger.warn !?
		if (value && value.nodeType) value = textContent(value);
		break;
	}

	_.forEach(exprParts, function(scriptBody) {
		var fn = Function('value', 'return (' + scriptBody + ');');
		value = fn(value);
	});

	return value;
}

return HTemplateProcessor;	
})();

framer.registerProcessor('ht', HTemplateProcessor);


var CSSDecoder = (function() {

function CSSDecoder() {}

_.defaults(CSSDecoder.prototype, {

init: function(node) {
	this.srcNode = node;
},

evaluate: function(query, context, variables, type) {
	if (!context) context = this.srcNode;
	var queryParts = query.match(/^\s*([^{]*)\s*(?:\{\s*([^}]*)\s*\}\s*)?$/);
	var selector = queryParts[1];
	var attr = queryParts[2];
	if (type === 'array') { // ht:for-each
		if (attr) logger.warn('Ignoring attribute selector because evaluate() requested array');
		return findAll(context, selector, variables);
	}
	var node = find(context, selector, variables);
	if (attr) {
		if (attr.charAt(0) === '@') attr = attr.substr(1);
	}

	switch(type) {
	case 'text': // expr:attr or expr:.text
		if (!node) return '';
		switch(attr) {
		case null: case undefined: case '': case textAttr: return textContent(node);
		case htmlAttr: return node.innerHTML;
		default: return node.getAttribute(attr);
		}
	case 'boolean': // ht:if
		if (!node) return false;
		switch(attr) {
		case null: case undefined: case '': return true;
		case textAttr: case htmlAttr: return !/^\s*$/.test(textContent(node)); // FIXME potentially heavy. Implement as a DOM utility isEmptyNode()
		default: return hasAttribute(node, nodeattr);
		}
	case 'node': // expr:.html
		switch(attr) {
		case null: case undefined: case '': case htmlAttr: return node;
		case textAttr: return textContent(node);
		default: return node.getAttribute(attr);
		}
	default: return node; // TODO shouldn't this be an error / warning??
	}
}

});

function find(context, selectorGroup, variables) {
	var finalSelector = expandSelector(context, selectorGroup, variables);
	return context.querySelector(finalSelector);
}

function findAll(context, selectorGroup, variables) {
	var finalSelector = expandSelector(context, selectorGroup, variables);
	return context.querySelectorAll(finalSelector);
}

var uidIndex = 0;
function expandSelector(context, selectorGroup, variables) { // FIXME currently only implements `context` expansion
	var isRoot = context.nodeType === 9;
	var id;
	if (!isRoot) {
		id = context.id;
		if (!id) {
			id = '__meeko_' + (uidIndex++) + '__';
			context.id = id;
		}
	}
	var selectors =	selectorGroup.split(',');
	selectors = _.map(selectors, function(s) { return _.trim(s); });
	selectors = _.filter(selectors, function(s) {
			switch(s.charAt(0)) {
			case '+': case '~': return false; // FIXME warning or error
			case '>': return (isRoot) ? false : true; // FIXME probably should be allowed even if isRoot
			default: return true;
			}
		});
	selectors = _.map(selectors, function(s) {
			return (isRoot) ? s : '#' + id + ' ' + s;
		});
	
	return selectors.join(', ');
}

return CSSDecoder;
})();

framer.registerDecoder('css', CSSDecoder);


// end framer defn

}).call(window);
