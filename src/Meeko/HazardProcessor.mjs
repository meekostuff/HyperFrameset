/*!
 * HazardProcessor
 * Copyright 2014-2016 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

import * as _ from './stuff.mjs';
import Thenfu from './Thenfu.mjs';
import filters from './filters.mjs';
import CustomNamespace from './CustomNamespace.mjs';

let document = window.document;

// Suffixes for expression attribute names (e.g. expr:_text, expr:_html)
// NOTE same values as TEXT_ATTR/HTML_ATTR in CSSDecoder but unrelated
const TEXT_SUFFIX = '_text';
const HTML_SUFFIX = '_html';

const PIPE_OPERATOR = '//>';

const HAZARD_TRANSFORM_URN = 'HazardTransform';
const hazDefaultNS = new CustomNamespace({
	urn: HAZARD_TRANSFORM_URN,
	name: 'haz',
	style: 'xml'
});
const HAZARD_EXPRESSION_URN = 'HazardExpression';
const exprDefaultNS = new CustomNamespace({
	urn: HAZARD_EXPRESSION_URN,
	name: 'expr',
	style: 'xml'
});
const HAZARD_MEXPRESSION_URN = 'HazardMExpression';
const mexprDefaultNS = new CustomNamespace({
	urn: HAZARD_MEXPRESSION_URN,
	name: 'mexpr',
	style: 'xml'
});

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
	'<otherwise <when@test <each@select <one@select +var@name,select <if@test <unless@test ' +
	'>choose <template@name,match >eval@select >mtext@select >text@select ' +
	'call@name apply param@name,select clone deepclone element@name attr@name';

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
	let attrs = def[1];
	attrs = (attrs && attrs !== '') ? attrs.split(',') : [];
	return {
		tag: tag,
		attrToElement: attrToElement,
		attrs: attrs
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
 * Parse an HTML string into a DocumentFragment.
 * @param {string} html - HTML string to parse.
 * @param {Document} [doc] - Document to create elements in.
 * @returns {DocumentFragment}
 */
function htmlToFragment(html, doc) {
	if (!doc) doc = document;
	let div = doc.createElement('div');
	div.innerHTML = html;
	return childNodesToFragment(div);
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
	if (!namespaces.lookupNamespace(HAZARD_EXPRESSION_URN))
		namespaces.add(exprDefaultNS);
	if (!namespaces.lookupNamespace(HAZARD_MEXPRESSION_URN))
		namespaces.add(mexprDefaultNS);
	this.#init();
}

#hazPrefix;
#exprPrefix;
#mexprPrefix;
#exprHtmlAttr;
#mexprTextAttr;
#exprTextAttr;
#exprToHazPriority;
#exprToHazMap;
#mexprHtmlAttr;

#init() {
	let namespaces = this.namespaces;
	this.#hazPrefix = namespaces.lookupPrefix(HAZARD_TRANSFORM_URN);
	this.#exprPrefix = namespaces.lookupPrefix(HAZARD_EXPRESSION_URN);
	this.#mexprPrefix = namespaces.lookupPrefix(HAZARD_MEXPRESSION_URN);

	this.#exprHtmlAttr = this.#exprPrefix + HTML_SUFFIX; // mapped to haz:eval
	this.#mexprTextAttr = this.#mexprPrefix + TEXT_SUFFIX; // mapped to haz:mtext
	this.#exprTextAttr = this.#exprPrefix + TEXT_SUFFIX; // mapped to haz:text
	this.#mexprHtmlAttr = this.#mexprPrefix + HTML_SUFFIX; // invalid, warn if seen

	// FIXME extract exprToHazPriority from hazLang
	this.#exprToHazPriority = [ this.#exprHtmlAttr, this.#mexprTextAttr, this.#exprTextAttr ];
	this.#exprToHazMap = {};
	this.#exprToHazMap[this.#exprHtmlAttr] = `${this.#hazPrefix}eval`;
	this.#exprToHazMap[this.#mexprTextAttr] = `${this.#hazPrefix}mtext`;
	this.#exprToHazMap[this.#exprTextAttr] = `${this.#hazPrefix}text`;
}

/**
 * Load and preprocess a template fragment for later transformation.
 * Rewrites expression attributes into hazard elements, implies otherwise/entry templates,
 * and extracts hazardDetails for each element.
 * @param {DocumentFragment} template - The template fragment to process.
 */
