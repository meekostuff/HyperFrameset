/*!
 * Microdata
 * HTML Microdata parsing and querying
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

const document = window.document;

const nodeData = new WeakMap();

function intersects(a1, a2) {
	return a1.some(i1 => a2.includes(i1));
}

function walkTree(root, skipRoot, callback) {
	let walker = document.createNodeIterator(root, 1, function(el) {
		if (skipRoot && el === root) return NodeFilter.FILTER_SKIP;
		return callback(el);
	});
	let el;
	while (el = walker.nextNode());
}

const valueAttr = {};
for (const text of "meta@content link@href a@href area@href img@src video@src audio@src source@src track@src iframe@src embed@src object@data time@datetime data@value meter@value".split(' ')) {
	let [tagName, attrName] = text.split('@');
	valueAttr[tagName] = attrName;
}

function createHTMLPropertiesCollection() {
	let list = [];
	list.names = [];
	list.nodeLists = {};
	list.namedItem = function(name) { return this.nodeLists[name]; };
	list.addNamedItem = function(name, el) {
		this.push(el);
		if (!this.nodeLists[name]) {
			this.nodeLists[name] = [];
			this.names.push(name);
		}
		this.nodeLists[name].push(el);
	};
	return list;
}

function evaluate(el) {
	let tagName = el.tagName.toLowerCase();
	let attrName = valueAttr[tagName];
	if (attrName) return el[attrName] || el.getAttribute(attrName);
	return el;
}

function getPropDesc(el) {
	if (nodeData.has(el)) return nodeData.get(el);
	let prop = { name: el.getAttribute('itemprop'), value: evaluate(el) };
	nodeData.set(el, prop);
	return prop;
}

function getScopeDesc(scopeEl) {
	if (nodeData.has(scopeEl)) return nodeData.get(scopeEl);

	let scopeDesc = {
		element: scopeEl,
		isScope: true,
		type: scopeEl.nodeType === 1 ? (scopeEl.getAttribute('itemtype') || '').trim().split(/\s+/) : [],
		properties: createHTMLPropertiesCollection(),
		childScopes: []
	};

	walkTree(scopeEl, true, function(el) {
		let isScope = el.hasAttribute('itemscope');
		let propName = el.getAttribute('itemprop');
		if (!(isScope || propName)) return NodeFilter.FILTER_SKIP;

		if (isScope) getScopeDesc(el);
		else getPropDesc(el);
		if (propName) scopeDesc.properties.addNamedItem(propName, el);
		else scopeDesc.childScopes.push(el);

		return isScope ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
	});

	nodeData.set(scopeEl, scopeDesc);
	return scopeDesc;
}

function parse(rootNode) {
	if (!rootNode) rootNode = document;
	getScopeDesc(rootNode);
}

function getItems(rootNode, type) {
	if (!nodeData.has(rootNode)) parse(rootNode);

	let scope = nodeData.get(rootNode);
	let typeList =
		(typeof type === 'string') ? type.trim().split(/\s+/) :
		type && type.length ? type :
		[];

	let resultList = [];

	for (const propName of scope.properties.names) {
		let propList = scope.properties.namedItem(propName);
		for (const el of propList) {
			let desc = nodeData.get(el);
			if (desc && desc.isScope) resultList.push(...getItems(el, typeList));
		}
	}

	for (const el of scope.childScopes) {
		let desc = nodeData.get(el);
		if (!typeList.length || (desc && intersects(desc.type, typeList))) resultList.push(el);
		resultList.push(...getItems(el, typeList));
	}

	return resultList;
}

function getProperties(el) {
	if (!nodeData.has(el)) return;
	let desc = nodeData.get(el);
	if (!desc.isScope) return;
	return desc.properties;
}

function getValue(el) {
	if (nodeData.has(el)) return nodeData.get(el).value;
	let desc = getPropDesc(el);
	return desc.value;
}

export { getItems, getProperties, getValue };
