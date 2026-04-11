
import * as _ from './stuff.mjs';

/**
 * Represents a namespace with a URN, name, and prefix style.
 * Supports XML-style (colon separator) and vendor-style (hyphen separator) prefixes.
 * @param {Object} options
 * @param {string} options.urn - Namespace URN identifier
 * @param {string} options.name - Short name used as prefix base
 * @param {string} options.style - 'xml' or 'vendor'
 */
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

/**
 * Create a shallow copy of this namespace definition.
 * @returns {CustomNamespace}
 */
clone: function() {
	let clone = new CustomNamespace();
	_.assign(clone, this);
	return clone;
},

/**
 * Return a prefixed tag name.
 * @param {string} name - Unprefixed tag name
 * @returns {string} Prefixed tag name (e.g. 'haz:if')
 */
lookupTagName: function(name) { return this.prefix + name; },

/**
 * Prefix each tag in a CSS selector.
 * @param {string} selector - CSS selector with unprefixed tag names
 * @returns {string} Selector with prefixed tag names
 */
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

/**
 * Create a NamespaceCollection from a document's root element attributes.
 * @param {Document} doc
 * @returns {NamespaceCollection}
 */
CustomNamespace.getNamespaces = function(doc) {
	return new NamespaceCollection(doc);
}

return CustomNamespace;

})();

/**
 * A collection of CustomNamespace objects with lookup methods.
 * Initialized from xmlns: or custom- attributes on a document's root element.
 * @param {Document} [doc] - Document to scan for namespace declarations
 */
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

/**
 * Deep copy this collection and all its namespace definitions.
 * @returns {NamespaceCollection}
 */
clone: function() {
	let coll = new NamespaceCollection();
	_.forEach(this.items, function(nsDef) { 
		coll.items.push(nsDef.clone());
	});
	return coll;
},

/**
 * Add a namespace definition. Rejects duplicates by URN or prefix.
 * @param {CustomNamespace} nsDef
 */
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

/**
 * Find a namespace definition by URN.
 * @param {string} urn
 * @returns {CustomNamespace|undefined}
 */
lookupNamespace: function(urn) {
	let coll = this;
	urn = _.lc(urn);
	let nsDef = _.find(coll.items, function(def) {
		return (_.lc(def.urn) === urn);
	});
	return nsDef;
},

/**
 * Get the prefix string for a namespace URN.
 * @param {string} urn
 * @returns {string|undefined} e.g. 'haz:'
 */
lookupPrefix: function(urn) {
	let coll = this;
	let nsDef = coll.lookupNamespace(urn);
	return nsDef && nsDef.prefix;
},

/**
 * Get the URN for a given prefix.
 * @param {string} prefix
 * @returns {string|undefined}
 */
lookupNamespaceURI: function(prefix) {
	let coll = this;
	prefix = _.lc(prefix);
	let nsDef = _.find(coll.items, function(def) {
		return (def.prefix === prefix);
	});
	return nsDef && nsDef.urn;
},

/**
 * Return a prefixed tag name for a given URN.
 * @param {string} name - Unprefixed tag name
 * @param {string} urn - Namespace URN
 * @returns {string}
 */
lookupTagNameNS: function(name, urn) {
	let coll = this;
	let nsDef = coll.lookupNamespace(urn);
	if (!nsDef) return name;
	return nsDef.prefix + name;
},

/**
 * Prefix a CSS selector for a given URN.
 * @param {string} selector
 * @param {string} urn
 * @returns {string}
 */
lookupSelector: function(selector, urn) {
	let nsDef = this.lookupNamespace(urn);
	if (!nsDef) return selector;
	return nsDef.lookupSelector(selector);
}

});

export default CustomNamespace;
