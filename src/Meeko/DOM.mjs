/*!
 DOM utils
 (c) Sean Hogan, 2008,2012,2013,2014,2026
 Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
*/

/**
 * @fileoverview DOM utility functions for element manipulation, event handling, and node management
 * @requires MutationObserver
 * @requires Element.matches
 * @requires Element.querySelector/querySelectorAll
 * @requires CustomEvent constructor
 * @requires WeakMap
 * @requires ChildNode (before, after, replaceWith)
 * @requires ParentNode (prepend, append, replaceChildren)
 */

import * as _ from './stuff.mjs';
import Thenfu from './Thenfu.mjs';

/** @constant {string} Vendor prefix for internal properties */
const vendorPrefix = 'meeko'; // FIXME DRY with other instances of `vendorPrefix`

/** @type {Document} Reference to the document object */
let document = window.document;

/** @constant {number} Random suffix for node ID property names */
const nodeIdSuffix = Math.round(Math.random() * 1000000);
/** @constant {string} Property name for storing node IDs */
const nodeIdProperty = `__${vendorPrefix}${nodeIdSuffix}`;
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
	nodeId = `__${nodeCount++}`;
	node[nodeIdProperty] = nodeId;
	return nodeId;
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
	return scopeify((absSelector) => {
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
	return scopeify((absSelector) => {

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
	let scopeSelector = `[${nodeIdProperty}=${nodeId}]`;

	// split on COMMA (,) that is not inside BRACKETS. Technically: not followed by a RHB ')' or ']' unless first followed by LHB '(' or '[' 
	let selectors = selectorGroup.split(/,(?![^\(]*\)|[^\[]*\])/);
	selectors = Array.from(selectors, (s) => {
		if (/^:scope\b/.test(s)) return s.replace(/^:scope\b/, scopeSelector);
		else return `${scopeSelector} ${s}`;
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
	return scopeify((absSelector) => {
		let result = Array.from(node.querySelectorAll(absSelector));
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
	return scopeify((absSelector) => {
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
	default: throw Error(`${conf} is not a valid configuration in siblings()`);
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
 * Create a custom event
 * @param {string|Object} type - Event type or params object with .type
 * @param {Object} [params] - Event parameters (bubbles, cancelable, detail, plus extra properties)
 * @returns {CustomEvent}
 */
function createEvent(type, params) {
	if (typeof type === 'object') {
		params = type;
		type = params.type;
	}
	if (typeof type !== 'string') throw Error('createEvent() called with invalid event type');
	let { bubbles = true, cancelable = true, detail, type: _type, ...extra } = params || {};
	let event = new CustomEvent(type, { bubbles, cancelable, detail });
	Object.assign(event, extra);
	return event;
}

/**
 * Dispatch custom event on target element
 * @param {Element} target - Target element
 * @param {string|Object} type - Event type or params object with .type
 * @param {Object} [params] - Event parameters
 * @returns {boolean} True if event was not cancelled
 */
function dispatchEvent(target, type, params) {
	let event = createEvent(type, params);
	return target.dispatchEvent(event);
}

/**
 * Check if element is visible (not hidden)
 * @param {Element} element - Element to check
 * @returns {boolean} True if element is visible
 */
function isVisible(element) {
	return !closest(element, '[hidden]');
}

/**
 * Return promise that resolves when element becomes visible
 * @param {Element} element - Element to watch
 * @returns {Promise} Promise that resolves when visible
 */
function whenVisible(element) {
	return new Promise((resolve) => {
		if (isVisible(element)) {
			resolve();
			return;
		}
		let observer = new MutationObserver(() => {
			if (isVisible(element)) {
				observer.disconnect();
				resolve();
			}
		});
		observer.observe(document, { attributes: true, attributeFilter: ['hidden'], subtree: true });
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
	return _.every(findAll('link'), (node) => {
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

/**
 * Create new empty document, preserving the source document's URL.
 * @param {Document} [srcDoc] - Source document to clone from
 * @returns {Document} New empty document with source URL
 */
function createDocument(srcDoc) {
	if (!srcDoc) srcDoc = document;
	return srcDoc.cloneNode(false);
}

/**
 * Create new HTML document with title, preserving the source document's URL.
 * @param {string} title - Document title
 * @param {Document} [srcDoc] - Source document to clone from
 * @returns {Document} New HTML document with source URL
 */
function createHTMLDocument(title, srcDoc) {
	let doc = createDocument(srcDoc);
	let docEl = doc.createElement('html');
	docEl.innerHTML = '<head><title>' + title + '</title></head><body></body>';
	doc.appendChild(docEl);
	return doc;
}

/**
 * Clone document with all content
 * @param {Document} srcDoc - Source document to clone
 * @returns {Document} Cloned document
 */
function cloneDocument(srcDoc) {
	return srcDoc.cloneNode(true);
}

/** @constant {Object} Lookup table for document ready states */
let readyStateLookup = { // used in checkStyleSheets()
	'uninitialized': false,
	'loading': false,
	'interactive': false,
	'loaded': true,
	'complete': true
}

export {
	getTagName,
	contains, matches,
	findId, find, findAll, closest, siblings,
	createEvent,
	dispatchEvent,
	adoptContents,
	isVisible, whenVisible,
	insertNode,
	checkStyleSheets,
	copyAttributes, removeAttributes, // attrs
	createDocument, createHTMLDocument, cloneDocument, // documents
}
