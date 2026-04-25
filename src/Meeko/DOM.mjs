/*!
 DOM utils
 (c) Sean Hogan, 2008,2012,2013,2014,2026
 Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
*/

/**
 * @fileoverview DOM utility functions for element manipulation, event handling, and node management
 * @requires MutationObserver (IE10+)
 * @requires element.matchesSelector (IE9+)
 * @requires element.querySelectorAll (IE8+)
 * @requires element.addEventListener (IE9+)
 * @requires element.dispatchEvent (IE9+)
 * @requires Object.create (IE9+)
 */

import * as _ from './stuff.mjs';
import Thenfu from './Thenfu.mjs';

/** @constant {string} Vendor prefix for internal properties */
const vendorPrefix = 'meeko'; // FIXME DRY with other instances of `vendorPrefix`

/** @type {Document} Reference to the document object */
let document = window.document;

// TODO all this node manager stuff assumes that nodes are only released on unload
// This might need revising
// TODO A node-manager API would be useful elsewhere

/** @constant {number} Random suffix for node ID property names */
const nodeIdSuffix = Math.round(Math.random() * 1000000);
/** @constant {string} Property name for storing node IDs */
const nodeIdProperty = '__' + vendorPrefix + nodeIdSuffix;
/** @type {number} Counter for generating unique node IDs */
let nodeCount = 0; // used to generated node IDs

/**
 * Generate unique ID for a DOM node
 * @param {Node} node - DOM node to get ID for
 * @returns {string} Unique node identifier
 */
function uniqueId(node) {
	let nodeId = node[nodeIdProperty];
	if (nodeId) return nodeId;
	nodeId = '__' + nodeCount++;
	node[nodeIdProperty] = nodeId; // WARN would need `new String(nodeId)` in IE<=8
			// so that node cloning doesn't copy the node ID property
	return nodeId;
}

/** @type {WeakMap<Node, *>} Storage for node-associated data */
const nodeData = new WeakMap();

/**
 * Store data associated with a DOM node
 * @param {Element} node - DOM element to store data for
 * @param {*} data - Data to store
 */
function setData(node, data) {
	nodeData.set(node, data);
}

/**
 * Check if node has associated data
 * @param {Node} node - DOM node to check
 * @returns {boolean} True if node has stored data
 */
function hasData(node) {
	return nodeData.has(node);
}

/**
 * Retrieve data associated with a DOM node
 * @param {Node} node - DOM node to get data for
 * @returns {*} Stored data or undefined
 */
function getData(node) {
	return nodeData.get(node);
}

/**
 * Get lowercase tag name of element
 * @param {Element} el - DOM element
 * @returns {string} Lowercase tag name or empty string
 */
function getTagName(el) {
	return el && el.nodeType === 1 ? _.lc(el.tagName) : '';
}

/**
 * Test if element matches CSS selector
 * @param {Element} element - Element to test
 * @param {string|Function} selector - CSS selector or test function
 * @param {Element} [scope] - Scope element for relative selectors
 * @returns {boolean} True if element matches selector
 */
function matches(element, selector, scope) {
	if (!(element && element.nodeType === 1)) return false;
	if (typeof selector === 'function') return selector(element, scope);
	return scopeify(function(absSelector) {
		return element.matches(absSelector);
	}, selector, scope);
}

/**
 * Find closest ancestor element matching selector
 * @param {Element} element - Starting element
 * @param {string|Function} selector - CSS selector or test function
 * @param {Element} [scope] - Scope element to stop at
 * @returns {Element|null} Matching ancestor or null
 */
function closest(element, selector, scope) {
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
			if (el.matches(absSelector)) return el;
		}

	}, selector, scope);
}

/**
 * Execute function with scoped selector
 * @private
 * @param {Function} fn - Function to execute with absolute selector
 * @param {string} selector - CSS selector
 * @param {Element} [scope] - Scope element
 * @returns {*} Result of function execution
 */
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

/**
 * Convert relative selector to absolute selector within scope
 * @private
 * @param {string} selectorGroup - CSS selector group
 * @param {Element} scope - Scope element
 * @returns {string} Absolute selector
 */
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

/**
 * Find element by ID
 * @param {string} id - Element ID
 * @param {Document} [doc] - Document to search in
 * @returns {Element|null} Found element or null
 */
function findId(id, doc) {
	if (!id) return;
	if (!doc) doc = document;
	if (!doc.getElementById) throw Error('Context for findId() must be a Document node');
	return doc.getElementById(id);
	// WARN would need a work around for broken getElementById in IE <= 7
}

