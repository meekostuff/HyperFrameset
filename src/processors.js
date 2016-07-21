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

var Meeko = window.Meeko;
var _ = Meeko.stuff;
var DOM = Meeko.DOM;
var Task = Meeko.Task;
var Promise = Meeko.Promise;
var filters = Meeko.filters;
var CustomNamespace = Meeko.CustomNamespace;
var NamespaceCollection = Meeko.NamespaceCollection;

var processors = Meeko.processors = {

items: {},

register: function(type, constructor) {
	this.items[type] = constructor;
},

create: function(type, options, namespaces) {
	return new this.items[type](options, namespaces, filters);
}

}


/* WARN 
	on IE11 and Edge, certain elements (or attrs) *not* attached to a document 
	can trash the layout engine. Examples:
		- <custom-element>
		- <element style="...">
		- <li value="NaN">
*/
var FRAGMENTS_ARE_INERT = !(window.HTMLUnknownElement && 
	'runtimeStyle' in window.HTMLUnknownElement.prototype);
// NOTE actually IE10 is okay, but no reasonable feature detection has been determined

var MainProcessor = (function() {

function MainProcessor(options) {}

_.defaults(MainProcessor.prototype, {

loadTemplate: function(template) {
	if (/\S+/.test(template.textContent)) console.warn('"main" transforms do not use templates');
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

processors.register('main', MainProcessor);


var ScriptProcessor = (function() {

function ScriptProcessor(options) {
	this.processor = options;
}

_.defaults(ScriptProcessor.prototype, {

loadTemplate: function(template) {
	var script;
	_.forEach(_.map(template.childNodes), function(node) {
		switch (node.nodeType) {
		case 1: // Element
			switch (DOM.getTagName(node)) {
			case 'script':
				if (script) console.warn('Ignoring secondary <script> in "script" transform template');
				else script = node;
				return;
			default:
				console.warn('Ignoring unexpected non-<script> element in "script" transform template');
				return;
			}
			break; // should never reach here
		case 3: // Text
			if (/\S+/.test(node.nodeValue)) console.warn('"script" transforms should not have non-empty text-nodes');
			return;
		case 8: // Comment
			return;
		default:
			console.warn('Unexpected node in "script" transform template');
			return;
		}
	});
	if (!script) {
		// no problem if already a processor defined in new ScriptProcessor(options)
		if (this.processor) return;
		console.warn('No <script> found in "script" transform template');
		return;
	}
	try { this.processor = (Function('return (' + script.text + ')'))(); }
	catch(err) { Task.postError(err); }
	
	if (!this.processor || !this.processor.transform) {
		console.warn('"script" transform template did not produce valid transform object');
		return;
	}
},

transform: function(provider, details) {
	var srcNode = provider.srcNode;
	if (!this.processor || !this.processor.transform) {
		console.warn('"script" transform template did not produce valid transform object');
		return;
	}
	return this.processor.transform(srcNode, details);
}
	
});


return ScriptProcessor;
})();

processors.register('script', ScriptProcessor);


// FIXME textAttr & htmlAttr used in HazardProcessor & CSSDecoder
var textAttr = '_text';
var htmlAttr = '_html';

var PIPE_OPERATOR = '//>';

var HYPERFRAMESET_URN = 'hyperframeset'; // FIXME DRY with libHyperFrameset.js

var HazardProcessor = (function() {

var HAZARD_TRANSFORM_URN = 'HazardTransform';
var hazDefaultNS = new CustomNamespace({
	urn: HAZARD_TRANSFORM_URN,
	name: 'haz',
	style: 'xml'
});
var HAZARD_EXPRESSION_URN = 'HazardExpression';
var exprDefaultNS = new CustomNamespace({
	urn: HAZARD_EXPRESSION_URN,
	name: 'expr',
	style: 'xml'
});
var HAZARD_MEXPRESSION_URN = 'HazardMExpression';
var mexprDefaultNS = new CustomNamespace({
	urn: HAZARD_MEXPRESSION_URN,
	name: 'mexpr',
	style: 'xml'
});

/* 
 NOTE IE11 / Edge has a bad performance regression with DOM fragments 
 containing certain elements / attrs, see
     https://connect.microsoft.com/IE/feedback/details/1776195/ie11-edge-performance-regression-with-dom-fragments
*/
var PERFORMANCE_UNFRIENDLY_CONDITIONS = [
	{
		tag: '*', // must be present for checkElementPerformance()
		attr: 'style',
		description: 'an element with @style'
	},
	{
		tag: 'li',
		attr: 'value',
		description: 'a <li> element with @value'
	},
	{
		tag: undefined,
		description: 'an unknown or custom element'
	}
];

function checkElementPerformance(el, namespaces) {
	var exprPrefix = namespaces.lookupPrefix(HAZARD_EXPRESSION_URN);
	var mexprPrefix = namespaces.lookupPrefix(HAZARD_MEXPRESSION_URN);

	var outerHTML;
	_.forEach(PERFORMANCE_UNFRIENDLY_CONDITIONS, function(cond) {
		switch (cond.tag) {
		case undefined: case null:
			if (el.toString() !== '[object HTMLUnknownElement]') return;
			break;
		default:
			if (DOM.getTagName(el) !== cond.tag) return;
			// fall-thru
		case '*': case '':
			if (_.every(
				['', exprPrefix, mexprPrefix], function(prefix) {
					var attr = prefix + cond.attr;
					return !el.hasAttribute(attr);
				})
			) return;
			break;
		}
		if (!outerHTML) outerHTML = el.cloneNode(false).outerHTML; // FIXME caniuse outerHTML??
		console.debug('Found ' + cond.description + ':\n\t\t' + outerHTML + '\n\t' +
			'This can cause poor performance on IE / Edge.');
	});
}

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
var hazLangDefinition = 
	'<otherwise <when@test <each@select <one@select +var@name,select <if@test <unless@test ' +
	'>choose <template@name,match >eval@select >mtext@select >text@select ' +
	'call@name apply clone deepclone element@name attr@name';

var hazLang = _.map(_.words(hazLangDefinition), function(def) {
	def = def.split('@');
	var tag = def[0];
	var attrToElement = tag.charAt(0);
	switch (attrToElement) {
	default: 
		attrToElement = false; 
		break;
	case '<': case '>': case '+':
		break;
	}
	if (attrToElement) tag = tag.substr(1);
	var attrs = def[1];
	attrs = (attrs && attrs !== '') ? attrs.split(',') : [];
	return {
		tag: tag,
		attrToElement: attrToElement,
		attrs: attrs
	}
});

var hazLangLookup = {};

_.forEach(hazLang, function(directive) {
	var tag = directive.tag; 
	hazLangLookup[tag] = directive;
});

function walkTree(root, skipRoot, callback) { // always "accept" element nodes
	var walker = document.createNodeIterator(
			root,
			1,
			acceptNode,
			null // IE9 throws if this irrelavent argument isn't passed
		);
	
	var el;
	while (el = walker.nextNode()) callback(el);

	function acceptNode(el) {
		if (skipRoot && el === root) return NodeFilter.FILTER_SKIP;
		return NodeFilter.FILTER_ACCEPT;
	}
}

function childNodesToFragment(el) {
	var doc = el.ownerDocument;
	var frag = doc.createDocumentFragment();
	_.forEach(_.map(el.childNodes), function(child) { frag.appendChild(child); });
	return frag;
}

function htmlToFragment(html, doc) {
	if (!doc) doc = document;
	var div = doc.createElement('div');
	div.innerHTML = html;
	var result = childNodesToFragment(div);
	return result;
}

function HazardProcessor(options, namespaces, filters) {
	this.filters = filters;
	this.templates = [];
	this.namespaces = namespaces = namespaces.clone();
	if (!namespaces.lookupNamespace(HAZARD_TRANSFORM_URN))
		namespaces.add(hazDefaultNS);
	if (!namespaces.lookupNamespace(HAZARD_EXPRESSION_URN))
		namespaces.add(exprDefaultNS);
	if (!namespaces.lookupNamespace(HAZARD_MEXPRESSION_URN))
		namespaces.add(mexprDefaultNS);
}

_.defaults(HazardProcessor.prototype, {
	
loadTemplate: function(template) {
	var processor = this;
	processor.root = template; // FIXME assert template is Fragment
	processor.templates = [];

	var namespaces = processor.namespaces;
	var hazPrefix = namespaces.lookupPrefix(HAZARD_TRANSFORM_URN);
	var exprPrefix = namespaces.lookupPrefix(HAZARD_EXPRESSION_URN);
	var mexprPrefix = namespaces.lookupPrefix(HAZARD_MEXPRESSION_URN);

	var exprHtmlAttr = exprPrefix + htmlAttr; // NOTE this is mapped to haz:eval
	var hazEvalTag = hazPrefix + 'eval';
	var mexprHtmlAttr = mexprPrefix + htmlAttr; // NOTE this is invalid

	var mexprTextAttr = mexprPrefix + textAttr; // NOTE this is mapped to haz:mtext
	var hazMTextTag = hazPrefix + 'mtext';
	var exprTextAttr = exprPrefix + textAttr; // NOTE this is mapped to haz:text
	var hazTextTag = hazPrefix + 'text';

	// FIXME extract exprToHazPriority from hazLang
	var exprToHazPriority = [ exprHtmlAttr, mexprTextAttr, exprTextAttr ];
	var exprToHazMap = {};
	exprToHazMap[exprHtmlAttr] = hazEvalTag;
	exprToHazMap[mexprTextAttr] = hazMTextTag;
	exprToHazMap[exprTextAttr] = hazTextTag;

	var doc = template.ownerDocument;

	// rewrite the template if necessary
	walkTree(template, true, function(el) {
		var tag = DOM.getTagName(el);
		if (tag.indexOf(hazPrefix) === 0) return;

		// pre-process @expr:_html -> @haz:eval, etc
		_.forEach(exprToHazPriority, function(attr) {
			if (!el.hasAttribute(attr)) return;
			var tag = exprToHazMap[attr];
			var val = el.getAttribute(attr);
			el.removeAttribute(attr);
			el.setAttribute(tag, val);
		});

		if (el.hasAttribute(mexprHtmlAttr)) {
			console.warn('Removing unsupported @' + mexprHtmlAttr);
			el.removeAttribute(mexprHtmlAttr);
		}

		// promote applicable hazard attrs to elements
		_.forEach(hazLang, function(def) {
			if (!def.attrToElement) return;
			var nsTag = hazPrefix + def.tag;
			if (!el.hasAttribute(nsTag)) return;

			// create <haz:element> ...
			var directiveEl = doc.createElement(nsTag);
			// with default attr set from @haz:attr on original element
			var defaultAttr = def.attrs[0];
			var value = el.getAttribute(nsTag);
			el.removeAttribute(nsTag);
			if (defaultAttr) directiveEl.setAttribute(defaultAttr, value);

			// copy non-default hazard attrs
			_.forEach(def.attrs, function(attr, i) {
				if (i === 0) return; // the defaultAttr
				var nsAttr = hazPrefix + attr;
				if (!el.hasAttribute(nsAttr)) return;
				var value = el.getAttribute(nsAttr);
				el.removeAttribute(nsAttr);
				directiveEl.setAttribute(attr, value);
			});
			// insert the hazard element goes below or above the current element
			switch (def.attrToElement) {
			case '>':
				var frag = childNodesToFragment(el);
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
	
	walkTree(template, true, function(el) {
		var tag = DOM.getTagName(el);
		if (tag === hazPrefix + 'template') markTemplate(el);
		if (tag === hazPrefix + 'choose') implyOtherwise(el);
	});

	implyEntryTemplate(template);

	// finally, preprocess all elements to extract hazardDetails
	walkTree(template, true, function(el) {
		el.hazardDetails = getHazardDetails(el, processor.namespaces);
	});
	
	if (console.logLevel !== 'debug') return;

	// if debugging then warn about PERFORMANCE_UNFRIENDLY_CONDITIONS (IE11 / Edge)
	var hfNS = processor.namespaces.lookupNamespace(HYPERFRAMESET_URN);
	walkTree(template, true, function(el) {
		var tag = DOM.getTagName(el);
		if (tag.indexOf(hazPrefix) === 0) return;
		if (tag.indexOf(hfNS.prefix) === 0) return; // HyperFrameset element
		checkElementPerformance(el, namespaces);
	});


	function implyOtherwise(el) { // NOTE this slurps *any* non-<haz:when>, including <haz:otherwise>
		var otherwise = el.ownerDocument.createElement(hazPrefix + 'otherwise');
		_.forEach(_.map(el.childNodes), function(node) {
			var tag = DOM.getTagName(node);
			if (tag === hazPrefix + 'when') return;
			otherwise.appendChild(node);
		});
		el.appendChild(otherwise);
	}

	function markTemplate(el) {
		processor.templates.push(el);
	}

	function implyEntryTemplate(el) { // NOTE this slurps *any* non-<haz:template>
		var firstExplicitTemplate;
		var contentNodes = _.filter(el.childNodes, function(node) {
			var tag = DOM.getTagName(node);
			if (tag === hazPrefix + 'template') {
				if (!firstExplicitTemplate) firstExplicitTemplate = node;
				return false;
			}
			if (tag === hazPrefix + 'var') return false;
			if (node.nodeType === 3 && !(/\S/).test(node.nodeValue)) return false;
			if (node.nodeType !== 1) return false;
			return true;
		});

		if (contentNodes.length <= 0) {
			if (firstExplicitTemplate) return;
			console.warn('This Hazard Template cannot generate any content.');
		}
		var entryTemplate = el.ownerDocument.createElement(hazPrefix + 'template');
		_.forEach(contentNodes, function(node) {
			entryTemplate.appendChild(node);
		});
		el.insertBefore(entryTemplate, firstExplicitTemplate);
		processor.templates.unshift(entryTemplate);
	}

},

getEntryTemplate: function() {
	return this.templates[0];
},

getNamedTemplate: function(name) {
	var processor = this;
	name = _.lc(name);
	return _.find(processor.templates, function(template) {
		return _.lc(template.getAttribute('name')) === name;
	});
},

getMatchingTemplate: function(element) {
	var processor = this;
	return _.find(processor.templates, function(template) {
		if (!template.hasAttribute('match')) return false;
		var expression = template.getAttribute('match');
		return processor.provider.matches(element, expression);
	});	
},

transform: FRAGMENTS_ARE_INERT ?
function(provider, details) { // TODO how to use details
	var processor = this;
	var root = processor.root;
	var doc = root.ownerDocument;
	var frag = doc.createDocumentFragment();
	return processor._transform(provider, details, frag)
	.then(function() {
		return frag;
	});
} :

// NOTE IE11, Edge needs a different transform() because fragments are not inert
function(provider, details) {
	var processor = this;
	var root = processor.root;
	var doc = DOM.createHTMLDocument('', root.ownerDocument);
	var frag = doc.body; // WARN don't know why `doc.body` is inert but fragments aren't
	return processor._transform(provider, details, frag)
	.then(function() {
		frag = childNodesToFragment(frag);
		return frag;
	});
},

_transform: function(provider, details, frag) {
	var processor = this;
	processor.provider = provider;
	var template = processor.getEntryTemplate()
	var done = processor.transformChildNodes(template, null, {}, frag);
	return Promise.resolve(done);
},

transformChildNodes: function(srcNode, context, variables, frag) {
	var processor = this;

	return Promise.reduce(null, srcNode.childNodes, function(dummy, current) {
		return processor.transformNode(current, context, variables, frag);
	});
},

transformNode: function(srcNode, context, variables, frag) {
	var processor = this;

	switch (srcNode.nodeType) {
	default: 
		var node = srcNode.cloneNode(true);
		frag.appendChild(node);
		return;
	case 3: // NOTE text-nodes are special-cased for perf testing
		var node = srcNode.cloneNode(true);
		frag.appendChild(node);
		return;
	case 1:
		var details = srcNode.hazardDetails;
		if (details.definition) return processor.transformHazardTree(srcNode, context, variables, frag);
		else return processor.transformTree(srcNode, context, variables, frag);
	}
},

transformHazardTree: function(el, context, variables, frag) {
	var processor = this;
	var doc = el.ownerDocument;

	var details = el.hazardDetails;
	var def = details.definition;

	var invertTest = false; // for haz:if haz:unless

	switch (def.tag) {
	default: // for unknown (or unhandled like `template`) haz: elements just process the children
		return processor.transformChildNodes(el, context, variables, frag); 
		
	case 'call':
		// FIXME attributes should already be in hazardDetails
		var name = el.getAttribute('name');
		var template = processor.getNamedTemplate(name);
		if (!template) {
			console.warn('Hazard could not find template name=' + name);
			return frag;
		}
	
		return processor.transformChildNodes(template, context, variables, frag); 

	case 'apply': // WARN only applies to DOM-based provider
		var template = processor.getMatchingTemplate(context);
		var promise = Promise.resolve(el);
		if (template) {
			return processor.transformChildNodes(template, context, variables, frag);
		}
		var node = context.cloneNode(false);
		frag.appendChild(node);
		return Promise.reduce(null, context.childNodes, function(dummy, child) {
			return processor.transformHazardTree(el, child, variables, node);
		});

	case 'clone': // WARN only applies to DOM-based providers
		var node = context.cloneNode(false);
		frag.appendChild(node);
		return processor.transformChildNodes(el, context, variables, node);

	case 'deepclone': // WARN only applies to DOM-based providers
		var node = context.cloneNode(true);
		frag.appendChild(node);
		// TODO WARN if el has child-nodes
		return;

	case 'element':
		// FIXME attributes should already be in hazardDetails
		// FIXME log a warning if this directive has children
		var mexpr = el.getAttribute('name');
		var name = evalMExpression(mexpr, processor.filters, processor.provider, context, variables);
		var type = typeof value;
		if (type !== 'string') return;

		var node = doc.createElement(name);
		frag.appendChild(node);
		return processor.transformChildNodes(el, context, variables, node);
		return;

	case 'attr':
		// FIXME attributes should already be in hazardDetails
		// FIXME log a warning if this directive has children
		var mexpr = el.getAttribute('name');
		var name = evalMExpression(mexpr, processor.filters, processor.provider, context, variables);
		var type = typeof value;
		if (type !== 'string') return;

		var node = doc.createDocumentFragment();
		return processor.transformChildNodes(el, context, variables, node)
		.then(function() {
			value = node.textContent;
			frag.setAttribute(name, value);
			return frag;
		});

	case 'eval':
		// FIXME attributes should already be in hazardDetails
		// FIXME log a warning if this directive has children
		var selector = el.getAttribute('select');
		var value = evalExpression(selector, processor.filters, processor.provider, context, variables, 'node');
		var type = typeof value;
		if (type === 'undefined' || type === 'boolean' || value == null) return;
		if (!value.nodeType) { // TODO test performance
			value = htmlToFragment(value, doc);
		}
		frag.appendChild(value);
		return;

	case 'mtext':
		// FIXME attributes should already be in hazardDetails
		// FIXME log a warning if this directive has children
		var mexpr = el.getAttribute('select');
		var value = evalMExpression(mexpr, processor.filters, processor.provider, context, variables);
		// FIXME `value` should always already be "text"
		if (type === 'undefined' || type === 'boolean' || value == null) return;
		if (!value.nodeType) {
			value = doc.createTextNode(value);
		}
		frag.appendChild(value);
		return;

	case 'text':
		// FIXME attributes should already be in hazardDetails
		// FIXME log a warning if this directive has children
		var expr = el.getAttribute('select');
		var value = evalExpression(expr, processor.filters, processor.provider, context, variables, 'text');
		// FIXME `value` should always already be "text"
		var type = typeof value;
		if (type === 'undefined' || type === 'boolean' || value == null) return;
		if (!value.nodeType) {
			value = doc.createTextNode(value);
		}
		frag.appendChild(value);
		return;

	case 'unless':
		invertTest = true;
	case 'if':
		// FIXME attributes should already be in hazardDetails
		var testVal = el.getAttribute('test');
		var pass = false;
		try {
			pass = evalExpression(testVal, processor.filters, processor.provider, context, variables, 'boolean');
		}
		catch (err) {
			Task.postError(err);
			console.warn('Error evaluating <haz:if test="' + testVal + '">. Assumed false.');
			pass = false;
		}
		if (invertTest) pass = !pass;
		if (!pass) return;
		return processor.transformChildNodes(el, context, variables, frag); 

	case 'choose':
		// FIXME attributes should already be in hazardDetails
 		// NOTE if no successful `when` then chooses *first* `otherwise` 		
		var otherwise;
		var when;
		var found = _.some(el.childNodes, function(child) { // TODO .children??
			if (child.nodeType !== 1) return false;
			var childDef = child.hazardDetails.definition;
			if (!childDef) return false;
			if (childDef.tag === 'otherwise') {
				if (!otherwise) otherwise = child;
				return false;
			}
			if (childDef.tag !== 'when') return false;
			var testVal = child.getAttribute('test');
			var pass = evalExpression(testVal, processor.filters, processor.provider, context, variables, 'boolean');
			if (!pass) return false;
			when = child;
			return true;
		});
		if (!found) when = otherwise;
		if (!when) return;
		return processor.transformChildNodes(when, context, variables, frag); 

	case 'one': // FIXME refactor common parts with `case 'each':`
		// FIXME attributes should already be in hazardDetails
		var selector = el.getAttribute('select');
		var subContext;
		try {
			subContext = processor.provider.evaluate(selector, context, variables, false);
		}
		catch (err) {
			Task.postError(err);
			console.warn('Error evaluating <haz:one select="' + selector + '">. Assumed empty.');
			return;
		}

		return processor.transformChildNodes(el, subContext, variables, frag);


	case 'each':
		// FIXME attributes should already be in hazardDetails
		var selector = el.getAttribute('select');
		var subContexts;
		try {
			subContexts = processor.provider.evaluate(selector, context, variables, true);
		}
		catch (err) {
			Task.postError(err);
			console.warn('Error evaluating <haz:each select="' + selector + '">. Assumed empty.');
			return;
		}

		return Promise.reduce(null, subContexts, function(dummy, subContext) {
			return processor.transformChildNodes(el, subContext, variables, frag);
		});

	case 'var':
		var name = el.getAttribute('name');
		var selector = el.getAttribute('select');
		var value = context;
		if (selector) {
			try {
				value = processor.provider.evaluate(selector, context, variables, false);
			}
			catch (err) {
				Task.postError(err);
				console.warn('Error evaluating <haz:var name="' + name + '" select="' + selector + '">. Assumed empty.');
				value = undefined;
			}
		}

		variables[name] = value;
		return;
	}
			
},

transformTree: function(srcNode, context, variables, frag) { // srcNode is Element
	var processor = this;
	
	var nodeType = srcNode.nodeType;
	if (nodeType !== 1) throw Error('transformTree() expects Element');
	var node = processor.transformSingleElement(srcNode, context, variables);
	var nodeAsFrag = frag.appendChild(node); // WARN use returned value not `node` ...
	// ... this allows frag to be a custom object, which in turn 
	// ... allows a different type of output construction

	return processor.transformChildNodes(srcNode, context, variables, nodeAsFrag);
},

transformSingleElement: function(srcNode, context, variables) {
	var processor = this;
	var details = srcNode.hazardDetails;

	el = srcNode.cloneNode(false);

	_.forEach(details.exprAttributes, function(desc) {
		var value;
		try {
			value = (desc.namespaceURI === HAZARD_MEXPRESSION_URN) ?
				processMExpression(desc.mexpression, processor.filters, processor.provider, context, variables) :
				processExpression(desc.expression, processor.filters, processor.provider, context, variables, desc.type);
		}
		catch (err) {
			Task.postError(err);
			console.warn('Error evaluating @' + desc.attrName + '="' + desc.expression + '". Assumed false.');
			value = false;
		}
		setAttribute(el, desc.attrName, value);
	});

	return el;
}

});

function getHazardDetails(el, namespaces) {
	var details = {};
	var tag = DOM.getTagName(el);
	var hazPrefix = namespaces.lookupPrefix(HAZARD_TRANSFORM_URN);
	var isHazElement = tag.indexOf(hazPrefix) === 0;

	if (isHazElement) { // FIXME preprocess attrs of <haz:*>
		tag = tag.substr(hazPrefix.length);
		var def = hazLangLookup[tag];
		details.definition = def || { tag: '' };
	}

	details.exprAttributes = getExprAttributes(el, namespaces);
	return details;
}

function getExprAttributes(el, namespaces) {
	var attrs = [];
	
	var exprNS = namespaces.lookupNamespace(HAZARD_EXPRESSION_URN);
	var mexprNS = namespaces.lookupNamespace(HAZARD_MEXPRESSION_URN);
	_.forEach(_.map(el.attributes), function(attr) {
		var ns = _.find([ exprNS, mexprNS ], function(ns) {
			return (attr.name.indexOf(ns.prefix) === 0);
		});
		if (!ns) return;
		var prefix = ns.prefix;
		var namespaceURI = ns.urn;
		var attrName = attr.name.substr(prefix.length);
		el.removeAttribute(attr.name);
		var desc = {
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


function setAttribute(el, attrName, value) {
	var type = typeof value;
	if (type === 'undefined' || type === 'boolean' || value == null) {
		if (!value) el.removeAttribute(attrName);
		else el.setAttribute(attrName, '');
	}
	else {
		el.setAttribute(attrName, value.toString());
	}
}

function evalMExpression(mexprText, filters, provider, context, variables) {
	var mexpr = interpretMExpression(mexprText);
	var result = processMExpression(mexpr, filters, provider, context, variables);
	return result;
}

function evalExpression(exprText, filters, provider, context, variables, type) {
	var expr = interpretExpression(exprText);
	var result = processExpression(expr, filters, provider, context, variables, type);
	return result;
}
	
function interpretMExpression(mexprText) {
	var expressions = [];
	var mexpr = mexprText.replace(/\{\{((?:[^}]|\}(?=\}\})|\}(?!\}))*)\}\}/g, function(all, expr) {
		expressions.push(expr);
		return '{{}}';
	});

	expressions = expressions.map(function(expr) { return interpretExpression(expr); });
	return {
		template: mexpr,
		expressions: expressions
	};
}

function interpretExpression(exprText) { // FIXME robustness
	var expression = {};
	expression.text = exprText;
	var exprParts = exprText.split(PIPE_OPERATOR);
	expression.selector = exprParts.shift();
	expression.filters = [];

	_.forEach(exprParts, function(filterSpec) {
		filterSpec = filterSpec.trim();
		var text = filterSpec;
		var m = text.match(/^([_a-zA-Z][_a-zA-Z0-9]*)\s*(:?)/);
		if (!m) {
			console.warn('Syntax Error in filter call: ' + filterSpec);
			return false;
		}
		var filterName = m[1];
		var hasParams = m[2];
		text = text.substr(m[0].length);
		if (!hasParams && /\S+/.test(text)) {
			console.warn('Syntax Error in filter call: ' + filterSpec);
			return false;
		}

		try {
			var filterParams = (Function('return [' + text + '];'))();
		}
		catch (err) {
			console.warn('Syntax Error in filter call: ' + filterSpec);
			return false;
		}

		expression.filters.push({
			text: filterSpec,
			name: filterName,
			params: filterParams
		});
		return true;
	});

	return expression;
}


function processMExpression(mexpr, filters, provider, context, variables) {
	var i = 0;
	return mexpr.template.replace(/\{\{\}\}/g, function(all) {
		return processExpression(mexpr.expressions[i++], filters, provider, context, variables, 'text');
	});
}

function processExpression(expr, filters, provider, context, variables, type) { // FIXME robustness
	var doc = (context && context.nodeType) ? // TODO which document
		(context.nodeType === 9 ? context : context.ownerDocument) : 
		document; 
	var value = provider.evaluate(expr.selector, context, variables);

	_.every(expr.filters, function(filter) {
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
			Task.postError(err);
			console.warn('Failure processing filter call: "' + filter.text + '" with input: "' + value + '"');
			value = '';
			return false;
		}
	});

	result = cast(value, type);
	return result;

	function cast(value, type) {
		switch (type) {
		case 'text':
			if (value && value.nodeType) value = value.textContent;
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
		case 'boolean':
			if (value == null || value === false) value = false;
			else value = true;
			break;
		default: // FIXME should never occur. console.warn !?
			if (value && value.nodeType) value = value.textContent;
			break;
		}
		return value;
	}


}

return HazardProcessor;	
})();

processors.register('hazard', HazardProcessor);

_.assign(classnamespace, {

MainProcessor: MainProcessor,
ScriptProcessor: ScriptProcessor,
HazardProcessor: HazardProcessor,

});


}).call(this, this.Meeko);
