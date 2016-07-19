(function(classnamespace) {

var window = this;
var document = window.document;

var Meeko = window.Meeko;
var _ = Meeko.stuff;
var DOM = Meeko.DOM;

var decoders = Meeko.decoders = {

items: {},

register: function(type, constructor) {
	this.items[type] = constructor;
},

create: function(type, options, namespaces) {
	return new this.items[type](options, namespaces);
}

}

// FIXME textAttr & htmlAttr used in HazardProcessor & CSSDecoder
var textAttr = '_text';
var htmlAttr = '_html';

var CSSDecoder = (function() {

function CSSDecoder(options, namespaces) {}

_.defaults(CSSDecoder.prototype, {

init: function(node) {
	this.srcNode = node;
},

matches: function(element, query) { // FIXME refactor common-code in matches / evaluate
	var queryParts = query.match(/^\s*([^{]*)\s*(?:\{\s*([^}]*)\s*\}\s*)?$/);
	var selector = queryParts[1];
	var attr = queryParts[2];
	var result;
	if (!matches(element, selector)) return;
	var node = element;
	var result = node;

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
			var frag = doc.createDocumentFragment();
			_.forEach(node.childNodes, function(child) { 
				frag.appendChild(doc.importNode(child, true)); // TODO does `child` really need to be cloned??
			});
			return frag;
		default: 
			return node.getAttribute(attr);
		}
	}


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
		attr = attr.trim();
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
			return node.textContent;
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

function matches(element, selectorGroup) {
	if (selectorGroup.trim() === '') return;
	var finalSelector = expandSelector(null, selectorGroup, {}, true);
	return DOM.matches(element, finalSelector);
}

function find(context, selectorGroup, variables) {
	if (selectorGroup.trim() === '') return context;
	var finalSelector = expandSelector(context, selectorGroup, variables);
	return context.querySelector(finalSelector); // FIXME DOM.find
}

function findAll(context, selectorGroup, variables) {
	if (selectorGroup.trim() === '') return [ context ];
	var finalSelector = expandSelector(context, selectorGroup, variables);
	return context.querySelectorAll(finalSelector); // FIXME DOM.findAll
}

var uidIndex = 0;
function expandSelector(context, selectorGroup, variables, isRoot) { // FIXME currently only implements `context` expansion
	if (context.nodeType === 9 || context.nodeType === 11) isRoot = true;
	var id;
	if (!isRoot) {
		id = context.id;
		if (!id) {
			id = '__meeko_' + (uidIndex++) + '__';
			context.id = id;
		}
	}
	var selectors =	selectorGroup.split(',');
	selectors = _.map(selectors, function(s) { return s.trim(); });
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

decoders.register('css', CSSDecoder);


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
		(typeof type === 'string') ? _.words(type.trim()) :
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

function MicrodataDecoder(options, namespaces) {}

_.defaults(MicrodataDecoder.prototype, {

init: function(node) {
	Microdata.getItems(node);
	this.rootNode = node;
},

evaluate: function(query, context, variables, wantArray) {
	if (!context) context = this.rootNode;

	var query = query.trim();
	var startAtRoot = false;
	var baseSchema;
	var pathParts;

	if (query === '.') return (wantArray) ? [ context ] : context;

	var m = query.match(/^(?:(\^)?\[([^\]]*)\]\.)/);
	if (m && m.length) {
		query = query.substr(m[0].length);
		startAtRoot = !!m[1];
		baseSchema = _.words(m[2].trim());
	}
	pathParts = _.words(query.trim());
	
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

decoders.register('microdata', MicrodataDecoder);


var JSONDecoder = (function() { 
// FIXME not really a JSON decoder since expects JSON input and 
// doesn't use JSON paths

function JSONDecoder(options, namespaces) {}

_.defaults(JSONDecoder.prototype, {

init: function(object) {
	if (typeof object !== 'object' || object === null) throw 'JSONDecoder cannot handle non-object';
	this.object = object;
},

evaluate: function(query, context, variables, wantArray) {
	if (!context) context = this.object;

	var query = query.trim();
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

decoders.register('json', JSONDecoder);

_.assign(classnamespace, {

CSSDecoder: CSSDecoder,
MicrodataDecoder: MicrodataDecoder,
JSONDecoder: JSONDecoder

});


}).call(this, this.Meeko);
