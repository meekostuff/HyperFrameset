/*!
 Sprocket
 (c) Sean Hogan, 2008,2012,2013,2014
 Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
*/

/* NOTE
Requires some features not implemented on older browsers:
element.matchesSelector (or prefixed equivalent) - IE9+
element.querySelectorAll - IE8+
element.addEventListener - IE9+
*/

/* FIXME
- event modifiers aren't filtering
- everything in the sprockets code (apart from the Binding implementation) is a BIG BALL OF MUD
*/

if (!this.Meeko) this.Meeko = {};

(function(window) {

var document = window.document;

var defaultOptions = {
	'log_level': 'warn',
	'polling_interval': 50
}

var vendorPrefix = 'meeko';

/*
 ### Utility functions
 These might (or might not) be lodash equivalents
 */

if (!Meeko.stuff) Meeko.stuff = (function() {

// TODO do string utils needs to sanity check args?
var uc = function(str) { return str ? str.toUpperCase() : ''; }
var lc = function(str) { return str ? str.toLowerCase() : ''; }

var trim = ''.trim ?
function(str) { return str.trim(); } :
function(str) { return str.replace(/^\s+/, '').replace(/\s+$/, ''); }

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

var find = function(a, fn, context) {
	for (var n=a.length, i=0; i<n; i++) {
		var item = a[i];
		var success = fn.call(context, item, i, a);
		if (success) return item;
	}
}

var words = function(text) { return text.split(/\s+/); }

var forOwn = function(object, fn, context) {
	var keys = Object.keys(object);
	if (typeof object === 'function' && object.hasOwnProperty('prototype') && keys.indexOf('prototype' < 0)) {
		fn.call(context, object.prototype, 'prototype', object);
	}
	for (var i=0, n=keys.length; i<n; i++) {
		var key = keys[i];
		fn.call(context, object[key], key, object);
	}
}

var isEmpty = function(o) { // NOTE lodash supports arrays and strings too
	if (o) for (var p in o) if (o.hasOwnProperty(p)) return false;
	return true;
}


var defaults = function(dest, src) {
	var keys = Object.keys(src);
	if (dest.prototype == null && typeof src === 'function' && src.hasOwnProperty('prototype') && keys.indexOf('prototype' < 0)) {
		dest.prototype = src.prototype;
	}
	for (var i=0, n=keys.length; i<n; i++) {
		var key = keys[i];
		if (typeof dest[key] !== 'undefined') continue;
		Object.defineProperty(dest, key, Object.getOwnPropertyDescriptor(src, key));
	}
	return dest;
}

var assign = function(dest, src) {
	var keys = Object.keys(src);
	if (typeof src === 'function' && src.hasOwnProperty('prototype') && keys.indexOf('prototype' < 0)) {
		dest.prototype = src.prototype;
	}
	for (var i=0, n=keys.length; i<n; i++) {
		var key = keys[i];
		Object.defineProperty(dest, key, Object.getOwnPropertyDescriptor(src, key));
	}
	return dest;
}

var createObject = Object.create;

return {
	uc: uc, lc: lc, trim: trim, words: words, // string
	contains: contains, toArray: toArray, forEach: forEach, some: some, every: every, map: map, filter: filter, find: find, // array
	forOwn: forOwn, isEmpty: isEmpty, defaults: defaults, assign: assign, extend: assign, // object
	create: createObject
}

})();

var _ = window._ || Meeko.stuff; // WARN this could potentially use underscore.js / lodash.js but HAS NOT BEEN TESTED!!!

/*
 ### Task queuing and isolation
	TODO Only intended for use by Promise. Should this be externally available?
 */

var Task = Meeko.Task = (function() {

// NOTE Task.asap could use window.setImmediate, except for
// IE10 CPU contention bugs http://codeforhire.com/2013/09/21/setimmediate-and-messagechannel-broken-on-internet-explorer-10/

var asapQueue = [];
var deferQueue = [];
var errorQueue = [];
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
		try { fn(); }
		catch (error) { postError(error); }
		processTasks();
	}, timeout);
}

// NOTE schedule used to be approx: setImmediate || postMessage || setTimeout
var schedule = window.setTimeout;

function processTasks() {
	processing = true;
	var fn;
	while (asapQueue.length) {
		fn = asapQueue.shift();
		if (typeof fn !== 'function') continue;
		try { fn(); }
		catch (error) { postError(error); }
	}
	scheduled = false;
	processing = false;
	
	asapQueue = deferQueue;
	deferQueue = [];
	if (asapQueue.length) {
		schedule(processTasks);
		scheduled = true;
	}
	
	throwErrors();
	
}


function postError(error) {
	errorQueue.push(error);
}

var throwErrors = (function() { // TODO maybe it isn't worth isolating on platforms that don't have dispatchEvent()

var evType = vendorPrefix + '-error';
var throwErrors = (window.dispatchEvent) ?
function() {
	var handlers = createThrowers(errorQueue);
	_.forEach(handlers, function(handler) {
		window.addEventListener(evType, handler, false);
	});
	var e = document.createEvent('Event');
	e.initEvent(evType, true, true);
	window.dispatchEvent(e);
	_.forEach(handlers, function(handler) {
		window.removeEventListener(evType, handler, false);
	});
	errorQueue = [];
} :
function() { // FIXME shouldn't need this
	var handlers = createThrowers(errorQueue);
	_.forEach(handlers, function(handler) {
		setTimeout(handler);
	});
	errorQueue = [];
}

function createThrowers(list) {
	return _.map(list, function(error) {
		return function() {
			if (logger.LOG_LEVEL >= logger.levels.indexOf('debug')) {
				if (error.stack) logger.error(error.stack);
				// TODO else ??
			}
			throw error;
		};
	});
}

return throwErrors;
})();

return {
	asap: asap,
	defer: defer,
	delay: delay,
	postError: postError
};

})(); // END Task

/*
 ### Promise
 WARN: This was based on early DOM Futures specification. This has been evolved towards ES6 Promises.
 */
