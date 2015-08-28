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
var exprNamespace = 'expr';
var mexprNamespace = 'mexpr';

var hazPrefix = hazNamespace + ':';
var exprPrefix = exprNamespace + ':';
var mexprPrefix = mexprNamespace + ':';

var hazLangDefinition = 
	'<otherwise <when@test <each@select,var <if@test <unless@test ' +
	'>choose <template@name >eval@select include@name';

var hazLang = _.map(_.words(hazLangDefinition), function(def) {
	def = def.split('@');
	var tag = def[0];
	var attrToElement = tag.charAt(0);
	switch (attrToElement) {
	default: 
		attrToElement = false; 
		break;
	case '<': case '>': 
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

hazLangLookup = {};

_.forEach(hazLang, function(directive) { // should happen in loadTemplate
	var nsTag = hazPrefix + directive.tag; 
	directive.nsTag = nsTag;
	hazLangLookup[nsTag] = directive;
});

function walkTree(root, skipRoot, callback) { // always "accept" element nodes
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
		callback(el);
		return NodeFilter.FILTER_ACCEPT;
	}
}

function childNodesToFragment(el) {
	var doc = el.ownerDocument;
	var frag = doc.createDocumentFragment();
	_.forEach(_.toArray(el.childNodes), function(child) { frag.appendChild(child); });
	return frag;
}

function htmlToFragment(html, doc) {
	if (!doc) doc = document;
	var div = doc.createElement('div');
	div.innerHTML = html;
	var result = childNodesToFragment(div);
	return result;
}

function HazardProcessor() {

}

_.defaults(HazardProcessor.prototype, {
	
loadTemplate: function(template) {
	var processor = this;
	processor.root = template; // FIXME assert template is Fragment
	processor.templates = {};

	var doc = template.ownerDocument;
	var exprHtmlAttr = exprPrefix + htmlAttr; // NOTE this is mapped to haz:eval
	var mexprHtmlAttr = mexprPrefix + htmlAttr; // NOTE this is invalid
	var hazEvalTag = hazPrefix + 'eval';

	walkTree(template, true, function(el) {
		var tag = DOM.getTagName(el);
		if (tag in hazLangLookup) return;

		// pre-process @expr:_html -> @haz:eval
		if (el.hasAttribute(exprHtmlAttr)) {
			var val = el.getAttribute(exprHtmlAttr);
			if (el.hasAttribute(hazEvalTag)) logger.warn('Removing @' + exprHtmlAttr + ': @' + hazEvalTag + ' present');
			else el.setAttribute(hazEvalTag, val);
		}
		if (el.hasAttribute(mexprHtmlAttr)) {
			logger.warn('Removing unsupported @' + mexprHtmlAttr);
			el.removeAttribute(mexprHtmlAttr);
		}
		_.forEach(hazLang, function(def) {
			if (!def.attrToElement) return;
			var nsTag = def.nsTag;
			if (!el.hasAttribute(nsTag)) return;
			var defaultAttr = def.attrs[0];
			var value = el.getAttribute(nsTag);
			el.removeAttribute(nsTag);
			var directiveEl = doc.createElement(nsTag);
			if (defaultAttr) directiveEl.setAttribute(defaultAttr, value);
			_.forEach(def.attrs, function(attr, i) {
				if (i === 0) return; // the defaultAttr
				var nsAttr = hazPrefix + attr;
				if (!el.hasAttribute(nsAttr)) return;
				var value = el.getAttribute(nsAttr);
				el.removeAttribute(nsAttr);
				directiveEl.setAttribute(attr, value);
			});
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

	function markTemplate(el) {
		if (!el.hasAttribute('name')) return;
		var name = el.getAttribute('name');
		processor.templates[name] = el;
	}

	function implyOtherwise(el) { // NOTE this slurps *any* non-<haz:when>, including <haz:otherwise>
		var otherwise = el.ownerDocument.createElement(hazPrefix + 'otherwise');
		_.forEach(_.toArray(el.childNodes), function(node) {
			var tag = DOM.getTagName(node);
			if (tag === hazPrefix + 'when') return;
			otherwise.appendChild(node);
		});
		el.appendChild(otherwise);
	}

},

transform: function(provider, details) { // TODO how to use details
	var root = this.root;
	var frag = root.ownerDocument.createDocumentFragment();
	this.transformChildNodes(root, provider, null, {}, frag);
	return frag;
},

transformChildNodes: function(srcNode, provider, context, variables, frag) {
	var processor = this;

	_.forEach(srcNode.childNodes, function(current) {
		processor.transformNode(current, provider, context, variables, frag);
	});
},

transformNode: function(srcNode, provider, context, variables, frag) {
	var processor = this;

	switch (srcNode.nodeType) {
	default: 
		var node = srcNode.cloneNode(true);
		frag.appendChild(node);
		break;
	case 1:
		var details = getHazardDetails(srcNode);
		if (details.definition) processor.transformHazardTree(srcNode, provider, context, variables, frag);
		else processor.transformTree(srcNode, provider, context, variables, frag);
		break;
	}
},

transformHazardTree: function(el, provider, context, variables, frag) {
	var doc = el.ownerDocument;
	var processor = this;

	var details = getHazardDetails(el);
	var def = details.definition;

	var invertTest = false; // for haz:if haz:unless

	switch (def.tag) {
	default: // for unknown (or unhandled like `template`) haz: elements just process the children
		processor.transformChildNodes(el, provider, context, variables, frag); 
		return;
		
	case 'include':
		var name = el.getAttribute('name');
		template = processor.templates[name];
		if (!template) {
			logger.warn('Hazard could not find template name=' + name);
			return;
		}
	
		processor.transformChildNodes(template, provider, context, variables, frag); 
		return;

	case 'eval':
		var selector = el.getAttribute('select');
		var value = evalExpression(selector, provider, context, variables, 'node');
		var type = typeof value;
		if (type === 'undefined' || type === 'boolean' || value == null) return;
		if (!value.nodeType) { // TODO test performance
			value = htmlToFragment(value, doc);
		}
		frag.appendChild(value);
		return;

	case 'unless':
		invertTest = true;
	case 'if':
		var testVal = el.getAttribute('test');
		var pass = false;
		try {
			pass = evalExpression(testVal, provider, context, variables, 'boolean');
		}
		catch (err) {
			Task.postError(err);
			logger.warn('Error evaluating <haz:if test="' + testVal + '">. Assumed false.');
			pass = false;
		}
		if (invertTest) pass = !pass;
		if (!pass) return;
		processor.transformChildNodes(el, provider, context, variables, frag); 
		return;

	case 'choose':
 		// NOTE if no successful `when` then chooses *first* `otherwise` 		
		var otherwise;
		var when;
		var found = _.some(el.childNodes, function(child) {
			var childTag = DOM.getTagName(child);
			var childDef = hazLangLookup[childTag];
			if (!childDef) return false;
			if (childDef.tag === 'otherwise') {
				if (!otherwise) otherwise = child;
				return false;
			}
			if (childDef.tag !== 'when') return false;
			var testVal = child.getAttribute('test');
			var pass = evalExpression(testVal, provider, context, variables, 'boolean');
			if (!pass) return false;
			when = child;
			return true;
		});
		if (!found) when = otherwise;
		if (!when) return;
		processor.transformChildNodes(when, provider, context, variables, frag); 
		return;

	case 'each':
		var selector = el.getAttribute('select');
		var varName = el.getAttribute('var');
		var subVars = _.defaults({}, variables);
		var subContexts;
		try {
			subContexts = provider.evaluate(selector, context, variables, true);
		}
		catch (err) {
			Task.postError(err);
			logger.warn('Error evaluating <haz:each select="' + selector + '">. Assumed empty.');
			return;
		}

		_.forEach(subContexts, function(subContext) {
			if (varName) subVars[varName] = subContext;
			processor.transformChildNodes(el, provider, subContext, subVars, frag);
		});
		
		return;

	}
			
},

transformTree: function(srcNode, provider, context, variables, frag) { // srcNode is Element
	var processor = this;
	
	var node;
	var nodeType = srcNode.nodeType;
	if (nodeType !== 1) throw Error('transformTree() expects Element');
	node = transformSingleElement(srcNode, provider, context, variables);
	var nodeAsFrag = frag.appendChild(node); // WARN use returned value not `node` ...
	// ... this allows frag to be a custom object, which in turn 
	// ... allows a different type of output construction
	if (getHazardDetails(srcNode).isShallow) return;

	processor.transformChildNodes(srcNode, provider, context, variables, nodeAsFrag);
}

});


function transformSingleElement(srcNode, provider, context, variables) {
	var details = getHazardDetails(srcNode);

	el = srcNode.cloneNode(false);

	_.forEach(details.exprAttributes, function(desc) {
		var value;
		try {
			value = (desc.prefix === mexprPrefix) ?
				processMExpression(desc.mexpression, provider, context, variables, desc.type) :
				processExpression(desc.expression, provider, context, variables, desc.type);
		}
		catch (err) {
			Task.postError(err);
			logger.warn('Error evaluating @' + desc.attrName + '="' + desc.expression + '". Assumed false.');
			value = false;
		}
		setAttribute(el, desc.attrName, value);
	});

	return el;
}

function getHazardDetails(el) {
	if (el.hazardDetails) return el.hazardDetails;
	var details = {};
	var tag = DOM.getTagName(el);
	var isHazElement = tag.indexOf(hazPrefix) === 0;

	if (isHazElement) {
		var def = hazLangLookup[tag];
		details.definition = def || { tag: '' };
	}

	details.exprAttributes = getExprAttributes(el);
	details.isShallow = _.some(details.exprAttributes, function(desc) {
		if (desc.attrName === textAttr) return true;
		return false;
	});

	el.hazardDetails = details;
	return details;
}

function getExprAttributes(el) {
	var attrs = [];
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
		var desc = {
			prefix: prefix,
			attrName: attrName,
			type: 'text'
		}
		switch (prefix) {
		case exprPrefix:
			desc.expression = interpretExpression(attr.value);
			break;
		case mexprPrefix:
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
	switch (attrName) {
	case textAttr:
		if (type === 'undefined' || type === 'boolean' || value == null) value = '';
		DOM.textContent(el, value);
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

function evalMExpression(mexprText, provider, context, variables, type) {
	var mexpr = interpretMExpression(mexprText);
	var result = processMExpression(mexpr, provider, context, variables, type);
	return result;
}

function evalExpression(exprText, provider, context, variables, type) {
	var expr = interpretExpression(exprText);
	var result = processExpression(expr, provider, context, variables, type);
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
	var exprParts = exprText.split('|');
	expression.selector = exprParts.shift();
	expression.filters = [];

	_.forEach(exprParts, function(scriptBody) {
		try {
			var fn = Function('value', 'return (' + scriptBody + ');');
		}
		catch (err) {
			Task.postError(err);
			logger.error('Error in filter: ' + scriptBody);
			return;
		}
		expression.filters.push(fn);
	});

	return expression;
}


function processMExpression(mexpr, provider, context, variables, type) { // FIXME mexpr not compatible with type === 'node'
	var i = 0;
	return mexpr.template.replace(/\{\{\}\}/g, function(all) {
		return processExpression(mexpr.expressions[i++], provider, context, variables, type);
	});
}

function processExpression(expr, provider, context, variables, type) { // FIXME robustness
	var doc = (context && context.nodeType) ? // TODO which document
		(context.nodeType === 9 ? context : context.ownerDocument) : 
		document; 
	var value = provider.evaluate(expr.selector, context, variables);

	_.forEach(expr.filters, function(fn) {
		value = fn(value);
	});

	result = cast(value, type);
	return result;

	function cast(value, type) {
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
		case 'boolean':
			if (value == null || value === false) value = false;
			else value = true;
			break;
		default: // FIXME should never occur. logger.warn !?
			if (value && value.nodeType) value = DOM.textContent(value);
			break;
		}
		return value;
	}


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

evaluate: function(query, context, variables, wantArray) {
	if (!context) context = this.srcNode;
	var doc = context.nodeType === 9 ? context : context.ownerDocument; // FIXME which document??
	var queryParts = query.match(/^\s*([^{]*)\s*(?:\{\s*([^}]*)\s*\}\s*)?$/);
	var selector = queryParts[1];
	var attr = queryParts[2];
	var result;
	if (wantArray) { // haz:each
		result = findAll(context, selector, variables);
	}
	else {
		var node = find(context, selector, variables);
		result = node ? [ node ] : [];
	}

	if (attr) {
		attr = _.trim(attr);
		if (attr.charAt(0) === '@') attr = attr.substr(1);
		_.forEach(result, function(node, i) {
			result[i] = getAttr(node, attr);
		});
	}

	return (wantArray) ? result : result[0];

	function getAttr(node, attr) {
		switch(attr) {
		case null: case undefined: case '': return node;
		case textAttr: 
			return DOM.textContent(node);
		case htmlAttr:
			var frag = doc.createDocumentFragment();
			_.forEach(node.childNodes, function(child) { 
				frag.appendChild(doc.importNode(child, true)); // TODO does `child` really need to be cloned??
			});
			return frag;
		default: 
			return node.getAttribute(attr);
		}
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

// TODO copied from DOMSprockets. Could be a generic "class"

var nodeIdProperty = '__microdata__';
var nodeCount = 0; // used to generated node IDs
var nodeStorage = {}; // hash of storage for nodes, keyed off `nodeIdProperty`

var uniqueId = function(node) {
	var nodeId = node[nodeIdProperty];
	if (nodeId) return nodeId;
	nodeId = nodeCount++; // TODO stringify??
	node[nodeIdProperty] = new String(nodeId); // NOTE so that node cloning in old IE doesn't copy the node ID property
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


function getItems(rootNode, type) {
	if (!hasData(rootNode)) parse(rootNode);

	var scope = getData(rootNode);
	var typeList = 
		(typeof type === 'string') ? _.words(_.trim(type)) :
		type && type.length ? type :
		[];
			
	var resultList = [];

	_.forEach(scope.properties.names, function(propName) {
		var propList = scope.properties.namedItem(propName);
		_.forEach(propList, function(prop) {
			if (prop.isScope) [].push.apply(resultList, getItems(prop.element, typeList));
		});
	});

	_.forEach(scope.childScopes, function(scope) {
		if (!typeList.length || intersects(scope.type, typeList)) resultList.push(scope);
		[].push.apply(resultList, getItems(scope.element, typeList));
	});

	// now convert descriptors back to nodes
	_.forEach(resultList, function(desc, i) {
		resultList[i] = desc.element;
	});
	return resultList;
}

function getProperties(el) {
	if (!hasData(el)) return;
	var desc = getData(el);
	if (!desc.isScope) return;
	return desc.properties;
}

function parse(rootNode) {
	if (!rootNode) rootNode = document;
	var desc = getScopeDesc(rootNode);
}

function getScopeDesc(scopeEl) {
	if (hasData(scopeEl)) return getData(scopeEl);
	
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
		if (propName) scopeDesc.properties.addNamedItem(propName, el);
		else scopeDesc.childScopes.push(el);

		return isScope ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
	});

	setData(scopeEl, scopeDesc);
	return scopeDesc;
}
	
function getValue(el) {
	if (hasData(el)) return getData(el).value;
	var desc = getPropDesc(el);
	setData(el, desc);
	return desc.value;
}

function getPropDesc(el) {
	if (hasData(el)) return getData(el);

	var name = el.getAttribute('itemprop');
	
	var prop = {
		name: name,
		value: evaluate(el)
	}
	
	setData(el, prop);
	return prop;
}

function evaluate(el) {
	var tagName = el.tagName.toLowerCase();
	var attrName = valueAttr[tagName];
	if (attrName) return el[attrName] || el.getAttribute(attrName);

	return el;
}

function createHTMLPropertiesCollection() {
	var list = [];
	list.names = [];
	list.nodeLists = {};
	_.assign(list, HTMLPropertiesCollection.prototype);
	return list;
}

var HTMLPropertiesCollection = function() {}
_.assign(HTMLPropertiesCollection.prototype, {

namedItem: function(name) {
	return this.nodeLists[name];
},

addNamedItem: function(name, el) {
	this.push(el);
	if (!this.nodeLists[name]) {
		this.nodeLists[name] = [];
		this.names.push(name);
	}
	this.nodeLists[name].push(el);
}

});


var valueAttr = {};
_.forEach(_.words("meta@content link@href a@href area@href img@src video@src audio@src source@src track@src iframe@src embed@src object@data time@datetime data@value meter@value"), function(text) {
	var m = text.split("@"), tagName = m[0], attrName = m[1];
	valueAttr[tagName] = attrName;
});


return {

getItems: getItems,
getProperties: getProperties,
getValue: getValue

}

})();


var MicrodataDecoder = (function() {

function MicrodataDecoder() {}

_.defaults(MicrodataDecoder.prototype, {

init: function(node) {
	Microdata.getItems(node);
	this.rootNode = node;
},

evaluate: function(query, context, variables, wantArray) {
	if (!context) context = this.rootNode;

	var query = _.trim(query);
	var startAtRoot = false;
	var baseSchema;
	var pathParts;

	if (query === '.') return (wantArray) ? [ context ] : context;

	var m = query.match(/^(?:(\^)?\[([^\]]*)\]\.)/);
	if (m && m.length) {
		query = query.substr(m[0].length);
		startAtRoot = !!m[1];
		baseSchema = _.words(_.trim(m[2]));
	}
	pathParts = _.words(_.trim(query));
	
	var nodes;
	if (baseSchema) {
		if (startAtRoot) context = this.view;
		nodes = Microdata.getItems(context, baseSchema);	
	}
	else nodes = [ context ];

	var resultList = nodes;
	_.forEach(pathParts, function(relPath, i) {
		var parents = resultList;
		resultList = [];
		_.forEach(parents, function(el) {
			var props = Microdata.getProperties(el);
			if (!props) return;
			var nodeList = props.namedItem(relPath);
			if (!nodeList) return;
			[].push.apply(resultList, nodeList);
		});
	});

	// now convert elements to values
	resultList = _.map(resultList, function(el) {
		var props = Microdata.getProperties(el);
		if (props) return el;
		return Microdata.getValue(el);
	});

	if (wantArray) return resultList;

	return resultList[0];
}

});

return MicrodataDecoder;
})();

framer.registerDecoder('microdata', MicrodataDecoder);


var JSONDecoder = (function() { 
// FIXME not really a JSON decoder since expects JSON input and 
// doesn't use JSON paths

function JSONDecoder() {}

_.defaults(JSONDecoder.prototype, {

init: function(object) {
	if (typeof object !== 'object' || object === null) throw 'JSONDecoder cannot handle non-object';
	this.object = object;
},

evaluate: function(query, context, variables, wantArray) {
	if (!context) context = this.object;

	var query = _.trim(query);
	var pathParts;

	if (query === '.') return (wantArray) ? [ context ] : context;

	var m = query.match(/^\^/);
	if (m && m.length) {
		query = query.substr(m[0].length);
		context = this.object;
	}
	pathParts = query.split('.');
	
	var resultList = [ context ];
	_.forEach(pathParts, function(relPath, i) {
		var parents = resultList;
		resultList = [];
		_.forEach(parents, function(item) {
			var child = item[relPath];
			if (child != null) {
				if (Array.isArray(child)) [].push.apply(resultList, child);
				else resultList.push(child);
			}
		});
	});

	if (wantArray) return resultList;

	var value = resultList[0];
	return value;
}

});

return JSONDecoder;
})();

framer.registerDecoder('json', JSONDecoder);


_.assign(classnamespace, {

MainProcessor: MainProcessor,
ScriptProcessor: ScriptProcessor,
HazardProcessor: HazardProcessor,
CSSDecoder: CSSDecoder,
MicrodataDecoder: MicrodataDecoder,
JSONDecoder: JSONDecoder

});


}).call(window, Meeko.framer);
