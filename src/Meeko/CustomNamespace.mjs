/*!
 * CustomNamespace
 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

import * as _ from './stuff.mjs';

/**
 * Represents a custom namespace with a URN, name, and prefix style.
 * Supports XML-style (colon separator) and vendor-style (hyphen separator) prefixes.
 *
 * A vendor-style namespace with name 'hf' produces prefix 'hf-' and selector prefix 'hf-'.
 * An XML-style namespace with name 'haz' produces prefix 'haz:' and selector prefix 'haz\\:'.
 */
class CustomNamespace {

/**
 * @param {Object} [options] - Namespace configuration. Omit for cloning/inheritance.
 * @param {string} options.urn - Namespace URN identifier (e.g. 'hyperframeset').
 * @param {string} options.name - Short name used as prefix base (e.g. 'hf', 'haz').
 * @param {string} options.style - Prefix style: 'xml' (colon separator) or 'vendor' (hyphen separator).
 */
constructor(options) {
	if (!options) return; // WARN for cloning / inheritance
	let style = options.style = _.lc(options.style);
	let styleInfo = _.find(CustomNamespace.namespaceStyles, (styleInfo) => {
		return styleInfo.style === style;
	});
	if (!styleInfo) throw Error(`Unexpected namespace style: ${style}`);
	let name = options.name = _.lc(options.name);
	if (!name) throw Error(`Unexpected name: ${name}`);
	
	_.assign(this, options);
	let separator = styleInfo.separator;
	/** @type {string} The prefix for tag names (e.g. 'hf-' or 'haz:'). */
	this.prefix = this.name + separator;
	/** @type {string} The prefix for CSS selectors, with escaped colons if needed (e.g. 'hf-' or 'haz\\:'). */
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
 * @param {string} name - Unprefixed tag name (e.g. 'frame').
 * @returns {string} Prefixed tag name (e.g. 'hf-frame' or 'haz:if').
 */
lookupTagName(name) { return this.prefix + name; }

/**
 * Prefix each tag in a comma- or space-separated CSS selector string.
 * @param {string} selector - Selector with unprefixed tag names (e.g. 'frame, body').
 * @returns {string} Selector with prefixed tag names (e.g. 'hf-frame, hf-body').
 */
lookupSelector(selector) {
	let prefix = this.selectorPrefix;
	let tags = selector.split(/\s*,\s*|\s+/);
	return Array.from(tags, (tag) => { return prefix + tag; }).join(', ');
}

}

/**
 * Supported namespace prefix styles. Each defines a separator character
 * and the attribute prefix used to declare namespaces on the document element.
 * @type {Array<{style: string, configNamespace: string, separator: string, configPrefix?: string}>}
 */
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

_.forOwn(CustomNamespace.namespaceStyles, (styleInfo) => {
	styleInfo.configPrefix = styleInfo.configNamespace + styleInfo.separator;
});

/**
 * Create a NamespaceCollection by scanning a document's root element for namespace declarations.
 * @param {Document} doc - Document whose root element attributes are scanned.
 * @returns {NamespaceCollection} A collection of namespaces found in the document.
 */
CustomNamespace.getNamespaces = function(doc) {
	return new NamespaceCollection(doc);
}

/**
 * A collection of {@link CustomNamespace} instances with lookup methods.
 * Initialized by scanning `xmlns:` or `custom-` attributes on a document's root element.
 *
 * Provides lookup by URN, prefix, or tag name, and prevents duplicate registrations.
 */
class NamespaceCollection {

/**
 * @param {Document} [doc] - Document to scan for namespace declarations. Omit for empty collection.
 */
constructor(doc) {
	/** @type {CustomNamespace[]} */
	this.items = [];
	if (!doc) return; // WARN for cloning / inheritance
	this.init(doc); 
}

/**
 * Scan a document's root element attributes for namespace declarations and populate the collection.
 * Recognises attributes like `custom-hf="hyperframeset"` (vendor) or `xmlns:haz="hazard"` (xml).
 * @param {Document} doc - Document to scan.
 */
init(doc) {
	let coll = this;
	_.forEach(Array.from(doc.documentElement.attributes), (attr) => {
		let fullName = _.lc(attr.name);
		let styleInfo = _.find(CustomNamespace.namespaceStyles, (styleInfo) => {
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

/**
 * Create a deep copy of this collection (each namespace is cloned).
 * @returns {NamespaceCollection}
 */
clone() {
	let coll = new NamespaceCollection();
	_.forEach(this.items, (nsDef) => { 
		coll.items.push(nsDef.clone());
	});
	return coll;
}

/**
 * Add a namespace to the collection. Rejects duplicates by URN or prefix,
 * logging a warning if a conflict is detected.
 * @param {CustomNamespace} nsDef - The namespace to add.
 */
add(nsDef) {
	let coll = this;
	let matchingNS = _.find(coll.items, (def) => {
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

/**
 * Find a namespace definition by its URN.
 * @param {string} urn - The namespace URN to search for (case-insensitive).
 * @returns {CustomNamespace|undefined} The matching namespace, or undefined.
 */
lookupNamespace(urn) {
	let coll = this;
	urn = _.lc(urn);
	let nsDef = _.find(coll.items, (def) => {
		return (_.lc(def.urn) === urn);
	});
	return nsDef;
}

/**
 * Get the prefix string for a namespace identified by URN.
 * @param {string} urn - The namespace URN.
 * @returns {string|undefined} The prefix (e.g. 'hf-'), or undefined if not found.
 */
lookupPrefix(urn) {
	let coll = this;
	let nsDef = coll.lookupNamespace(urn);
	return nsDef && nsDef.prefix;
}

/**
 * Find the URN associated with a given prefix.
 * @param {string} prefix - The prefix to look up (case-insensitive).
 * @returns {string|undefined} The namespace URN, or undefined if not found.
 */
lookupNamespaceURI(prefix) {
	let coll = this;
	prefix = _.lc(prefix);
	let nsDef = _.find(coll.items, (def) => {
		return (def.prefix === prefix);
	});
	return nsDef && nsDef.urn;
}

/**
 * Return a prefixed tag name for the given namespace URN.
 * Falls back to the unprefixed name if the namespace is not registered.
 * @param {string} name - Unprefixed tag name (e.g. 'body').
 * @param {string} urn - Namespace URN (e.g. 'hyperframeset').
 * @returns {string} Prefixed tag name (e.g. 'hf-body').
 */
lookupTagNameNS(name, urn) {
	let coll = this;
	let nsDef = coll.lookupNamespace(urn);
	if (!nsDef) return name;
	return nsDef.prefix + name;
}

/**
 * Prefix a CSS selector for the given namespace URN.
 * Falls back to the original selector if the namespace is not registered.
 * @param {string} selector - Selector with unprefixed tag names (e.g. 'frame, body').
 * @param {string} urn - Namespace URN (e.g. 'hyperframeset').
 * @returns {string} Selector with prefixed tag names (e.g. 'hf-frame, hf-body').
 */
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
