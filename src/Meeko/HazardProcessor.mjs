/*!
 * HazardProcessor
 * Copyright 2014-2016 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

import * as _ from './stuff.mjs';
import Thenfu from './Thenfu.mjs';
import { evaluate, Scope } from './expressions.mjs';
import CustomNamespace from './CustomNamespace.mjs';

let document = window.document;

const HAZARD_TRANSFORM_URN = 'HazardTransform';
const hazDefaultNS = new CustomNamespace({
	urn: HAZARD_TRANSFORM_URN,
	name: 'haz',
	style: 'xml'
});

/** WeakMap of preprocessing results, keyed by element. */
const _cache = new WeakMap();

/*
 - items in hazLangDefinition are element@list-of-attrs
 - if element is prefixed with '<' or '>' then it can be defined 
    as an attribute on a normal HTML element. 
 - in preprocessing the attr is promoted to an element
    either above or below the HTML element. 
 - the attr value is used as the "default" attr of the created element. 
    The "default" attr is the first attr-name in the list-of-attrs.  
 - the order of items in hazLangDefinition is the order of promoting 
    attrs to elements.
*/
let hazLangDefinition =
	'<otherwise <when@$test <each@$select,as <one@$select,as +var@name,$select <if@$test <unless@$test ' +
	'>choose <template@name,$match >eval@$select >text@"select ' +
	'call@name apply@$select,as clone deepclone element@"name attr@"name,"value';

let hazLang = Array.from(_.words(hazLangDefinition), (def) => {
	def = def.split('@');
	let tag = def[0];
	let attrToElement = tag.charAt(0);
	switch (attrToElement) {
	default: 
		attrToElement = false; 
		break;
	case '<': case '>': case '+':
		break;
	}
	if (attrToElement) tag = tag.substr(1);
	let attrDefs = def[1];
	let attrs = [];
	let attrTypes = {};
	if (attrDefs && attrDefs !== '') {
		for (let a of attrDefs.split(',')) {
			let type = 'bare';
			if (a.startsWith('"')) { type = 'string'; a = a.substring(1); }
			else if (a.startsWith('$')) { type = 'expr'; a = a.substring(1); }
			attrs.push(a);
			attrTypes[a] = type;
		}
	}
	return {
		tag: tag,
		attrToElement: attrToElement,
		attrs: attrs,
		attrTypes: attrTypes
	}
});

let hazLangLookup = {};

_.forEach(hazLang, (directive) => {
	let tag = directive.tag;
	hazLangLookup[tag] = directive;
});

/**
 * Walk all element nodes in a tree using a NodeIterator.
 * @param {Node} root - Root node to walk.
 * @param {boolean} skipRoot - If true, skip the root element itself.
 * @param {function(Element)} callback - Called for each element.
 */
function walkTree(root, skipRoot, callback) { // always "accept" element nodes
	let walker = document.createNodeIterator(
			root,
			1,
			acceptNode,
			null // IE9 throws if this irrelavent argument isn't passed
		);
	
	let el;
	while (el = walker.nextNode()) callback(el);

	function acceptNode(el) {
		if (skipRoot && el === root) return NodeFilter.FILTER_SKIP;
		return NodeFilter.FILTER_ACCEPT;
	}
}

/**
 * Move all child nodes of an element into a new DocumentFragment.
 * @param {Element} el - Source element.
 * @returns {DocumentFragment}
 */
function childNodesToFragment(el) {
	let doc = el.ownerDocument;
	let frag = doc.createDocumentFragment();
	_.forEach(Array.from(el.childNodes), (child) => { frag.appendChild(child); });
	return frag;
}

/**
 * Convert html: prefixed elements and attributes to their unprefixed equivalents.
 * @param {Element} el - Element to process.
 */
