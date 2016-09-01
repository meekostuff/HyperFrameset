/*!
 DOM utils
 (c) Sean Hogan, 2008,2012,2013,2014
 Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
*/

/* NOTE
Requires some features not implemented on older browsers:
element.matchesSelector (or prefixed equivalent) - IE9+
element.querySelectorAll - IE8+
element.addEventListener - IE9+
element.dispatchEvent - IE9+
Object.create - IE9+
*/

(function() {

var window = this;
var document = window.document;

var Meeko = window.Meeko;
var _ = window._ || Meeko.stuff; // WARN this could potentially use underscore.js / lodash.js but HAS NOT BEEN TESTED!!!
var Promise = Meeko.Promise;

/*
 ### DOM utility functions
 */
var DOM = Meeko.DOM = (function() {

// TODO all this node manager stuff assumes that nodes are only released on unload
// This might need revising

// TODO A node-manager API would be useful elsewhere

var nodeIdSuffix = Math.round(Math.random() * 1000000);
var nodeIdProperty = '__' + vendorPrefix + nodeIdSuffix;
var nodeCount = 0; // used to generated node IDs
var nodeTable = []; // list of tagged nodes
var nodeStorage = {}; // hash of storage for nodes, keyed off `nodeIdProperty`

var uniqueId = function(node) {
	var nodeId = node[nodeIdProperty];
	if (nodeId) return nodeId;
	nodeId = '__' + nodeCount++;
	node[nodeIdProperty] = nodeId; // WARN would need `new String(nodeId)` in IE<=8
			// so that node cloning doesn't copy the node ID property
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

var getTagName = function(el) {
	return el && el.nodeType === 1 ? _.lc(el.tagName) : '';
}


var getTagName = function(el) {
	return el && el.nodeType === 1 ? _.lc(el.tagName) : '';
}

var matchesSelector;

if (document.documentElement.matches) matchesSelector = function(element, selector) {
	return (element && element.nodeType === 1) ? element.matches(selector) : false; 
}
else _.some(_.words('moz webkit ms o'), function(prefix) {
	var method = prefix + 'MatchesSelector';
	if (document.documentElement[method]) {
		matchesSelector = function(element, selector) { return (element && element.nodeType === 1) ? element[method](selector) : false; }
		return true;
	}
	return false;
});


var matches = matchesSelector ?
function(element, selector, scope) {
	if (!(element && element.nodeType === 1)) return false;
	if (typeof selector === 'function') return selector(element, scope);
	return scopeify(function(absSelector) {
		return matchesSelector(element, absSelector);
	}, selector, scope);
} :
function() { throw Error('matches not supported'); } // NOTE fallback

var closest = matchesSelector ?
function(element, selector, scope) {
	if (typeof selector === 'function') {
		for (var el=element; el && el!==scope; el=el.parentNode) {
			if (el.nodeType !== 1) continue;
			if (selector(el, scope)) return el;
		}
		return null;
	}
	return scopeify(function(absSelector) {

		for (var el=element; el && el!==scope; el=el.parentNode) {
			if (el.nodeType !== 1) continue;
			if (matchesSelector(el, absSelector)) return el;
		}

	}, selector, scope);
} :
function() { throw Error('closest not supported'); } // NOTE fallback

function scopeify(fn, selector, scope) {
	var absSelector = selector;
	if (scope) {
		var uid = uniqueId(scope);
		scope.setAttribute(nodeIdProperty, uid);
		absSelector = absolutizeSelector(selector, scope);
	}

	var result = fn(absSelector);

	if (scope) {
		scope.removeAttribute(nodeIdProperty);
	}

	return result;
}

function absolutizeSelector(selectorGroup, scope) { // WARN does not handle relative selectors that start with sibling selectors
	switch (scope.nodeType) {
	case 1:
		break;
	case 9: case 11:
		// TODO what to do with document / fragment
		return selectorGroup;
	default:
		// TODO should other node types throw??
		return selectorGroup;
	}
	
	var nodeId = uniqueId(scope);
	var scopeSelector = '[' + nodeIdProperty + '=' + nodeId + ']';

	// split on COMMA (,) that is not inside BRACKETS. Technically: not followed by a RHB ')' or ']' unless first followed by LHB '(' or '[' 
	var selectors = selectorGroup.split(/,(?![^\(]*\)|[^\[]*\])/);
	selectors = _.map(selectors, function(s) {
		if (/^:scope\b/.test(s)) return s.replace(/^:scope\b/, scopeSelector);
		else return scopeSelector + ' ' + s;
	});
		
	return selectors.join(', ');
}

var findId = function(id, doc) {
	if (!id) return;
	if (!doc) doc = document;
	if (!doc.getElementById) throw Error('Context for findId() must be a Document node');
	return doc.getElementById(id);
	// WARN would need a work around for broken getElementById in IE <= 7
}

var findAll = document.querySelectorAll ?
function(selector, node, scope, inclusive) {
	if (!node) node = document;
	if (!node.querySelectorAll) return [];
	if (scope && !scope.nodeType) scope = node; // `true` but not the scope element
	return scopeify(function(absSelector) {
		var result = _.map(node.querySelectorAll(absSelector));
		if (inclusive && matchesSelector(node, absSelector)) result.unshift(node);
		return result;
	}, selector, scope);
} :
function() { throw Error('findAll() not supported'); };

var find = document.querySelector ?
function(selector, node, scope, inclusive) {
	if (!node) node = document;
	if (!node.querySelector) return null;
	if (scope && !scope.nodeType) scope = node; // `true` but not the scope element
	return scopeify(function(absSelector) {
		if (inclusive && matchesSelector(node, absSelector)) return node;
		return node.querySelector(absSelector);
	}, selector, scope);
} :
function() { throw Error('find() not supported'); };

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

var contains = // WARN `contains()` means contains-or-isSameNode
document.documentElement.contains && function(node, otherNode) {
	if (node === otherNode) return true;
	if (node.contains) return node.contains(otherNode);
	if (node.documentElement) return node.documentElement.contains(otherNode); // FIXME won't be valid on pseudo-docs
	return false;
} ||
document.documentElement.compareDocumentPosition && function(node, otherNode) { return (node === otherNode) || !!(node.compareDocumentPosition(otherNode) & 16); } ||
function(node, otherNode) { throw Error('contains not supported'); };

function dispatchEvent(target, type, params) { // NOTE every JS initiated event is a custom-event
	if (typeof type === 'object') {
		params = type;
		type = params.type;
	}
	var bubbles = params && 'bubbles' in params ? !!params.bubbles : true;
	var cancelable = params && 'cancelable' in params ? !!params.cancelable : true;
	if (typeof type !== 'string') throw Error('trigger() called with invalid event type');
	var detail = params && params.detail;
	var event = document.createEvent('CustomEvent');
	event.initCustomEvent(type, bubbles, cancelable, detail);
	if (params) _.defaults(event, params);
	return target.dispatchEvent(event);
}

var managedEvents = [];

function manageEvent(type) {
	if (_.includes(managedEvents, type)) return;
	managedEvents.push(type);
	window.addEventListener(type, function(event) {
		// NOTE stopPropagation() prevents custom default-handlers from running. DOMSprockets nullifies it.
		event.stopPropagation = function() { console.warn('event.stopPropagation() is a no-op'); }
		event.stopImmediatePropagation = function() { console.warn('event.stopImmediatePropagation() is a no-op'); }
	}, true);
}

var SUPPORTS_ATTRMODIFIED = (function() {
	var supported = false;
	var div = document.createElement('div');
	div.addEventListener('DOMAttrModified', function(e) { supported = true; }, false);
	div.setAttribute('hidden', '');
	return supported;
})();

// DOM node visibilitychange implementation and monitoring
if (!('hidden' in document.documentElement)) { // implement 'hidden' for older browsers

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
			
			// IE9 has a reflow bug. The following forces a reflow. FIXME can we stop suporting IE9
			var elementDisplayStyle = this.style.display;
			var computedDisplayStyle = window.getComputedStyle(this, null);
			this.style.display = computedDisplayStyle;
			this.style.display = elementDisplayStyle;
		}
	});
}

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
		if (e.attrName !== 'hidden') return;
		triggerVisibilityChangeEvent(e.target);
	}, true);
	
}
else console.warn('element.visibilitychange event will not be supported');