/**
 * Find all elements matching selector
 * @param {string} selector - CSS selector
 * @param {Element|Document} [node] - Root node to search from
 * @param {Element|boolean} [scope] - Scope element or true for node scope
 * @param {boolean} [inclusive] - Include root node in results if it matches
 * @returns {Array<Element>} Array of matching elements
 */
function findAll(selector, node, scope, inclusive) {
	if (!node) node = document;
	if (!node.querySelectorAll) return [];
	if (scope && !scope.nodeType) scope = node; // `true` but not the scope element
	return scopeify(function(absSelector) {
		let result = _.map(node.querySelectorAll(absSelector));
		if (inclusive && node.nodeType === 1 && node.matches(absSelector)) result.unshift(node);
		return result;
	}, selector, scope);
}

/**
 * Find first element matching selector
 * @param {string} selector - CSS selector
 * @param {Element|Document} [node] - Root node to search from
 * @param {Element|boolean} [scope] - Scope element or true for node scope
 * @param {boolean} [inclusive] - Include root node in results if it matches
 * @returns {Element|null} First matching element or null
 */
function find(selector, node, scope, inclusive) {
	if (!node) node = document;
	if (!node.querySelector) return null;
	if (scope && !scope.nodeType) scope = node; // `true` but not the scope element
	return scopeify(function(absSelector) {
		if (inclusive && node.nodeType === 1 && node.matches(absSelector)) return node;
		return node.querySelector(absSelector);
	}, selector, scope);
}

/**
 * Get sibling elements relative to reference node
 * @param {string} conf - Configuration: 'starting', 'after', 'ending', 'before'
 * @param {Element} refNode - Reference node
 * @param {string} [conf2] - Second configuration for range
 * @param {Element} [refNode2] - Second reference node for range
 * @returns {Array<Element>} Array of sibling elements
 */
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

/**
 * Check if node contains another node. Equivalent to Node.contains().
 * @param {Node} node - Container node
 * @param {Node} otherNode - Node to check
 * @returns {boolean} True if otherNode is a descendant of node, or is node itself
 */
function contains(node, otherNode) {
	return node.contains(otherNode);
}

/**
 * Dispatch custom event on target element
 * @param {Element} target - Target element
 * @param {string|Object} type - Event type or event object
 * @param {Object} [params] - Event parameters
 * @returns {boolean} True if event was not cancelled
 */
function dispatchEvent(target, type, params) { // NOTE every JS initiated event is a custom-event
	if (typeof type === 'object') {
		params = type;
		type = params.type;
	}
	if (typeof type !== 'string') throw Error('trigger() called with invalid event type');
	let event = new CustomEvent(type, {
		bubbles: params && 'bubbles' in params ? !!params.bubbles : true,
		cancelable: params && 'cancelable' in params ? !!params.cancelable : true,
		detail: params && params.detail
	});
	if (params) _.defaults(event, params);
	return target.dispatchEvent(event);
}

/** @type {Array<string>} List of managed event types */
let managedEvents = [];

/**
 * Set up event management for specified event type
 * @param {string} type - Event type to manage
 */
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
/** @type {MutationObserver} Observer for visibility changes */
let observer = new MutationObserver(function(mutations, observer) {
	_.forEach(mutations, function(entry) {
		triggerVisibilityChangeEvent(entry.target);
	});
});
observer.observe(document, { attributes: true, attributeFilter: ['hidden'], subtree: true });

/**
 * Trigger visibility change event on target element
 * @param {Element} target - Target element
 */
// FIXME this should use observers, not events
function triggerVisibilityChangeEvent(target) {
	let visibilityState = target.hidden ? 'hidden' : 'visible';
	dispatchEvent(target, 'visibilitychange', { bubbles: false, cancelable: false, detail: visibilityState }); // NOTE doesn't bubble to avoid clash with same event on document (and also performance)
}

/**
 * Check if element is visible (not hidden)
 * @param {Element} element - Element to check
 * @returns {boolean} True if element is visible
 */
function isVisible(element) {
	let closestHidden = closest(element, '[hidden]');
	return (!closestHidden);
}

/**
 * Return promise that resolves when element becomes visible
 * @param {Element} element - Element to watch
 * @returns {Promise} Promise that resolves when visible
 */
