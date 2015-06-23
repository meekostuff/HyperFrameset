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
			switch (getTagName(node)) {
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
	try { this.processor = (Function('return (' + scriptText(script) + ')'))(); }
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
var hazAttrPrefix = hazNamespace + ':';
var exprNamespace = 'expr';
var exprPrefix = exprNamespace + ':';
var mexprNamespace = 'mexpr';
var mexprPrefix = mexprNamespace + ':';
var exprTextAttr = exprPrefix + textAttr;
var exprHtmlAttr = exprPrefix + htmlAttr;

function hazAttrs(el, varPrefix) {
	if (!varPrefix) varPrefix = "";
	var values = {};
	_.forEach(_.words('if unless each var template'), function(name) {
		values[varPrefix + name] = hazAttr(el, name);
	});
	return values;
}

function hazAttr(el, attr) {
	var hazAttrName = hazAttrPrefix + attr;
	if (!DOM.hasAttribute(el, hazAttrName)) return false;
	var value = el.getAttribute(hazAttrName);
	el.removeAttribute(hazAttrName);
	return value;
}

function HazardProcessor() {

}

_.defaults(HazardProcessor.prototype, {
	
loadTemplate: function(template) {
	var processor = this;
	processor.top = template;
	processor.templates = {};
	_.forEach(DOM.findAll('[id]', template), function(el) {
		var id = el.getAttribute('id');
		processor.templates[id] = el;
	});
},

transform: function(provider, details) { // TODO how to use details
	var clone = this.top.cloneNode(true);
	return this.transformNode(clone, provider, null, {});
},

transformTree: function(el, provider, context, variables) {
	var doc = el.ownerDocument;
	var processor = this;
	
	var haz = hazAttrs(el, '_');

	if (haz._template) {
		template = processor.templates[haz._template];
		if (!template) {
			logger.warn('Hazard could not find template #' + haz._template);
			return;
		}
		var tagName = getTagName(el);
		var templateTagName = getTagName(template);
		if (tagName !== templateTagName) {
			logger.warn('Hazard found mismatched tagNames between template ' + templateTagName + '#' + haz._template + ' and ' + tagName);
		}
		
		el = template.cloneNode(true);
		
		// Now remove @id and @haz:
		el.removeAttribute('id');
		hazAttrs(el);
	}

	if (haz._each === false) {
		return processNode(el, provider, context, variables); // NOTE return value === el
	}
	
	// handle each
	var subVars = _.defaults({}, variables);
	var subContexts;
	try {
		subContexts = provider.evaluate(haz._each, context, variables, 'array');
	}
	catch (err) {
		Task.postError(err);
		logger.warn('Error evaluating @haz:each="' + haz._each + '". Assumed empty.');
		return;
	}
	var result = doc.createDocumentFragment(); // FIXME which is the right doc to create this frag in??
	
	_.forEach(subContexts, function(subContext) {
		if (haz._var) subVars[haz._var] = subContext;
		var srcEl = el.cloneNode(true);
		var newEl = processNode(srcEl, provider, subContext, subVars); // NOTE newEl === srcEl
		if (newEl) result.appendChild(newEl); // NOTE no adoption
	});
	
	return result;

	function processNode(node, provider, context, variables) {
		var keep;
		if (haz._if !== false) {
			try {
				keep = provider.evaluate(haz._if, context, variables, 'boolean');
			}
			catch (err) {
				Task.postError(err);
				logger.warn('Error evaluating @haz:if="' + haz._if + '". Assumed false.');
				keep = false;
			}
			if (!keep) return;
		}
		if (haz._unless !== false) {
			try {
				var keep = !provider.evaluate(haz._unless, context, variables, 'boolean');
			}
			catch(err) {
				Task.postError(err);
				logger.warn('Error evaluating @haz:unless="' + haz._unless + '". Assumed false.');
				keep = true;
			}
			if (!keep) return;
		}
		return processor.transformNode(node, provider, context, variables); // NOTE return value === node
	}
	
},

transformNode: function(node, provider, context, variables) {
	var processor = this;
	
	var nodeType = node.nodeType;
	if (!nodeType) return node;
	if (nodeType !== 1 && nodeType !== 11) return node;
	var deep = true;
	if (nodeType === 1 && (DOM.hasAttribute(node, exprTextAttr) || DOM.hasAttribute(node, exprHtmlAttr))) deep = false;
	if (nodeType === 1) transformSingleElement(node, provider, context, variables);
	if (!deep) return node;

	_.forEach(_.toArray(node.childNodes), function(current) {
		if (current.nodeType !== 1) return;
		var newChild = processor.transformTree(current, provider, context, variables);
		if (newChild !== current) {
			if (newChild && newChild.nodeType) node.replaceChild(newChild, current);
			else node.removeChild(current); // FIXME warning if newChild not empty
		}
	});
	return node;
}

});


function transformSingleElement(el, provider, context, variables) {
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
		var expr = attr.value;
		var type = (attrName === htmlAttr) ? 'node' : 'text';
		var value;
		try {
			value = (prefix === mexprPrefix) ?
				evalMExpression(expr, provider, context, variables, type) :
				evalExpression(expr, provider, context, variables, type);
		}
		catch (err) {
			Task.postError(err);
			logger.warn('Error evaluating @' + attr.name + '="' + attr.value + '". Assumed false.');
			value = false;
		}
		setAttribute(el, attrName, value);
	});
}

