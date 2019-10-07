
import * as _ from './stuff.mjs';

let CustomNamespace = (function() {

function CustomNamespace(options) {
	if (!(this instanceof CustomNamespace)) return new CustomNamespace(options);
	if (!options) return; // WARN for cloning / inheritance
	let style = options.style = _.lc(options.style);
	let styleInfo = _.find(CustomNamespace.namespaceStyles, function(styleInfo) {
		return styleInfo.style === style;
	});
	if (!styleInfo) throw Error('Unexpected namespace style: ' + style);
	let name = options.name = _.lc(options.name);
	if (!name) throw Error('Unexpected name: ' + name);
	
	let nsDef = this;
	_.assign(nsDef, options);
	let separator = styleInfo.separator;
	nsDef.prefix = nsDef.name + separator;
	nsDef.selectorPrefix = nsDef.name + (separator === ':' ? '\\:' : separator);
}

_.defaults(CustomNamespace.prototype, {

clone: function() {
	let clone = new CustomNamespace();
	_.assign(clone, this);
	return clone;
},

lookupTagName: function(name) { return this.prefix + name; },
lookupSelector: function(selector) {
	let prefix = this.selectorPrefix;
	let tags = selector.split(/\s*,\s*|\s+/);
	return _.map(tags, function(tag) { return prefix + tag; }).join(', ');
}

});

CustomNamespace.namespaceStyles = [
	{
		style: 'vendor',
		configNamespace: 'custom',
		separator: '-'
	},
	{
		style: 'xml',
		configNamespace: 'xmlns',
		separator: ':'
	}
];

_.forOwn(CustomNamespace.namespaceStyles, function(styleInfo) {
	styleInfo.configPrefix = styleInfo.configNamespace + styleInfo.separator;
});

CustomNamespace.getNamespaces = function(doc) { // NOTE modelled on IE8, IE9 document.namespaces interface
	return new NamespaceCollection(doc);
}

return CustomNamespace;

})();

let NamespaceCollection = function(doc) {
	if (!(this instanceof NamespaceCollection)) return new NamespaceCollection(doc);
	this.items = [];
	if (!doc) return; // WARN for cloning / inheritance
	this.init(doc); 
}

_.assign(NamespaceCollection.prototype, {

init: function(doc) {
	let coll = this;
	_.forEach(_.map(doc.documentElement.attributes), function(attr) {
		let fullName = _.lc(attr.name);
		let styleInfo = _.find(CustomNamespace.namespaceStyles, function(styleInfo) {
			return (fullName.indexOf(styleInfo.configPrefix) === 0);
		});
		if (!styleInfo) return;
		let name = fullName.substr(styleInfo.configPrefix.length);
		let nsDef = new CustomNamespace({
			urn: attr.value,
			name: name,
			style: styleInfo.style
		});
		coll.add(nsDef);
	});
},

clone: function() {
	let coll = new NamespaceCollection();
	_.forEach(this.items, function(nsDef) { 
		coll.items.push(nsDef.clone());
	});
	return coll;
},

add: function(nsDef) {
	let coll = this;
	let matchingNS = _.find(coll.items, function(def) {
		if (_.lc(def.urn) === _.lc(nsDef.urn)) {
			if (def.prefix !== nsDef.prefix) console.warn('Attempted to add namespace with same urn as one already present: ' + def.urn);
			return true;
		}
		if (def.prefix === nsDef.prefix) {
			if (_.lc(def.urn) !== _.lc(nsDef.urn)) console.warn('Attempted to add namespace with same prefix as one already present: ' + def.prefix);
			return true;
		}
	});
	if (matchingNS) return;
	coll.items.push(nsDef);
},

lookupNamespace: function(urn) {
	let coll = this;
	urn = _.lc(urn);
	let nsDef = _.find(coll.items, function(def) {
		return (_.lc(def.urn) === urn);
	});
	return nsDef;
},


lookupPrefix: function(urn) {
	let coll = this;
	let nsDef = coll.lookupNamespace(urn);
	return nsDef && nsDef.prefix;
},

lookupNamespaceURI: function(prefix) {
	let coll = this;
	prefix = _.lc(prefix);
	let nsDef = _.find(coll.items, function(def) {
		return (def.prefix === prefix);
	});
	return nsDef && nsDef.urn;
},

lookupTagNameNS: function(name, urn) {
	let coll = this;
	let nsDef = coll.lookupNamespace(urn);
	if (!nsDef) return name; // TODO is this correct?
	return nsDef.prefix + name; // TODO _.lc(name) ??
},

lookupSelector: function(selector, urn) {
	let nsDef = this.lookupNamespace(urn);
	if (!nsDef) return selector;
	return nsDef.lookupSelector(selector);
}

});

export default CustomNamespace;
