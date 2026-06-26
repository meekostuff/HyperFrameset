/*!
 * CSSDecoder
 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */
import * as _ from './stuff.mjs';
import * as DOM from './DOM.mjs'

// Pseudo-attribute names for extracting text content or child nodes from elements
// NOTE same values as TEXT_SUFFIX/HTML_SUFFIX in HazardProcessor but unrelated
const TEXT_ATTR = '_text';
const HTML_ATTR = '_html';

const CSS_CONTEXT_VARIABLE = '_';

/**
 * @implements {Decoder}
 */
class CSSDecoder {

constructor(options, namespaces) {}

init(node) {
	this.srcNode = node;
}

// FIXME refactor common-code in matches / evaluate
// TODO should matches() support Hazard variables?
matches(element, query) {
	// Parse "selector { @attr }" — captures selector and optional attribute accessor
	let queryParts = query.match(/^\s*([^{]*)\s*(?:\{\s*([^}]*)\s*\}\s*)?$/);
	let selector = queryParts[1];
	let attr = queryParts[2];
	if (!matches(element, selector)) return;
	let node = element;
	let result = node;

	if (attr) {
		attr = attr.trim();
		if (attr.charAt(0) === '@') attr = attr.substr(1);
		result = getAttr(node, attr);
	}

	return result;
}

evaluate(query, context, variables, wantArray) {
	if (!context) context = this.srcNode;
	// Parse "selector { @attr }" — captures selector and optional attribute accessor
	let queryParts = query.match(/^\s*([^{]*)\s*(?:\{\s*([^}]*)\s*\}\s*)?$/);
	let selector = queryParts[1];
	let attr = queryParts[2];
	let result = find(selector, context, variables, wantArray);

	if (attr) {
		attr = attr.trim();
		if (attr.charAt(0) === '@') attr = attr.substr(1);

		if (!wantArray) result = [ result ];
		result = Array.from(result, (node) => {
			return getAttr(node, attr);
		});
		if (!wantArray) result = result[0];
	}

	return result;
}

}

/**
 * Get an attribute value or content from a node.
 * @param {Node} node - The source node.
 * @param {string} attr - Attribute name, or '_text' for textContent, or '_html' for child nodes as fragment.
 * @returns {Node|string|DocumentFragment} The attribute value, text content, or cloned children.
 */
function getAttr(node, attr) {
	switch(attr) {
	case null: case undefined: case '': return node;
	case TEXT_ATTR:
		return node.textContent;
	case HTML_ATTR:
		let doc = node.ownerDocument;
		let frag = doc.createDocumentFragment();
		_.forEach(node.childNodes, (child) => {
			frag.appendChild(doc.importNode(child, true)); // TODO does `child` really need to be cloned??
		});
		return frag;
	default:
		return node.getAttribute(attr);
	}
}

/**
 * Test if an element matches a CSS selector group.
 * @param {Element} element - Element to test.
 * @param {string} selectorGroup - CSS selector group.
 * @returns {boolean|undefined} True if matches, undefined if selector is empty.
 */
function matches(element, selectorGroup) {
	if (selectorGroup.trim() === '') return;
	return DOM.matches(element, selectorGroup);
}

/**
 * Find elements matching a CSS selector group, with $variable context support.
 * @param {string} selectorGroup - CSS selector group, may contain $variable references.
 * @param {Node} context - Context node for relative selectors.
 * @param {DecoderVariables} variables - Variable bindings for $variable resolution.
 * @param {boolean} wantArray - If true, return all matches; if false, return first match only.
 * @returns {Node|Node[]|null} Matched node(s), or null/[] if no match.
 */
function find(selectorGroup, context, variables, wantArray) { // FIXME currently only implements `context` expansion
	selectorGroup = selectorGroup.trim();
	if (selectorGroup === '') return wantArray ? [ context ] : context;
	let nullResult = wantArray ? [] : null;

	// Step 1: Split selector group into individual selectors
	// Split selector group on commas, but not commas inside () or []
	let selectors = selectorGroup.split(/,(?![^\(]*\)|[^\[]*\])/);
	selectors = Array.from(selectors, (s) => { return s.trim(); });

	// Step 2: Validate $variable usage across selectors
	// All selectors in a group must share the same context variable (or have none)
	let invalidVarUse = false;
	let contextVar;
	_.forEach(selectors, (s, i) => {
		// Match $variable references (e.g. $myVar), or escaped \$ (which are ignored later)
		let m = s.match(/\\?\$[_a-zA-Z][_a-zA-Z0-9]*\b/g);
		if (!m) {
			if (i > 0 && contextVar) {
				invalidVarUse = true;
				console.warn(`All individual selectors in a selector-group must share same context: ${selectorGroup}`);
			}
			return; // if no matches then m will be null not []
		}
		_.forEach(m, (varRef, j) => {
			if (varRef.charAt(0) === '\\') return; // Ignore "\$"
			let varName = varRef.substr(1);
			let varPos = s.indexOf(varRef);
			if (j > 0 || varPos > 0) {
				invalidVarUse = true;
				console.warn(`Invalid use of ${varRef} in ${selectorGroup}`);
				return;
			}
			if (i > 0) {
				if (varName !== contextVar) {
					invalidVarUse = true;
					console.warn(`All individual selectors in a selector-group must share same context: ${selectorGroup}`);
				}
				return;
			}
			contextVar = varName;
		});
	});

	if (invalidVarUse) {
		console.error('Invalid use of variables in CSS selector. Assuming no match.');
		return nullResult;
	}

	// Step 3: Resolve $variable context
	// If a context variable is used, look it up and replace the query context
	if (contextVar && contextVar !== CSS_CONTEXT_VARIABLE) {
		if (!variables.has(contextVar)) {
			console.debug(`Context variable $${contextVar} not defined for ${selectorGroup}`);
			return nullResult;
		}
		if (contextVar !== CSS_CONTEXT_VARIABLE) context = variables.get(contextVar);

		// NOTE if the selector is just '$variable' then 
		// context doesn't even need to be a node
		if (selectorGroup === `$${contextVar}`) return context;

		if (!(context && context.nodeType === 1)) {
			console.debug('Context variable $' + contextVar + ' not an element in ' + selectorGroup);
			return nullResult;
		}
	}

	// Step 4: Filter out unsupported combinator selectors
	let isRoot = false;
	if (context.nodeType === 9 || context.nodeType === 11) isRoot = true;

	selectors = _.filter(selectors, (s) => {
			switch(s.charAt(0)) {
			case '+': case '~': 
				console.warn('Siblings of context-node cannot be selected in ' + selectorGroup);
				return false;
			case '>': return (isRoot) ? false : true; // FIXME probably should be allowed even if isRoot
			default: return true;
			}
		});

	if (selectors.length <= 0) return nullResult;

	// Step 5: Rewrite selectors to be scoped relative to context
	selectors = Array.from(selectors, (s) => {
			if (isRoot) return s;
			let prefix = ':scope';
			return (contextVar) ? 
				s.replace('$' + contextVar, prefix) : 
				prefix + ' ' + s;
		});
	
	// Step 6: Execute the final query
	let finalSelector = selectors.join(', ');

	if (wantArray) {
		return DOM.findAll(finalSelector, context, !isRoot, !isRoot);
	}
	else {
		return DOM.find(finalSelector, context, !isRoot, !isRoot);
	}
}

export default CSSDecoder;