// FIXME this should use observers, not events
function triggerVisibilityChangeEvent(target) {
	var visibilityState = target.hidden ? 'hidden' : 'visible';
	DOM.dispatchEvent(target, 'visibilitychange', { bubbles: false, cancelable: false, detail: visibilityState }); // NOTE doesn't bubble to avoid clash with same event on document (and also performance)
}

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


var insertNode = function(conf, refNode, node) { // like imsertAdjacentHTML but with a node and auto-adoption
	var doc = refNode.ownerDocument;
	if (doc.adoptNode) node = doc.adoptNode(node); // Safari 5 was throwing because imported nodes had been added to a document node
	switch(conf) {

	case 'before':
	case 'beforebegin': refNode.parentNode.insertBefore(node, refNode); break;

	case 'after':
	case 'afterend': refNode.parentNode.insertBefore(node, refNode.nextSibling); break;

	case 'start':
	case 'afterbegin': refNode.insertBefore(node, refNode.firstChild); break;

	case 'end':
	case 'beforeend': refNode.appendChild(node); break;

	case 'replace': refNode.parentNode.replaceChild(node, refNode); break;

	case 'empty':
	case 'contents': 
		// TODO DOM.empty(refNode);
		var child;
		while (child = refNode.firstChild) refNode.removeChild(child);
		refNode.appendChild(node);
		break;
	}
	return refNode;
}

var adoptContents = function(parentNode, doc) {
	if (!doc) doc = document;
	var frag = doc.createDocumentFragment();
	var node;
	while (node = parentNode.firstChild) frag.appendChild(doc.adoptNode(node));
	return frag;
}
	