function convertHtmlPrefix(el) {
	let doc = el.ownerDocument;
	// Convert html:* element to unprefixed
	if (el.localName.startsWith('html:')) {
		let newEl = doc.createElement(el.localName.substring(5));
		for (let attr of Array.from(el.attributes)) {
			newEl.setAttribute(attr.name, attr.value);
		}
		while (el.firstChild) newEl.appendChild(el.firstChild);
		el.parentNode.replaceChild(newEl, el);
		el = newEl;
	}
	// Convert html:* attributes to unprefixed
	for (let attr of Array.from(el.attributes)) {
		if (!attr.name.startsWith('html:')) continue;
		let targetName = attr.name.substring(5);
		if (el.hasAttribute(targetName)) {
			console.warn(`<${el.localName}> html:${targetName} overrides existing @${targetName}`);
		}
		el.removeAttribute(attr.name);
		el.setAttribute(targetName, attr.value);
	}
}

/**
 * Promote ${expr} and `template` content expressions to haz:eval / haz:text child elements.
 * Only applies when the element's sole content is a single text node matching the pattern.
 * @param {Element} el - Element to process.
 * @param {string} hazPrefix - The hazard namespace prefix (e.g. 'haz:').
 */
function promoteContentExpressions(el, hazPrefix) {
	if (el.localName.startsWith(hazPrefix)) return;
	// Must have exactly one child node which is a text node
	if (el.childNodes.length !== 1) return;
	let child = el.firstChild;
	if (child.nodeType !== 3) return;
	let text = child.nodeValue.trim();
	if (!text) return;

	let doc = el.ownerDocument;
	if (text.startsWith('${')) {
		if (!text.endsWith('}')) {
			console.warn(`<${el.localName}> content starts with \${ but does not end with }: "${text}"`);
			return;
		}
		let expr = text.slice(2, -1);
		let directive = doc.createElement(hazPrefix + 'eval');
		directive.setAttribute('select', expr);
		el.removeChild(child);
		el.appendChild(directive);
	} else if (text.startsWith('`')) {
		if (!text.endsWith('`')) {
			console.warn(`<${el.localName}> content starts with backtick but does not end with one: "${text}"`);
			return;
		}
		let directive = doc.createElement(hazPrefix + 'text');
		directive.setAttribute('select', text);
		el.removeChild(child);
		el.appendChild(directive);
	}
}

/**
 * Normalize expression attributes on haz:* elements for inspectability.
 * Wraps 'expr' type attrs with ${}, 'string' type attrs with backticks.
 * Strips unnecessary double-wrapping with a warning.
 * @param {Element} el - Element to process.
 * @param {string} hazPrefix - The hazard namespace prefix (e.g. 'haz:').
 */
function normalizeExprAttrs(el, hazPrefix) {
	if (!el.localName.startsWith(hazPrefix)) return;
	let tag = el.localName.substring(hazPrefix.length);
	let def = hazLangLookup[tag];
	if (!def) return;
	for (let attrName of def.attrs) {
		let value = el.getAttribute(attrName);
		if (!value) continue;
		let type = def.attrTypes[attrName];
		if (type === 'bare') continue;
		// Strip double ${} wrapping
		if (value.startsWith('${') && value.endsWith('}')) {
			if (type === 'expr') {
				// Already wrapped — leave as-is
				continue;
			}
			// String type with ${} — strip and re-wrap as backtick
			console.warn(`<${el.localName}> @${attrName} does not need \${} wrapper.`);
			value = value.slice(2, -1);
		}
		// Wrap for display and evaluation
		if (type === 'expr') {
			if (!value.startsWith('${')) {
				el.setAttribute(attrName, '${' + value + '}');
			}
		} else if (type === 'string') {
			if (!value.startsWith('`')) {
				el.setAttribute(attrName, '`${' + value + '}`');
			}
		}
	}
}

/**
 * Promote hazard attributes on HTML elements to hazard directive elements.
 * Each promotable attribute is converted to a wrapping or child element
 * according to its direction (<, >, +) defined in hazLang.
 * @param {Element} el - Element to process.
 * @param {string} hazPrefix - The hazard namespace prefix (e.g. 'haz:').
 */