function whenVisible(element) { // FIXME this quite possibly causes leaks if closestHidden is removed from document before removeEventListener
	return new Promise(function(resolve) {
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

/**
 * Insert node relative to reference node
 * @param {string} conf - Position: 'before', 'after', 'start', 'end', 'replace', 'empty'
 * @param {Element} refNode - Reference node
 * @param {Node} node - Node to insert
 * @returns {Element} Reference node
 */
function insertNode(conf, refNode, node) { // like insertAdjacentElement but with a node and auto-adoption
	node = refNode.ownerDocument.adoptNode(node);
	switch(conf) {
	case 'before':
	case 'beforebegin': refNode.before(node); break;
	case 'after':
	case 'afterend': refNode.after(node); break;
	case 'start':
	case 'afterbegin': refNode.prepend(node); break;
	case 'end':
	case 'beforeend': refNode.append(node); break;
	case 'replace': refNode.replaceWith(node); break;
	case 'empty':
	case 'contents': refNode.replaceChildren(node); break;
	}
	return refNode;
}

/**
 * Adopt all child nodes into document fragment
 * @param {Element} parentNode - Parent node to adopt from
 * @param {Document} [doc] - Target document
 * @returns {DocumentFragment} Fragment containing adopted nodes
 */
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
/**
 * Check if all stylesheets have loaded
 * @returns {boolean} True if all stylesheets are loaded
 */
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

/**
 * Copy all attributes from source node to target node
 * @param {Element} node - Target node
 * @param {Element} srcNode - Source node
 * @returns {Element} Target node
 */
function copyAttributes(node, srcNode) {
	for (const { name, value } of srcNode.attributes) node.setAttribute(name, value);
	return node;
}

/**
 * Remove all attributes from node
 * @param {Element} node - Target node
 * @returns {Element} Target node
 */
function removeAttributes(node) {
	while (node.attributes.length) node.removeAttribute(node.attributes[0].name);
	return node;
}

/** @constant {boolean} Whether createHTMLDocument copies URL from current document */
const CREATE_DOCUMENT_COPIES_URL = (function() {
	let doc = document.implementation.createHTMLDocument('');
	return doc.URL === document.URL;
})();

/** @constant {boolean} Whether cloneNode copies URL from current document */
const CLONE_DOCUMENT_COPIES_URL = (function() {
	try {
		let doc = document.cloneNode(false);
		if (doc.URL === document.URL) return true;
	}
	catch (err) { }
	return false;
})();
		
// NOTE we want create*Document() to have a URL
/** @constant {boolean} Whether to use cloneNode for document creation */
const CREATE_DOCUMENT_WITH_CLONE = !CREATE_DOCUMENT_COPIES_URL && CLONE_DOCUMENT_COPIES_URL;

/**
 * Create new empty document
 * @param {Document} [srcDoc] - Source document for cloning
 * @returns {Document} New document
 */
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

/**
 * Create new HTML document with title
 * @param {string} title - Document title
 * @param {Document} [srcDoc] - Source document for cloning
 * @returns {Document} New HTML document
 */
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

/**
 * Clone document with all content
 * @param {Document} srcDoc - Source document to clone
 * @returns {Document} Cloned document
 */
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

/**
 * Scroll to element with given ID
 * @param {string} id - Element ID to scroll to
 */
function scrollToId(id) { // FIXME this isn't being used
	if (id) {
		let el = findId(id);
		if (el) el.scrollIntoView(true);
	}
	else window.scroll(0, 0);
}

/** @constant {Object} Lookup table for document ready states */
let readyStateLookup = { // used in domReady() and checkStyleSheets()
	'uninitialized': false,
	'loading': false,
	'interactive': false,
	'loaded': true,
	'complete': true
}

/**
 * Execute function when DOM is ready
 * @type {Function}
 */
let domReady = (function() { // WARN this assumes that document.readyState is valid or that content is ready...

/** @type {string} Current document ready state */
let readyState = document.readyState;
/** @type {boolean} Whether DOM is loaded */
let loaded = readyState ? readyStateLookup[readyState] : true;
/** @type {Array<Function>} Queue of functions to execute when ready */
let queue = [];

/**
 * Execute function when DOM is ready
 * @param {Function} fn - Function to execute
 */
function domReady(fn) {
	if (typeof fn !== 'function') return;
	queue.push(fn);
	if (loaded) processQueue();
}

/**
 * Process queued functions
 * @private
 */
function processQueue() {
	_.forEach(queue, function(fn) { setTimeout(fn); });
	queue.length = 0;
}

/** @type {Object} Event listeners for DOM ready */
let events = {
	'DOMContentLoaded': document,
	'load': window
};

if (!loaded) _.forOwn(events, function(node, type) { node.addEventListener(type, onLoaded, false); });

return domReady;

// NOTE the following functions are hoisted
/**
 * Handle DOM loaded event
 * @private
 * @param {Event} e - DOM event
 */
function onLoaded(e) {
	loaded = true;
	_.forOwn(events, function(node, type) { node.removeEventListener(type, onLoaded, false); });
	processQueue();
}

})();

export {
	nodeIdProperty as uniqueIdAttr,
	uniqueId, setData, getData, hasData,
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