function setAttribute(el, attrName, value) {
	var type = typeof value;
	switch (attrName) {
	case textAttr:
		if (type === 'undefined' || type === 'boolean' || value == null) value = '';
		DOM.textContent(el, value);
		break;
	case htmlAttr:
		if (type === 'undefined' || type === 'boolean' || value == null) value = '';
		el.innerHTML = '';
		if (value && value.nodeType) DOM.insertNode('beforeend', el, value);
		else el.innerHTML = value;
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

function evalMExpression(mexpr, provider, context, variables, type) { // FIXME mexpr not compatible with type === 'node'
	return mexpr.replace(/\{\{((?:[^}]|\}(?=\}\})|\}(?!\}))*)\}\}/g, function(all, expr) {
		return evalExpression(expr, provider, context, variables, type);
	});
}

function evalExpression(expr, provider, context, variables, type) { // FIXME robustness
	var doc = (context && context.nodeType) ? // TODO which document
		(context.nodeType === 9 ? context : context.ownerDocument) : 
		document; 
	var exprParts = expr.split('|');
	var value = provider.evaluate(exprParts.shift(), context, variables, type);

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
	default: // FIXME should never occur. logger.warn !?
		if (value && value.nodeType) value = DOM.textContent(value);
		break;
	}

	_.forEach(exprParts, function(scriptBody) {
		var fn = Function('value', 'return (' + scriptBody + ');');
		value = fn(value);
	});

	return value;
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

evaluate: function(query, context, variables, type) {
	if (!context) context = this.srcNode;
	var doc = context.nodeType === 9 ? context : context.ownerDocument; // FIXME which document??
	var queryParts = query.match(/^\s*([^{]*)\s*(?:\{\s*([^}]*)\s*\}\s*)?$/);
	var selector = queryParts[1];
	var attr = queryParts[2];
	if (type === 'array') { // haz:each
		if (attr) logger.warn('Ignoring attribute selector because evaluate() requested array');
		return findAll(context, selector, variables);
	}
	var node = find(context, selector, variables);
	if (attr) {
		attr = _.trim(attr);
		if (attr.charAt(0) === '@') attr = attr.substr(1);
	}

	switch(type) {
	case 'text': // expr:attr or expr:.text
		if (!node) return '';
		switch(attr) {
		case null: case undefined: case '': case textAttr: return DOM.textContent(node);
		case htmlAttr: return node.innerHTML;
		default: return node.getAttribute(attr);
		}
	case 'boolean': // haz:if
		if (!node) return false;
		switch(attr) {
		case null: case undefined: case '': return true;
		case textAttr: case htmlAttr: return !/^\s*$/.test(DOM.textContent(node)); // FIXME potentially heavy. Implement as a DOM utility isEmptyNode()
		default: return DOM.hasAttribute(node, nodeattr);
		}
	case 'node': // expr:.html
		switch(attr) {
		case null: case undefined: case '': return node;
		case textAttr: return DOM.textContent(node);
		case htmlAttr:
			var frag = doc.createDocumentFragment();
			_.forEach(node.childNodes, function(child) { 
				frag.appendChild(doc.importNode(child, true)); // TODO does `child` really need to be cloned??
			});
			return frag;
		default: return node.getAttribute(attr);
		}
	default: return node; // TODO shouldn't this be an error / warning??
	}
}

});

function find(context, selectorGroup, variables) {
	var finalSelector = expandSelector(context, selectorGroup, variables);
	return context.querySelector(finalSelector);
}

function findAll(context, selectorGroup, variables) {
	var finalSelector = expandSelector(context, selectorGroup, variables);
	return context.querySelectorAll(finalSelector);
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


function getView(rootNode) {
	if (!rootNode) rootNode = document;

	return getScopeDesc(rootNode);
	

	function getScopeDesc(scopeEl) {
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
			if (propName) scopeDesc.properties.addNamedItem(propName, item);
			else scopeDesc.childScopes.push(item);

			return isScope ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
		});

		return scopeDesc;
	}
	
}