function promoteHazAttrs(el, hazPrefix) {
	if (el.localName.startsWith(hazPrefix)) return;

	_.forEach(hazLang, (def) => {
		if (!def.attrToElement) return;
		let nsTag = hazPrefix + def.tag;
		if (!el.hasAttribute(nsTag)) return;

		let doc = el.ownerDocument;
		// create <haz:element> ...
		let directiveEl = doc.createElement(nsTag);
		// with default attr set from @haz:attr on original element
		let defaultAttr = def.attrs[0];
		let value = el.getAttribute(nsTag);
		el.removeAttribute(nsTag);
		if (defaultAttr) directiveEl.setAttribute(defaultAttr, value);

		// copy non-default hazard attrs
		_.forEach(def.attrs, (attr, i) => {
			if (i === 0) return; // the defaultAttr
			let nsAttr = hazPrefix + attr;
			if (!el.hasAttribute(nsAttr)) return;
			let value = el.getAttribute(nsAttr);
			el.removeAttribute(nsAttr);
			directiveEl.setAttribute(attr, value);
		});
		// insert the hazard element goes below or above the current element
		switch (def.attrToElement) {
		case '>':
			let frag = childNodesToFragment(el);
			directiveEl.appendChild(frag);
			el.appendChild(directiveEl);
			break;
		case '<':
			el.parentNode.replaceChild(directiveEl, el);
			directiveEl.appendChild(el);
			break;
		case '+':
			el.parentNode.insertBefore(directiveEl, el);
			break;
		default:
			break;
		}
	});
}

/**
 * Wrap non-<haz:when> children of a <haz:choose> in an implied <haz:otherwise>.
 * NOTE this slurps *any* non-<haz:when>, including <haz:otherwise>
 * @param {Element} el - The <haz:choose> element.
 * @param {string} hazPrefix - The hazard namespace prefix (e.g. 'haz:').
 */
// TODO handle scenarios:
// 1. Explicit <haz:otherwise> already exists — don't wrap it in another one
// 2. Multiple explicit <haz:otherwise> — warn, use the first
// 3. Loose nodes mixed with explicit <haz:otherwise> — warn or slurp into it
function implyOtherwise(el, hazPrefix) {
	let otherwise = el.ownerDocument.createElement(hazPrefix + 'otherwise');
	_.forEach(Array.from(el.childNodes), (node) => {
		let tag = node.localName;
		if (tag === hazPrefix + 'when') return;
		otherwise.appendChild(node);
	});
	el.appendChild(otherwise);
}

/**
 * @implements {Processor}
 */
