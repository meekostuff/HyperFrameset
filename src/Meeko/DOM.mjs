/*!
 DOM utils
 (c) Sean Hogan, 2008,2012,2013,2014
 Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
*/

/* NOTE
Requires some features not implemented on older browsers:
MutationOberver - IE10+
element.matchesSelector (or prefixed equivalent) - IE9+
element.querySelectorAll - IE8+
element.addEventListener - IE9+
element.dispatchEvent - IE9+
Object.create - IE9+
*/

import * as _ from './stuff.mjs';
import Thenfu from './Thenfu.mjs';

const vendorPrefix = 'meeko'; // FIXME DRY with other instances of `vendorPrefix`

let document = window.document;

/*
 ### DOM utility functions
 */

// TODO all this node manager stuff assumes that nodes are only released on unload
// This might need revising

// TODO A node-manager API would be useful elsewhere

const nodeIdSuffix = Math.round(Math.random() * 1000000);
const nodeIdProperty = '__' + vendorPrefix + nodeIdSuffix;
let nodeCount = 0; // used to generated node IDs
let nodeTable = []; // list of tagged nodes
let nodeStorage = {}; // hash of storage for nodes, keyed off `nodeIdProperty`

function uniqueId(node) {
	let nodeId = node[nodeIdProperty];
	if (nodeId) return nodeId;
	nodeId = '__' + nodeCount++;
	node[nodeIdProperty] = nodeId; // WARN would need `new String(nodeId)` in IE<=8
			// so that node cloning doesn't copy the node ID property
	nodeTable.push(node);
	return nodeId;
}

function setData(node, data) { // FIXME assert node is element
	let nodeId = uniqueId(node);
	nodeStorage[nodeId] = data;
}

function hasData(node) {
	let nodeId = node[nodeIdProperty];
	return !nodeId ? false : nodeId in nodeStorage;
}

function getData(node) { // TODO should this throw if no data?
	let nodeId = node[nodeIdProperty];
	if (!nodeId) return;
	return nodeStorage[nodeId];
}

function releaseNodes(callback, context) { // FIXME this is never called
	for (let i=nodeTable.length-1; i>=0; i--) {
		let node = nodeTable[i];
		delete nodeTable[i];
		if (callback) callback.call(context, node);
		let nodeId = node[nodeIdProperty];
		delete nodeStorage[nodeId];
	}
	nodeTable.length = 0;
}

function getTagName(el) {
	return el && el.nodeType === 1 ? _.lc(el.tagName) : '';
}

let matchesSelector;

if (document.documentElement.matches) matchesSelector = function(element, selector) {
	return (element && element.nodeType === 1) ? element.matches(selector) : false; 
}
else _.some(_.words('moz webkit ms o'), function(prefix) {
	let method = prefix + 'MatchesSelector';
	if (document.documentElement[method]) {
		matchesSelector = function(element, selector) { return (element && element.nodeType === 1) ? element[method](selector) : false; }
		return true;
	}
	return false;
});


let matches = matchesSelector ?
function(element, selector, scope) {
	if (!(element && element.nodeType === 1)) return false;
	if (typeof selector === 'function') return selector(element, scope);
	return scopeify(function(absSelector) {
		return matchesSelector(element, absSelector);
	}, selector, scope);
} :
function() { throw Error('matches not supported'); } // NOTE fallback

let closest = matchesSelector ?
function(element, selector, scope) {
	if (typeof selector === 'function') {
		for (let el=element; el && el!==scope; el=el.parentNode) {
			if (el.nodeType !== 1) continue;
			if (selector(el, scope)) return el;
		}
		return null;
	}
	return scopeify(function(absSelector) {

		for (let el=element; el && el!==scope; el=el.parentNode) {
			if (el.nodeType !== 1) continue;
			if (matchesSelector(el, absSelector)) return el;
		}

	}, selector, scope);
} :
function() { throw Error('closest not supported'); } // NOTE fallback

function scopeify(fn, selector, scope) {
	let absSelector = selector;
	if (scope) {
		let uid = uniqueId(scope);
		scope.setAttribute(nodeIdProperty, uid);
		absSelector = absolutizeSelector(selector, scope);
	}

	let result = fn(absSelector);

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
	
	let nodeId = uniqueId(scope);
	let scopeSelector = '[' + nodeIdProperty + '=' + nodeId + ']';

	// split on COMMA (,) that is not inside BRACKETS. Technically: not followed by a RHB ')' or ']' unless first followed by LHB '(' or '[' 
	let selectors = selectorGroup.split(/,(?![^\(]*\)|[^\[]*\])/);
	selectors = _.map(selectors, function(s) {
		if (/^:scope\b/.test(s)) return s.replace(/^:scope\b/, scopeSelector);
		else return scopeSelector + ' ' + s;
	});
		
	return selectors.join(', ');
}

