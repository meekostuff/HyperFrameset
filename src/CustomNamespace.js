
(function() {

var global = this;
var Meeko = global.Meeko;
var _ = Meeko.stuff;

var CustomNamespace = Meeko.CustomNamespace = (function() {

function CustomNamespace(options) {
	if (!(this instanceof CustomNamespace)) return new CustomNamespace(options);
	if (!options) return; // WARN for cloning / inheritance
	var style = options.style = _.lc(options.style);
	var styleInfo = _.find(CustomNamespace.namespaceStyles, function(styleInfo) {
		return styleInfo.style === style;
	});
	if (!styleInfo) throw Error('Unexpected namespace style: ' + style);
	var name = options.name = _.lc(options.name);
	if (!name) throw Error('Unexpected name: ' + name);
	
	var nsDef = this;
	_.assign(nsDef, options);
	var separator = styleInfo.separator;
	nsDef.prefix = nsDef.name + separator;
	nsDef.selectorPrefix = nsDef.name + (separator === ':' ? '\\:' : separator);
}

_.defaults(CustomNamespace.prototype, {

clone: function() {
	var clone = new CustomNamespace();
	_.assign(clone, this);
	return clone;
},

lookupTagName: function(name) { return this.prefix + name; },
lookupSelector: function(selector) {
	var prefix = this.selectorPrefix;
	var tags = selector.split(/\s*,\s*|\s+/);
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

var NamespaceCollection = Meeko.NamespaceCollection = function(doc) { 
	if (!(this instanceof NamespaceCollection)) return new NamespaceCollection(doc);
	this.items = [];
	if (!doc) return; // WARN for cloning / inheritance
	this.init(doc); 
}

_.assign(NamespaceCollection.prototype, {

init: function(doc) {
	var coll = this;
	_.forEach(_.map(doc.documentElement.attributes), function(attr) {
		var fullName = _.lc(attr.name);
		var styleInfo = _.find(CustomNamespace.namespaceStyles, function(styleInfo) {
			return (fullName.indexOf(styleInfo.configPrefix) === 0);
		});
		if (!styleInfo) return;
		var name = fullName.substr(styleInfo.configPrefix.length);
		var nsDef = new CustomNamespace({
			urn: attr.value,
			name: name,
			style: styleInfo.style
		});
		coll.add(nsDef);
	});
},

clone: function() {
	var coll = new NamespaceCollection();
	_.forEach(this.items, function(nsDef) { 
		coll.items.push(nsDef.clone());
	});
	return coll;
},

add: function(nsDef) {
	var coll = this;
	var matchingNS = _.find(coll.items, function(def) {
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
	var coll = this;
	urn = _.lc(urn);
	var nsDef = _.find(coll.items, function(def) {
		return (_.lc(def.urn) === urn);
	});
	return nsDef;
},


lookupPrefix: function(urn) {
	var coll = this;
	var nsDef = coll.lookupNamespace(urn);
	return nsDef && nsDef.prefix;
},

lookupNamespaceURI: function(prefix) {
	var coll = this;
	prefix = _.lc(prefix);
	var nsDef = _.find(coll.items, function(def) {
		return (def.prefix === prefix);
	});
	return nsDef && nsDef.urn;
},

lookupTagNameNS: function(name, urn) {
	var coll = this;
	var nsDef = coll.lookupNamespace(urn);
	if (!nsDef) return name; // TODO is this correct?
	return nsDef.prefix + name; // TODO _.lc(name) ??
},

lookupSelector: function(selector, urn) {
	var nsDef = this.lookupNamespace(urn);
	if (!nsDef) return selector;
	return nsDef.lookupSelector(selector);
}

});



}).call(this);
