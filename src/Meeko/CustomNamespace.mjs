
import * as _ from './stuff.mjs';

/**
 * Represents a namespace with a URN, name, and prefix style.
 * Supports XML-style (colon separator) and vendor-style (hyphen separator) prefixes.
 * @param {Object} options
 * @param {string} options.urn - Namespace URN identifier
 * @param {string} options.name - Short name used as prefix base
 * @param {string} options.style - 'xml' or 'vendor'
 */
class CustomNamespace {

constructor(options) {
	if (!options) return; // WARN for cloning / inheritance
	let style = options.style = _.lc(options.style);
	let styleInfo = _.find(CustomNamespace.namespaceStyles, function(styleInfo) {
		return styleInfo.style === style;
	});
	if (!styleInfo) throw Error(`Unexpected namespace style: ${style}`);
	let name = options.name = _.lc(options.name);
	if (!name) throw Error(`Unexpected name: ${name}`);
	
	_.assign(this, options);
	let separator = styleInfo.separator;
	this.prefix = this.name + separator;
	this.selectorPrefix = this.name + (separator === ':' ? '\\:' : separator);
}

/**
 * Create a shallow copy of this namespace definition.
 * @returns {CustomNamespace}
 */
clone() {
	let clone = new CustomNamespace();
	_.assign(clone, this);
	return clone;
}

/**
 * Return a prefixed tag name.
 * @param {string} name - Unprefixed tag name
 * @returns {string} Prefixed tag name (e.g. 'haz:if')
 */
lookupTagName(name) { return this.prefix + name; }

/**
 * Prefix each tag in a CSS selector.
 * @param {string} selector - CSS selector with unprefixed tag names
 * @returns {string} Selector with prefixed tag names
 */
lookupSelector(selector) {
	let prefix = this.selectorPrefix;
	let tags = selector.split(/\s*,\s*|\s+/);
	return Array.from(tags, function(tag) { return prefix + tag; }).join(', ');
}

}

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

/**
 * A collection of CustomNamespace objects with lookup methods.
 * Initialized from xmlns: or custom- attributes on a document's root element.
 * @param {Document} [doc] - Document to scan for namespace declarations
 */
class NamespaceCollection {

constructor(doc) {
	this.items = [];
	if (!doc) return; // WARN for cloning / inheritance
	this.init(doc); 
}

init(doc) {
	let coll = this;
	_.forEach(Array.from(doc.documentElement.attributes), function(attr) {
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
}

clone() {
	let coll = new NamespaceCollection();
	_.forEach(this.items, function(nsDef) { 
		coll.items.push(nsDef.clone());
	});
	return coll;
}

add(nsDef) {
	let coll = this;
	let matchingNS = _.find(coll.items, function(def) {
		if (_.lc(def.urn) === _.lc(nsDef.urn)) {
			if (def.prefix !== nsDef.prefix) console.warn(`Attempted to add namespace with same urn as one already present: ${def.urn}`);
			return true;
		}
		if (def.prefix === nsDef.prefix) {
			if (_.lc(def.urn) !== _.lc(nsDef.urn)) console.warn(`Attempted to add namespace with same prefix as one already present: ${def.prefix}`);
			return true;
		}
	});
	if (matchingNS) return;
	coll.items.push(nsDef);
}

lookupNamespace(urn) {
	let coll = this;
	urn = _.lc(urn);
	let nsDef = _.find(coll.items, function(def) {
		return (_.lc(def.urn) === urn);
	});
	return nsDef;
}

lookupPrefix(urn) {
	let coll = this;
	let nsDef = coll.lookupNamespace(urn);
	return nsDef && nsDef.prefix;
}

lookupNamespaceURI(prefix) {
	let coll = this;
	prefix = _.lc(prefix);
	let nsDef = _.find(coll.items, function(def) {
		return (def.prefix === prefix);
	});
	return nsDef && nsDef.urn;
}

lookupTagNameNS(name, urn) {
	let coll = this;
	let nsDef = coll.lookupNamespace(urn);
	if (!nsDef) return name;
	return nsDef.prefix + name;
}

lookupSelector(selector, urn) {
	let nsDef = this.lookupNamespace(urn);
	if (!nsDef) return selector;
	return nsDef.lookupSelector(selector);
}

}

/** URN identifying the HyperFrameset custom namespace. */
const HYPERFRAMESET_URN = 'hyperframeset';

export default CustomNamespace;
export { HYPERFRAMESET_URN };