var Promise = Meeko.Promise = (function() {
	
var Promise = function(init) { // `init` is called as init(resolve, reject)
	if (!(this instanceof Promise)) return new Promise(init);
	
	var promise = this;
	promise._initialize();

	function resolve(result) {
		if (typeof result !== 'function') {
			promise._resolve(result);
			return;
		}
		try { promise._resolve(result()); }
		catch (err) { promise._reject(err); }
	}
	function reject(error) {
		if (typeof error !== 'function') {
			promise._reject(error);
			return;
		}
		try { promise._reject(error()); }
		catch (err) { promise._reject(err); }
	}

	var resolver;
	if (typeof init !== 'function') { // if `init` is not a function then assign resolve() / reject() elsewhere
		resolver = (typeof init === 'object' && init !== null) ? init : promise;
		resolver.resolve = resolve;
		resolver.reject = reject;
	}
	
	Task.asap(function() {
		if (promise._willCatch == null) promise._willCatch = false;
		if (resolver) return;
		try { init(resolve, reject); }
		catch(error) { reject(error); }
	});
	// NOTE promise is returned by `new` invocation
}

_.defaults(Promise.prototype, {

_initialize: function() {
	var promise = this;
	promise._acceptCallbacks = [];
	promise._rejectCallbacks = [];
	promise._accepted = null;
	promise._result = null;
	promise._willCatch = null;
	promise._processing = false;
},

_accept: function(result, sync) { // NOTE equivalent to 'accept algorithm'. External calls MUST NOT use sync
	var promise = this;
	if (promise._accepted != null) return;
	promise._accepted = true;
	promise._result = result;
	promise._requestProcessing(sync);
},

_resolve: function(value, sync) { // NOTE equivalent to 'resolve algorithm'. External calls MUST NOT use sync
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

_reject: function(error, sync) { // NOTE equivalent to 'reject algorithm'. External calls MUST NOT use sync
	var promise = this;
	if (promise._accepted != null) return;
	promise._accepted = false;
	promise._result = error;
	if (!promise._willCatch) {
		Task.postError(error);
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
	
		if (promise._willCatch == null) promise._willCatch = true;
	
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
	asap(test.fn)
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
	_.forEach(currentTests, asapTest);
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

Promise.pollingInterval = defaultOptions['polling_interval'];

_.defaults(Promise, {
	asap: asap, delay: delay, wait: wait, pipe: pipe
});

return Promise;

})();


/*
 ### DOM utility functions
 */

var DOM = Meeko.DOM = (function() {

// WARN getSpecificity is for selectors, **but not** for selector-chains
var getSpecificity = function(selector) { // NOTE this fn is small but extremely naive (and wrongly counts attrs and pseudo-attrs with element-type)
	if (selector.indexOf(',') >= 0) throw Error('getSpecificity does not support selectors that contain COMMA (,)');
	var idCount = selector.split('#').length - 1;
	var classCount = selector.split('.').length - 1;
	var typeCount =
		selector.replace(/\*/g, '') // ignore universals
		.replace(/[>+~]/g, ' ') // descendants don't matter
		.replace(/:+|[#.\[\]]/g, ' ') // prepare to count pseudos and id, class, attr
		.split(/\s+/).length - 1 - aCount - bCount; // and remove id and class counts
	
	return [idCount, classCount, typeCount];
}

var cmpSpecificty = function(s1, s2) { // WARN no sanity checks
	var c1 = DOM.getSpecificity(s1), c2 = DOM.getSpecificity(c2);
	for (var n=c1.length, i=0; i<n; i++) {
		var a = c1[i], b = c2[i];
		if (a > b) return 1;
		if (a < b) return -1;
	}
	return 0;
}

// TODO all this node manager stuff assumes that nodes are only released on unload
// This might need revising

var nodeIdProperty = vendorPrefix + 'ID';
var nodeCount = 0; // used to generated node IDs
var nodeTable = []; // list of tagged nodes
var nodeStorage = {}; // hash of storage for nodes, keyed off `nodeIdProperty`

var uniqueId = function(node) {
	var nodeId = node[nodeIdProperty];
	if (nodeId) return nodeId;
	nodeId = '__' + vendorPrefix + '_' + nodeCount++;
	node[nodeIdProperty] = new String(nodeId); // NOTE so that node cloning in IE doesn't copy the node ID property
	nodeTable.push(node);
	return nodeId;
}

var setData = function(node, data) { // FIXME assert node is element
	var nodeId = uniqueId(node);
	nodeStorage[nodeId] = data;
}

var hasData = function(node) {
	var nodeId = node[nodeIdProperty];
	return !nodeId ? false : nodeId in nodeStorage;
}

var getData = function(node) { // TODO should this throw if no data?
	var nodeId = node[nodeIdProperty];
	if (!nodeId) return;
	return nodeStorage[nodeId];
}

var releaseNodes = function(callback, context) { // FIXME this is never called
	for (var i=nodeTable.length-1; i>=0; i--) {
		var node = nodeTable[i];
		delete nodeTable[i];
		if (callback) callback.call(context, node);
		var nodeId = node[nodeIdProperty];
		delete nodeStorage[nodeId];
	}
	nodeTable.length = 0;
}


var matchesSelector;
_.some(_.words('moz webkit ms o'), function(prefix) {
	var method = prefix + 'MatchesSelector';
	if (document.documentElement[method]) {
		matchesSelector = function(element, selector) { return (element && element.nodeType === 1) ? element[method](selector) : false; }
		return true;
	}
	return false;
});


var matches = matchesSelector ?
function(element, selector, scope) {
	if (scope) selector = absolutizeSelector(selector, scope);
	return matchesSelector(element, selector);
} :
function() { throw Error('matches not supported'); } // NOTE fallback

var closest = matchesSelector ?
function(element, selector, scope) {
	if (scope) selector = absolutizeSelector(selector, scope);
	for (var el=element; el && el.nodeType === 1 && el!==scope; el=el.parentNode) {
		if (matchesSelector(el, selector)) return el;
	}
	return;
} :
function() { throw Error('closest not supported'); } // NOTE fallback

function absolutizeSelector(selector, scope) { // WARN does not handle relative selectors that start with sibling selectors
	switch (scope.nodeType) {
	case 1:
		break;
	case 9: case 11:
		// TODO what to do with document / fragment
		return selector;
	default:
		// TODO should other node types throw??
		return selector;
	}
	var id = scope.id;
	if (!id) id = scope.id = uniqueId(scope);
	var scopePrefix = '#' + id + ' ';
	return scopePrefix + selector.replace(/,(?![^(]*\))/g, ', ' + scopePrefix); // COMMA (,) that is not inside BRACKETS. Technically: not followed by a RHB ')' unless first followed by LHB '(' 
}

var findId = function(id, doc) {
	if (!id) return;
	if (!doc) doc = document;
	if (!doc.getElementById) throw Error('Context for findId() must be a Document node');
	return doc.getElementById(id);
	// WARN would need a work around for broken getElementById in IE <= 7
}

var findAll = document.querySelectorAll ?
function(selector, node, scope) {
	if (!node) node = document;
	if (!node.querySelectorAll) return [];
	if (scope) {
		if (!scope.nodeType) scope = node; // `true` but not the scope element
		selector = absolutizeSelector(selector, scope);
	}
	return _.toArray(node.querySelectorAll(selector));
} :
function() { throw Error('findAll() not supported'); };

var find = document.querySelector ?
function(selector, node, scope) {
	if (!node) node = document;
	if (!node.querySelector) return null;
	if (scope) {
		if (!scope.nodeType) scope = node; // `true` but not the scope element
		selector = absolutizeSelector(selector, scope);
	}
	return node.querySelector(selector);
} :
function() { throw Error('find() not supported'); };

var contains = // WARN `contains()` means contains-or-isSameNode
document.documentElement.contains && function(node, otherNode) {
	if (node === otherNode) return true;
	if (node.contains) return node.contains(otherNode);
	if (node.documentElement) return node.documentElement.contains(otherNode); // FIXME won't be valid on pseudo-docs
	return false;
} ||
document.documentElement.compareDocumentPosition && function(node, otherNode) { return (node === otherNode) || !!(node.compareDocumentPosition(otherNode) & 16); } ||
function(node, otherNode) { throw Error('contains not supported'); };

var addEventListener =
document.addEventListener && function(node, type, listener, capture) { return node.addEventListener(type, listener, capture); } ||
function(node, type, listener, capture) { throw Error('addEventListener not supported'); };

var removeEventListener =
document.removeEventListener && function(node, type, listener, capture) { return node.removeEventListener(type, listener, capture); } ||
function(node, type, listener, capture) { throw Eror('removeEventListener not supported'); };

return {
	getSpecificity: getSpecificity, cmpSpecificty: cmpSpecificty,
	uniqueId: uniqueId, setData: setData, getData: getData, hasData: hasData, // FIXME releaseNodes
	findId: findId, find: find, findAll: findAll, matches: matches, closest: closest,
	contains: contains,
	addEventListener: addEventListener, removeEventListener: removeEventListener
}

})();


/*
 ### Logger (minimal implementation - can be over-ridden)
 */
if (!Meeko.logger) Meeko.logger = (function() {

var logger = {};

var levels = logger.levels = _.words('none error warn info debug');

_.forEach(levels, function(name, num) {
	
levels[name] = num;
logger[name] = !window.console && function() {} ||
	console[name] && function() { if (num <= logger.LOG_LEVEL) console[name].apply(console, arguments); } ||
	function() { if (num <= logger.LOG_LEVEL) console.log.apply(console, arguments); }

}, this);

logger.LOG_LEVEL = levels[defaultOptions['log_level']]; // DEFAULT

return logger;

})(); // end logger definition

var logger = Meeko.logger;

this.Meeko.sprockets = (function() {

var sprockets = {};

var activeListeners = {};

function attachBinding(definition, element) {
	var binding = new Binding(definition);
	DOM.setData(element, binding);
	binding.attach(element);
	return binding;
}

function detachBinding(definition, element) {
	if (!DOM.hasData(element)) throw Error('No binding attached to element');
	var binding = DOM.getData(element);
	if (definition !== binding.definition) throw Error('Mismatch between binding and the definition');
	if (binding.inDocument) binding.leftDocumentCallback();
	binding.detach();
	DOM.setData(element, null);
}


var Binding = function(definition) {
	var binding = this;
	binding.definition = definition;
	binding.object = _.create(definition.prototype);
	binding.listeners = [];
	binding.inDocument = null; // TODO state assertions in attach/onenter/leftDocumentCallback/detach
}

_.assign(Binding, {

getInterface: function(element) {
	var nodeData = DOM.getData(element);
	if (nodeData && nodeData.object) return nodeData;
},

enteredDocumentCallback: function(element) {
	var binding = Binding.getInterface(element);
	if (!binding) return;
	binding.enteredDocumentCallback();
},

leftDocumentCallback: function(element) {
	var binding = Binding.getInterface(element);
	if (!binding) return;
	binding.leftDocumentCallback();
},

managedEvents: [],

manageEvent: function(type) {
	if (_.contains(this.managedEvents, type)) return;
	this.managedEvents.push(type);
	window.addEventListener(type, function(event) {
		// NOTE stopPropagation() prevents custom default-handlers from running. DOMSprockets nullifies it.
		event.stopPropagation = function() { logger.warn('event.stopPropagation() is a no-op'); }
		event.stopImmediatePropagation = function() { logger.warn('event.stopImmediatePropagation() is a no-op'); }
	}, true);
}

});

_.assign(Binding.prototype, {

attach: function(element) {
	var binding = this;
	var definition = binding.definition;
	var object = binding.object;

	object.element = element; 
	if (definition.handlers) _.forEach(definition.handlers, function(handler) {
		var listener = binding.addHandler(handler); // handler might be ignored ...
		if (listener) binding.listeners.push(listener);// ... resulting in an undefined listener
	});
	
	binding.attachedCallback();
},

attachedCallback: function() {
	var binding = this;
	var definition = binding.definition;
	var object = binding.object;

	binding.inDocument = false;
	if (definition.attached) definition.attached.call(object); // FIXME try/catch
},

enteredDocumentCallback: function() {
	var binding = this;
	var definition = binding.definition;
	var object = binding.object;

	binding.inDocument = true;
	if (definition.enteredDocument) definition.enteredDocument.call(object);	
},

leftDocumentCallback: function() {
	var binding = this;
	var definition = binding.definition;
	var object = binding.object;

	binding.inDocument = false;
	if (definition.leftDocument) definition.leftDocument.call(object);	
},

detach: function() {
	var binding = this;
	var definition = binding.definition;
	var object = binding.object;

	_.forEach(binding.listeners, binding.removeListener, binding);
	binding.listeners.length = 0;
	
	binding.detachedCallback();
},

detachedCallback: function() {
	var binding = this;
	var definition = binding.definition;
	var object = binding.object;
	
	binding.inDocument = null;
	if (definition.detached) definition.detached.call(object);	
},

addHandler: function(handler) {
	var binding = this;
	var object = binding.object;
	var element = object.element;
	var type = handler.type;
	var capture = (handler.eventPhase == 1); // Event.CAPTURING_PHASE
	if (capture) {
		logger.warn('Capture phase for events not supported');
		return; // FIXME should this convert to bubbling instead??
	}

	Binding.manageEvent(type);
	var fn = function(event) {
		if (fn.normalize) event = fn.normalize(event);
		return handleEvent.call(object, event, handler);
	}
	fn.type = type;
	fn.capture = capture;
	DOM.addEventListener(element, type, fn, capture);
	return fn;
},

removeListener: function(fn) {
	var binding = this;
	var object = binding.object;
	var element = object.element;
	var type = fn.type;
	var capture = fn.capture;
	var target = (element === document.documentElement && _.contains(redirectedWindowEvents, type)) ? window : element; 
	DOM.removeEventListener(target, type, fn, capture);	
},

});

// WARN polyfill Event#preventDefault
if (!('defaultPrevented' in Event.prototype)) { // NOTE ensure defaultPrevented works
	Event.prototype.defaultPrevented = false;
	Event.prototype._preventDefault = Event.prototype.preventDefault;
	Event.prototype.preventDefault = function() { this.defaultPrevented = true; this._preventDefault(); }
}

function handleEvent(event, handler) {
	var bindingImplementation = this;
	var target = event.target;
	var current = bindingImplementation.element;
	if (!DOM.hasData(current)) throw Error('Handler called on non-bound element');
	if (!matchesEvent(handler, event, true)) return; // NOTE the phase check is below
	var delegator = current;
	if (handler.delegator) {
		var el = DOM.closest(target, handler.delegator, current);
		if (!el) return;
		delegator = el;
	}
	switch (handler.eventPhase) { // FIXME DOMSprockets doesn't intend to support eventPhase
	case 1:
		throw Error('Capture phase for events not supported');
		break;
	case 2:
		if (delegator !== target) return;
		break;
	case 3:
		if (delegator === target) return;
		break;
	default:
		break;
	}

	if (handler.action) {
		var result = handler.action.call(bindingImplementation, event, delegator);
		if (result === false) event.preventDefault();
	}
	return;
}


/*
	TODO: better reporting of invalid content
*/

var convertXBLHandler = function(config) {
	var handler = {}
	handler.type = config.event;
	if (null == config.event) logger.warn('Invalid handler: event property undeclared');

	function lookupValue(attrName, lookup) {
		var attrValue = config[attrName];
		var result;
		if (attrValue) {
			result = lookup[attrValue];
			if (null == result) logger.info('Ignoring invalid property ' + attrName + ': ' + attrValue);
		}
		return result;
	}

	handler.eventPhase = lookupValue('phase', {
		'capture': 1, // Event.CAPTURING_PHASE,
		'target': 2, // Event.AT_TARGET,
		'bubble': 3, // Event.BUBBLING_PHASE,
		'default-action': 0x78626C44 
	}) || 0;

	handler.preventDefault = lookupValue('default-action', {
		'cancel' : true,
		'perform' : false
	}) || false;

	handler.stopPropagation = lookupValue('propagate', {
		'stop': true,
		'continue': false
	}) || false;
	
	function attrText_to_numArray(attr) {				
		var attrText = config[attr];
		if (!attrText) return null;
		var result = [];
		var strings = attrText.split(/\s+/);
		for (var n=strings.length, i=0; i<n; i++) {
			var text = strings[i];
			var num = Number(text);
			if (NaN != num && Math.floor(num) == num) result.push(num);
		}
		return result;
	}

	// Event Filters: mouse / keyboard / text / mutation / modifiers
	
	// mouse
	handler.button = attrText_to_numArray('button');
	handler.clickCount = attrText_to_numArray('click-count');
	
	// keyboard
	handler.key = config.key;
	handler.keyLocation = [];
	var keyLocationText = config['key-location']
	var keyLocationStrings =  (keyLocationText) ? keyLocationText.split(/\s+/) : [];
	for (var n=keyLocationStrings.length, i=0; i<n; i++) {
		var text = keyLocationStrings[i];
		switch (text) {
			case 'standard': handler.keyLocation.push(KeyboardEvent.DOM_KEY_LOCATION_STANDARD); break;
			case 'left': handler.keyLocation.push(KeyboardEvent.DOM_KEY_LOCATION_LEFT); break;
			case 'right': handler.keyLocation.push(KeyboardEvent.DOM_KEY_LOCATION_RIGHT); break;
			case 'numpad': handler.keyLocation.push(KeyboardEvent.DOM_KEY_LOCATION_NUMPAD); break;
		}
	}

	// text
	handler.text = config.text;
	
	// non-standard
	handler.filter = new RegExp(config.filter, '');
	
	// mutation
	// FIXME not supported anymore
	handler.attrName = config['attr-name'];
	handler.attrChange = [];
	var attrChangeText = config['attr-change'];
	var attrChangeStrings =  (attrChangeText) ? attrChangeText.split(/\s+/) : [];
	for (var n=attrChangeStrings.length, i=0; i<n; i++) {
		var text = attrChangeStrings[i];
		switch (text) {
			case 'modification': handler.attrChange.push(MutationEvent.MODIFICATION); break;
			case 'addition': handler.attrChange.push(MutationEvent.ADDITION); break;
			case 'removal': handler.attrChange.push(MutationEvent.REMOVAL); break;
		}
	}
	handler.prevValue = config['prev-value'];
	handler.newValue = config['new-value'];
	
	// modifiers
	// TODO should handler.modifiers be {} or []?
	if (null != config['modifiers']) {
		handler.modifiers = [];
		var modifiersText = config['modifiers'];
		var modifiersStrings = (modifiersText) ? modifiersText.split(/\s+/) : [];
		for (var n=modifiersStrings, i=0; i<n; i++) {
			var text = modifiersStrings[i];
			var m;
			m = /^([+-]?)([a-z]+)(\??)$/.exec(text);
			if (m) {
				var key = m[2];
				var condition = 1; // MUST
				if (m[3]) condition = 0; // OPTIONAL
				else if (m[1] == '+') condition = 1; // MUST
				else if (m[1] == '-') condition = -1; // MUST NOT
				handler.modifiers.push({ key: key, condition: condition });
			}
		}
	}
	else handler.modifiers = null;
	handler.action = config.action;
	
	return handler;
}

var EventModules = {};
EventModules.AllEvents = {};
registerModule('FocusEvents', 'focus blur focusin focusout');
registerModule('MouseEvents', 'click dblclick mousedown mouseup mouseover mouseout mousemove mousewheel');
registerModule('KeyboardEvents', 'keydown keyup');
registerModule('UIEvents', 'load unload abort error select change submit reset resize scroll');

function registerModule(modName, evTypes) {
	var mod = {};
	EventModules[modName] = mod;
	_.forEach(_.words(evTypes), registerEvent, mod);
}
function registerEvent(evType) {
	EventModules.AllEvents[evType] = true;
	this[evType] = true;
}

var matchesEvent = function(handler, event, ignorePhase) {
	// type
	var xblEvents = EventModules.AllEvents;
	var xblMouseEvents = EventModules.MouseEvents;
	var xblKeyboardEvents = EventModules.KeyboardEvents;
	var xblUIEvents = EventModules.UIEvents;

	if (event.type != handler.type) return false;

	// phase
	if (!ignorePhase && !phaseMatchesEvent(handler.eventPhase, event)) return false;
	
	var evType = event.type;

	// MouseEvents
	if (evType in xblMouseEvents) { // FIXME needs testing. Bound to be cross-platform issues still
		if (handler.button && handler.button.length) {
			if (!_.contains(handler.button, event.button) == -1) return false;
		}
		if (handler.clickCount && handler.clickCount.length) { 
			var count = 1;
			// if ('dblclick' == event.type) count = 2;
			if ('click' == event.type) count = (event.detail) ? event.detail : 1;
			if (!_.contains(handler.clickCount, count)) return false;
		}
		if (handler.modifiers) {
			if (!modifiersMatchEvent(handler.modifiers, event)) return false;
		}
	}

	// KeyboardEvents
	// NOTE some of these are non-standard
	var ourKeyIdentifiers = {
		Backspace: 'U+0008', Delete: 'U+007F', Escape: 'U+001B', Space: 'U+0020', Tab: 'U+0009'
	}

	if (evType in xblKeyboardEvents) {
		if (handler.key) {
			var success = false;
			var keyId = event.keyIdentifier;
			if (/^U\+00....$/.test(keyId)) { // TODO Needed for Safari-2. It would be great if this test could be done elsewhere
				keyId = keyId.replace(/^U\+00/, 'U+');
			}
			if (handler.key != keyId && ourKeyIdentifiers[handler.key] != keyId) return false;
		}

		// TODO key-location		
		if (handler.modifiers || handler.key) {
			if (!modifiersMatchEvent(handler.modifiers || [ 'none' ], event)) return false;
		}
	}

	// UI events
	if (evType in xblUIEvents) { } // TODO
	
	// user-defined events
	if (!(evType in xblEvents)) { } // TODO should these be optionally allowed / prevented??

	return true;
}

var modifiersMatchEvent = function(modifiers, event) {
	// TODO comprehensive modifiers list
	// event.getModifierState() -> evMods
	// Need to account for any positives
	// Fields are set to -1 when accounted for
	var evMods = {
		control: event.ctrlKey,
		shift: event.shiftKey,
		alt: event.altKey,
		meta: event.metaKey
	};

	var evMods_any = event.ctrlKey || event.shiftKey || event.altKey || event.metaKey;
	var evMods_none = !evMods_any;

	var any = false;

	if (modifiers)	{
		for (var i=0, n=modifiers.length; i<n; i++) {
			var modifier = modifiers[i];
			switch (modifier.key) {
				case 'none':
					if (evMods_any) return false;
					break;
	
				case 'any':
					any = true;
					break;
	
				default:
					var active = evMods[modifier.key];
					switch (modifier.condition) {
						case -1:
							if (active) return false;
							break;
						case 0:
							if (active) evMods[modifier.key] = -1;
							break;
						case 1:
							if (!active) return false;
							evMods[modifier.key] = -1;
							break;
					}				
			}
		}
	}
	
	if (any) return true;
	
	// Fail if any positive modifiers not accounted for
	for (var key in evMods) {
		if (evMods[key] > 0) return false;
	}
	return true;
}

var isPrototypeOf = {}.isPrototypeOf ?
function(prototype, object) { return prototype.isPrototypeOf(object); } :
function(prototype, object) {
	for (var current=object.__proto__; current; current=current.__proto__) if (current === prototype) return true;
	return false;
};

/* CSS Rules */

function BindingDefinition(desc) {
	_.assign(this, desc);
	if (!this.handlers) this.handlers = [];
}

function BindingRule(selector, bindingDefn) {
	this.selector = selector;
	this.definition = bindingDefn;
}


var bindingRules = sprockets.rules = [];

function applyRuleToEnteredElement(rule, element, callback) { // FIXME compare current and new CSS specifities
	var binding = Binding.getInterface(element);
	if (binding && binding.definition !== rule.definition) {
		logger.warn('Binding rule applied when binding already present');
		return;
	}
	if (!binding) binding = attachBinding(rule.definition, element);
	if (!binding.inDocument) binding.enteredDocumentCallback();
	if (callback) callback(rule, element);
}

function applyRuleToEnteredTree(rule, root, callback) {
	if (!root || root === document) root = document.documentElement;
	if (DOM.matches(root, rule.selector)) applyRuleToEnteredElement(rule, root, callback);
	_.forEach(DOM.findAll(rule.selector, root), function(el) { applyRuleToEnteredElement(rule, el, callback); });
}

_.assign(sprockets, {

registerElement: function(tagName, defn) { // FIXME test tagName
	if (defn.rules) logger.warn('registerElement() does not support rules. Try registerComposite()');
	var bindingDefn = new BindingDefinition(defn);
	var selector = tagName + ', [is=' + tagName + ']'; // TODO why should @is be supported??
	var rule = new BindingRule(selector, bindingDefn);
	bindingRules.push(rule);
	return rule;
}

});


var started = false;

_.assign(sprockets, {

start: function() { // FIXME find a way to allow progressive binding application
	if (started) throw Error('sprockets management has already started');
	started = true;
	this.nodeInserted(document.documentElement);
	observe();
},

nodeInserted: function(node) { // NOTE called AFTER node inserted into document
	if (!started) throw Error('sprockets management has not started yet');
	if (node.nodeType !== 1) return;

	var composites = [];
	_.forEach(bindingRules, function(rule) {
		applyRuleToEnteredTree(rule, node, componentCallback);
	});

	var composite = sprockets.getComposite(node);
	if (composite) applyCompositedRules(node, composite);

	while (composite = composites.shift()) applyCompositedRules(composite);
	
	return;
		
	function enteredComponentCallback(rule, el) {
		var binding = DOM.getData(rule.composite);
		rule.callback.call(binding.object, el);
	}

	function componentCallback(rule, el) {
		var binding = DOM.getData(el);
		if (!binding || !binding.rules) return;
		composites.push(el);
	}

	function applyCompositedRules(node, composite) {
		if (!composite) composite = node;
		var rules = getRules(composite);
		if (rules.length <= 0) return;

		var walker = createCompositeWalker(node, false); // don't skipRoot
		var el;
		while (el = walker.nextNode()) {
			_.forEach(rules, function(rule) {
				var selector = rule.selector; // FIXME absolutizeSelector??
				if (DOM.matches(el, selector)) applyRuleToEnteredElement(rule, el, enteredComponentCallback);
			});
		}
	}
	
	function getRules(composite) { // buffer uses unshift so LIFO
		var rules = [];
		var binding = DOM.getData(composite);
		_.forEach(binding.rules, function(rule) {
			if (!rule.callback) return;
			var clonedRule = _.assign({}, rule);
			clonedRule.composite = composite;
			rules.unshift(clonedRule);
		});
		return rules;
	}
	
},

nodeRemoved: function(node) { // NOTE called AFTER node removed document
	if (!started) throw Error('sprockets management has not started yet');
	if (node.nodeType !== 1) return;

	// TODO leftComponentCallback. Might be hard to implement *after* node is removed
	// FIXME the following logic maybe completely wrong
	Binding.leftDocumentCallback(node);
	_.forEach(DOM.findAll('*', node), Binding.leftDocumentCallback);
}

});

// FIXME this auto DOM Monitoring could have horrible performance for DOM sorting operations
// It would be nice to have a list of moved nodes that could potentially be ignored
var observe = (window.MutationObserver) ?
function() {
	var observer = new MutationObserver(function(mutations, observer) {
		if (!started) return;
		_.forEach(mutations, function(record) {
			if (record.type !== 'childList') return;
			_.forEach(record.addedNodes, sprockets.nodeInserted, sprockets);
			_.forEach(record.removedNodes, sprockets.nodeRemoved, sprockets);
		});
	});
	observer.observe(document, { childList: true, subtree: true });
	
	// FIXME when to call observer.disconnect() ??
} :
function() { // otherwise assume MutationEvents. TODO is this assumption safe?
	document.addEventListener('DOMNodeInserted', function(e) {
		e.stopPropagation();
		if (!started) return;
		Task.asap(function() { sprockets.nodeInserted(e.target); });
	}, true);
	document.body.addEventListener('DOMNodeRemoved', function(e) {
		e.stopPropagation();
		if (!started) return;
		Task.asap(function() { sprockets.nodeRemoved(e.target); });
		// FIXME
	}, true);
};


var SprocketDefinition = function(prototype) {
	var constructor = function(element) {
		return sprockets.cast(element, constructor);
	}
	constructor.prototype = prototype;
	return constructor;
}

_.assign(sprockets, {

registerSprocket: function(selector, definition, callback) { // WARN this can promote any element into a composite
	var rule = {};
	var composite;
	if (typeof selector === 'string') {
		_.assign(rule, {
			selector: selector
		});
		composite = document;
	}
	else {
		_.assign(rule, selector);
		composite = selector.composite;
		delete rule.composite;
	}
	var nodeData = DOM.getData(composite); // NOTE nodeData should always be a binding
	if (!nodeData) {
		nodeData = {};
		DOM.setData(composite, nodeData);
	}
	var nodeRules = nodeData.rules;
	if (!nodeRules) nodeRules = nodeData.rules = [];
	rule.definition = definition;
	rule.callback = callback;
	nodeRules.unshift(rule); // WARN last registered means highest priority. Is this appropriate??
},

register: function(options, sprocket) {
	return sprockets.registerSprocket(options, sprocket);
},

registerComposite: function(tagName, definition) {
	var defn = _.assign({}, definition);
	var rules = defn.rules;
	delete defn.rules;
	if (!rules) logger.warn('registerComposite() called without any sprocket rules. Try registerElement()');
	var onattached = defn.attached;
	defn.attached = function() {
		var object = this;
		if (rules) _.forEach(rules, function(rule) {
			var selector = {
				composite: object.element
			}
			var definition = {};
			var callback;
			if (Array.isArray(rule)) {
				selector.selector = rule[0];
				definition = rule[1];
				callback = rule[2];
			}
			else {
				selector.selector = rule.selector;
				definition = rule.definition;
				callback = rule.callback;
			}
			sprockets.registerSprocket(selector, definition, callback);
		});
		if (onattached) return onattached.call(this);
	};
	return sprockets.registerElement(tagName, defn);
},

registerComponent: function(tagName, sprocket, extras) {
	var defn = { prototype: sprocket.prototype };
	if (extras) {
		defn.handlers = extras.handlers;
		if (extras.sprockets) _.forEach(extras.sprockets, function(oldRule) {
			if (!defn.rules) defn.rules = [];
			var rule = {
				selector: oldRule.matches,
				definition: oldRule.sprocket,
				callback: oldRule.enteredComponent
			}
			defn.rules.push(rule);
		});
		if (extras.callbacks) _.defaults(defn, extras.callbacks);
	}
	if (defn.rules) return sprockets.registerComposite(tagName, defn);
	else return sprockets.registerElement(tagName, defn);
},

evolve: function(base, properties) {
	var prototype = _.create(base.prototype);
	var sub = new SprocketDefinition(prototype);
	var baseProperties = base.prototype.__properties__ || {};
	var subProperties = prototype.__properties__ = {};
	_.forOwn(baseProperties, function(desc, name) {
		subProperties[name] = _.create(desc);
	});
	if (properties) sprockets.defineProperties(sub, properties);
	return sub;
},

defineProperties: function(sprocket, properties) {
	var prototype = sprocket.prototype;
	var definition = prototype.__properties__ || (prototype.__properties__ = {});
	_.forOwn(properties, function(desc, name) {
		switch (typeof desc) {
		case 'object':
			var propDesc = definition[name] || (definition[name] = {});
			_.assign(propDesc, desc);
			Object.defineProperty(prototype, name, {
				get: function() { throw Error('Attempt to get an ARIA property'); },
				set: function() { throw Error('Attempt to set an ARIA property'); }
			});
			break;
		default:
			prototype[name] = desc;
			break;
		}
	});
},

getPropertyDescriptor: function(sprocket, prop) {
	return sprocket.prototype.__properties__[prop];
},

_matches: function(element, sprocket, rule) { // internal utility method which is passed a "cached" rule
	var binding = Binding.getInterface(element);
	if (binding) return prototypeMatchesSprocket(binding.object, sprocket);
	if (rule && DOM.matches(element, rule.selector)) return true; // TODO should make rules scoped by rule.composite
	return false;
},

matches: function(element, sprocket, inComposite) {
	var composite;
	if (inComposite) {
		composite = sprockets.getComposite(element);
		if (!composite) return false;
	}
	var rule = getMatchingSprocketRule(element.parentNode, sprocket, inComposite);
	return sprockets._matches(element, sprocket, rule);
},

closest: function(element, sprocket, inComposite) {
	var composite;
	if (inComposite) {
		composite = sprockets.getComposite(element);
		if (!composite) return;
	}
	var rule = getMatchingSprocketRule(element.parentNode, sprocket, inComposite);
	for (var node=element; node && node.nodeType === 1; node=node.parentNode) {
		if (sprockets._matches(node, sprocket, rule)) return node;
		if (node === composite) return;
	}
},

findAll: function(element, sprocket) { // FIXME this search is blocked by descendant composites (scopes). Is this appropriate?
	var nodeList = [];
	var rule = getMatchingSprocketRule(element, sprocket);
	if (!rule) return nodeList;
	var walker = createCompositeWalker(element, true); // skipRoot
	
	var node;
	while (node = walker.nextNode()) {
		if (DOM.matches(node, rule.selector)) nodeList.push(node);
	}
	return nodeList;
},

find: function(element, sprocket) { // FIXME this search is blocked by descendant composites (scopes). Is this appropriate?
	var rule = getMatchingSprocketRule(element, sprocket);
	if (!rule) return null;
	var walker = createCompositeWalker(element, true); // skipRoot
	
	var node;
	while (node = walker.nextNode()) {
		if (DOM.matches(node, rule.selector)) return node;
	}
	return null;
},

cast: function(element, sprocket) {
	var object = sprockets.getInterface(element);
	if (prototypeMatchesSprocket(object, sprocket)) return object;
	throw Error('Attached sprocket is not compatible');
},

getInterface: function(element) {
	var binding = Binding.getInterface(element);
	if (binding) return binding.object;
	var rule = getSprocketRule(element);
	if (!rule) 	throw Error('No sprocket declared'); // WARN should never happen - should be a universal fallback
	var binding = attachBinding(rule.definition, element);
	return binding.object;
},

isComposite: function(node) {
	if (!DOM.hasData(node)) return false;
	var nodeData = DOM.getData(node);
	if (!nodeData.rules) return false;
	return true;
},

getComposite: function(element) { // WARN this can return `document`. Not sure if that should count
	for (var node=element; node; node=node.parentNode) {
		if (sprockets.isComposite(node)) return node;
	}
}

});

function getSprocketRule(element) {
	var sprocketRule;
	var composite = sprockets.getComposite(element);
	sprocketRule = getRuleFromComposite(composite, element);
	if (sprocketRule) return sprocketRule;
	return getRuleFromComposite(document, element);
}

function getRuleFromComposite(composite, element) {
	var sprocketRule;
	var nodeData = DOM.getData(composite);
	_.some(nodeData.rules, function(rule) {
		if (!DOM.matches(element, rule.selector)) return false; // TODO should be using relative selector
		sprocketRule = { composite: composite };
		_.defaults(sprocketRule, rule);
		return true;
	});
	if (sprocketRule) return sprocketRule;
}

function getMatchingSprocketRule(element, sprocket, inComposite) {
	var sprocketRule;
	var composite = sprockets.getComposite(element);
	sprocketRule = getMatchingRuleFromComposite(composite, sprocket);
	if (inComposite || sprocketRule) return sprocketRule;
	return getMatchingRuleFromComposite(document, sprocket);
}

function getMatchingRuleFromComposite(composite, sprocket) {
	var sprocketRule;
	var nodeData = DOM.getData(composite);
	_.some(nodeData.rules, function(rule) {
		if (typeof sprocket === 'string') {
			if (rule.definition.prototype.role !== sprocket) return false;
		}
		else {
			if (sprocket.prototype !== rule.definition.prototype && !isPrototypeOf(sprocket.prototype, rule.definition.prototype)) return false;
		}
		sprocketRule = { composite: composite };
		_.defaults(sprocketRule, rule);
		return true;
	});
	return sprocketRule;
}

function prototypeMatchesSprocket(prototype, sprocket) {
	if (typeof sprocket === 'string') return (prototype.role === sprocket);
	else return (sprocket.prototype === prototype || isPrototypeOf(sprocket.prototype, prototype));
}

function createCompositeWalker(root, skipRoot) {
	return document.createNodeIterator(
			root,
			1,
			acceptNode,
			null // IE9 throws if this irrelavent argument isn't passed
		);
	
	function acceptNode(el) {
		 return (skipRoot && el === root) ? NodeFilter.FILTER_SKIP : sprockets.isComposite(el) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; 
	}
}

sprockets.trigger = function(target, type, params) { // NOTE every JS initiated event is a custom-event
	if (typeof type === 'object') {
		params = type;
		type = params.type;
	}
	var bubbles = 'bubbles' in params ? !!params.bubbles : true;
	var cancelable = 'cancelable' in params ? !!params.cancelable : true;
	if (typeof type !== 'string') throw Error('trigger() called with invalid event type');
	var detail = params && params.detail;
	var event = document.createEvent('CustomEvent');
	event.initCustomEvent(type, bubbles, cancelable, detail);
	if (params) _.defaults(event, params);
	return target.dispatchEvent(event);
}


var basePrototype = {};
sprockets.Base = new SprocketDefinition(basePrototype); // NOTE now we can extend basePrototype

return sprockets;

})(); // END sprockets


/* Extend BaseSprocket.prototype */
(function() {

var _ = Meeko.stuff;
var DOM = Meeko.DOM;
var sprockets = Meeko.sprockets, Base = sprockets.Base;


_.assign(Base.prototype, {

find: function(selector, scope) { return DOM.find(selector, this.element, scope); },
findAll: function(selector, scope) { return DOM.findAll(selector, this.element, scope); },
matches: function(selector, scope) { return DOM.matches(this.element, selector, scope); },
closest: function(selector, scope) { return DOM.closest(this.element, selector, scope); },

contains: function(otherNode) { return DOM.contains(this.element, otherNode); },

attr: function(name, value) {
	var element = this.element;
	if (typeof value === 'undefined') return element.getAttribute(name);
	if (value == null) element.removeAttribute(name);
	else element.setAttribute(name, value);
},
hasClass: function(token) {
	var element = this.element;
	var text = element.getAttribute('class');
	if (!text) return false;
	return _.contains(_.words(text), token);
},
addClass: function(token) {
	var element = this.element;
	var text = element.getAttribute('class');
	if (!text) {
		element.setAttribute('class', token);
		return;
	}
	if (_.contains(_.words(text), token)) return;
	var n = text.length,
		space = (n && text.charAt(n-1) !== ' ') ? ' ' : '';
	text += space + token;
	element.setAttribute('class', text);
},
removeClass: function(token) {
	var element = this.element;
	var text = element.getAttribute('class');
	if (!text) return;
	var prev = _.words(text);
	var next = [];
	_.forEach(prev, function(str) { if (str !== token) next.push(str); });
	if (prev.length === next.length) return;
	element.setAttribute('class', next.join(' '));
},
toggleClass: function(token, force) {
	var found = this.hasClass(token);
	if (found) {
		if (force) return true;
		this.removeClass(token);
		return false;
	}
	else {
		if (force === false) return false;
		this.addClass(token);
		return true;
	}
},
css: function(name, value) {
	var element = this.element;
	var isKebabCase = (name.indexOf('-') >= 0);
	if (typeof value === 'undefined') return isKebabCase ? element.style.getPropertyValue(name) : element.style[name];
	if (value == null || value === '') {
		if (isKebabCase) element.style.removeProperty(name);
		else element.style[name] = '';
	}
	else {
		if (isKebabCase) element.style.setProperty(name, value);
		else element.style[name] = value;
	}
},

trigger: function(type, params) {
	return sprockets.trigger(this.element, type, params);
}


});

function ucFirst(str) { return str ? str.charAt(0).toUpperCase() + str.substr(1) : ''; }
function camelCase(str) { return str ? _.map(str.split('-'), function(part, i) { return i === 0 ? part : ucFirst(part); }).join('') : ''; }
function kebabCase(str) { return str ? _.map(str.split(/(?=[A-Z])/), function(part, i) { return i === 0 ? part : _.lc(part); }).join('-') : ''; }


// Element.prototype.hidden and visibilitychange event
var Element = window.Element || window.HTMLElement;

Object.defineProperty(Element.prototype, '$', {
	get: function() { return sprockets.getInterface(this); }
});


if (!('hidden' in document.documentElement)) {

	var head = document.head;
	// NOTE on <=IE8 this needs a styleSheet work-around
	var style = document.createElement('style');
	
	var cssText = '*[hidden] { display: none; }\n';
	style.textContent = cssText;
	
	head.insertBefore(style, head.firstChild);

	Object.defineProperty(Element.prototype, 'hidden', {
		get: function() { return this.hasAttribute('hidden'); },
		set: function(value) {
			if (!!value) this.setAttribute('hidden', '');
			else this.removeAttribute('hidden');
			
			// IE9 has a reflow bug. The following forces a reflow. TODO surely there's another work-around??
			var elementDisplayStyle = this.style.display;
			var computedDisplayStyle = window.getComputedStyle(this, null);
			this.style.display = computedDisplayStyle;
			this.style.display = elementDisplayStyle;
		}
	});

}

var SUPPORTS_ATTRMODIFIED = (function() {
	var supported = false;
	var div = document.createElement('div');
	div.addEventListener('DOMAttrModified', function(e) { supported = true; }, false);
	div.setAttribute('hidden', '');
	return supported;
})();

if (window.MutationObserver) {

	var observer = new MutationObserver(function(mutations, observer) {
		_.forEach(mutations, function(entry) {
			triggerVisibilityChangeEvent(entry.target);
		});
	});
	observer.observe(document, { attributes: true, attributeFilter: ['hidden'], subtree: true });
	
}
else if (SUPPORTS_ATTRMODIFIED) {
	
	document.addEventListener('DOMAttrModified', function(e) {
		e.stopPropagation();
		if (e.attrName !== 'hidden') return;
		triggerVisibilityChangeEvent(e.target);
	}, true);
	
}
else logger.warn('element.visibilitychange event will not be supported');

function triggerVisibilityChangeEvent(target) { // FIXME this should be asynchronous
	var visibilityState = target.hidden ? 'hidden' : 'visible';
	sprockets.trigger(target, 'visibilitychange', { bubbles: false, cancelable: false, detail: visibilityState }); // NOTE doesn't bubble to avoid clash with same event on document
}

})();

(function() {

var _ = Meeko.stuff;
var DOM = Meeko.DOM;
var sprockets = Meeko.sprockets, Base = sprockets.Base;

var ariaProperties = { // TODO this lookup is only for default values
	hidden: false,
	selected: false,
	expanded: true
}

var ARIA = sprockets.evolve(Base, {

role: 'roletype',

aria: function(name, value) {
	var element = this.element;
	var defn = ariaProperties[name];
	if (defn == null) throw Error('No such aria property: ' + name);

	if (name === 'hidden') {
		if (typeof value === 'undefined') return element.hasAttribute('hidden');
		if (!value) element.removeAttribute('hidden');
		else element.setAttribute('hidden', '');
		return;
	}
	
	var ariaName = 'aria-' + name;
	var type = typeof defn;
	if (typeof value === 'undefined') {
		var result = element.getAttribute(ariaName);
		switch(type) {
		case 'string': default: return result;
		case 'boolean': return result === 'false' ? false : result == null ? undefined : true;
		}
	}
	if (value == null) element.removeAttribute(ariaName);
	else switch(type) {
		case 'string': default:
			element.setAttribute(ariaName, value);
			break;
		case 'boolean':
			var bool = value === 'false' ? 'false' : value === false ? 'false' : 'true';
			element.setAttribute(ariaName, bool);
			break;
	}
},

ariaCan: function(name, value) {
	var desc = this.__properties__[name];
	if (!desc) throw Error('Property not defined: ' + name);
	if (desc.type !== 'boolean' || desc.can && !desc.can.call(this)) return false;
	return true;
},

ariaToggle: function(name, value) {
	var desc = this.__properties__[name];
	if (!desc) throw Error('Property not defined: ' + name);
	if (desc.type !== 'boolean' || desc.can && !desc.can.call(this)) throw Error('Property can not toggle: ' + name);
	var oldValue = desc.get.call(this);
	
	if (typeof value === 'undefined') desc.set.call(this, !oldValue);
	else desc.set.call(this, !!value);
	return oldValue;
},

ariaGet: function(name) {
	var desc = this.__properties__[name];
	if (!desc) throw Error('Property not defined: ' + name);
	return desc.get.call(this); // TODO type and error handling
},

ariaSet: function(name, value) {
	var desc = this.__properties__[name];
	if (!desc) throw Error('Property not defined: ' + name);
	return desc.set.call(this, value); // TODO type and error handling
}

});

var RoleType = sprockets.evolve(ARIA, {

hidden: {
	type: 'boolean',
	can: function() { return true; },
	get: function() { return this.aria('hidden'); },
	set: function(value) { this.aria('hidden', !!value); }
}

});

sprockets.ARIA = ARIA;
sprockets.RoleType = RoleType;
sprockets.register('*', RoleType);

var Element = window.Element || window.HTMLElement;

_.defaults(Element.prototype, { // NOTE this assumes that the declared sprocket for every element is derived from ARIA

aria: function(prop, value) {
	return this.$.aria(prop, value);
},

ariaCan: function(prop) {
	return this.$.ariaCan(prop);
},

ariaToggle: function(prop, value) {
	return this.$.ariaToggle(prop, value);
},

ariaGet: function(prop) {
	return this.$.ariaGet(prop);
},

ariaSet: function(prop, value) {
	return this.$.ariaSet(prop, value);
},

ariaFind: function(role) {
	return sprockets.find(this, role);
},

ariaFindAll: function(role) {
	return sprockets.findAll(this, role);	
},

ariaClosest: function(role) {
	return sprockets.closest(this, role);
},

ariaMatches: function(role) {
	return sprockets.matches(this, role);
}
	
});


})();


})(window);
/*!
 * HyperFrameset
 * Copyright 2009-2014 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

/* NOTE
	+ assumes DOMSprockets
*/
/* TODO
    + substantial error handling and notification needs to be added
    + <link rel="self" />
    + Would be nice if more of the internal functions were called as method, eg DOM.ready()...
        this would allow the boot-script to modify them as appropriate
    + Up-front feature testing to prevent boot on unsupportable platorms...
        e.g. can't create HTML documents
    + use requestAnimationFrame() when available
    + The passing of nodes between documents needs to be audited.
		Safari and IE10,11 in particular seem to require nodes to be imported / adopted
		(not fully understood right now)
 */

(function() {

var window = this;
var document = window.document;


if (!window.XMLHttpRequest) throw Error('HyperFrameset requires native XMLHttpRequest');
if (!window.Meeko || !window.Meeko.sprockets) throw Error('HyperFrameset requires DOMSprockets');

var vendorPrefix = 'meeko';

var _ = Meeko.stuff; // provided by DOMSprockets

// TODO these additions to Meeko.stuff should go in DOMSprockets

var without = function(a1, a2) {
	var result = [];
	_.forEach(a1, function(item) {
		if (_.contains(a2, item) || _.contains(result, item)) return;
		result.push(item);
	});
	return result;
}

var difference = function(a1, a2) {
	var result = [].concat(
		_.without(a1, a2),
		_.without(a2, a1)
	);
	return result;
}

_.defaults(_, {
	without: without, difference: difference
});
	

var logger = Meeko.logger; // provided by DOMSprockets or even boot-script

var Task = Meeko.Task;
var Promise = Meeko.Promise;

// TODO call these as Promise methods rather than with local vars
var asap = Promise.asap;
var delay = Promise.delay;
var wait = Promise.wait;
var pipe = Promise.pipe;



/*
 ### DOM utility functions
 */

var DOM = Meeko.DOM;

var getTagName = function(el) {
	return el && el.nodeType === 1 ? _.lc(el.tagName) : '';
}

var siblings = function(conf, refNode, conf2, refNode2) {
	
	conf = _.lc(conf);
	if (conf2) {
		conf2 = _.lc(conf2);
		if (conf === 'ending' || conf === 'before') throw Error('siblings() startNode looks like stopNode');
		if (conf2 === 'starting' || conf2 === 'after') throw Error('siblings() stopNode looks like startNode');
		if (!refNode2 || refNode2.parentNode !== refNode.parentNode) throw Error('siblings() startNode and stopNode are not siblings');
	}
	
	var nodeList = [];
	if (!refNode || !refNode.parentNode) return nodeList;
	var node, stopNode, first = refNode.parentNode.firstChild;

	switch (conf) {
	case 'starting': node = refNode; break;
	case 'after': node = refNode.nextSibling; break;
	case 'ending': node = first; stopNode = refNode.nextSibling; break;
	case 'before': node = first; stopNode = refNode; break;
	default: throw Error(conf + ' is not a valid configuration in siblings()');
	}
	if (conf2) switch (conf2) {
	case 'ending': stopNode = refNode2.nextSibling; break;
	case 'before': stopNode = refNode2; break;
	}
	
	if (!node) return nodeList; // FIXME is this an error??
	for (;node && node!==stopNode; node=node.nextSibling) nodeList.push(node);
	return nodeList;
}
var matchesElement = function(selector, node) { // WARN only matches by tagName
	var tag = _.lc(selector);
	var matcher = function(el) {
		return (el.nodeType === 1 && getTagName(el) === tag);
	}
	return (node) ? matcher(node) : matcher;
}
var firstChild = function(parent, matcher) { // WARN only matches by tagName or matcher function
	var fn = (typeof matcher == 'function') ? 
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
	case 'beforebegin': refNode.parentNode.insertBefore(node, refNode); break;
	case 'afterend': refNode.parentNode.insertBefore(node, refNode.nextSilbing); break;
	case 'afterbegin': refNode.insertBefore(node, refNode.firstChild); break;
	case 'beforeend': refNode.appendChild(node); break;
	case 'replace': refNode.parentNode.replaceChild(node, refNode);
	}
	return refNode;
}

var textContent = document.documentElement.textContent ?
function(el, text) { // NOTE https://developer.mozilla.org/en-US/docs/Web/API/Node.textContent#Differences_from_innerText
	if (typeof text === 'undefined') return el.textContent;
	el.textContent = text;
} :
function(el, text) {
	if (typeof text === 'undefined') return el.innerText;
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
	var doc = el.ownerDocument;
	el.appendChild(doc.createTextNode(val)); // NOTE no adoption
}

})();
	
function styleText(node, text) { // TODO IE <style> can have `.sheet` independent of `.textContent` (but probably not for parsed documents)
	if (typeof text === 'undefined') return node.textContent;
	node.textContent = text;
}

var hasAttribute = function(node, attrName) { // WARN needs to be more complex for IE <= 7
	return node.hasAttribute(attrName);
}

var copyAttributes = function(node, srcNode) {
	_.forEach(_.toArray(srcNode.attributes), function(attr) {
		node.setAttribute(attr.name, attr.value); // WARN needs to be more complex for IE <= 7
	});
	return node;
}

var removeAttributes = function(node) {
	_.forEach(_.toArray(node.attributes), function(attr) {
		node.removeAttribute(attr.name);
	});
	return node;
}

var createDocument = function() { // modern browsers. IE >= 9
	var doc = document.implementation.createHTMLDocument('');
	doc.removeChild(doc.documentElement);
	return doc;
}

var createHTMLDocument = function(title) { // modern browsers. IE >= 9
	return document.implementation.createHTMLDocument(title);
}

var cloneDocument = function(srcDoc, options) {
	var doc = createDocument(options);
	var docEl = doc.importNode(srcDoc.documentElement, true);
	doc.appendChild(docEl); // NOTE already adopted

	// WARN sometimes IE9/IE10 doesn't read the content of inserted <style>
	_.forEach(DOM.findAll('style', doc), function(node) {
		if (node.styleSheet && node.styleSheet.cssText == '') styleText(node, styleText(node));
	});
	
	return doc;
}

var scrollToId = function(id) { // FIXME this isn't being used
	if (id) {
		var el = DOM.findId(id);
		if (el) el.scrollIntoView(true);
	}
	else window.scroll(0, 0);
}

var addEvent = 
	document.addEventListener && function(node, event, fn) { return node.addEventListener(event, fn, false); } ||
	document.attachEvent && function(node, event, fn) { return node.attachEvent('on' + event, fn); } ||
	function(node, event, fn) { node['on' + event] = fn; }

var removeEvent = 
	document.removeEventListener && function(node, event, fn) { return node.removeEventListener(event, fn, false); } ||
	document.detachEvent && function(node, event, fn) { return node.detachEvent('on' + event, fn); } ||
	function(node, event, fn) { if (node['on' + event] == fn) node['on' + event] = null; }

var readyStateLookup = { // used in domReady() and checkStyleSheets()
	'uninitialized': false,
	'loading': false,
	'interactive': false,
	'loaded': true,
	'complete': true
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
	'DOMContentLoaded': document,
	'load': window
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

function isVisible(element) {
	var closestHidden = DOM.closest(element, '[hidden]');
	return (!closestHidden);
}


function whenVisible(element) { // FIXME this quite possibly causes leaks if closestHidden is removed from document before removeEventListener
	return new Promise(function(resolve, reject) {	
		var closestHidden = DOM.closest(element, '[hidden]');
		if (!closestHidden) {
			resolve();
			return;
		}
		var listener = function(e) {
			if (e.target.hidden) return;
			closestHidden.removeEventListener('visibilitychange', listener, false);
			whenVisible(element).then(resolve);
		}
		closestHidden.addEventListener('visibilitychange', listener, false);
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
	return _.every(DOM.findAll('link'), function(node) {
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
			case 'NS_ERROR_DOM_SECURITY_ERR': case 'SecurityError':
				return true;
			case 'NS_ERROR_DOM_INVALID_ACCESS_ERR': case 'InvalidAccessError':
				return false;
			default:
				return true;
			}
		} 
	});
}

_.defaults(DOM, {
	getTagName: getTagName, hasAttribute: hasAttribute, matchesElement: matchesElement, // properties
	siblings: siblings, firstChild: firstChild, // selections
	copyAttributes: copyAttributes, removeAttributes: removeAttributes, textContent: textContent, scriptText: scriptText, // attrs
	insertNode: insertNode, // nodes
	ready: domReady, addEvent: addEvent, removeEvent: removeEvent, // events
	createDocument: createDocument, createHTMLDocument: createHTMLDocument, cloneDocument: cloneDocument, // documents
	isVisible: isVisible, whenVisible: whenVisible,
	scrollToId: scrollToId
});

/* parseHTML are AJAX utilities */
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

_.defaults(DOM, {
	parseHTML: parseHTML,
	HTML_IN_XHR: HTML_IN_XHR, HTML_IN_DOMPARSER: HTML_IN_DOMPARSER
});

var CustomDOM = Meeko.CustomDOM = (function() {

function CustomDOM(options) {
	var style = options.style = _.lc(options.style);
	var styleInfo = CustomDOM.namespaceStyles[style];
	if (!styleInfo) throw Error('Unexpected style: ' + style);
	var ns = options.name = _.lc(options.name);
	if (!ns) throw Error('Unexpected name: ' + ns);
	
	var cdom = this;
	_.assign(cdom, options);
	var separator = styleInfo.separator;
	cdom.prefix = cdom.name + separator;
	cdom.selectorPrefix = cdom.name + (separator === ':' ? '\\:' : separator);
}

_.defaults(CustomDOM.prototype, {

mkTagName: function(name) { return this.prefix + name; },
mkSelector: function(name) { return this.selectorPrefix + name; }

});

CustomDOM.separator = {
	'vendor': '-',
	'xml': ':'
};

CustomDOM.namespaceStyles = {
	'vendor': {
		configNamespace: 'custom',
		separator: '-'
	},
	'xml': {
		configNamespace: 'xmlns',
		separator: ':'
	}
}

_.forOwn(CustomDOM.namespaceStyles, function(styleInfo) {
	styleInfo.configPrefix = styleInfo.configNamespace + styleInfo.separator;
});

CustomDOM.getNamespaces = function(doc) { // NOTE modelled on IE8, IE9 document.namespaces interface
	var namespaces = [];
	_.forEach(_.toArray(doc.documentElement.attributes), function(attr) {
		var style;
		var name;
		var fullName = _.lc(attr.name);
		for (var style in CustomDOM.namespaceStyles) {
			var styleInfo = CustomDOM.namespaceStyles[style];
			if (fullName.indexOf(styleInfo.configPrefix) !== 0) continue;
			var name = fullName.substr(styleInfo.configPrefix.length);
			namespaces.push({
				style: style,
				name: name,
				urn: attr.value
			});
			break;
		}
	});
	return namespaces;
}

return CustomDOM;

})();


var URL = Meeko.URL = (function() {

// TODO is this URL class compatible with the proposed DOM4 URL class??

var URL = function(str) {
	if (!(this instanceof URL)) return new URL(str);
	this.parse(str);
}

var keys = ['source','protocol','hostname','port','pathname','search','hash'];
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

var httpProxy = Meeko.httpProxy = (function() {

var methods = _.words('get'); // TODO words('get post put delete');
var responseTypes = _.words('document'); // TODO words('document json text');
var defaultInfo = {
	method: 'get',
	responseType: 'document'
}

// NOTE cache, etc is currently used only for landing page
// FIXME cacheLookup doesn't indicate if a resource is currently being fetched
// TODO an API like ServiceWorker may be more appropriate
var cache = [];

function cacheAdd(request, response) {
	var rq = _.defaults({}, request);
	var resp = _.defaults({}, response);
	resp.document = response.document.cloneNode(true); // TODO handle other response types
	cache.push({
		request: rq,
		response: resp
	});
}

function cacheLookup(request) {
	var response;
	_.some(cache, function(entry) {
		if (!cacheMatch(request, entry)) return false;
		response = entry.response;
		return true;
	});
	if (!response) return;
	var resp = _.defaults({}, response);
	resp.document = response.document.cloneNode(true); // TODO handle other response types
	return resp;
}

function cacheMatch(request, entry) {
	if (request.url !== entry.request.url) return false;
	// FIXME what testing is appropriate?? `method`, other headers??
	return true;
}

var httpProxy = {

add: function(response) { // NOTE this is only for the landing page
	var url = response.url;
	if (!url) throw Error('Invalid url in response object');
	if (!_.contains(responseTypes, response.type)) throw Error('Invalid type in response object');
	var request = {
		url: response.url
	}
	_.defaults(request, defaultInfo);
	response.document = normalize(response.document, request);
	cacheAdd(request, response);
},

load: function(url, requestInfo) {
	var info = {
		url: url
	};
	if (requestInfo) _.defaults(info, requestInfo);
	_.defaults(info, defaultInfo);
	if (!_.contains(methods, info.method)) throw Error('method not supported: ' + info.method);
	if (!_.contains(responseTypes, info.responseType)) throw Error('responseType not supported: ' + info.responseType);
	return request(info);
}

}

var request = function(info) {
	var sendText = null;
	var method = _.lc(info.method);
	switch (method) {
	case 'post':
		throw Error('POST not supported'); // FIXME proper error handling
		info.body = serialize(info.body, info.type);
		return doRequest(info);
		break;
	case 'get':
		var response = cacheLookup(info);
		if (response) return Promise.resolve(response);
		return doRequest(info)
			.then(function(response) {
				cacheAdd(info, response);
				return response;
			});
		break;
	default:
		throw Error(_.uc(method) + ' not supported');
		break;
	}
}

var doRequest = function(info) {
return new Promise(function(resolve, reject) {
	var method = info.method;
	var url = info.url;
	var sendText = info.body; // FIXME not-implemented
	var xhr = new XMLHttpRequest;
	xhr.onreadystatechange = onchange;
	xhr.open(method, url, true);
	if (HTML_IN_XHR) xhr.responseType = info.responseType;
	xhr.send(sendText);
	function onchange() {
		if (xhr.readyState != 4) return;
		if (xhr.status != 200) { // FIXME what about other status codes?
			reject(function() { throw Error('Unexpected status ' + xhr.status + ' for ' + url); });
			return;
		}
		asap(onload); // Use delay to stop the readystatechange event interrupting other event handlers (on IE). 
	}
	function onload() {
		var result = handleResponse(xhr, info);
		resolve(result);
	}
});
}

function handleResponse(xhr, info) { // TODO handle info.responseType
	var response = {
		url: info.url,
		type: info.responseType,
		status: xhr.status,
		statusText: xhr.statusText
	};
	if (HTML_IN_XHR) {
		response.document = normalize(xhr.response, info);
		return response;
	}
	else {
		return parseHTML(new String(xhr.responseText), info)
		.then(function(doc) {
				response.document = doc;
				return response;
		});
	}
}

return httpProxy;

})();


var urlAttributes = URL.attributes = (function() {
	
var AttributeDescriptor = function(tagName, attrName, loads, compound) {
	var testEl = document.createElement(tagName);
	var supported = attrName in testEl;
	var lcAttr = _.lc(attrName); // NOTE for longDesc, etc
	_.defaults(this, { // attrDesc
		tagName: tagName,
		attrName: attrName,
		loads: loads,
		compound: compound,
		supported: supported
	});
}

_.defaults(AttributeDescriptor.prototype, {

resolve: function(el, baseURL) {
	var attrName = this.attrName;
	var url = el.getAttribute(attrName);
	if (url == null) return;
	var finalURL = this.resolveURL(url, baseURL)
	if (finalURL !== url) el.setAttribute(attrName, finalURL);
},

resolveURL: function(url, baseURL) {
	var relURL = _.trim(url);
	var finalURL = relURL;
	switch (relURL.charAt(0)) {
		case '': // empty, but not null. TODO should this be a warning??
			break;
		
		default:
			finalURL = baseURL.resolve(relURL);
			break;
	}
	return finalURL;
}

});

var urlAttributes = {};
_.forEach(_.words('link@<href script@<src img@<longDesc,<src,+srcset iframe@<longDesc,<src object@<data embed@<src video@<poster,<src audio@<src source@<src,+srcset input@formAction,<src button@formAction,<src a@+ping,href area@href q@cite blockquote@cite ins@cite del@cite form@action'), function(text) {
	var m = text.split('@'), tagName = m[0], attrs = m[1];
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

function resolveSrcset(urlSet, baseURL) {
	var urlList = urlSet.split(/\s*,\s*/); // WARN this assumes URLs don't contain ','
	_.forEach(urlList, function(urlDesc, i) {
		urlList[i] = urlDesc.replace(/^\s*(\S+)(?=\s|$)/, function(all, url) { return baseURL.resolve(url); });
	});
	return urlList.join(', ');
}

urlAttributes['img']['srcset'].resolveURL = resolveSrcset;
urlAttributes['source']['srcset'].resolveURL = resolveSrcset;

urlAttributes['a']['ping'].resolveURL = function(urlSet, baseURL) {
	var urlList = urlSet.split(/\s+/);
	_.forEach(urlList, function(url, i) {
		urlList[i] = baseURL.resolve(url);
	});
	return urlList.join(' ');
}

return urlAttributes;

})();

/*
	resolveAll() resolves all URL attributes
*/
var resolveAll = function(doc, baseURL) {

	_.forOwn(urlAttributes, function(attrList, tag) {
		var elts;
		_.forOwn(attrList, function(attrDesc, attrName) {
			if (!elts) elts = DOM.findAll(tag, doc);
			_.forEach(elts, function(el) {
				attrDesc.resolve(el, baseURL);
			});
		});
	});
}



/*
	normalize() is called between html-parsing (internal) and document normalising (external function).
	It is called after using the native parser:
	- with DOMParser#parseFromString(), see HTMLParser#nativeParser()
	- with XMLHttpRequest & xhr.responseType='document', see httpProxy's request()
	The innerHTMLParser also uses this call
*/
function normalize(doc, details) { 

	var baseURL = URL(details.url);

	_.forEach(DOM.findAll('script', doc), function(node) { // FIXME is this needed anymore, now older browsers are not supported?
		if (!node.type || /^text\/javascript$/i.test(node.type)) node.type = 'text/javascript?disabled';
	});

	_.forEach(DOM.findAll('style', doc.body), function(node) { // TODO support <style scoped>
		doc.head.appendChild(node); // NOTE no adoption
	});
	
	_.forEach(DOM.findAll('style', doc.head), function(node) {
		// TODO the following rewrites url() property values but isn't robust
		var text = styleText(node);
		var replacements = 0;
		text = text.replace(/\burl\(\s*(['"]?)([^\r\n]*)\1\s*\)/ig, function(match, quote, url) {
				absURL = baseURL.resolve(url);
				if (absURL === url) return match;
				replacements++;
				return "url(" + quote + absURL + quote + ")";
			});
		if (replacements) styleText(node, text);
	});

	resolveAll(doc, baseURL, false);

	return doc;	
}

var HTMLParser = Meeko.HTMLParser = (function() {

var HTMLParser = function() { // TODO should this receive options
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

function innerHTMLParser(html, details) {
	return pipe(null, [
		
	function() {
		var doc = createHTMLDocument('');
		var docElement = doc.documentElement;
		docElement.innerHTML = html;
		var m = html.match(/<html(?=\s|>)(?:[^>]*)>/i); // WARN this assumes there are no comments containing '<html' and no attributes containing '>'.
		var div = document.createElement('div');
		div.innerHTML = m[0].replace(/^<html/i, '<div');
		var htmlElement = div.firstChild;
		copyAttributes(docElement, htmlElement);
		return doc;
	},
	
	function(doc) {
		normalize(doc, details);
		return doc;
	}
	
	]);
}


_.defaults(HTMLParser.prototype, {
	parse: HTML_IN_DOMPARSER ? nativeParser : innerHTMLParser
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
	supportsSync = (testScript.async === true);

this.push = function(node) {
return new Promise(function(resolve, reject) {
	if (emptying) throw Error('Attempt to append script to scriptQueue while emptying');
	
	// TODO assert node is in document

	if (!node.type || /^text\/javascript$/i.test(node.type)) {
		logger.info('Attempt to queue already executed script ' + node.src);
		resolve(); // TODO should this be reject() ??
		return;
	}

	if (!/^text\/javascript\?disabled$/i.test(node.type)) {
		logger.info('Unsupported script-type ' + node.type);
		resolve(); // TODO should this be reject() ??
		return;
	}

	var script = document.createElement('script');

	if (node.src) addListeners(); // WARN must use `node.src` because attrs not copied to `script` yet
	
	copyAttributes(script, node); 
	scriptText(script, scriptText(node));

	if (script.getAttribute('defer')) { // @defer is not appropriate. Implement as @async
		script.removeAttribute('defer');
		script.setAttribute('async', '');
		logger.warn('@defer not supported on scripts');
	}
	if (supportsSync && script.src && !DOM.hasAttribute(script, 'async')) script.async = false;
	script.type = 'text/javascript';
	
	// enabledFu resolves after script is inserted
	var enabledFu = new Promise(); 
	
	var prev = queue[queue.length - 1], prevScript = prev && prev.script;

	var triggerFu; // triggerFu allows this script to be enabled, i.e. inserted
	if (prev) {
		if (DOM.hasAttribute(prevScript, 'async') || script.src && supportsSync && !DOM.hasAttribute(script, 'async')) triggerFu = prev.enabled;
		else triggerFu = prev.complete; 
	}
	else triggerFu = Promise.resolve();
	
	triggerFu.then(enable, enable);

	var completeFu = new Promise();
	completeFu.then(resolve, reject);

	var current = { script: script, complete: completeFu, enabled: enabledFu };
	queue.push(current);
	return;

	// The following are hoisted
	function enable() {
		insertNode('replace', node, script);
		enabledFu.resolve(); 
		if (!script.src) {
			spliceItem(queue, current);
			completeFu.resolve();
		}
	}
	
	function onLoad(e) {
		removeListeners();
		spliceItem(queue, current);
		completeFu.resolve();
	}

	function onError(e) {
		removeListeners();
		spliceItem(queue, current);
		completeFu.reject(function() { throw Error('Script loading failed'); }); // FIXME throw NetworkError()
	}

	function addListeners() {
		addEvent(script, 'load', onLoad);
		addEvent(script, 'error', onError);
	}
	
	function removeListeners() {
		removeEvent(script, 'load', onLoad);
		removeEvent(script, 'error', onError);
	}
	
	function spliceItem(a, item) {
		for (var n=a.length, i=0; i<n; i++) {
			if (a[i] !== item) continue;
			a.splice(i, 1);
			return;
		}
	}

});
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

var stateTag = 'HyperFrameset';
var currentState;
var popStateHandler;
var started = false;

_.defaults(historyManager, {

getState: function() {
	return currentState;
},

start: function(data, title, url, onNewState, onPopState) { // FIXME this should call onPopState if history.state is defined
return scheduler.now(function() {
	if (started) throw Error('historyManager has already started');
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

if (history.replaceState) window.addEventListener('popstate', function(e) {
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
	if (!settings[stateTag]) throw Error('Invalid settings for new State');
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
		if (state !== currentState) throw Error('Cannot update state: not current');
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
		else reject(function() { throw Error('No `fail` callback passed to whenever()'); });
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

var sprockets = Meeko.sprockets;

var framer = Meeko.framer = (function() {

var hfDefaultNamespace = {
	name: 'hf',
	style: 'vendor'
}

var hfHeadTags = _.words('title meta link style script');

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
	duration: 0
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

lookup: function(url, details) {
	var frameDef = this;
	var options = frameDef.options;
	if (!options.lookup) return;
	var partial = options.lookup(url, details);
	if (!partial) return;
	return inferChangeset(url, partial);
},

detect: function(doc, details) {
	var frameDef = this;
	var options = frameDef.options;
	if (!options.detect) return;
	var partial = options.detect(doc, details);
	if (!partial) return;
	return inferChangeset(details.url, partial);
},

init: function(el) {
    var frameDef = this;
	var frameset = frameDef.frameset;
	var cdom = frameset.cdom;
	_.defaults(frameDef, {
		options: _.defaults({}, HFrameDefinition.options),
		element: el,
		id: el.id,
		type: el.getAttribute('type'),
		mainSelector: el.getAttribute('main') // TODO consider using a hash in `@src`
    });
	var bodies = frameDef.bodies = [];
	_.forEach(_.toArray(el.childNodes), function(node) {
		var tag = getTagName(node);
		if (!tag) return;
		if (tag === 'script') { // TODO factor out common code with <script for=""> evaluation in <head>
			// FIXME only the first <script> should be eval'd. Latter scripts should produce warnings.
			var script = node;
			if (script.src) {
				logger.warn('Ignoring <script> declaration - @src not compatible with HFrame options scripts');
				return;
			}
			var options;
			try {
				options = (Function('return (' + scriptText(script) + ');'))();
			}
			catch(err) { 
				Task.postError(err);
				return; 
			}
			_.assign(frameDef.options, options);
			return;
		}
		if (_.contains(hfHeadTags, tag)) return; // ignore typical <head> elements
		if (tag === cdom.mkTagName('body')) {
			el.removeChild(node);
			bodies.push(new HBodyDefinition(node, frameset));
			return;
		}
		logger.warn('Unexpected element in HFrame: ' + tag);
		return;
	});
	// FIXME create fallback bodies
},

render: function(resource, condition, details) {
	var frameDef = this;
	var frameset = frameDef.frameset;
	var cdom = frameset.cdom;
	if (!details) details = {};
	_.defaults(details, { // TODO more details??
		scope: framer.scope,
		url: resource && resource.url,
		mainSelector: frameDef.mainSelector,
		type: frameDef.type
	});
	var bodyDef = _.find(frameDef.bodies, function(body) { return body.condition === condition;});
	if (!bodyDef) return; // FIXME what to do here??
	return bodyDef.render(resource, details);
}

	
});

return HFrameDefinition;
})();


var HBodyDefinition = (function() {
	
function HBodyDefinition(el, frameset) {
	if (!el) return; // in case of inheritance
	this.frameset = frameset;
	this.init(el);
}

var conditions = _.words('uninitialized loading loaded error');

var conditionAliases = {
	'blank': 'uninitialized',
	'waiting': 'loading',
	'interactive': 'loaded',
	'complete': 'loaded'
}

function normalizeCondition(condition) {
	condition = _.lc(condition);
	if (_.contains(conditions, condition)) return condition;
	return conditionAliases[condition];
}

_.defaults(HBodyDefinition, {
	
conditions: conditions,
conditionAliases: conditionAliases

});

_.defaults(HBodyDefinition.prototype, {

init: function(el) {
	var bodyDef = this;
	var frameset = bodyDef.frameset;
	var cdom = frameset.cdom;
	var condition = el.getAttribute('condition');
	var finalCondition;
	if (condition) {
		finalCondition = normalizeCondition(condition);
		if (!finalCondition) {
			finalCondition = condition;
			logger.warn('Frame body defined with unknown condition: ' + condition);
		}
	}
	else finalCondition = 'loaded';
		
	_.defaults(bodyDef, {
		element: el,
		condition: finalCondition,
		transforms: []
	});
	_.forEach(_.toArray(el.childNodes), function(node) {
		if (getTagName(node) === cdom.mkTagName('transform')) {
			el.removeChild(node);
			bodyDef.transforms.push(new HTransformDefinition(node, frameset));
		}	
	});
	if (!bodyDef.transforms.length && bodyDef.condition === 'loaded') {
		logger.warn('HBody definition for loaded content contains no HTransform definitions');
	}
},

render: function(resource, details) {
	var bodyDef = this;
	var frameset = bodyDef.frameset;
	var cdom = frameset.cdom;
	var fragment;
	if (bodyDef.transforms.length <= 0) {
		return bodyDef.element.cloneNode(true);
	}
	if (!resource) return null;
	var doc = resource.document; // FIXME what if resource is a Request?
	if (!doc) return null;
	fragment = doc;
	if (details.mainSelector) fragment = DOM.find(details.mainSelector, doc);
	_.forEach(bodyDef.transforms, function(transform) {
		fragment = transform.process(fragment, details);
	});
	var el = bodyDef.element.cloneNode(false);
	DOM.insertNode('beforeend', el, fragment);
	return el;
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
		type: el.getAttribute('type') || 'main',
		format: el.getAttribute('format')
    });
	if (transform.type === 'main') transform.format = '';
	var doc = frameset.document; // or el.ownerDocument
	var frag = doc.createDocumentFragment();
	var node;
	while (node = el.firstChild) frag.appendChild(node); // NOTE no adoption
	var processor = transform.processor = framer.createProcessor(transform.type);
	processor.loadTemplate(frag);
},

process: function(srcNode, details) {
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
	var output = processor.transform(decoder, details);
	return output;
}

});

return HTransformDefinition;
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
	if (!partial) return;
	return inferChangeset(url, partial);
},

detect: function(doc, details) {
	var frameset = this;
	var options = frameset.options;
	if (!options.detect) return;
	var partial = options.detect(doc, details);
	if (!partial) return;
	return inferChangeset(details.url, partial);
},

init: function(doc, settings) {
	var frameset = this;
	_.defaults(frameset, {
		options: _.defaults({}, HFramesetDefinition.options),
		frames: {} // all hyperframe definitions. Indexed by @id (which may be auto-generated)
	});

	var hfNS = hfDefaultNamespace;
	frameset.namespaces = CustomDOM.getNamespaces(doc);
	_.some(frameset.namespaces, function(ns) {
		if (_.lc(ns.urn) !== 'hyperframeset') return false;
		hfNS = ns;
		return true;
	});
	
	var cdom = frameset.cdom = new CustomDOM(hfNS);

	// NOTE first rebase scope: urls
	var scopeURL = URL(settings.scope);
	rebase(doc, scopeURL);
	
	var body = doc.body;
	body.parentNode.removeChild(body);
	frameset.document = doc;
	frameset.element = body;
	var frameElts = DOM.findAll(frameset.mkSelector('frame'), body);
	var frameDefElts = [];
	var frameRefElts = [];
	_.forEach(frameElts, function(el, index) { // FIXME hyperframes can't be outside of <body> OR descendants of repetition blocks
		// NOTE first rebase @src with scope: urls
		var src = el.getAttribute('src');
		if (src) {
			var newSrc = rebaseURL(src, scopeURL);
			if (newSrc != src) el.setAttribute('src', newSrc);
		}
		
		// NOTE even if the frame is only a declaration (@def && @def !== @id) it still has its content removed
		var placeholder = el.cloneNode(false);
		el.parentNode.replaceChild(placeholder, el); // NOTE no adoption

		var id = el.getAttribute('id');
		var defId = el.getAttribute('def');
		if (defId && defId !== id) {
			frameRefElts.push(el);
			return;
		}
		if (!id) {
			id = '__frame_' + index + '__'; // FIXME not guaranteed to be unique. Should be a function at top of module
			el.setAttribute('id', id);
		}
		if (!defId) {
			defId = id;
			placeholder.setAttribute('def', defId);
		}
		frameDefElts.push(el);
	});
	_.forEach(frameDefElts, function(el) {
		var id = el.getAttribute('id');
		frameset.frames[id] = new HFrameDefinition(el, frameset);
	});
	_.forEach(frameRefElts, function(el) {
		var defId = el.getAttribute('def');
		if (!frameset.frames[defId]) {
			logger.warn('HyperFrame references non-existant frame #' + defId);
		}
	});
},

render: function() {
	var frameset = this;
	return frameset.element.cloneNode(true);
},

mkSelector: function(selector) {
	var cdom = this.cdom;
	var tags = selector.split(/\s*,\s*|\s+/);
	return _.map(tags, function(tag) { return cdom.mkSelector(tag); }).join(', ');
}



});

/*
 Rebase scope URLs:
	scope:{path}
 is rewritten with `path` being relative to the current scope.
 */

function rebase(doc, scopeURL) {
	_.forOwn(urlAttributes, function(attrList, tag) {
		_.forEach(DOM.findAll(tag, doc), function(el) {
			_.forOwn(attrList, function(attrDesc, attrName) {
				var relURL = el.getAttribute(attrName);
				if (relURL == null) return;
				var url = rebaseURL(relURL, scopeURL);
				if (url != relURL) el[attrName] = url;
			});
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
 
var controllers = (function() {

return {

values: {},

listeners: {},

create: function(name) {
	this.values[name] = [];
	this.listeners[name] = [];
},

has: function(name) {
	return (name in this.values);
},

get: function(name) { 
	if (!this.has(name)) throw name + ' is not a registered controller';
	return this.values[name];
},

set: function(name, value) {
	if (!this.has(name)) throw name + ' is not a registered controller';
	if (value === false || value == null) value = [];
	else if (typeof value === 'string' || !('length' in value)) value = [ value ];
	var oldValue = this.values[name];
	if (_.difference(value, oldValue).length <= 0) return;
	this.values[name] = value;
	_.forEach(this.listeners[name], function(listener) {
		Task.asap(function() { listener(value); });
	});	
},

listen: function(name, listener) {
	if (!this.has(name)) throw name + ' is not a registered controller';
	this.listeners[name].push(listener);
	var value = this.values[name];
	Task.asap(function() { listener(value) });
}

};

})();

var Layer = (function() {

var Layer = sprockets.evolve(sprockets.RoleType, {

role: 'layer'

});

var zIndex = 1;

_.assign(Panel, {

attached: function() {
	this.css('z-index', zIndex++);
}

});

return Layer;
});

var Panel = (function() {

var Panel = sprockets.evolve(sprockets.RoleType, {

role: 'panel',

});

_.assign(Panel, {

attached: function() {
	var height = this.attr('height');
	if (height) this.css('height', height); // FIXME units
	var width = this.attr('width');
	if (width) this.css('width', width); // FIXME units
	var minWidth = this.attr('minwidth');
	if (minWidth) this.css('min-width', minWidth); // FIXME units
}, 

enteredDocument: function() {
	var panel = this;
	var name = panel.attr('name'); 
	var value = panel.attr('value'); 
	if (!name && !value) return;
	panel.ariaToggle('hidden', true);
	if (!name) return; // being controlled by an ancestor
	controllers.listen(name, function(values) {
		panel.ariaToggle('hidden', !(_.contains(values, value)));
	});

}

});

return Panel;
})();

var Layout = (function() { // a Layout is a list of Panel (or other Layout) and perhaps separators for hlayout, vlayout

var Layout = sprockets.evolve(sprockets.RoleType, {

role: 'group',

owns: {
	get: function() { return _.filter(this.element.children, function(el) { return DOM.matches(el, framer.definition.mkSelector('hlayout, vlayout, deck, rdeck, panel, frame')); }); }
}

});

_.assign(Layout, {

attached: function() {
	Panel.attached.call(this);
},

enteredDocument: function() {
	var element = this.element;
	var parent = element.parentNode;
	if (DOM.matches(parent, framer.definition.mkSelector('layer'))) { // TODO vh, vw not tested on various platforms
		var height = this.attr('height'); // TODO css unit parsing / validation
		if (!height) height = '100vh';
		else height = height.replace('%', 'vh');
		this.css('height', height); // FIXME units
		var width = this.attr('width'); // TODO css unit parsing / validation
		if (!width) width = '100vw';
		else width = width.replace('%', 'vw');
		if (width) this.css('width', width); // FIXME units
	}
	_.forEach(_.toArray(element.childNodes), normalizeChild, element);
	return;
	
	function normalizeChild(node) {
		var element = this;
		if (DOM.matches(node, framer.definition.mkSelector('hlayout, vlayout, deck, rdeck, panel, frame'))) return; // FIXME doesn't take into account custom ns and other layout tags
		switch (node.nodeType) {
		case 1: // hide non-layout elements
			node.hidden = true;
			return;
		case 3: // hide text nodes by wrapping in <wbr hidden>
			if (/^\s*$/.test(node.nodeValue )) {
				element.removeChild(node);
				return;
			}
			var wbr = element.ownerDocument.createElement('wbr');
			wbr.hidden = true;
			element.replaceChild(wbr, node); // NOTE no adoption
			wbr.appendChild(node); // NOTE no adoption
			return;
		default:
			return;
		}
	}
}

});

return Layout;
})();

var VLayout = (function() {

var VLayout = sprockets.evolve(Layout, {
});

_.assign(VLayout, {

attached: function() {
	Layout.attached.call(this);
	var hAlign = this.attr('align'); // FIXME assert left/center/right/justify - also start/end (stretch?)
	if (hAlign) this.css('text-align', hAlign); // NOTE defaults defined in <style> above
},

enteredDocument: function() {
	Panel.enteredDocument.call(this);
	Layout.enteredDocument.call(this);
	_.forEach(this.ariaGet('owns'), function(panel) {
	});
}

});

return VLayout;
})();

var HLayout = (function() {

var HLayout = sprockets.evolve(Layout, {
});

_.assign(HLayout, {

attached: function() {
	Layout.attached.call(this);
},

enteredDocument: function() {
	Panel.enteredDocument.call(this);
	Layout.enteredDocument.call(this);
	var vAlign = this.attr('align'); // FIXME assert top/middle/bottom/baseline - also start/end (stretch?)
	_.forEach(this.ariaGet('owns'), function(panel) {
		if (vAlign) panel.$.css('vertical-align', vAlign);
	});
}

});

return HLayout;
})();

var Deck = (function() {

var Deck = sprockets.evolve(Layout, {

activedescendant: {
	set: function(item) { // if !item then hide all children
		
		var element = this.element;
		var panels = this.ariaGet('owns');
		if (item && !_.contains(panels, item)) throw Error('set activedescendant failed: item is not child of deck');
		_.forEach(panels, function(child) {
			if (child === item) child.ariaToggle('hidden', false);
			else child.ariaToggle('hidden', true);
		});
	
	}
}

	
});

_.assign(Deck, {

attached: function() {
	Layout.attached.call(this);
},

enteredDocument: function() {
	Layout.enteredDocument.call(this);
	var deck = this;
	var name = deck.attr('name'); 
	if (!name) {
		deck.ariaSet('activedescendant', deck.ariaGet('owns')[0]);
		return;
	}
	controllers.listen(name, function(values) {
		var panels = deck.ariaGet('owns');
		var active;
		_.some(panels, function(child) { 
			var value = child.getAttribute('value');
			if (!_.contains(values, value)) return false;
			active = child;
			return true;
		});
		if (active) deck.ariaSet('activedescendant', active);
	});

}

});

return Deck;
})();

var ResponsiveDeck = (function() {

var ResponsiveDeck = sprockets.evolve(Deck, {
	
});

_.assign(ResponsiveDeck, {

attached: function() {
	Deck.attached.call(this);
},

enteredDocument: function() {
	Deck.enteredDocument.call(this);
	var width = parseFloat(window.getComputedStyle(this.element, null).width);
	var panels = this.ariaGet('owns');
	var activePanel;
	_.some(panels, function(panel) {
		var minWidth = window.getComputedStyle(panel, null).minWidth;
		if (minWidth == null || minWidth === '' || minWidth === '0px') {
			activePanel = panel;
			return true;
		}
		minWidth = parseFloat(minWidth); // FIXME minWidth should be "NNNpx" but need to test
		if (minWidth > width) return false;
		activePanel = panel;
		return true;
	});
	if (activePanel) {
		activePanel.$.css('height', '100%');
		activePanel.$.css('width', '100%');
		this.ariaSet('activedescendant', activePanel);
	}
}

});

return ResponsiveDeck;
})();


function registerLayoutElements() {

var framesetDef = framer.definition;

sprockets.registerElement(framesetDef.mkSelector('layer'), Layer);
sprockets.registerElement(framesetDef.mkSelector('panel'), Panel);
sprockets.registerElement(framesetDef.mkSelector('vlayout'), VLayout);
sprockets.registerElement(framesetDef.mkSelector('hlayout'), HLayout);
sprockets.registerElement(framesetDef.mkSelector('deck'), Deck);
sprockets.registerElement(framesetDef.mkSelector('rdeck'), ResponsiveDeck);

var cssText = [
'*[hidden] { display: none !important; }', // TODO maybe not !important
'html, body { margin: 0; padding: 0; }',
'html { width: 100%; height: 100%; }',
framesetDef.mkSelector('layer, hlayout, vlayout, deck, rdeck, panel, frame, body') + ' { box-sizing: border-box; }', // TODO http://css-tricks.com/inheriting-box-sizing-probably-slightly-better-best-practice/
framesetDef.mkSelector('layer') + ' { display: block; position: fixed; top: 0; left: 0; width: 0; height: 0; overflow: visible; }',
framesetDef.mkSelector('hlayout, vlayout, deck, rdeck') + ' { display: block; width: 0; height: 0; overflow: hidden; text-align: left; margin: 0; padding: 0; }', // FIXME text-align: start
framesetDef.mkSelector('hlayout, vlayout, deck, rdeck') + ' { width: 100%; height: 100%; }', // FIXME should be 0,0 before manual calculations
framesetDef.mkSelector('frame, panel') + ' { display: block; width: auto; height: auto; overflow: auto; text-align: left; margin: 0; padding: 0; }', // FIXME text-align: start
framesetDef.mkSelector('body') + ' { display: block; width: auto; height: auto; overflow: hidden; margin: 0; }',
framesetDef.mkSelector('vlayout') + ' { height: 100%; overflow: hidden; }',
framesetDef.mkSelector('hlayout') + ' { width: 100%; overflow: hidden; }',
framesetDef.mkSelector('vlayout') + ' > * { display: block; width: 100%; height: auto; text-align: left; }',
framesetDef.mkSelector('hlayout') + ' > * { display: block; float: left; width: auto; height: 100%; vertical-align: top; }',
framesetDef.mkSelector('hlayout') + '::after { clear: both; }',
framesetDef.mkSelector('deck') + ' > * { width: 100%; height: 100%; }',
framesetDef.mkSelector('rdeck') + ' > * { width: 0; height: 0; }',
].join('\n');

var style = document.createElement('style');
styleText(style, cssText);
document.head.insertBefore(style, document.head.firstChild);

}

var HFrame = (function() {

var HFrame = sprockets.evolve(sprockets.RoleType, {

role: 'frame',

init: function() {
	var frame = this;
	_.defaults(frame, {
		frames: [],
		bodyElement: null,
		name: frame.attr('name'),
		src: frame.attr('src'),
		mainSelector: frame.attr('main') // TODO consider using a hash in `@src`
    });
},

frameEntered: function(frame) {
	this.frames.push(frame);
},

frameLeft: function(frame) {
	var index = this.frames.indexOf(frame);
	this.frames.splice(index);
},

preload: function(request) {
	var frame = this;
	return pipe(request, [
		
	function(request) { return frame.definition.render(request, 'loading'); },
	function(result) {
		if (!result) return;
		return frame.insert(result);
	}
	
	]);
},

load: function(response) { // FIXME need a teardown method that releases child-frames	
	var frame = this;
	if (response) frame.src = response.url;
	// else a no-src frame
	return pipe(response, [
	
	function(response) { 
		return frame.definition.render(response, 'loaded', {
			mainSelector: frame.mainSelector
			}); 
	},
	function(result) {
		if (!result) return;
		return frame.insert(result);
	}

	]);
},

insert: function(bodyElement) { // FIXME need a teardown method that releases child-frames	
	var frame = this;
	
	// FIXME .bodyElement will probably become .bodies[] for transition animations.
	if (frame.bodyElement) frame.element.removeChild(frame.bodyElement);
	DOM.insertNode('beforeend', frame.element, bodyElement);
	frame.bodyElement = bodyElement;
},

});

_.assign(HFrame, {

attached: Panel.attached

});

return HFrame;	
})();


var HFrameset = (function() {
	
var HFrameset = sprockets.evolve(sprockets.RoleType, {

role: 'frameset',
isFrameset: true,

init: function() {
	this.frames = [];	
},

frameEntered: function(frame) {
	this.frames.push(frame);
},

frameLeft: function(frame) {
	var index = this.frames.indexOf(frame);
	this.frames.splice(index);
},

render: function() {

	var hframeset = this;
	var definition = hframeset.definition;
	var dstBody = this.element;

	var srcBody = definition.render();
	
	return pipe(null, [

	function() {
		mergeElement(dstBody, srcBody);

		_.forEach(_.toArray(srcBody.childNodes), function(node) {
			DOM.insertNode('beforeend', dstBody, node);
		});
	}

	]);

}

});

_.defaults(HFrameset, {
	
prerender: function(dstDoc, definition) {

	if (getFramesetMarker(dstDoc)) throw Error('The HFrameset has already been applied');

	var srcDoc = cloneDocument(definition.document);

	var selfMarker;
	
	return pipe(null, [

	function() {
		var dstBody = dstDoc.body;
		var node;
		while (node = dstBody.firstChild) dstBody.removeChild(node);
	},

	function() {
		selfMarker = getSelfMarker(dstDoc);
		if (selfMarker) return;
		selfMarker = dstDoc.createElement('link');
		selfMarker.rel = selfRel;
		selfMarker.href = dstDoc.URL;
		dstDoc.head.insertBefore(selfMarker, dstDoc.head.firstChild); // NOTE no adoption
	},

	function() {
		var framesetMarker = dstDoc.createElement('link');
		framesetMarker.rel = framesetRel;
		framesetMarker.href = definition.src;
		dstDoc.head.insertBefore(framesetMarker, selfMarker); // NOTE no adoption
	},
	
	function() {
		mergeElement(dstDoc.documentElement, srcDoc.documentElement);
		mergeElement(dstDoc.head, srcDoc.head);
		mergeHead(dstDoc, srcDoc.head, true);
		// allow scripts to run. FIXME scripts should always be appended to document.head
		var forScripts = [];
		_.forEach(DOM.findAll('script', dstDoc.head), function(script) {
			var forAttr = script.getAttribute('for');
			if (forAttr) { // TODO possibly we want to evaluate forScripts in document order
				forScripts.push(script);
				return;
			}
			scriptQueue.push(script);
		});
		return scriptQueue.empty().then(function() { return forScripts; });
	},
	
	function(forScripts) {
		_.forEach(forScripts, function(script) {
			var forAttr = script.getAttribute('for');
			if (script.src) {
				logger.warn('Ignoring <script> declaration - @for not compatible with @src');
				return;
			}
			var forOptions;
			try {
				forOptions = (Function('return (' + scriptText(script) + ');'))();
			}
			catch(err) { 
				Task.postError(err);
				return; 
			}
			
			var cdom = definition.cdom;
			switch(forAttr) {
			case cdom.mkTagName('frameset'):
				definition.config(forOptions);
				break;
			case cdom.mkTagName('frame'):
				_.assign(HFrameDefinition.options, forOptions);
				break;
			default:
				logger.warn('Unsupported value of @for on <script>: ' + forAttr);
			}
		}); // FIXME this breaks if a script inserts other scripts
	}
	
	]);

}

});

function separateHead(dstDoc, isFrameset) {
	var dstHead = dstDoc.head;
	var framesetMarker = getFramesetMarker(dstDoc);
	if (!framesetMarker) throw Error('No ' + framesetRel + ' marker found. ');

	var selfMarker = getSelfMarker(dstDoc);
	// remove frameset / page elements except for <script type=text/javascript>
	if (isFrameset) _.forEach(siblings('after', framesetMarker, 'before', selfMarker), remove);
	else _.forEach(siblings('after', selfMarker), remove);
	
	function remove(node) {
		if (getTagName(node) == 'script' && (!node.type || node.type.match(/^text\/javascript/i))) return;
		dstHead.removeChild(node);
	}
}

function mergeHead(dstDoc, srcHead, isFrameset) {
	var baseURL = URL(dstDoc.URL);
	var dstHead = dstDoc.head;
	var framesetMarker = getFramesetMarker();
	if (!framesetMarker) throw Error('No ' + framesetRel + ' marker found. ');
	var selfMarker = getSelfMarker();

	separateHead(dstDoc, isFrameset);

	_.forEach(_.toArray(srcHead.childNodes), function(srcNode) {
		if (srcNode.nodeType != 1) return;
		switch (getTagName(srcNode)) {
		case 'title':
			if (isFrameset) return; // ignore <title> in frameset. FIXME what if topic content has no <title>?
			if (!srcNode.innerHTML) return; // IE will add a title even if non-existant
			break;
		case 'link': // FIXME no duplicates @rel, @href pairs
			break;
		case 'meta': // FIXME no duplicates, warn on clash
			if (srcNode.httpEquiv) return;
			break;
		case 'style': 
			break;
		case 'script':  // FIXME no duplicate @src
			break;
		}
		if (isFrameset) insertNode('beforebegin', selfMarker, srcNode);
		else insertNode('beforeend', dstHead, srcNode);
		if (getTagName(srcNode) == 'link') srcNode.href = srcNode.getAttribute('href'); // Otherwise <link title="..." /> stylesheets don't work on Chrome
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
			getTagName(el) == 'link' &&
			framesetRelRegex.test(el.rel);
	});
	return marker;
}

var selfRelRegex = new RegExp('\\b' + selfRel + '\\b', 'i');
function getSelfMarker(doc) {
	if (!doc) doc = document;
	var marker = firstChild(doc.head, function(el) {
		return el.nodeType == 1 &&
			getTagName(el) == 'link' &&
			selfRelRegex.test(el.rel);
	});
	return marker;
}

return HFrameset;
})();


var notify = function(msg) { // FIXME this isn't being used called everywhere it should
	var module;
	switch (msg.module) {
	case 'frameset': module = framer.definition.options; break;
	case 'frame': module = HFrameDefinition.options; break;
	default: return Promise.resolve();
	}
	var handler = module[msg.type];
	if (!handler) return Promise.resolve();
	var listener;

	if (handler[msg.stage]) listener = handler[msg.stage];
	else switch(msg.module) {
	case 'frame':
		listener =
			msg.type == 'bodyLeft' ? (msg.stage == 'before' ? handler : null) :
			msg.type == 'bodyEntered' ? (msg.stage == 'after' ? handler : null) :
			null;
		break;
	case 'frameset':
		listener =
			msg.type == 'leftState' ? (msg.stage == 'before' ? handler : null) :
			msg.type == 'enteredState' ? (msg.stage == 'after' ? handler : null) :
			null;
		break;
	default:
		throw Error(msg.module + ' is invalid module');
		break;
	}

	if (typeof listener == 'function') {
		var promise = asap(function() { listener(msg); }); // TODO isFunction(listener)
		promise['catch'](function(err) { throw Error(err); });
		return promise;
	}
	else return Promise.resolve();
}


var framer = {};

_.defaults(framer, {

frameset: null,

started: false,

start: function(startOptions) {
	var framer = this;
	
	if (framer.started) throw Error('Already started');
	if (!startOptions || !startOptions.contentDocument) throw Error('No contentDocument passed to start()');

	framer.started = true;
	startOptions.contentDocument
	.then(function(doc) { // FIXME potential race condition between document finished loading and frameset rendering
		httpProxy.add({
			url: document.URL,
			type: 'document',
			document: doc
		});
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
		if (!framerConfig) throw Error('No frameset could be determined for this page');
		framer.scope = framerConfig.scope; // FIXME shouldn't set this until loadFramesetDefinition() returns success
		var framesetURL = URL(framerConfig.framesetURL);
		if (framesetURL.hash) logger.info('Ignoring hash component of frameset URL: ' + framesetURL.hash);
		framer.framesetURL = framesetURL.nohash;
		return httpProxy.load(framer.framesetURL, { responseType: 'document' })
		.then(function(response) {
			var framesetDoc = response.document;
			return new HFramesetDefinition(framesetDoc, framerConfig);
		});
	},

	function(definition) {
		framer.definition = definition;
		return HFrameset.prerender(document, definition);
	},
	
	function () {
		var url = document.URL;
		var changeset = framer.currentChangeset = framer.definition.lookup(url, {
			referrer: document.referrer
		});
		// FIXME what if no changeset is returned
		return historyManager.start(changeset, '', document.URL,
				function(state) { }, // FIXME need some sort of rendering status
				function(state) { return framer.onPopState(state.getData()); }
			);
	},
	
	function() {
		window.addEventListener('click', function(e) {
			if (e.defaultPrevented) return;
			var acceptDefault = framer.onClick(e);
			if (acceptDefault === false) e.preventDefault();
		}, false); // onClick generates requestnavigation event
		window.addEventListener('submit', function(e) {
			if (e.defaultPrevented) return;
			var acceptDefault = framer.onSubmit(e);
			if (acceptDefault === false) e.preventDefault();
		}, false);
		
		registerLayoutElements();

		sprockets.registerElement('body', { // FIXME should target the body using 'hf-frameset' as @is
			prototype: HFrameset.prototype, 
			attached: function() {
				var frameset = this;
				frameset.definition = framer.definition;
				if (frameset.init) frameset.init();
				frameset._ready = {};
				frameset.ready = new Promise(frameset._ready); // FIXME should this be in the HFrameset definition?
			}, 
			enteredDocument: function() {
				var frameset = this;
				framer.frameset = frameset;
				frameset.render()
				.then(function() { frameset._ready.resolve(); }); 
			},
			leftDocument: function() { // FIXME should never be called??
				delete framer.frameset;
			},
			handlers: [
			{
				type: 'requestnavigation',
				action: function(e) {
					if (e.defaultPrevented) return;
					var acceptDefault = framer.onRequestNavigation(e, this);
					if (acceptDefault === false) e.preventDefault();
				}
			}
			]
			
			});

		sprockets.registerElement(framer.definition.mkSelector('frame'), {
			prototype: HFrame.prototype,
			attached: function() {
				HFrame.attached.call(this);
				var frame = this;
				var defId = frame.attr('def');
				frame.definition = framer.definition.frames[defId];
				if (frame.init) frame.init();
			},
			enteredDocument: function() {
				var frame = this;
				var parentFrame;
				var parentElement = DOM.closest(frame.element.parentNode, framer.definition.mkSelector('frame')); // TODO frame.element.parentNode.ariaClosest('frame')
				if (parentElement) parentFrame = HFrame(parentElement);
				else {
					parentElement = document.body; // TODO  frame.elenent.parentNode.ariaClosest('frameset'); 
					parentFrame = HFrameset(parentElement);
				}
				frame.parentFrame = parentFrame;
				parentFrame.frameEntered(frame);
				framer.frameEntered(frame);
			},
			leftDocument: function() {
				var frame = this;
				frame.parentFrame.frameLeft(frame);
				delete frame.parentFrame;
				// FIXME notify framer
			},
			
			handlers: [
			{
				type: 'requestnavigation',
				action: function(e) {
					if (e.defaultPrevented) return;
					var acceptDefault = framer.onRequestNavigation(e, this);
					if (acceptDefault === false) e.preventDefault();
				}
			}
			]
			
			});

		return sprockets.start(); // FIXME should be a promise
	},
	
	function() { // NOTE this doesn't prevent start() from resolving
		pipe(null, [

		function() {
			return notify({ // FIXME should this be called before stylesheets are confirmed?
				module: 'frameset',
				type: 'enteredState',
				stage: 'before',
				url: document.URL
			});
		},
		
		function() {
			return HFrameset(document.body).ready;
		},
		
		function() { // FIXME this should wait until at least the landing document has been rendered in one frame
			return notify({
				module: 'frameset',
				type: 'enteredState',
				stage: 'after',
				url: document.URL
			});
		}
		
		]);
	},

	// TODO it would be nice if <body> wasn't populated until stylesheets were loaded
	function() {
		return wait(function() { return checkStyleSheets(); })
	}	
	
	]);

	
},

onClick: function(e) { // return false means success
	var framer = this;

	if (e.button != 0) return; // FIXME what is the value for button in IE's W3C events model??
	if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return; // FIXME do these always trigger modified click behavior??

	// Find closest <a href> to e.target
	var linkElement = DOM.closest(e.target, 'a, [link]');
	if (!linkElement) return;
	var hyperlink;
	if (getTagName(linkElement) === 'a') hyperlink = linkElement;
	else {
		hyperlink = DOM.find('a, link', linkElement);
		if (!hyperlink) hyperlink = DOM.closest('a', linkElement);
		if (!hyperlink) return;
	}
	var href = hyperlink.getAttribute('href');
	if (!href) return; // not really a hyperlink

	var baseURL = URL(document.URL);
	var url = baseURL.resolve(href); // TODO probably don't need to resolve on browsers that support pushstate

	// NOTE The following creates a pseudo-event and dispatches to frames in a bubbling order.
	// FIXME May as well use a virtual event system, e.g. DOMSprockets
	var details = {
		url: url,
		element: hyperlink
	}; // TODO more details?? event??

	framer.triggerRequestNavigation(details.url, details);
	return false;
},

onSubmit: function(e) { // return false means success
	var framer = this;

	// test submit
	var form = e.target;
	if (form.target) return; // no iframe
	var baseURL = URL(document.URL);
	var action = baseURL.resolve(form.action); // TODO probably don't need to resolve on browsers that support pushstate
	
	var details = {
		element: form
	};
	var method = _.lc(form.method);
	switch(method) {
	case 'get':
		var oURL = URL(action);
		var query = encode(form);
		details.url = oURL.nosearch + (oURL.search || '?') + query + oURL.hash;
		break;
	default: return; // TODO handle POST
	}
	
	framer.triggerRequestNavigation(details.url, details);
	return false;
	
	function encode(form) {
		var data = [];
		_.forEach(_.toArray(form.elements), function(el) {
			if (!el.name) return;
			data.push(el.name + '=' + encodeURIComponent(el.value));
		});
		return data.join('&');
	}
},

triggerRequestNavigation: function(url, details) {
	asap(function() {
		var event = document.createEvent('CustomEvent');
		event.initCustomEvent('requestnavigation', true, true, details.url);
		var acceptDefault = details.element.dispatchEvent(event);
		if (acceptDefault !== false) {
			location.assign(details.url);
		}
	});
},

onRequestNavigation: function(e, frame) { // `return false` means success (so preventDefault)
	var framer = this;
	if (!frame) throw Error('Invalid frame / frameset in onRequestNavigation');
	// NOTE only pushState enabled browsers use this
	// We want panning to be the default behavior for clicks on hyperlinks - <a href>
	// Before panning to the next page, have to work out if that is appropriate
	// `return` means ignore the click

	var url = e.detail;
	var details = {
		url: url,
		element: e.target
	}
	
	if (!frame.isFrameset) {
		if (requestNavigation(frame, url, details)) return false;
		return;
	}
	
	// test hyperlinks
	var baseURL = URL(document.URL);
	var oURL = URL(url);
	if (oURL.origin != baseURL.origin) return; // no external urls

	// TODO perhaps should test same-site and same-page links
	var isPageLink = (oURL.nohash === baseURL.nohash); // TODO what about page-links that match the current hash?
	if (isPageLink) {
		framer.onPageLink(url, details);
		return false;
	}

	var frameset = frame;
	var framesetScope = framer.lookup(url);
	if (!framesetScope || !framer.compareFramesetScope(framesetScope)) { // allow normal browser navigation
		return;
	}
	
	if (requestNavigation(frameset, url, details)) return false;
	return;

	function requestNavigation(frame, url, details) { // `return true` means success
		var changeset = frame.definition.lookup(url, details);
		if (!changeset) return false;
		framer.load(url, changeset, frame.isFrameset);
		return true;
	}

},

onPageLink: function(url, details) {
	var framer = this;
	logger.warn('Ignoring on-same-page links for now.'); // FIXME
},

navigate: function(url, changeset) { // FIXME doesn't support replaceState
	var framer = this;	
	return framer.load(url, changeset, true);
},

load: function(url, changeset, changeState) { // FIXME doesn't support replaceState
	var framer = this;	
	var frameset = framer.frameset;
	var mustNotify = changeState || changeState === 0;
	var target = changeset.target;
	var frames = [];
	recurseFrames(frameset, function(frame) {
		if (frame.name !== target) return;
		frames.push(frame);
		return true;
	});
	
	var fullURL = URL(url);
	var hash = fullURL.hash;
	var nohash = fullURL.nohash;
	var request = { method: 'get', url: nohash, responseType: 'document' }; // TODO one day may support different response-type
	var response;

	return pipe(null, [

	function() {
		if (mustNotify) return notify({ // FIXME need a timeout on notify
			module: 'frameset',
			type: 'leftState',
			stage: 'before',
			url: document.URL
			// TODO details, resource, url, frames??
			});
	},
	function() {
		_.forEach(frames, function(frame) {
			frame.preload(request);
		});
	},
	function() {
		return httpProxy.load(nohash, request)
		.then(function(resp) { response = resp; });
	},
	function() {
		if (mustNotify) return notify({ // FIXME need a timeout on notify
			module: 'frameset',
			type: 'enteredState',
			stage: 'before',
			url: url
			// TODO details, resource, url, frames??
			});
	},
	function() { // FIXME how to handle `hash` if present??
		if (changeState) return historyManager.pushState(changeset, '', url, function(state) {
				loadFrames(frames, response);
			});
		else return loadFrames(frames, response);
	},
	function() { // FIXME need to wait for the DOM to stabilize before this notification
		if (mustNotify) return notify({ // FIXME need a timeout on notify
			module: 'frameset',
			type: 'enteredState',
			stage: 'after',
			url: url
			// TODO details, resource, url, frames??
			});
	}
		
	]);

	function loadFrames(frames, response) { // TODO promisify
		_.forEach(frames, function(frame) {
			frame.attr('src', response.url);
			if (DOM.isVisible(frame.element)) frame.load(response); // FIXME if !isVisible then **probably** handled by framer.frameEntered code
		});
	}
	
	function recurseFrames(parentFrame, fn) {
		_.forEach(parentFrame.frames, function(frame) {
			var found = fn(frame);
			if (!found) recurseFrames(frame, fn);
		});			
	}
},

frameEntered: function(frame) {
	if (frame.name === framer.currentChangeset.target) { // FIXME should only be used at startup
		frame.attr('src', framer.currentChangeset.url);
	}

	DOM.whenVisible(frame.element).then(function() { // FIXME could be clash with loadFrames() above

	var src = frame.attr('src');

	if (src == null) { // a non-src frame
		return frame.load(null, { condition: 'loaded' });
	}

	if (src === '') {
		return; // FIXME frame.load(null, { condition: 'uninitialized' })
	}
	
	var fullURL = URL(src);
	var nohash = fullURL.nohash;
	var hash = fullURL.hash;
	
	var request = { method: 'get', url: nohash, responseType: 'document'};
	return pipe(null, [ // FIXME how to handle `hash` if present??
	
	function() { return frame.preload(request); },
	function() { return httpProxy.load(nohash, request); },
	function(response) { return frame.load(response); }

	]);

	});
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
	framer.load(url, changeset, 0);
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
	if (typeof result !== 'object' || !result.scope || !result.framesetURL) throw Error('Unexpected result from frameset lookup');
	return result;
},

detect: function(srcDoc) {
	var framer = this;
	if (!framer.options.detect) return;
	var result = framer.options.detect(srcDoc);
	if (result == null) return null;

	// FIXME error if `result` is a relative URL
	if (typeof result === 'string') result = implyFramesetScope(result, document.URL);
	if (typeof result !== 'object' || !result.scope || !result.framesetURL) throw Error('Unexpected result from frameset detect');
	return result;
},

compareFramesetScope: function(settings) {
	var framer = this;
	if (framer.framesetURL !== settings.framesetURL) return false;
	if (framer.scope !== settings.scope) return false;
	return true;
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
		throw Error('Invalid changeset returned from lookup()');
		break;
	}
	
	return inferred;
}


_.defaults(framer, {

options: {
	/* The following options are available (unless otherwise indicated) *
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

_.defaults(framer, {

	controllers: controllers,
	HFrameDefinition: HFrameDefinition,
	HFramesetDefinition: HFramesetDefinition,
	HFrame: HFrame,
	HFrameset: HFrameset,
	Layer: Layer,
	HLayout: HLayout,
	VLayout: VLayout,
	Deck: Deck,
	ResponsiveDeck: ResponsiveDeck

});

return framer;

})();

// end framer defn

}).call(window);

/*!
 * HyperFrameset Processors and Decoders
 * Copyright 2014-2015 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

/* NOTE
	+ assumes DOMSprockets + HyperFrameset
*/
/* TODO
    + The passing of nodes between documents needs to be audited.
		Safari and IE10,11 in particular seem to require nodes to be imported / adopted
		(not fully understood right now)
 */

(function(classnamespace) {

var window = this;
var document = window.document;

var _ = Meeko.stuff;
var DOM = Meeko.DOM;
var Task = Meeko.Task;
var logger = Meeko.logger;
var framer = Meeko.framer;

var MainProcessor = (function() {

function MainProcessor() {}

_.defaults(MainProcessor.prototype, {

loadTemplate: function(template) {
	if (/\S+/.test(DOM.textContent(template))) logger.warn('"main" transforms do not use templates');
},

transform: function(provider, details) { // TODO how to use details?
	var srcNode = provider.srcNode;
	var srcDoc = srcNode.nodeType === 9 ? srcNode : srcNode.ownerDocument;
	var main;
	if (!main) main = DOM.find('main, [role=main]', srcNode);
	if (!main && srcNode === srcDoc) main = srcDoc.body;
	if (!main) main = srcNode;

	var frag = srcDoc.createDocumentFragment();
	var node;
	while (node = main.firstChild) frag.appendChild(node); // NOTE no adoption
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
			switch (DOM.getTagName(node)) {
			case 'script':
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
	try { this.processor = (Function('return (' + DOM.scriptText(script) + ')'))(); }
	catch(err) { Task.postError(err); }
	
	if (!this.processor || !this.processor.transform) {
		logger.warn('"script" transform template did not produce valid transform object');
		return;
	}
},

transform: function(provider, details) {
	var srcNode = provider.srcNode;
	var processor = this.processor;
	if (!this.processor || !this.processor.transform) {
		logger.warn('"script" transform template did not produce valid transform object');
		return;
	}
	return this.processor.transform(srcNode, details);
}
	
});


return ScriptProcessor;
})();

framer.registerProcessor('script', ScriptProcessor);


// NOTE textAttr & htmlAttr used in HazardProcessor & CSSDecoder
var textAttr = '_text';
var htmlAttr = '_html';

var HazardProcessor = (function() {

var hazNamespace = 'haz';
var hazAttrPrefix = hazNamespace + ':';
var exprNamespace = 'expr';
var exprPrefix = exprNamespace + ':';
var mexprNamespace = 'mexpr';
var mexprPrefix = mexprNamespace + ':';
var exprTextAttr = exprPrefix + textAttr;
var exprHtmlAttr = exprPrefix + htmlAttr;

function hazAttrs(el, varPrefix) {
	if (!varPrefix) varPrefix = "";
	var values = {};
	_.forEach(_.words('if unless each var template'), function(name) {
		values[varPrefix + name] = hazAttr(el, name);
	});
	return values;
}

function hazAttr(el, attr) {
	var hazAttrName = hazAttrPrefix + attr;
	if (!DOM.hasAttribute(el, hazAttrName)) return false;
	var value = el.getAttribute(hazAttrName);
	el.removeAttribute(hazAttrName);
	return value;
}

function HazardProcessor() {

}

_.defaults(HazardProcessor.prototype, {
	
loadTemplate: function(template) {
	var processor = this;
	processor.top = template;
	processor.templates = {};
	_.forEach(DOM.findAll('[id]', template), function(el) {
		var id = el.getAttribute('id');
		processor.templates[id] = el;
	});
},

transform: function(provider, details) { // TODO how to use details
	var clone = this.top.cloneNode(true);
	return this.transformNode(clone, provider, null, {});
},

transformTree: function(el, provider, context, variables) {
	var doc = el.ownerDocument;
	var processor = this;
	
	var haz = hazAttrs(el, '_');

	if (haz._template) {
		template = processor.templates[haz._template];
		if (!template) {
			logger.warn('Hazard could not find template #' + haz._template);
			return;
		}
		var tagName = DOM.getTagName(el);
		var templateTagName = DOM.getTagName(template);
		if (tagName !== templateTagName) {
			logger.warn('Hazard found mismatched tagNames between template ' + templateTagName + '#' + haz._template + ' and ' + tagName);
		}
		
		el = template.cloneNode(true);
		
		// Now remove @id and @haz:
		el.removeAttribute('id');
		hazAttrs(el);
	}

	if (haz._each === false) {
		return processNode(el, provider, context, variables); // NOTE return value === el
	}
	
	// handle each
	var subVars = _.defaults({}, variables);
	var subContexts;
	try {
		subContexts = provider.evaluate(haz._each, context, variables, 'array');
	}
	catch (err) {
		Task.postError(err);
		logger.warn('Error evaluating @haz:each="' + haz._each + '". Assumed empty.');
		return;
	}
	var result = doc.createDocumentFragment(); // FIXME which is the right doc to create this frag in??
	
	_.forEach(subContexts, function(subContext) {
		if (haz._var) subVars[haz._var] = subContext;
		var srcEl = el.cloneNode(true);
		var newEl = processNode(srcEl, provider, subContext, subVars); // NOTE newEl === srcEl
		if (newEl) result.appendChild(newEl); // NOTE no adoption
	});
	
	return result;

	function processNode(node, provider, context, variables) {
		var keep;
		if (haz._if !== false) {
			try {
				keep = provider.evaluate(haz._if, context, variables, 'boolean');
			}
			catch (err) {
				Task.postError(err);
				logger.warn('Error evaluating @haz:if="' + haz._if + '". Assumed false.');
				keep = false;
			}
			if (!keep) return;
		}
		if (haz._unless !== false) {
			try {
				var keep = !provider.evaluate(haz._unless, context, variables, 'boolean');
			}
			catch(err) {
				Task.postError(err);
				logger.warn('Error evaluating @haz:unless="' + haz._unless + '". Assumed false.');
				keep = true;
			}
			if (!keep) return;
		}
		return processor.transformNode(node, provider, context, variables); // NOTE return value === node
	}
	
},

transformNode: function(node, provider, context, variables) {
	var processor = this;
	
	var nodeType = node.nodeType;
	if (!nodeType) return node;
	if (nodeType !== 1 && nodeType !== 11) return node;
	var deep = true;
	if (nodeType === 1 && (DOM.hasAttribute(node, exprTextAttr) || DOM.hasAttribute(node, exprHtmlAttr))) deep = false;
	if (nodeType === 1) transformSingleElement(node, provider, context, variables);
	if (!deep) return node;

	_.forEach(_.toArray(node.childNodes), function(current) {
		if (current.nodeType !== 1) return;
		var newChild = processor.transformTree(current, provider, context, variables);
		if (newChild !== current) {
			if (newChild && newChild.nodeType) node.replaceChild(newChild, current);
			else node.removeChild(current); // FIXME warning if newChild not empty
		}
	});
	return node;
}

});


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
		var value;
		try {
			value = (prefix === mexprPrefix) ?
				evalMExpression(expr, provider, context, variables, type) :
				evalExpression(expr, provider, context, variables, type);
		}
		catch (err) {
			Task.postError(err);
			logger.warn('Error evaluating @' + attr.name + '="' + attr.value + '". Assumed false.');
			value = false;
		}
		setAttribute(el, attrName, value);
	});
}

function setAttribute(el, attrName, value) {
	var type = typeof value;
	switch (attrName) {
	case textAttr:
		if (type === 'undefined' || type === 'boolean' || value == null) value = '';
		DOM.textContent(el, value);
		break;
	case htmlAttr:
		if (type === 'undefined' || type === 'boolean' || value == null) value = '';
		el.innerHTML = '';
		if (value && value.nodeType) DOM.insertNode('beforeend', el, value);
		else el.innerHTML = value;
		break;
	default:
		if (type === 'undefined' || type === 'boolean' || value == null) {
			if (!value) el.removeAttribute(attrName);
			else el.setAttribute(attrName, '');
		}
		else {
			el.setAttribute(attrName, value.toString());
		}
		break;
	}
}

function evalMExpression(mexpr, provider, context, variables, type) { // FIXME mexpr not compatible with type === 'node'
	return mexpr.replace(/\{\{((?:[^}]|\}(?=\}\})|\}(?!\}))*)\}\}/g, function(all, expr) {
		return evalExpression(expr, provider, context, variables, type);
	});
}

function evalExpression(expr, provider, context, variables, type) { // FIXME robustness
	var doc = (context && context.nodeType) ? // TODO which document
		(context.nodeType === 9 ? context : context.ownerDocument) : 
		document; 
	var exprParts = expr.split('|');
	var value = provider.evaluate(exprParts.shift(), context, variables, type);

	switch (type) {
	case 'text':
		if (value && value.nodeType) value = DOM.textContent(value);
		break;
	case 'node':
		var frag = doc.createDocumentFragment();
		if (value && value.nodeType) frag.appendChild(doc.importNode(value, true)); // NOTE no adoption
		else {
			var div = doc.createElement('div');
			div.innerHTML = value;
			var node;
			while (node = div.firstChild) frag.appendChild(node); // NOTE no adoption
		}
		value = frag;
		break;
	default: // FIXME should never occur. logger.warn !?
		if (value && value.nodeType) value = DOM.textContent(value);
		break;
	}

	_.forEach(exprParts, function(scriptBody) {
		var fn = Function('value', 'return (' + scriptBody + ');');
		value = fn(value);
	});

	return value;
}

return HazardProcessor;	
})();

framer.registerProcessor('hazard', HazardProcessor);


var CSSDecoder = (function() {

function CSSDecoder() {}

_.defaults(CSSDecoder.prototype, {

init: function(node) {
	this.srcNode = node;
},

evaluate: function(query, context, variables, type) {
	if (!context) context = this.srcNode;
	var doc = context.nodeType === 9 ? context : context.ownerDocument; // FIXME which document??
	var queryParts = query.match(/^\s*([^{]*)\s*(?:\{\s*([^}]*)\s*\}\s*)?$/);
	var selector = queryParts[1];
	var attr = queryParts[2];
	if (type === 'array') { // haz:each
		if (attr) logger.warn('Ignoring attribute selector because evaluate() requested array');
		return findAll(context, selector, variables);
	}
	var node = find(context, selector, variables);
	if (attr) {
		attr = _.trim(attr);
		if (attr.charAt(0) === '@') attr = attr.substr(1);
	}

	switch(type) {
	case 'text': // expr:attr or expr:.text
		if (!node) return '';
		switch(attr) {
		case null: case undefined: case '': case textAttr: return DOM.textContent(node);
		case htmlAttr: return node.innerHTML;
		default: return node.getAttribute(attr);
		}
	case 'boolean': // haz:if
		if (!node) return false;
		switch(attr) {
		case null: case undefined: case '': return true;
		case textAttr: case htmlAttr: return !/^\s*$/.test(DOM.textContent(node)); // FIXME potentially heavy. Implement as a DOM utility isEmptyNode()
		default: return DOM.hasAttribute(node, nodeattr);
		}
	case 'node': // expr:.html
		switch(attr) {
		case null: case undefined: case '': return node;
		case textAttr: return DOM.textContent(node);
		case htmlAttr:
			var frag = doc.createDocumentFragment();
			_.forEach(node.childNodes, function(child) { 
				frag.appendChild(doc.importNode(child, true)); // TODO does `child` really need to be cloned??
			});
			return frag;
		default: return node.getAttribute(attr);
		}
	default: return node; // TODO shouldn't this be an error / warning??
	}
}

});

function find(context, selectorGroup, variables) {
	if (_.trim(selectorGroup) === '') return context;
	var finalSelector = expandSelector(context, selectorGroup, variables);
	return context.querySelector(finalSelector); // FIXME DOM.find
}

function findAll(context, selectorGroup, variables) {
	if (_.trim(selectorGroup) === '') return [ context ];
	var finalSelector = expandSelector(context, selectorGroup, variables);
	return context.querySelectorAll(finalSelector); // FIXME DOM.findAll
}

var uidIndex = 0;
function expandSelector(context, selectorGroup, variables) { // FIXME currently only implements `context` expansion
	var isRoot = context.nodeType === 9 || context.nodeType === 11;
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


var Microdata = (function() {

function intersects(a1, a2) { // TODO add to Meeko.stuff
	return _.some(a1, function(i1) {
		return _.some(a2, function(i2) { 
			return i2 === i1; 
		});
	});
}

function walkTree(root, skipRoot, callback) { // callback(el) must return NodeFilter code
	var walker = document.createNodeIterator(
			root,
			1,
			acceptNode,
			null // IE9 throws if this irrelavent argument isn't passed
		);
	
	var el;
	while (el = walker.nextNode());

	function acceptNode(el) {
		if (skipRoot && el === root) return NodeFilter.FILTER_SKIP;
		return callback(el);
	}
}


function getView(rootNode) {
	if (!rootNode) rootNode = document;

	return getScopeDesc(rootNode);
	

	function getScopeDesc(scopeEl) {
		var scopeDesc = {
			element: scopeEl,
			isScope: true,
			type: scopeEl.nodeType === 1 || _.words(scopeEl.getAttribute('itemtype')),
			properties: createHTMLPropertiesCollection(),
			childScopes: []
		}

		walkTree(scopeEl, true, function(el) {
			var isScope = el.hasAttribute('itemscope');
			var propName = el.getAttribute('itemprop');
			if (!(isScope || propName)) return NodeFilter.FILTER_SKIP;
			
			var item = isScope ? getScopeDesc(el) : getPropDesc(el);
			if (propName) scopeDesc.properties.addNamedItem(propName, item);
			else scopeDesc.childScopes.push(item);

			return isScope ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
		});

		return scopeDesc;
	}
	
}

function getPropDesc(el) {
	var name = el.getAttribute('itemprop');
	
	var prop = {
		element: el,
		name: name,
		value: getValue(el)
	}
	
	return prop;
}

function getValue(el) {
	var tagName = el.tagName.toLowerCase();
	var attrName = valueAttr[tagName];
	if (attrName) return el[attrName] || el.getAttribute(attrName);

	return el;
}

function getItems(scope, type) {
	var typeList = 
		(typeof type === 'string') ? _.words(_.trim(type)) :
		type.length ? type :
		[];
			
	var resultList = [];

	_.forEach(scope.properties.names, function(propName) {
		var propList = scope.properties.namedItem(propName);
		_.forEach(propList, function(prop) {
			if (prop.isScope) [].push.apply(resultList, getItems(prop, typeList));
		});
	});

	_.forEach(scope.childScopes, function(scope) {
		if (!typeList.length || intersects(scope.type, typeList)) resultList.push(scope);
		[].push.apply(resultList, getItems(scope, typeList));
	});

	return resultList;
}

function createHTMLPropertiesCollection() {
	var list = [];
	list.names = [];
	list.byName = {};
	_.assign(list, HTMLPropertiesCollection.prototype);
	return list;
}

var HTMLPropertiesCollection = function() {}
_.assign(HTMLPropertiesCollection.prototype, {

namedItem: function(name) {
	return this.byName[name];
},

addNamedItem: function(name, item) {
	this.push(item);
	if (!this.byName[name]) {
		this.byName[name] = [];
		this.names.push(name);
	}
	this.byName[name].push(item);
}

});


var valueAttr = {};
_.forEach(_.words("meta@content link@href a@href area@href img@src video@src audio@src source@src track@src iframe@src embed@src object@data time@datetime data@value meter@value"), function(text) {
	var m = text.split("@"), tagName = m[0], attrName = m[1];
	valueAttr[tagName] = attrName;
});


return {

getView: getView,
getItems: getItems

}

})();

var MicrodataDecoder = (function() {

function MicrodataDecoder() {}

_.defaults(MicrodataDecoder.prototype, {

init: function(node) {
	this.view = Microdata.getView(node);
},

evaluate: function(query, context, variables, type) {
	if (!context) context = this.view;

	var query = _.trim(query);
	var startAtRoot = false;
	var baseSchema;
	var pathParts;

	if (query === '.') return (type === 'array') ? [ context ] : context;

	var m = query.match(/^(?:(\^)?\[([^\]]*)\]\.)/);
	if (m && m.length) {
		query = query.substr(m[0].length);
		startAtRoot = !!m[1];
		baseSchema = _.words(_.trim(m[2]));
	}
	pathParts = _.words(_.trim(query));
	
	var scopes;
	if (baseSchema) {
		if (startAtRoot) context = this.view;
		scopes = Microdata.getItems(context, baseSchema);	
	}
	else scopes = [ context ];

	if (type === 'array') {
		var resultList = scopes;
		_.forEach(pathParts, function(relPath, i) {
			var parents = resultList;
			resultList = [];
			_.forEach(parents, function(desc) {
				var props = desc.properties.namedItem(relPath);
				if (props) [].push.apply(resultList, props);
			});
		});
		return _.map(resultList, function(desc) {
			if (desc.isScope) return desc;
			return desc.value;
		});
	}

	var item = scopes[0];
	_.every(pathParts, function(relPath, i) {
		var props = item.properties.namedItem(relPath);
		item = null;
		if (!props || !props.length) return false;
		item = props[0];
		if (item == null) return false;
		return true;
	});
	
	var value = item && item.value;

	switch(type) {
	case 'text': // expr:attr or expr:.text
		if (!value) return '';
		if (value.nodeType && value.nodeType === 1) return DOM.textContent(value);
		return value;
	case 'boolean': // haz:if
		if (!value) return false;
		return true;
	case 'node': // expr:.html
		return value;
	default: return value; // TODO shouldn't this be an error / warning??
	}
}

});

return MicrodataDecoder;
})();

framer.registerDecoder('microdata', MicrodataDecoder);


_.assign(classnamespace, {

MainProcessor: MainProcessor,
ScriptProcessor: ScriptProcessor,
HazardProcessor: HazardProcessor,
CSSDecoder: CSSDecoder,
MicrodataDecoder: MicrodataDecoder

});


}).call(window, Meeko.framer);