function getPropDesc(el) {
	var name = el.getAttribute('itemprop');
	
	var prop = {
		element: el,
		name: name,
		value: getValue(el)
	}
	
	return prop;
}

function getValue(el) {
	var tagName = el.tagName.toLowerCase();
	var attrName = valueAttr[tagName];
	if (attrName) return el[attrName] || el.getAttribute(attrName);

	return el;
}

function getItems(scope, type) {
	var typeList = 
		(typeof type === 'string') ? _.words(_.trim(type)) :
		type.length ? type :
		[];
			
	var resultList = [];

	_.forEach(scope.properties.names, function(propName) {
		var propList = scope.properties.namedItem(propName);
		_.forEach(propList, function(prop) {
			if (prop.isScope) [].push.apply(resultList, getItems(prop, typeList));
		});
	});

	_.forEach(scope.childScopes, function(scope) {
		if (!typeList.length || intersects(scope.type, typeList)) resultList.push(scope);
		[].push.apply(resultList, getItems(scope, typeList));
	});

	return resultList;
}

function createHTMLPropertiesCollection() {
	var list = [];
	list.names = [];
	list.byName = {};
	_.assign(list, HTMLPropertiesCollection.prototype);
	return list;
}

var HTMLPropertiesCollection = function() {}
_.assign(HTMLPropertiesCollection.prototype, {

namedItem: function(name) {
	return this.byName[name];
},

addNamedItem: function(name, item) {
	this.push(item);
	if (!this.byName[name]) {
		this.byName[name] = [];
		this.names.push(name);
	}
	this.byName[name].push(item);
}

});


var valueAttr = {};
_.forEach(_.words("meta@content link@href a@href area@href img@src video@src audio@src source@src track@src iframe@src embed@src object@data time@datetime data@value meter@value"), function(text) {
	var m = text.split("@"), tagName = m[0], attrName = m[1];
	valueAttr[tagName] = attrName;
});


return {

getView: getView,
getItems: getItems

}

})();

var MicrodataDecoder = (function() {

function MicrodataDecoder() {}

_.defaults(MicrodataDecoder.prototype, {

init: function(node) {
	this.view = Microdata.getView(node);
},

evaluate: function(query, context, variables, type) {
	if (!context) context = this.view;

	var query = _.trim(query);
	var startAtRoot = false;
	var baseSchema;
	var pathParts;

	var m = query.match(/^(?:(\^)?\[([^\]]*)\]\.)/);
	if (m && m.length) {
		query = query.substr(m[0].length);
		startAtRoot = !!m[1];
		baseSchema = _.words(_.trim(m[2]));
	}
	pathParts = _.words(_.trim(query));
	
	var scopes;
	if (baseSchema) {
		if (startAtRoot) context = this.view;
		scopes = Microdata.getItems(context, baseSchema);	
	}
	else scopes = [ context ];

	if (type === 'array') {
		var resultList = scopes;
		_.forEach(pathParts, function(relPath, i) {
			var parents = resultList;
			resultList = [];
			_.forEach(parents, function(desc) {
				var props = desc.properties.namedItem(relPath);
				if (props) [].push.apply(resultList, props);
			});
		});
		return _.map(resultList, function(desc) {
			if (desc.isScope) return desc;
			return desc.value;
		});
	}

	var item = scopes[0];
	_.every(pathParts, function(relPath, i) {
		var props = item.properties.namedItem(relPath);
		item = null;
		if (!props || !props.length) return false;
		item = props[0];
		if (item == null) return false;
		return true;
	});
	
	var value = item && item.value;

	switch(type) {
	case 'text': // expr:attr or expr:.text
		if (!value) return '';
		if (value.nodeType && value.nodeType === 1) return DOM.textContent(value);
		return value;
	case 'boolean': // haz:if
		if (!value) return false;
		return true;
	case 'node': // expr:.html
		return value;
	default: return value; // TODO shouldn't this be an error / warning??
	}
}

});

return MicrodataDecoder;
})();

framer.registerDecoder('microdata', MicrodataDecoder);


_.assign(classnamespace, {

MainProcessor: MainProcessor,
ScriptProcessor: ScriptProcessor,
HazardProcessor: HazardProcessor,
CSSDecoder: CSSDecoder,
MicrodataDecoder: MicrodataDecoder

});


}).call(window, Meeko.framer);