function findId(id, doc) {
	if (!id) return;
	if (!doc) doc = document;
	if (!doc.getElementById) throw Error('Context for findId() must be a Document node');
	return doc.getElementById(id);
	// WARN would need a work around for broken getElementById in IE <= 7
}

let findAll = document.querySelectorAll ?
function(selector, node, scope, inclusive) {
	if (!node) node = document;
	if (!node.querySelectorAll) return [];
	if (scope && !scope.nodeType) scope = node; // `true` but not the scope element
	return scopeify(function(absSelector) {
		let result = _.map(node.querySelectorAll(absSelector));
		if (inclusive && matchesSelector(node, absSelector)) result.unshift(node);
		return result;
	}, selector, scope);
} :
function() { throw Error('findAll() not supported'); };

let find = document.querySelector ?
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

function siblings(conf, refNode, conf2, refNode2) {
	
	conf = _.lc(conf);
	if (conf2) {
		conf2 = _.lc(conf2);
		if (conf === 'ending' || conf === 'before') throw Error('siblings() startNode looks like stopNode');
		if (conf2 === 'starting' || conf2 === 'after') throw Error('siblings() stopNode looks like startNode');
		if (!refNode2 || refNode2.parentNode !== refNode.parentNode) throw Error('siblings() startNode and stopNode are not siblings');
	}
	
	let nodeList = [];
	if (!refNode || !refNode.parentNode) return nodeList;
	let node, stopNode, first = refNode.parentNode.firstChild;

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

let contains = // WARN `contains()` means contains-or-isSameNode
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
	let bubbles = params && 'bubbles' in params ? !!params.bubbles : true;
	let cancelable = params && 'cancelable' in params ? !!params.cancelable : true;
	if (typeof type !== 'string') throw Error('trigger() called with invalid event type');
	let detail = params && params.detail;
	let event = document.createEvent('CustomEvent');
	event.initCustomEvent(type, bubbles, cancelable, detail);
	if (params) _.defaults(event, params);
	return target.dispatchEvent(event);
}

let managedEvents = [];

function manageEvent(type) {
	if (_.includes(managedEvents, type)) return;
	managedEvents.push(type);
	window.addEventListener(type, function(event) {
		// NOTE stopPropagation() prevents custom default-handlers from running. DOMSprockets nullifies it.
		event.stopPropagation = function() { console.warn('event.stopPropagation() is a no-op'); }
		event.stopImmediatePropagation = function() { console.warn('event.stopImmediatePropagation() is a no-op'); }
	}, true);
}

// DOM node visibilitychange implementation and monitoring
let observer = new MutationObserver(function(mutations, observer) {
	_.forEach(mutations, function(entry) {
		triggerVisibilityChangeEvent(entry.target);
	});
});
observer.observe(document, { attributes: true, attributeFilter: ['hidden'], subtree: true });

// FIXME this should use observers, not events
function triggerVisibilityChangeEvent(target) {
	let visibilityState = target.hidden ? 'hidden' : 'visible';
	dispatchEvent(target, 'visibilitychange', { bubbles: false, cancelable: false, detail: visibilityState }); // NOTE doesn't bubble to avoid clash with same event on document (and also performance)
}

function isVisible(element) {
	let closestHidden = closest(element, '[hidden]');
	return (!closestHidden);
}


function whenVisible(element) { // FIXME this quite possibly causes leaks if closestHidden is removed from document before removeEventListener
	return new Thenfu(function(resolve, reject) {
		let closestHidden = closest(element, '[hidden]');
		if (!closestHidden) {
			resolve();
			return;
		}
		let listener = function(e) {
			if (e.target.hidden) return;
			closestHidden.removeEventListener('visibilitychange', listener, false);
			whenVisible(element).then(resolve);
		}
		closestHidden.addEventListener('visibilitychange', listener, false);
	});
}


function insertNode(conf, refNode, node) { // like imsertAdjacentHTML but with a node and auto-adoption
	let doc = refNode.ownerDocument;
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
		// TODO empty(refNode);
		let child;
		while (child = refNode.firstChild) refNode.removeChild(child);
		refNode.appendChild(node);
		break;
	}
	return refNode;
}