class HazardProcessor {

constructor(options, namespaces) {
	this.templates = [];
	this.namespaces = namespaces = namespaces.clone();
	if (!namespaces.lookupNamespace(HAZARD_TRANSFORM_URN))
		namespaces.add(hazDefaultNS);
	this.#hazPrefix = namespaces.lookupPrefix(HAZARD_TRANSFORM_URN);
}

#hazPrefix;

/**
 * Get the unprefixed directive name from a hazard element's tag.
 * @param {Element} el - An element to extract the directive name from.
 * @returns {string|null} The directive name without prefix (e.g. 'if', 'each', 'text'), or null if not a hazard element.
 */
#getHazardTag(el) {
	if (!el.localName.startsWith(this.#hazPrefix)) return null;
	return el.localName.substring(this.#hazPrefix.length);
}

/**
 * Load and preprocess a template for later transformation.
 * Rewrites expression attributes into hazard elements, implies otherwise/entry templates,
 * and extracts expression attributes for each element.
 * Results are cached in a WeakMap keyed by the template element to avoid reprocessing.
 * @param {Element} template - The template element to process.
 */
loadTemplate(template) {
	// Check cache — if already processed, reuse stored state
	if (_cache.has(template)) {
		let cached = _cache.get(template);
		this.root = cached.root;
		this.templates = cached.templates;
		return;
	}

	this.root = template;
	this.templates = [];

	let hazPrefix = this.#hazPrefix;

	// Pass 0: Convert html: prefixed elements and attributes to unprefixed.
	// Must be first — subsequent passes need to see real tag/attribute names.
	walkTree(template, true, (el) => convertHtmlPrefix(el));
	// Pass 0b: Promote ${expr} and `template` content expressions to haz:eval / haz:text elements.
	// Must run before Pass 1 — relies on "sole text node" detection which Pass 1 would break.
	walkTree(template, true, (el) => promoteContentExpressions(el, hazPrefix));
	// Pass 1: Promote hazard attributes to directive elements.
	// Must run after 0b (tree restructuring breaks content detection) and before 1b (creates new haz:* elements).
	walkTree(template, true, (el) => promoteHazAttrs(el, hazPrefix));
	// Pass 1b: Normalize expression attributes on haz:* elements for inspectability.
	// Must run last — needs to see ALL haz:* elements (authored and promoted by Pass 1).
	walkTree(template, true, (el) => normalizeExprAttrs(el, hazPrefix));

	// Pass 2: Mark named templates and imply <haz:otherwise> in <haz:choose> blocks
	walkTree(template, true, (el) => {
		let tag = el.localName;
		if (tag === hazPrefix + 'template') this.#markTemplate(el);
		if (tag === hazPrefix + 'choose') implyOtherwise(el, hazPrefix);
	});

	// Pass 3: Wrap loose content nodes in an implicit entry template
	this.#implyEntryTemplate(template);

	// Cache the processed state
	_cache.set(template, { root: this.root, templates: this.templates });
}

/**
 * Register a named template element for later matching.
 * @param {Element} el - The <haz:template> element.
 */
#markTemplate(el) {
	this.templates.push(el);
}

/**
 * Wrap loose content nodes (non-template, non-param) in an implicit entry template.
 * NOTE this slurps *any* non-<haz:template>
 * @param {Element|DocumentFragment} el - The root template container.
 */
#implyEntryTemplate(el) {
	let firstExplicitTemplate;
	let contentNodes = _.filter(el.childNodes, (node) => {
		if (node.nodeType === 3) return (/\S/).test(node.nodeValue);
		if (node.nodeType !== 1) return false;
		let tag = node.localName;
		if (tag === this.#hazPrefix + 'template') {
			if (!firstExplicitTemplate) firstExplicitTemplate = node;
			return false;
		}
		if (tag === this.#hazPrefix + 'let') return false;
		if (tag === this.#hazPrefix + 'param') return false;
		return true;
	});

	if (contentNodes.length <= 0) {
		if (firstExplicitTemplate) return;
		console.warn('This Hazard Template cannot generate any content.');
	}
	let entryTemplate = el.ownerDocument.createElement(this.#hazPrefix + 'template');
	_.forEach(contentNodes, (node) => {
		entryTemplate.appendChild(node);
	});
	if (firstExplicitTemplate) el.insertBefore(entryTemplate, firstExplicitTemplate);
	else el.appendChild(entryTemplate);
	this.templates.unshift(entryTemplate);
}

/** @returns {Element} The first (entry) template element. */
getEntryTemplate() {
	return this.templates[0];
}

/**
 * Extract hazard directive details from an element (tag definition and expression attributes).
 * @param {Element} el - Element to inspect.
 * @returns {Object} Details with .definition and .exprAttributes.
 */
/**
 * Find a template by name attribute.
 * @param {string} name - Template name to match.
 * @returns {Element|undefined} Matching template element.
 */
getNamedTemplate(name) {
	let processor = this;
	name = _.lc(name);
	return _.find(processor.templates, (template) => {
		return _.lc(template.getAttribute('name')) === name;
	});
}

/**
 * Transform the loaded template against a data source.
 * @param {Object} provider - Data source with a `source` property (the root data).
 * @param {Object} details - Transform details (passed as initial global scope).
 * @returns {Promise<DocumentFragment>} Resolves with the transformed output fragment.
 */
transform(provider, details) {
	let doc = this.root.ownerDocument;
	let frag = doc.createDocumentFragment();
	return this._transform(provider, details, frag)
	.then(() => {
		return frag;
	});
}

_transform(provider, details, frag) {
	this.scope = new Scope(details);
	this.scope.set('root', provider.source, { global: true });

	return this.transformChildNodes(this.root, frag)
	.then(() => {
		let template = this.getEntryTemplate();
		return this.transformTemplate(template, null, frag);
	});
}

/**
 * Transform a specific template element within the current scope.
 * @param {Element} template - Template element to transform.
 * @param {Object} params - Parameters to push onto the scope.
 * @param {DocumentFragment} frag - Output fragment to append results to.
 * @returns {Promise<DocumentFragment>}
 */
transformTemplate(template, params, frag) {
	this.scope.push(params);

	return this.transformChildNodes(template, frag)
	.then(() => { 
		this.scope.pop(); 
		return frag;
	});
}

/**
 * Transform all child nodes of a source node sequentially.
 * @param {Node} srcNode - Source node whose children to transform.
 * @param {DocumentFragment} frag - Output fragment.
 * @returns {Promise}
 */
transformChildNodes(srcNode, frag) {
	return Thenfu.reduce(null, srcNode.childNodes, (dummy, current) => {
		return this.transformNode(current, frag);
	});
}

/**
 * Transform a single node: clone non-elements, dispatch elements to hazard or tree transform.
 * @param {Node} srcNode - Source node to transform.
 * @param {DocumentFragment} frag - Output fragment.
 * @returns {Promise|undefined}
 */
transformNode(srcNode, frag) {
	switch (srcNode.nodeType) {
	default: 
		let node = srcNode.cloneNode(true);
		frag.appendChild(node);
		return;
	case 3: // text nodes
		let textNode = srcNode.cloneNode(true);
		frag.appendChild(textNode);
		return;
	case 1:
		if (this.#getHazardTag(srcNode)) return this.transformHazardTree(srcNode, frag);
		else return this.transformTree(srcNode, frag);
	}
}

/**
 * Transform a hazard directive element (haz:if, haz:each, haz:choose, etc.).
 * @param {Element} el - Hazard element to process.
 * @param {DocumentFragment} frag - Output fragment.
 * @returns {Promise|undefined}
 */
transformHazardTree(el, frag) {
	let doc = el.ownerDocument;
	let tag = this.#getHazardTag(el);

	let invertTest = false;

	switch (tag) {
	default:
		console.warn(`Unknown hazard element <${el.localName}> — processing children only`);
		return this.transformChildNodes(el, frag);
		
	case 'template':
		return frag;

	case 'var': {
		let name = el.getAttribute('name');
		let selectExpr = el.getAttribute('select');
		let value;
		if (selectExpr) {
			try { value = evaluate(selectExpr, this.scope.values); }
			catch (err) {
				console.warn(`Error evaluating <haz:var name="${name}" select="${selectExpr}">. Assumed undefined.`);
			}
		}
		this.scope.set(name, value);
		return frag;
	}

	case 'param': {
		let name = el.getAttribute('name');
		let selectExpr = el.getAttribute('select');
		let value;
		if (selectExpr) {
			try { value = evaluate(selectExpr, this.scope.values); }
			catch (err) {
				console.warn(`Error evaluating <haz:param name="${name}" select="${selectExpr}">. Assumed undefined.`);
			}
		}
		this.scope.set(name, value, { param: true });
		return frag;
	}

	case 'call': {
		let name = el.getAttribute('name');
		let template = this.getNamedTemplate(name);
		if (!template) {
			console.warn(`Hazard could not find template name="${name}"`);
			return frag;
		}
		// Collect params from child <haz:param> elements
		let params = {};
		for (let child of el.children) {
			if (this.#getHazardTag(child) === 'param') {
				let pName = child.getAttribute('name');
				let pSelect = child.getAttribute('select');
				if (pName && pSelect) {
					try { params[pName] = evaluate(pSelect, this.scope.values); }
					catch (err) { console.warn(`Error evaluating param "${pName}": ${pSelect}`); }
				}
			}
		}
		return this.transformTemplate(template, params, frag);
	}

	// TODO consider reimplementing apply with @select, @as, and template @match as JS expressions
	case 'apply': {
		console.warn('<haz:apply> is not currently supported. Use haz:call with explicit template names.');
		return frag;
	}

	case 'clone': {
		let root = this.scope.get('root');
		if (!root || !root.cloneNode) return frag;
		let node = root.cloneNode(false);
		frag.appendChild(node);
		return this.transformChildNodes(el, node);
	}

	case 'deepclone': {
		let root = this.scope.get('root');
		if (!root || !root.cloneNode) return frag;
		let node = root.cloneNode(true);
		frag.appendChild(node);
		return frag;
	}

	case 'element': {
		let nameExpr = el.getAttribute('name');
		let name;
		try { name = evaluate(nameExpr, this.scope.values); }
		catch (err) {
			console.warn(`Error evaluating <haz:element name="${nameExpr}">.`);
			return frag;
		}
		if (typeof name !== 'string') {
			console.debug(`<haz:element name="${nameExpr}"> did not resolve to a string — skipped`);
			return frag;
		}
		let node = doc.createElement(name);
		frag.appendChild(node);
		return this.transformChildNodes(el, node);
	}

	case 'attr': {
		let nameExpr = el.getAttribute('name');
		let valueExpr = el.getAttribute('value');
		let name, value;
		try { name = evaluate(nameExpr, this.scope.values); }
		catch (err) {
			console.warn(`Error evaluating <haz:attr name="${nameExpr}">.`);
			return frag;
		}
		if (typeof name !== 'string') {
			console.debug(`<haz:attr name="${nameExpr}"> did not resolve to a string — skipped`);
			return frag;
		}
		if (valueExpr) {
			try { value = evaluate(valueExpr, this.scope.values); }
			catch (err) {
				console.warn(`Error evaluating <haz:attr value="${valueExpr}">.`);
				return frag;
			}
			setAttribute(frag, name, value);
			return frag;
		}
		// Fall back to child text content for value
		let node = doc.createDocumentFragment();
		return this.transformChildNodes(el, node)
		.then(() => {
			value = node.textContent;
			setAttribute(frag, name, value);
			return frag;
		});
	}

	case 'eval': {
		let selectExpr = el.getAttribute('select');
		let value;
		try { value = evaluate(selectExpr, this.scope.values); }
		catch (err) {
			console.warn(`Error evaluating <haz:eval select="${selectExpr}">.`);
			return this.transformChildNodes(el, frag); // fallback to children
		}
		if (value == null || value === false || value === undefined) {
			// No value — render children as fallback content
			return this.transformChildNodes(el, frag);
		}
		if (value.nodeType) {
			frag.appendChild(value);
		} else {
			frag.appendChild(doc.createTextNode(String(value)));
		}
		return frag;
	}

	case 'text': {
		let selectExpr = el.getAttribute('select');
		let value;
		try { value = evaluate(selectExpr, this.scope.values); }
		catch (err) {
			console.warn(`Error evaluating <haz:text select="${selectExpr}">.`);
			return frag;
		}
		frag.appendChild(doc.createTextNode(String(value)));
		return frag;
	}

	case 'unless':
		invertTest = true;
	case 'if': {
		let testExpr = el.getAttribute('test');
		let pass = false;
		try { pass = evaluate(testExpr, this.scope.values); }
		catch (err) {
			console.warn(`Error evaluating <haz:if test="${testExpr}">. Assumed false.`);
		}
		if (invertTest) pass = !pass;
		if (!pass) return frag;
		return this.transformChildNodes(el, frag);
	}

	case 'choose': {
		let otherwise;
		let when;
		let found = _.some(el.childNodes, (child) => {
			if (child.nodeType !== 1) return false;
			let childTag = this.#getHazardTag(child);
			if (!childTag) return false;
			if (childTag === 'otherwise') {
				if (!otherwise) otherwise = child;
				return false;
			}
			if (childTag !== 'when') return false;
			let testExpr = child.getAttribute('test');
			let pass = false;
			try { pass = evaluate(testExpr, this.scope.values); }
			catch (err) {
				console.warn(`Error evaluating <haz:when test="${testExpr}">. Assumed false.`);
			}
			if (!pass) return false;
			when = child;
			return true;
		});
		if (!found) when = otherwise;
		if (!when) {
			console.debug('<haz:choose> had no matching <haz:when> and no <haz:otherwise>');
			return frag;
		}
		return this.transformChildNodes(when, frag);
	}

	case 'one': {
		let selectExpr = el.getAttribute('select');
		let asName = el.getAttribute('as');
		let value;
		try { value = evaluate(selectExpr, this.scope.values); }
		catch (err) {
			console.warn(`Error evaluating <haz:one select="${selectExpr}">. Assumed empty.`);
			return frag;
		}
		if (!value) {
			console.debug(`<haz:one select="${selectExpr}"> resolved to nothing`);
			return frag;
		}
		if (asName) this.scope.set(asName, value);
		return this.transformChildNodes(el, frag);
	}

	case 'each': {
		let selectExpr = el.getAttribute('select');
		let asName = el.getAttribute('as');
		let items;
		try { items = evaluate(selectExpr, this.scope.values); }
		catch (err) {
			console.warn(`Error evaluating <haz:each select="${selectExpr}">. Assumed empty.`);
			return frag;
		}
		if (!items) {
			console.debug(`<haz:each select="${selectExpr}"> resolved to nothing`);
			return frag;
		}
		return Thenfu.reduce(null, items, (dummy, item) => {
			if (asName) this.scope.set(asName, item);
			return this.transformChildNodes(el, frag);
		});
	}

	}
}

/**
 * Transform a non-hazard element: clone it, evaluate expression attributes, then recurse into children.
 * @param {Element} srcNode - Source element to transform.
 * @param {DocumentFragment} frag - Output fragment.
 * @returns {Promise}
 */
transformTree(srcNode, frag) {
	let node = this.transformSingleElement(srcNode);
	let nodeAsFrag = frag.appendChild(node);

	return this.transformChildNodes(srcNode, nodeAsFrag);
}

/**
 * Clone an element (shallow) and evaluate any ${} expression attributes.
 * html: prefixed elements and attributes are already converted during preprocessing.
 * @param {Element} srcNode - Source element to clone and evaluate.
 * @returns {Element} Output element with evaluated attributes.
 */
transformSingleElement(srcNode) {
	let el = srcNode.cloneNode(false);

	for (let attr of Array.from(srcNode.attributes)) {
		let name = attr.name;
		let value = attr.value;
		if (value.startsWith('`')) {
			if (!value.endsWith('`')) {
				console.warn(`<${srcNode.localName}> @${name} starts with backtick but does not end with one: "${value}"`);
				continue;
			}
			// Template literal: `text ${expr}`
			el.removeAttribute(name);
			try { value = evaluate(value, this.scope.values); }
			catch (err) {
				console.warn(`Error evaluating attribute ${name}="${attr.value}".`);
				continue;
			}
			setAttribute(el, name, value);
		} else if (value.startsWith('${')) {
			if (!value.endsWith('}')) {
				console.warn(`<${srcNode.localName}> @${name} starts with \${ but does not end with }: "${value}"`);
				continue;
			}
			// Single expression: ${expr}
			el.removeAttribute(name);
			let expr = value.slice(2, -1);
			try { value = evaluate(expr, this.scope.values); }
			catch (err) {
				console.warn(`Error evaluating attribute ${name}="${attr.value}".`);
				continue;
			}
			setAttribute(el, name, value);
		}
	}

	return el;
}

}




/**
 * Set or remove an attribute based on value type.
 * Boolean false/null/undefined removes; boolean true sets empty; otherwise sets as string.
 * @param {Element} el - Target element.
 * @param {string} attrName - Attribute name.
 * @param {*} value - Value to set.
 */
function setAttribute(el, attrName, value) {
	let type = typeof value;
	if (type === 'undefined' || type === 'boolean' || value == null) {
		if (!value) el.removeAttribute(attrName);
		else el.setAttribute(attrName, '');
	}
	else {
		el.setAttribute(attrName, value.toString());
	}
}

export default HazardProcessor;
export { convertHtmlPrefix, promoteContentExpressions, normalizeExprAttrs, promoteHazAttrs, implyOtherwise };
