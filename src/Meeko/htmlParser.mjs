/*!
 * htmlParser
 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

import * as _ from './stuff.mjs';
import URLux from './URLux.mjs';
import * as DOM from './DOM.mjs';
import Thenfu from './Thenfu.mjs';

/**
 * Normalize a parsed HTML document: move non-scoped styles from body to head,
 * resolve relative url() values in stylesheets, and resolve all URL attributes.
 * @param {Document} doc - The parsed HTML document to normalize.
 * @param {Object} details
 * @param {string} details.url - The document's URL, used as the base for resolution.
 * @returns {Promise<Document>} The normalized document.
 */
function normalize(doc, details) { 

	let baseURL = URLux.create(details.url);

	_.forEach(DOM.findAll('style', doc.body), (node) => {
		if (node.hasAttribute('scoped')) return; // ignore
		doc.head.appendChild(node); // NOTE no adoption
	});
	
	_.forEach(DOM.findAll('style', doc), (node) => {
		// TODO the following rewrites url() property values but isn't robust
		let text = node.textContent;
		let replacements = 0;
		text = text.replace(/\burl\(\s*(['"]?)([^\r\n]*)\1\s*\)/ig, (match, quote, url) => {
				let absURL = baseURL.resolve(url);
				if (absURL === url) return match;
				replacements++;
				return `url(${quote}${absURL}${quote})`;
			});
		if (replacements) node.textContent = text;
	});

	return resolveAll(doc, baseURL, false);
}

/**
 * Resolve all URL attributes in a document to absolute form.
 * @param {Document} doc
 * @param {URLux} baseURL
 * @returns {Promise<Document>}
 */
function resolveAll(doc, baseURL) {
	let urlAttributes = URLux.attributes;

	return Thenfu.pipe(null, [

	() => {
		let selector = Object.keys(urlAttributes).join(', ');
		return DOM.findAll(selector, doc);
	},

	(nodeList) => {
		return Thenfu.reduce(null, nodeList, (dummy, el) => {
			let tag = el.localName;
			if (!tag) return;
			let attrList = urlAttributes[tag];
			_.forOwn(attrList, (attrDesc, attrName) => {
				if (!el.hasAttribute(attrName)) return;
				attrDesc.resolve(el, baseURL);
			});
		});
	},

	() => {
		return doc;
	}

	]);

}

/**
 * Parse an HTML string into a normalized Document.
 * @param {string} html - Raw HTML string.
 * @param {Object} details
 * @param {string} details.url - Base URL for resolving relative references.
 * @returns {Promise<Document>}
 */
function nativeParser(html, details) {

	return Thenfu.pipe(null, [
		
	() => {
		let doc = (new DOMParser).parseFromString(html, 'text/html');
		return normalize(doc, details);
	}
	
	]);

}

/**
 * Rewrite a single URL, replacing a `scope:` prefix with resolution against baseURL.
 * URLs without the `scope:` prefix are returned unchanged. Case-insensitive.
 * @param {string} url - The URL to potentially rebase.
 * @param {URLux} baseURL - The scope base URL to resolve against.
 * @returns {string} The resolved URL, or the original if no `scope:` prefix.
 */
function rebaseURL(url, baseURL) {
	let relURL = url.replace(/^scope:/i, '');
	if (relURL == url) return url;
	return baseURL.resolve(relURL);
}

/**
 * Walk all URL-bearing attributes in a document and rewrite any `scope:`-prefixed
 * values to be resolved against the given scope URL.
 * @param {Document} doc - The document to rebase.
 * @param {URLux} scopeURL - The scope base URL.
 */
function rebase(doc, scopeURL) {
	let urlAttributes = URLux.attributes;
	_.forOwn(urlAttributes, (attrList, tag) => {
		_.forEach(DOM.findAll(tag, doc), (el) => {
			_.forOwn(attrList, (attrDesc, attrName) => {
				let relURL = el.getAttribute(attrName);
				if (relURL == null) return;
				let url = rebaseURL(relURL, scopeURL);
				if (url != relURL) el[attrName] = url;
			});
		});
	});
}

/**
 * Process `<style scoped>` elements: wrap their CSS in an @scope rule targeting
 * a generated scope ID, remove the `scoped` attribute, and move them to `<head>`.
 * Styles whose parent doesn't match allowedScopeSelector are removed entirely.
 * @param {Document} doc - The document containing scoped styles.
 * @param {string} allowedScopeSelector - CSS selector for valid parent elements.
 */
function normalizeScopedStyles(doc, allowedScopeSelector) {
	let scopedStyles = doc.body.querySelectorAll('style[scoped]');
	scopedStyles.forEach((el, index) => {
		let scope = el.parentNode;
		if (!scope.matches(allowedScopeSelector)) {
			console.warn(`Removing <style scoped>. Must be child of ${allowedScopeSelector}`);
			el.remove();
			return;
		}

		let scopeId = `__scope_${index}__`;
		scope.setAttribute('scopeid', scopeId);

		el.removeAttribute('scoped');
		el.textContent = `@scope ([scopeid="${scopeId}"]) {\n${el.textContent}\n}`;
		doc.head.appendChild(el);
	});
}

export default {
	parse: nativeParser,
	normalize,
	rebase,
	rebaseURL,
	normalizeScopedStyles
}