function adoptContents(parentNode, doc) {
	if (!doc) doc = document;
	let frag = doc.createDocumentFragment();
	let node;
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
function checkStyleSheets() {
	// check that every <link rel="stylesheet" type="text/css" /> 
	// has loaded
	return _.every(findAll('link'), function(node) {
		if (!node.rel || !/^stylesheet$/i.test(node.rel)) return true;
		if (node.type && !/^text\/css$/i.test(node.type)) return true;
		if (node.disabled) return true;
		
		// handle IE
		if (node.readyState) return readyStateLookup[node.readyState];

		let sheet = node.sheet;

		// handle webkit
		if (!sheet) return false;

		try {
			// Firefox should throw if not loaded or cross-domain
			let rules = sheet.rules || sheet.cssRules;
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

function copyAttributes(node, srcNode) {
	_.forEach(_.map(srcNode.attributes), function(attr) {
		node.setAttribute(attr.name, attr.value); // WARN needs to be more complex for IE <= 7
	});
	return node;
}

function removeAttributes(node) {
	_.forEach(_.map(node.attributes), function(attr) {
		node.removeAttribute(attr.name);
	});
	return node;
}

const CREATE_DOCUMENT_COPIES_URL = (function() {
	let doc = document.implementation.createHTMLDocument('');
	return doc.URL === document.URL;
})();

const CLONE_DOCUMENT_COPIES_URL = (function() {
	try {
		let doc = document.cloneNode(false);
		if (doc.URL === document.URL) return true;
	}
	catch (err) { }
	return false;
})();
		
// NOTE we want create*Document() to have a URL
const CREATE_DOCUMENT_WITH_CLONE = !CREATE_DOCUMENT_COPIES_URL && CLONE_DOCUMENT_COPIES_URL;

function createDocument(srcDoc) { // modern browsers. IE >= 9
	if (!srcDoc) srcDoc = document;
	// TODO find doctype element??
	let doc;
	if (CREATE_DOCUMENT_WITH_CLONE) { 
		doc = srcDoc.cloneNode(false);
	}
	else {
		doc = srcDoc.implementation.createHTMLDocument('');
		doc.removeChild(doc.documentElement);
	}
	return doc;
}

function createHTMLDocument(title, srcDoc) { // modern browsers. IE >= 9
	if (!srcDoc) srcDoc = document;
	// TODO find doctype element??
	let doc;
	if (CREATE_DOCUMENT_WITH_CLONE) { 
		doc = srcDoc.cloneNode(false);
		let docEl = doc.createElement('html');
		docEl.innerHTML = '<head><title>' + title + '</title></head><body></body>';
		doc.appendChild(docEl);
	}
	else {
		doc = srcDoc.implementation.createHTMLDocument(title);
	}
	return doc;
}

function cloneDocument(srcDoc) {
	let doc = createDocument(srcDoc);
	let docEl = doc.importNode(srcDoc.documentElement, true);
	doc.appendChild(docEl); // NOTE already adopted

	// WARN sometimes IE9/IE10/IE11 doesn't read the content of inserted <style>
	// NOTE this doesn't seem to matter on IE10+. The following is precautionary
	_.forEach(findAll('style', doc), function(node) {
		let sheet = node.sheet;
		if (!sheet || sheet.cssText == null) return;
		if (sheet.cssText != '') return;
		node.textContent = node.textContent;
	});
	
	return doc;
}

function scrollToId(id) { // FIXME this isn't being used
	if (id) {
		let el = findId(id);
		if (el) el.scrollIntoView(true);
	}
	else window.scroll(0, 0);
}

let readyStateLookup = { // used in domReady() and checkStyleSheets()
	'uninitialized': false,
	'loading': false,
	'interactive': false,
	'loaded': true,
	'complete': true
}

let domReady = (function() { // WARN this assumes that document.readyState is valid or that content is ready...

let readyState = document.readyState;
let loaded = readyState ? readyStateLookup[readyState] : true;
let queue = [];

function domReady(fn) {
	if (typeof fn !== 'function') return;
	queue.push(fn);
	if (loaded) processQueue();
}

function processQueue() {
	_.forEach(queue, function(fn) { setTimeout(fn); });
	queue.length = 0;
}

let events = {
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

export {
	nodeIdProperty as uniqueIdAttr,
	uniqueId, setData, getData, hasData, releaseNodes, // FIXME releaseNodes
	getTagName,
	contains, matches,
	findId, find, findAll, closest, siblings,
	dispatchEvent, manageEvent,
	adoptContents,
	isVisible, whenVisible,
	insertNode,
	checkStyleSheets,
	copyAttributes, removeAttributes, // attrs
	domReady as ready, // events
	createDocument, createHTMLDocument, cloneDocument, // documents
	scrollToId
}
