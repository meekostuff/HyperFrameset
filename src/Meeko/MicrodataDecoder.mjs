import * as _ from './stuff.mjs';

let document = window.document;

let Microdata = (function() {

function intersects(a1, a2) { // TODO add to Meeko.stuff
	return _.some(a1, function(i1) {
		return _.some(a2, function(i2) { 
			return i2 === i1; 
		});
	});
}

function walkTree(root, skipRoot, callback) { // callback(el) must return NodeFilter code
	let walker = document.createNodeIterator(
			root,
			1,
			acceptNode,
			null // IE9 throws if this irrelavent argument isn't passed
		);
	
	let el;
	while (el = walker.nextNode());

	function acceptNode(el) {
		if (skipRoot && el === root) return NodeFilter.FILTER_SKIP;
		return callback(el);
	}
}

// TODO copied from DOMSprockets. Could be a generic "class"

let nodeIdProperty = '__microdata__';
let nodeCount = 0; // used to generated node IDs
let nodeStorage = {}; // hash of storage for nodes, keyed off `nodeIdProperty`

let uniqueId = function(node) {
	let nodeId = node[nodeIdProperty];
	if (nodeId) return nodeId;
	nodeId = nodeCount++; // TODO stringify??
	node[nodeIdProperty] = new String(nodeId); // NOTE so that node cloning in old IE doesn't copy the node ID property
	return nodeId;
}

let setData = function(node, data) { // FIXME assert node is element
	let nodeId = uniqueId(node);
	nodeStorage[nodeId] = data;
}

let hasData = function(node) {
	let nodeId = node[nodeIdProperty];
	return !nodeId ? false : nodeId in nodeStorage;
}

let getData = function(node) { // TODO should this throw if no data?
	let nodeId = node[nodeIdProperty];
	if (!nodeId) return;
	return nodeStorage[nodeId];
}


function getItems(rootNode, type) {
	if (!hasData(rootNode)) parse(rootNode);

	let scope = getData(rootNode);
	let typeList =
		(typeof type === 'string') ? _.words(type.trim()) :
		type && type.length ? type :
		[];
			
	let resultList = [];

	_.forEach(scope.properties.names, function(propName) {
		let propList = scope.properties.namedItem(propName);
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
	let desc = getData(el);
	if (!desc.isScope) return;
	return desc.properties;
}

function parse(rootNode) {
	if (!rootNode) rootNode = document;
	let desc = getScopeDesc(rootNode);
}

function getScopeDesc(scopeEl) {
	if (hasData(scopeEl)) return getData(scopeEl);
	
	let scopeDesc = {
		element: scopeEl,
		isScope: true,
		type: scopeEl.nodeType === 1 || _.words(scopeEl.getAttribute('itemtype')),
		properties: createHTMLPropertiesCollection(),
		childScopes: []
	}

	walkTree(scopeEl, true, function(el) {
		let isScope = el.hasAttribute('itemscope');
		let propName = el.getAttribute('itemprop');
		if (!(isScope || propName)) return NodeFilter.FILTER_SKIP;
		
		let item = isScope ? getScopeDesc(el) : getPropDesc(el);
		if (propName) scopeDesc.properties.addNamedItem(propName, el);
		else scopeDesc.childScopes.push(el);

		return isScope ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
	});

	setData(scopeEl, scopeDesc);
	return scopeDesc;
}
	
function getValue(el) {
	if (hasData(el)) return getData(el).value;
	let desc = getPropDesc(el);
	setData(el, desc);
	return desc.value;
}

function getPropDesc(el) {
	if (hasData(el)) return getData(el);

	let name = el.getAttribute('itemprop');
	
	let prop = {
		name: name,
		value: evaluate(el)
	}
	
	setData(el, prop);
	return prop;
}

function evaluate(el) {
	let tagName = el.tagName.toLowerCase();
	let attrName = valueAttr[tagName];
	if (attrName) return el[attrName] || el.getAttribute(attrName);

	return el;
}

function createHTMLPropertiesCollection() {
	let list = [];
	list.names = [];
	list.nodeLists = {};
	_.assign(list, HTMLPropertiesCollection.prototype);
	return list;
}

let HTMLPropertiesCollection = function() {}
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


let valueAttr = {};
_.forEach(_.words("meta@content link@href a@href area@href img@src video@src audio@src source@src track@src iframe@src embed@src object@data time@datetime data@value meter@value"), function(text) {
	let m = text.split("@"), tagName = m[0], attrName = m[1];
	valueAttr[tagName] = attrName;
});


return {

getItems: getItems,
getProperties: getProperties,
getValue: getValue

}

})();


function MicrodataDecoder(options, namespaces) {}

_.defaults(MicrodataDecoder.prototype, {

init: function(node) {
	Microdata.getItems(node);
	this.rootNode = node;
},

evaluate: function(query, context, variables, wantArray) {
	if (!context) context = this.rootNode;

	query = query.trim();
	let startAtRoot = false;
	let baseSchema;
	let pathParts;

	if (query === '.') return (wantArray) ? [ context ] : context;

	let m = query.match(/^(?:(\^)?\[([^\]]*)\]\.)/);
	if (m && m.length) {
		query = query.substr(m[0].length);
		startAtRoot = !!m[1];
		baseSchema = _.words(m[2].trim());
	}
	pathParts = _.words(query.trim());
	
	let nodes;
	if (baseSchema) {
		if (startAtRoot) context = this.view;
		nodes = Microdata.getItems(context, baseSchema);	
	}
	else nodes = [ context ];

	let resultList = nodes;
	_.forEach(pathParts, function(relPath, i) {
		let parents = resultList;
		resultList = [];
		_.forEach(parents, function(el) {
			let props = Microdata.getProperties(el);
			if (!props) return;
			let nodeList = props.namedItem(relPath);
			if (!nodeList) return;
			[].push.apply(resultList, nodeList);
		});
	});

	// now convert elements to values
	resultList = _.map(resultList, function(el) {
		let props = Microdata.getProperties(el);
		if (props) return el;
		return Microdata.getValue(el);
	});

	if (wantArray) return resultList;

	return resultList[0];
}

});

export {
	Microdata,
	MicrodataDecoder
};

export default MicrodataDecoder;