loadTemplate(template) {
	this.root = template; // FIXME assert template is Fragment
	this.templates = [];

	let doc = template.ownerDocument;

	// Pass 1: Rewrite expression attributes (expr:_text, expr:_html, etc.) into hazard elements
	walkTree(template, true, (el) => {
		let tag = el.localName;
		if (tag.indexOf(this.#hazPrefix) === 0) return;

		// pre-process @expr:_html -> @haz:eval, etc
		_.forEach(this.#exprToHazPriority, (attr) => {
			if (!el.hasAttribute(attr)) return;
			let tag = this.#exprToHazMap[attr];
			let val = el.getAttribute(attr);
			el.removeAttribute(attr);
			el.setAttribute(tag, val);
		});

		if (el.hasAttribute(this.#mexprHtmlAttr)) {
			console.warn(`Removing unsupported @${this.#mexprHtmlAttr}`);
			el.removeAttribute(this.#mexprHtmlAttr);
		}

		// promote applicable hazard attrs to elements
		_.forEach(hazLang, (def) => {
			if (!def.attrToElement) return;
			let nsTag = this.#hazPrefix + def.tag;
			if (!el.hasAttribute(nsTag)) return;

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
				let nsAttr = this.#hazPrefix + attr;
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
	});
	
	// Pass 2: Mark named templates and imply <haz:otherwise> in <haz:choose> blocks
	walkTree(template, true, (el) => {
		let tag = el.localName;
		if (tag === this.#hazPrefix + 'template') this.#markTemplate(el);
		if (tag === this.#hazPrefix + 'choose') this.#implyOtherwise(el);
	});

	// Pass 3: Wrap loose content nodes in an implicit entry template
	this.#implyEntryTemplate(template);

	// Pass 4: Extract hazardDetails (parsed directive info) for every element
	walkTree(template, true, (el) => {
		el.hazardDetails = this.#getHazardDetails(el);
	});
	
}

/**
 * Register a named template element for later matching.
 * @param {Element} el - The <haz:template> element.
 */
#markTemplate(el) {
	this.templates.push(el);
}

/**
 * Wrap non-<haz:when> children of a <haz:choose> in an implied <haz:otherwise>.
 * NOTE this slurps *any* non-<haz:when>, including <haz:otherwise>
 * @param {Element} el - The <haz:choose> element.
 */
#implyOtherwise(el) {
	let otherwise = el.ownerDocument.createElement(this.#hazPrefix + 'otherwise');
	_.forEach(Array.from(el.childNodes), (node) => {
		let tag = node.localName;
		if (tag === this.#hazPrefix + 'when') return;
		otherwise.appendChild(node);
	});
	el.appendChild(otherwise);
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
#getHazardDetails(el) {
	console.assert(el.nodeType === 1);
	let details = {};
	let tag = el.localName;
	let isHazElement = tag.indexOf(this.#hazPrefix) === 0;

	if (isHazElement) { // FIXME preprocess attrs of <haz:*>
		tag = tag.substr(this.#hazPrefix.length);
		let def = hazLangLookup[tag];
		details.definition = def || { tag: '' };
	}

	details.exprAttributes = this.#getExprAttributes(el);
	return details;
}

/**
 * Extract and remove expression/mexpression attributes from an element.
 * @param {Element} el - Element to extract from.
 * @returns {Array<Object>} Array of expression attribute descriptors.
 */
#getExprAttributes(el) {
	let attrs = [];
	let namespaces = this.namespaces;
	let exprNS = namespaces.lookupNamespace(HAZARD_EXPRESSION_URN);
	let mexprNS = namespaces.lookupNamespace(HAZARD_MEXPRESSION_URN);
	_.forEach(Array.from(el.attributes), (attr) => {
		let ns = _.find([ exprNS, mexprNS ], (ns) => {
			return (attr.name.indexOf(ns.prefix) === 0);
		});
		if (!ns) return;
		let prefix = ns.prefix;
		let namespaceURI = ns.urn;
		let attrName = attr.name.substr(prefix.length);
		el.removeAttribute(attr.name);
		let desc = {
			namespaceURI: namespaceURI,
			prefix: prefix,
			attrName: attrName,
			type: 'text'
		}
		switch (namespaceURI) {
		case HAZARD_EXPRESSION_URN:
			desc.expression = interpretExpression(attr.value);
			break;
		case HAZARD_MEXPRESSION_URN:
			desc.mexpression = interpretMExpression(attr.value);
			break;
		default: // TODO an error?
			break;
		}
		attrs.push(desc);
	});
	return attrs;
}

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
 * Find a template whose @match expression matches the given element.
 * @param {Element} element - Element to test against template match expressions.
 * @returns {Element|undefined} First matching template element.
 */
getMatchingTemplate(element) {
	let processor = this;
	return _.find(processor.templates, (template) => {
		if (!template.hasAttribute('match')) return false;
		let expression = template.getAttribute('match');
		return processor.provider.matches(element, expression);
	});	
}

/**
 * Transform the loaded template against a data provider.
 * @param {Object} provider - Data provider with evaluate() and matches() methods.
 * @param {Object} details - Transform details (passed as global params).
 * @returns {Promise<DocumentFragment>} Resolves with the transformed output fragment.
 */
transform(provider, details) {
	let processor = this;
	let root = processor.root;
	let doc = root.ownerDocument;
	let frag = doc.createDocumentFragment();
	return processor._transform(provider, details, frag)
	.then(() => {
		return frag;
	});
}

_transform(provider, details, frag) {
	let processor = this;
	processor.provider = provider;

	processor.globalParams = _.assign({}, details);
	processor.globalVars = {};
	processor.localParams = processor.globalParams;
	processor.localVars = processor.globalVars;
	processor.localParamsStack = [];
	processor.localVarsStack = [];

	/** @type {DecoderVariables} */
	processor.variables = {
		has: (key) => {
			let result =
				key in processor.localVars ||
				key in processor.localParams ||
				key in processor.globalVars ||
				key in processor.globalParams ||
				false;
			return result;
		},
		// NOTE returns the stored value for the first scope that contains the key,
		//   even if that value is falsy (0, "", false). Only returns undefined if no scope has the key.
		get: (key) => {
			if (key in processor.localVars) return processor.localVars[key];
			if (key in processor.localParams) return processor.localParams[key];
			if (key in processor.globalVars) return processor.globalVars[key];
			if (key in processor.globalParams) return processor.globalParams[key];
			return undefined;
		},
		set: (key, value, inParams, isGlobal) => {
			let mapName = isGlobal ?
				( inParams ? 'globalParams' : 'globalVars' ) :
				( inParams ? 'localParams' : 'localVars' );
			// NOTE params are write-once
			if (inParams && key in processor[mapName]) {
				console.warn(`Param "${key}" already set`);
				return;
			}
			// NOTE null/undefined deletes the value, allowing outer scope to show through
			if (value == null) {
				console.warn(`Variable "${key}" set to null/undefined — removing from scope`);
				delete processor[mapName][key];
				return;
			}
			processor[mapName][key] = value;
		},
		push: (params) => {
			processor.localParamsStack.push(processor.localParams);
			processor.localVarsStack.push(processor.localVars);

			if (typeof params !== 'object' || params == null) params = {};
			processor.localParams = params;
			processor.localVars = {};
		},
		pop: () => {
			processor.localParams = processor.localParamsStack.pop();		
			processor.localVars = processor.localVarsStack.pop();		
		}
	}

	return processor.transformChildNodes(processor.root, null, frag)
	.then(() => {
		let template = processor.getEntryTemplate();
		return processor.transformTemplate(template, null, null, frag);
	});
}

/**
 * Transform a specific template element within a context.
 * @param {Element} template - Template element to transform.
 * @param {Node} context - Data context node.
 * @param {Object} params - Parameters to push onto the variable stack.
 * @param {DocumentFragment} frag - Output fragment to append results to.
 * @returns {Promise<DocumentFragment>}
 */
transformTemplate(template, context, params, frag) {
	let processor = this;
	processor.variables.push(params);

	return processor.transformChildNodes(template, context, frag)
	.then(() => { 
		processor.variables.pop(); 
		return frag;
	});
}

/**
 * Transform all child nodes of a source node sequentially.
 * @param {Node} srcNode - Source node whose children to transform.
 * @param {Node} context - Data context node.
 * @param {DocumentFragment} frag - Output fragment.
 * @returns {Promise}
 */
transformChildNodes(srcNode, context, frag) {
	let processor = this;

	return Thenfu.reduce(null, srcNode.childNodes, (dummy, current) => {
		return processor.transformNode(current, context, frag);
	});
}

/**
 * Transform a single node: clone non-elements, dispatch elements to hazard or tree transform.
 * @param {Node} srcNode - Source node to transform.
 * @param {Node} context - Data context node.
 * @param {DocumentFragment} frag - Output fragment.
 * @returns {Promise|undefined}
 */
transformNode(srcNode, context, frag) {
	let processor = this;

	switch (srcNode.nodeType) {
	default: 
		let node = srcNode.cloneNode(true);
		frag.appendChild(node);
		return;
	case 3: // NOTE text-nodes are special-cased for perf testing
		let textNode = srcNode.cloneNode(true);
		frag.appendChild(textNode);
		return;
	case 1:
		let details = srcNode.hazardDetails;
		if (details.definition) return processor.transformHazardTree(srcNode, context, frag);
		else return processor.transformTree(srcNode, context, frag);
	}
}

/**
 * Transform a hazard directive element (haz:if, haz:for-each, haz:choose, etc.).
 * @param {Element} el - Hazard element to process.
 * @param {Node} context - Data context node.
 * @param {DocumentFragment} frag - Output fragment.
 * @returns {Promise|undefined}
 */
transformHazardTree(el, context, frag) {
	let processor = this;
	let doc = el.ownerDocument;

	let details = el.hazardDetails;
	let def = details.definition;

	let invertTest = false; // for haz:if haz:unless

	let name, selector, value, type, template, node, expr, mexpr;

	switch (def.tag) { // TODO refactor these cases into individual methods, e.g transformHazardLetTree()
	default: // for unknown (or unhandled) haz: elements just process the children
		console.warn(`Unknown hazard element <${el.localName}> — processing children only`);
		return processor.transformChildNodes(el, context, frag); 
		
	case 'template':
		return frag;

	case 'var':
		name = el.getAttribute('name');
		selector = el.getAttribute('select');
		value = context;
		if (selector) {
			try {
				value = processor.provider.evaluate(selector, context, processor.variables, false);
			}
			catch (err) {
				window.reportError(err);
				console.warn(`Error evaluating <haz:var name="${name}" select="${selector}">. Assumed empty.`);
				value = undefined;
			}
		}

		processor.variables.set(name, value);
		return frag;

	case 'param':
		name = el.getAttribute('name');
		selector = el.getAttribute('select');
		value = context;
		if (selector) {
			try {
				value = processor.provider.evaluate(selector, context, processor.variables, false);
			}
			catch (err) {
				window.reportError(err);
				console.warn(`Error evaluating <haz:param name="${name}" select="${selector}">. Assumed empty.`);
				value = undefined;
			}
		}

		processor.variables.set(name, value, true);
		return frag;


	case 'call':
		// FIXME attributes should already be in hazardDetails
		name = el.getAttribute('name');
		template = processor.getNamedTemplate(name);
		if (!template) {
			console.warn(`Hazard could not find template name="${name}"`);
			return frag;
		}
	
		return processor.transformTemplate(template, context, null, frag); 

	case 'apply': // WARN only applies to DOM-based provider
		template = processor.getMatchingTemplate(context);
		if (template) {
			return processor.transformTemplate(template, context, null, frag);
		}
		console.warn('<haz:apply> found no matching template:', context);
		node = context.cloneNode(false);
		frag.appendChild(node);
		return Thenfu.reduce(null, context.childNodes, (dummy, child) => {
			return processor.transformHazardTree(el, child, node);
		});

	case 'clone': // WARN only applies to DOM-based providers
		node = context.cloneNode(false);
		frag.appendChild(node);
		return processor.transformChildNodes(el, context, node);

	case 'deepclone': // WARN only applies to DOM-based providers
		node = context.cloneNode(true);
		frag.appendChild(node);
		// TODO WARN if el has child-nodes
		return frag;

	case 'element':
		// FIXME attributes should already be in hazardDetails
		// FIXME log a warning if this directive has children
		mexpr = el.getAttribute('name');
		name = evalMExpression(mexpr, processor.provider, context, processor.variables);
		type = typeof value;
		if (type !== 'string') {
			console.debug(`<haz:element name="${mexpr}"> did not resolve to a string — skipped`);
			return frag;
		}

		node = doc.createElement(name);
		frag.appendChild(node);
		return processor.transformChildNodes(el, context, node);

	case 'attr':
		// FIXME attributes should already be in hazardDetails
		// FIXME log a warning if this directive has children
		mexpr = el.getAttribute('name');
		name = evalMExpression(mexpr, processor.provider, context, processor.variables);
		type = typeof value;
		if (type !== 'string') {
			console.debug(`<haz:attr name="${mexpr}"> did not resolve to a string — skipped`);
			return frag;
		}

		node = doc.createDocumentFragment();
		return processor.transformChildNodes(el, context, node)
		.then(() => {
			value = node.textContent;
			frag.setAttribute(name, value);
			return frag;
		});

	case 'eval':
		// FIXME attributes should already be in hazardDetails
		// FIXME log a warning if this directive has children
		selector = el.getAttribute('select');
		value = evalExpression(selector, processor.provider, context, processor.variables, 'node');
		type = typeof value;
		if (type === 'undefined' || type === 'boolean' || value == null) {
			console.debug(`<haz:eval select="${selector}"> resolved to nothing`);
			return frag;
		}
		if (!value.nodeType) { // TODO test performance
			value = htmlToFragment(value, doc);
		}
		frag.appendChild(value);
		return frag;

	case 'mtext':
		// FIXME attributes should already be in hazardDetails
		// FIXME log a warning if this directive has children
		mexpr = el.getAttribute('select');
		value = evalMExpression(mexpr, processor.provider, context, processor.variables);
		// FIXME `value` should always already be "text"
		if (type === 'undefined' || type === 'boolean' || value == null) {
			console.debug(`<haz:mtext select="${mexpr}"> resolved to nothing`);
			return frag;
		}

		if (!value.nodeType) {
			value = doc.createTextNode(value);
		}
		frag.appendChild(value);
		return frag;

	case 'text':
		// FIXME attributes should already be in hazardDetails
		// FIXME log a warning if this directive has children
		expr = el.getAttribute('select');
		value = evalExpression(expr, processor.provider, context, processor.variables, 'text');
		// FIXME `value` should always already be "text"
		type = typeof value;
		if (type === 'undefined' || type === 'boolean' || value == null) {
			console.debug(`<haz:text select="${expr}"> resolved to nothing`);
			return frag;
		}
		if (!value.nodeType) {
			value = doc.createTextNode(value);
		}
		frag.appendChild(value);
		return frag;

	case 'unless':
		invertTest = true;
	case 'if':
		// FIXME attributes should already be in hazardDetails
		let testVal = el.getAttribute('test');
		let pass = false;
		try {
			pass = evalExpression(testVal, processor.provider, context, processor.variables, 'boolean');
		}
		catch (err) {
			window.reportError(err);
			console.warn(`Error evaluating <haz:if test="${testVal}">. Assumed false.`);
			pass = false;
		}
		if (invertTest) pass = !pass;
		if (!pass) return frag;
		return processor.transformChildNodes(el, context, frag); 

	case 'choose':
		// FIXME attributes should already be in hazardDetails
 		// NOTE if no successful `when` then chooses *first* `otherwise` 		
		let otherwise;
		let when;
		let found = _.some(el.childNodes, (child) => { // TODO .children??
			if (child.nodeType !== 1) return false;
			let childDef = child.hazardDetails.definition;
			if (!childDef) return false;
			if (childDef.tag === 'otherwise') {
				if (!otherwise) otherwise = child;
				return false;
			}
			if (childDef.tag !== 'when') return false;
			let testVal = child.getAttribute('test');
			let pass = evalExpression(testVal, processor.provider, context, processor.variables, 'boolean');
			if (!pass) return false;
			when = child;
			return true;
		});
		if (!found) when = otherwise;
		if (!when) {
			console.debug('<haz:choose> had no matching <haz:when> and no <haz:otherwise>');
			return frag;
		}
		return processor.transformChildNodes(when, context, frag); 

	case 'one': // FIXME refactor common parts with `case 'each':`
		// FIXME attributes should already be in hazardDetails
		selector = el.getAttribute('select');
		let subContext;
		try {
			subContext = processor.provider.evaluate(selector, context, processor.variables, false);
		}
		catch (err) {
			window.reportError(err);
			console.warn(`Error evaluating <haz:one select="${selector}">. Assumed empty.`);
			return frag;
		}

		if (!subContext) {
			console.debug(`<haz:one select="${selector}"> resolved to nothing`);
			return frag;
		}
		return processor.transformChildNodes(el, subContext, frag);


	case 'each':
		// FIXME attributes should already be in hazardDetails
		selector = el.getAttribute('select');
		let subContexts;
		try {
			subContexts = processor.provider.evaluate(selector, context, processor.variables, true);
		}
		catch (err) {
			window.reportError(err);
			console.warn(`Error evaluating <haz:each select="${selector}">. Assumed empty.`);
			return frag;
		}

		return Thenfu.reduce(null, subContexts, (dummy, subContext) => {
			return processor.transformChildNodes(el, subContext, frag);
		});

	}
			
}

/**
 * Transform a non-hazard element: clone it, evaluate expression attributes, then recurse into children.
 * @param {Element} srcNode - Source element to transform.
 * @param {Node} context - Data context node.
 * @param {DocumentFragment} frag - Output fragment.
 * @returns {Promise}
 */
transformTree(srcNode, context, frag) { // srcNode is Element
	let processor = this;
	
	let nodeType = srcNode.nodeType;
	if (nodeType !== 1) throw Error('transformTree() expects Element');
	let node = processor.transformSingleElement(srcNode, context);
	let nodeAsFrag = frag.appendChild(node); // WARN use returned value not `node` ...
	// ... this allows frag to be a custom object, which in turn 
	// ... allows a different type of output construction

	return processor.transformChildNodes(srcNode, context, nodeAsFrag);
}

/**
 * Clone an element (shallow) and evaluate its expression attributes.
 * @param {Element} srcNode - Source element to clone and evaluate.
 * @param {Node} context - Data context node.
 * @returns {Element} Cloned element with evaluated attributes.
 */
transformSingleElement(srcNode, context) {
	let processor = this;
	let details = srcNode.hazardDetails;

	let el = srcNode.cloneNode(false);

	_.forEach(details.exprAttributes, (desc) => {
		let value;
		try {
			value = (desc.namespaceURI === HAZARD_MEXPRESSION_URN) ?
				processMExpression(desc.mexpression, processor.provider, context, processor.variables) :
				processExpression(desc.expression, processor.provider, context, processor.variables, desc.type);
		}
		catch (err) {
			window.reportError(err);
			console.warn(`Error evaluating @${desc.attrName}="${desc.expression}". Assumed false.`);
			value = false;
		}
		setAttribute(el, desc.attrName, value);
	});

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

/**
 * Parse and evaluate a mustache-style expression string.
 * @param {string} mexprText - Mustache expression text (e.g. "Hello {{.name}}").
 * @param {Object} provider - Data provider with evaluate/matches methods.
 * @param {Node} context - Context node for evaluation.
 * @param {Object} variables - Variable bindings.
 * @returns {string} Evaluated result.
 */
function evalMExpression(mexprText, provider, context, variables) {
	let mexpr = interpretMExpression(mexprText);
	return processMExpression(mexpr, provider, context, variables);
}

/**
 * Parse and evaluate a single expression string.
 * @param {string} exprText - Expression text (e.g. ".title //> uppercase").
 * @param {Object} provider - Data provider with evaluate/matches methods.
 * @param {Node} context - Context node for evaluation.
 * @param {Object} variables - Variable bindings.
 * @param {string} type - Result type ('text' or 'node').
 * @returns {*} Evaluated result.
 */
function evalExpression(exprText, provider, context, variables, type) {
	let expr = interpretExpression(exprText);
	return processExpression(expr, provider, context, variables, type);
}
	
/**
 * Parse a mustache-style expression into a template and expression list.
 * @param {string} mexprText - Text containing {{expression}} placeholders.
 * @returns {{template: string, expressions: Array<Object>}} Parsed representation.
 */
function interpretMExpression(mexprText) {
	let expressions = [];
	let mexpr = mexprText.replace(/\{\{((?:[^}]|\}(?=\}\})|\}(?!\}))*)\}\}/g, (all, expr) => {
		expressions.push(expr);
		return '{{}}';
	});

	expressions = expressions.map((expr) => { return interpretExpression(expr); });
	return {
		template: mexpr,
		expressions: expressions
	};
}

/**
 * Parse a single expression into a selector and filter chain.
 * @param {string} exprText - Expression text (selector optionally followed by //> filter calls).
 * @returns {{text: string, selector: string, filters: Array<Object>}} Parsed expression.
 */
function interpretExpression(exprText) { // FIXME robustness
	let expression = {};
	expression.text = exprText;
	let exprParts = exprText.split(PIPE_OPERATOR);
	expression.selector = exprParts.shift();
	expression.filters = [];

	_.forEach(exprParts, (filterSpec) => {
		filterSpec = filterSpec.trim();
		let text = filterSpec;
		let m = text.match(/^([_a-zA-Z][_a-zA-Z0-9]*)\s*(:?)/);
		if (!m) {
			console.warn(`Syntax Error in filter call: ${filterSpec}`);
			return false;
		}
		let filterName = m[1];
		let hasParams = m[2];
		text = text.substr(m[0].length);
		if (!hasParams && /\S+/.test(text)) {
			console.warn(`Syntax Error in filter call: ${filterSpec}`);
			return false;
		}

		try {
			let filterParams = (Function('return [' + text + '];'))();
			expression.filters.push({
				text: filterSpec,
				name: filterName,
				params: filterParams
			});
			return true;
		}
		catch (err) {
			console.warn(`Syntax Error in filter call: ${filterSpec}`);
			return false;
		}
	});

	return expression;
}


/**
 * Evaluate a parsed mustache expression by replacing placeholders with evaluated values.
 * @param {Object} mexpr - Parsed mustache expression from interpretMExpression.
 * @param {Object} provider - Data provider.
 * @param {Node} context - Context node.
 * @param {Object} variables - Variable bindings.
 * @returns {string} Fully evaluated string.
 */
function processMExpression(mexpr, provider, context, variables) {
	let i = 0;
	return mexpr.template.replace(/\{\{\}\}/g, (all) => {
		return processExpression(mexpr.expressions[i++], provider, context, variables, 'text');
	});
}

/**
 * Evaluate a parsed expression: resolve selector, apply filter chain, cast to type.
 * @param {Object} expr - Parsed expression from interpretExpression.
 * @param {Object} provider - Data provider with evaluate method.
 * @param {Node} context - Context node for selector evaluation.
 * @param {Object} variables - Variable bindings.
 * @param {string} type - Result type ('text' or 'node').
 * @returns {*} Evaluated and cast result.
 */
function processExpression(expr, provider, context, variables, type) { // FIXME robustness
	let value = provider.evaluate(expr.selector, context, variables);

	_.every(expr.filters, (filter) => {
		if (value == null) value = '';
		if (value.nodeType) {
			if (value.nodeType === 1) value = value.textContent;
			else value = '';
		}
		try {
			value = filters.evaluate(filter.name, value, filter.params);
			return true;
		}
		catch (err) {
			window.reportError(err);
			console.warn(`Failure processing filter call: "${filter.text}" with input: "${value}"`);
			value = '';
			return false;
		}
	});

	return cast(value, type, context);
}

/**
 * Get the ownerDocument from a context node.
 * @param {Node} context - A document, element, or other node.
 * @returns {Document}
 */
function getDocument(context) {
	if (context && context.nodeType === 9) return context;
	if (context && context.ownerDocument) return context.ownerDocument;
	return document;
}

/**
 * Cast a value to the specified output type.
 * @param {*} value - The value to cast.
 * @param {string} type - Target type: 'text', 'node', or 'boolean'.
 * @param {Node} context - Context node (used to derive document for fragment creation).
 * @returns {string|DocumentFragment|boolean} The cast value.
 */
function cast(value, type, context) {
	switch (type) {
	case 'text':
		if (value && value.nodeType) value = value.textContent;
		break;
	case 'node':
		let doc = getDocument(context);
		let frag = doc.createDocumentFragment();
		if (value && value.nodeType) frag.appendChild(doc.importNode(value, true)); // NOTE no adoption
		else {
			let div = doc.createElement('div');
			div.innerHTML = value;
			let node;
			while (node = div.firstChild) frag.appendChild(node); // NOTE no adoption
		}
		value = frag;
		break;
	case 'boolean':
		// NOTE only literal `false` or absence (null/undefined) means false; all other values are true
		if (value == null || value === false) value = false;
		else {
			if (!value) console.warn(`Casting present but falsy value (${JSON.stringify(value)}) to true`);
			value = true;
		}
		break;
	default:
		console.warn(`Unexpected cast type: ${type}`);
		if (value && value.nodeType) value = value.textContent;
		break;
	}
	return value;
}

export default HazardProcessor;