/*!
 * URLux
 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */
/**
 * URLux - extended URL utility.
 *
 * Extends the native URL class with pre-computed path components
 * and a resolve method that handles non-standard protocols gracefully.
 *
 * Instances are effectively immutable by convention — always create
 * new instances via {@link URLux.create} rather than mutating properties.
 * WARN: native URL setters are inherited and will NOT update the custom fields.
 */

const document = window.document;

class URLux extends URL {

/**
 * @param {string} href - Absolute or relative URL string.
 * @param {string} [base] - Base URL for resolving relative href.
 */
constructor(href, base) {
	super(href, base);
	/** @type {boolean} Whether this URL's protocol supports relative resolution. */
	this.supportsResolve = /^(https?|ftp|file):$/.test(this.protocol);
	if (!this.supportsResolve) return;
	const pathParts = this.pathname.split('/'); // ['', ...segments, filename]
	pathParts.shift();
	/** @type {string} The final path segment (e.g. 'page.html'). */
	this.filename = pathParts.pop() || '';
	/** @type {string} The directory path with leading and trailing slashes. */
	this.basepath = pathParts.length ? '/' + pathParts.join('/') + '/' : '/';
	/** @type {string} Origin + basepath — the base for resolving relative URLs. */
	this.base = this.origin + this.basepath;
	/** @type {string} Origin + pathname, without search or hash. */
	this.nosearch = this.origin + this.pathname;
	/** @type {string} Origin + pathname + search, without hash. */
	this.nohash = this.nosearch + this.search;
}

/**
 * Resolve a relative URL against this URL.
 * Returns the href unchanged for absolute URLs or unsupported protocols.
 * @param {string} relHref - The relative (or absolute) URL to resolve.
 * @returns {string} The resolved absolute URL string.
 */
resolve(relHref) {
	relHref = relHref.trim();
	if (!this.supportsResolve) return relHref;
	if (/^[a-zA-Z0-9-]+:/.test(relHref)) return relHref;
	if (relHref.startsWith('//')) return this.protocol + relHref;
	if (relHref.startsWith('/')) return this.origin + relHref;
	if (relHref.startsWith('?')) return this.nosearch + relHref;
	if (relHref.startsWith('#')) return this.nohash + relHref;
	if (!relHref.startsWith('.')) return this.base + relHref;
	if (relHref.startsWith('./')) return this.base + relHref.slice(2);
	// handle ../
	let myRel = relHref;
	let myDir = this.basepath;
	while (myRel.startsWith('../')) {
		myRel = myRel.slice(3);
		myDir = myDir.replace(/[^/]+\/$/, '');
	}
	return this.origin + myDir + myRel;
}

}

/**
 * Describes an HTML attribute that contains a URL, with logic to resolve it.
 */
class AttributeDescriptor {

/**
 * @param {string} tagName - HTML tag name (e.g. 'img').
 * @param {string} attrName - Attribute name (e.g. 'src').
 * @param {boolean} loads - Whether the attribute triggers a resource load.
 * @param {boolean} compound - Whether the attribute contains multiple URLs.
 */
constructor(tagName, attrName, loads, compound) {
	this.tagName = tagName;
	this.attrName = attrName;
	this.loads = loads;
	this.compound = compound;
	this.supported = attrName in document.createElement(tagName);
}

/**
 * Resolve the URL attribute on an element in-place.
 * @param {Element} el - The DOM element.
 * @param {URLux} baseURL - The base URL to resolve against.
 */
resolve(el, baseURL) {
	const url = el.getAttribute(this.attrName);
	if (url == null) return;
	const finalURL = this.resolveURL(url, baseURL);
	if (finalURL !== url) el.setAttribute(this.attrName, finalURL);
}

/**
 * Resolve a URL string against a base. May be overridden for compound attributes.
 * @param {string} url - The raw attribute value.
 * @param {URLux} baseURL - The base URL to resolve against.
 * @returns {string} The resolved URL string.
 */
resolveURL(url, baseURL) {
	const relURL = url.trim();
	if (relURL.charAt(0) === '') return relURL; // empty, but not null
	return baseURL.resolve(relURL);
}

}

/** @param {string} urlSet @param {URLux} baseURL @returns {string} */
function resolveSrcset(urlSet, baseURL) {
	return urlSet.split(/\s*,\s*/).map((urlDesc, i, list) =>
		urlDesc.replace(/^\s*(\S+)(?=\s|$)/, (all, url) => baseURL.resolve(url))
	).join(', ');
}

/** @param {string} urlSet @param {URLux} baseURL @returns {string} */
function resolvePing(urlSet, baseURL) {
	return urlSet.split(/\s+/).map(url => baseURL.resolve(url)).join(' ');
}

const urlAttributes = {};
'link@<href script@<src img@<longDesc,<src,+srcset iframe@<longDesc,<src object@<data embed@<src video@<poster,<src audio@<src source@<src,+srcset input@formAction,<src button@formAction,<src a@+ping,href area@href q@cite blockquote@cite ins@cite del@cite form@action'
.split(/\s+/).forEach(text => {
	const [tagName, attrs] = text.split('@');
	const attrList = urlAttributes[tagName] = {};
	attrs.split(',').forEach(attrName => {
		let loads = false, compound = false;
		const modifier = attrName.charAt(0);
		if (modifier === '<') { loads = true; attrName = attrName.slice(1); }
		else if (modifier === '+') { compound = true; attrName = attrName.slice(1); }
		attrList[attrName] = new AttributeDescriptor(tagName, attrName, loads, compound);
	});
});

urlAttributes['img']['srcset'].resolveURL = resolveSrcset;
urlAttributes['source']['srcset'].resolveURL = resolveSrcset;
urlAttributes['a']['ping'].resolveURL = resolvePing;

/** @type {Object<string, Object<string, AttributeDescriptor>>} Registry of URL-bearing HTML attributes by tag. */
URLux.attributes = urlAttributes;

/**
 * Factory method. Preferred way to create URLux instances.
 * @param {string} href - Absolute or relative URL string.
 * @param {string} [base] - Base URL for resolving relative href.
 * @returns {URLux}
 */
URLux.create = function(href, base) { return new URLux(href, base); };

export default URLux;