/* 
NOTE:  for more details on how checkStyleSheets() works cross-browser see 
http://aaronheckmann.blogspot.com/2010/01/writing-jquery-plugin-manager-part-1.html
TODO: does this still work when there are errors loading stylesheets??
*/
// TODO would be nice if this didn't need to be polled
// TODO should be able to use <link>.onload, see
// http://stackoverflow.com/a/13610128/108354
// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link
var checkStyleSheets = function() { 
	// check that every <link rel="stylesheet" type="text/css" /> 
	// has loaded
	return _.every(DOM.findAll('link'), function(node) {
		if (!node.rel || !/^stylesheet$/i.test(node.rel)) return true;
		if (node.type && !/^text\/css$/i.test(node.type)) return true;
		if (node.disabled) return true;
		
		// handle IE
		if (node.readyState) return readyStateLookup[node.readyState];

		var sheet = node.sheet;

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

// WARN IE <= 8 would need styleText() to get/set <style> contents
// WARN old non-IE would need scriptText() to get/set <script> contents

var copyAttributes = function(node, srcNode) {
	_.forEach(_.map(srcNode.attributes), function(attr) {
		node.setAttribute(attr.name, attr.value); // WARN needs to be more complex for IE <= 7
	});
	return node;
}

var removeAttributes = function(node) {
	_.forEach(_.map(node.attributes), function(attr) {
		node.removeAttribute(attr.name);
	});
	return node;
}

var CREATE_DOCUMENT_COPIES_URL = (function() {
	var doc = document.implementation.createHTMLDocument('');
	return doc.URL === document.URL;
})();

var CLONE_DOCUMENT_COPIES_URL = (function() {
	try {
		var doc = document.cloneNode(false);
		if (doc.URL === document.URL) return true;
	}
	catch (err) { }
	return false;
})();
		
// NOTE we want create*Document() to have a URL
var CREATE_DOCUMENT_WITH_CLONE = !CREATE_DOCUMENT_COPIES_URL && CLONE_DOCUMENT_COPIES_URL;

var createDocument = function(srcDoc) { // modern browsers. IE >= 9
	if (!srcDoc) srcDoc = document;
	// TODO find doctype element??
	var doc;
	if (CREATE_DOCUMENT_WITH_CLONE) { 
		doc = srcDoc.cloneNode(false);
	}
	else {
		doc = srcDoc.implementation.createHTMLDocument('');
		doc.removeChild(doc.documentElement);
	}
	return doc;
}

var createHTMLDocument = function(title, srcDoc) { // modern browsers. IE >= 9
	if (!srcDoc) srcDoc = document;
	// TODO find doctype element??
	var doc;
	if (CREATE_DOCUMENT_WITH_CLONE) { 
		doc = srcDoc.cloneNode(false);
		docEl = doc.createElement('html');
		docEl.innerHTML = '<head><title>' + title + '</title></head><body></body>';
		doc.appendChild(docEl);
	}
	else {
		doc = srcDoc.implementation.createHTMLDocument(title);
	}
	return doc;
}

var cloneDocument = function(srcDoc) {
	var doc = DOM.createDocument(srcDoc);
	var docEl = doc.importNode(srcDoc.documentElement, true);
	doc.appendChild(docEl); // NOTE already adopted

	// WARN sometimes IE9/IE10/IE11 doesn't read the content of inserted <style>
	// NOTE this doesn't seem to matter on IE10+. The following is precautionary
	_.forEach(DOM.findAll('style', doc), function(node) {
		var sheet = node.sheet;
		if (!sheet || sheet.cssText == null) return;
		if (sheet.cssText != '') return;
		node.textContent = node.textContent;
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

if (!loaded) _.forOwn(events, function(node, type) { node.addEventListener(type, onLoaded, false); });

return domReady;

// NOTE the following functions are hoisted
function onLoaded(e) {
	loaded = true;
	_.forOwn(events, function(node, type) { node.removeEventListener(type, onLoaded, false); });
	processQueue();
}

})();

return {
	uniqueIdAttr: nodeIdProperty,
	uniqueId: uniqueId, setData: setData, getData: getData, hasData: hasData, // FIXME releaseNodes
	getTagName: getTagName,
	contains: contains, matches: matches,
	findId: findId, find: find, findAll: findAll, closest: closest, siblings: siblings,
	dispatchEvent: dispatchEvent, manageEvent: manageEvent,
	adoptContents: adoptContents,
	SUPPORTS_ATTRMODIFIED: SUPPORTS_ATTRMODIFIED, 
	isVisible: isVisible, whenVisible: whenVisible,
	insertNode: insertNode, 
	checkStyleSheets: checkStyleSheets,
	copyAttributes: copyAttributes, removeAttributes: removeAttributes, // attrs
	ready: domReady, // events
	createDocument: createDocument, createHTMLDocument: createHTMLDocument, cloneDocument: cloneDocument, // documents
	scrollToId: scrollToId
}

})();


}).call(this);
