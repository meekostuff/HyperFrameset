/*!
 * CSSDecoder
 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */
import * as _ from './stuff.mjs';
import * as DOM from './DOM.mjs'

// FIXME textAttr & htmlAttr used in HazardProcessor & CSSDecoder
const textAttr = '_text';
const htmlAttr = '_html';
// TODO what about tagnameAttr, namespaceAttr

const CSS_CONTEXT_VARIABLE = '_';

/**
 * @implements {Decoder}
 */
class CSSDecoder {

constructor(options, namespaces) {}

init(node) {
	this.srcNode = node;
}

// TODO should matches() support Hazard variables
matches(element, query) { // FIXME refactor common-code in matches / evaluate
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

	function getAttr(node, attr) {
		switch(attr) {
		case null: case undefined: case '': return node;
		case textAttr: 
			return node.textContent;
		case htmlAttr:
			let frag = doc.createDocumentFragment();
			_.forEach(node.childNodes, (child) => { 
				frag.appendChild(doc.importNode(child, true)); // TODO does `child` really need to be cloned??
			});
			return frag;
		default: 
			return node.getAttribute(attr);
		}
	}

}

evaluate(query, context, variables, wantArray) {
	if (!context) context = this.srcNode;
	let doc = context.nodeType === 9 ? context : context.ownerDocument; // FIXME which document??
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

	function getAttr(node, attr) {
		switch(attr) {
		case null: case undefined: case '': return node;
		case textAttr: 
			return node.textContent;
		case htmlAttr:
			let frag = doc.createDocumentFragment();
			_.forEach(node.childNodes, (child) => { 
				frag.appendChild(doc.importNode(child, true)); // TODO does `child` really need to be cloned??
			});
			return frag;
		default: 
			return node.getAttribute(attr);
		}
	}

}

}

function matches(element, selectorGroup) {
	if (selectorGroup.trim() === '') return;
	return DOM.matches(element, selectorGroup);
}

function find(selectorGroup, context, variables, wantArray) { // FIXME currently only implements `context` expansion
	selectorGroup = selectorGroup.trim();
	if (selectorGroup === '') return wantArray ? [ context ] : context;
	let nullResult = wantArray ? [] : null;
	// Split selector group on commas, but not commas inside () or []
	let selectors = selectorGroup.split(/,(?![^\(]*\)|[^\[]*\])/);
	selectors = Array.from(selectors, (s) => { return s.trim(); });

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

	selectors = Array.from(selectors, (s) => {
			if (isRoot) return s;
			let prefix = ':scope';
			return (contextVar) ? 
				s.replace('$' + contextVar, prefix) : 
				prefix + ' ' + s;
		});
	
	let finalSelector = selectors.join(', ');

	if (wantArray) {
		return DOM.findAll(finalSelector, context, !isRoot, !isRoot);
	}
	else {
		return DOM.find(finalSelector, context, !isRoot, !isRoot);
	}
}

export default CSSDecoder;
