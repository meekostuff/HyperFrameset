
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

	_.forEach(DOM.findAll('style', doc.body), function(node) {
		if (node.hasAttribute('scoped')) return; // ignore
		doc.head.appendChild(node); // NOTE no adoption
	});
	
	_.forEach(DOM.findAll('style', doc), function(node) {
		// TODO the following rewrites url() property values but isn't robust
		let text = node.textContent;
		let replacements = 0;
		text = text.replace(/\burl\(\s*(['"]?)([^\r\n]*)\1\s*\)/ig, function(match, quote, url) {
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
 * @param {URL} baseURL
 * @returns {Promise<Document>}
 */
function resolveAll(doc, baseURL) {
	let urlAttributes = URLux.attributes;

	return Thenfu.pipe(null, [

	function () {
		let selector = Object.keys(urlAttributes).join(', ');
		return DOM.findAll(selector, doc);
	},

	function(nodeList) {
		return Thenfu.reduce(null, nodeList, function(dummy, el) {
			let tag = DOM.getTagName(el);
			let attrList = urlAttributes[tag];
			_.forOwn(attrList, function(attrDesc, attrName) {
				if (!el.hasAttribute(attrName)) return;
				attrDesc.resolve(el, baseURL);
			});
		});
	},

	function() {
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
		
	function() {
		let doc = (new DOMParser).parseFromString(html, 'text/html');
		return normalize(doc, details);
	}
	
	]);

}

/**
 * Rewrite a single URL, replacing a `scope:` prefix with resolution against baseURL.
 * URLs without the `scope:` prefix are returned unchanged. Case-insensitive.
 * @param {string} url - The URL to potentially rebase.
 * @param {URL} baseURL - The scope base URL to resolve against.
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
 * @param {URL} scopeURL - The scope base URL.
 */
function rebase(doc, scopeURL) {
	let urlAttributes = URLux.attributes;
	_.forOwn(urlAttributes, function(attrList, tag) {
		_.forEach(DOM.findAll(tag, doc), function(el) {
			_.forOwn(attrList, function(attrDesc, attrName) {
				let relURL = el.getAttribute(attrName);
				if (relURL == null) return;
				let url = rebaseURL(relURL, scopeURL);
				if (url != relURL) el[attrName] = url;
			});
		});
	});
}

/**
 * Process `<style scoped>` elements: prefix their CSS selectors with a generated
 * scope ID, remove the `scoped` attribute, and move them to `<head>`.
 * Styles whose parent doesn't match allowedScopeSelector are removed entirely.
 * @param {Document} doc - The document containing scoped styles.
 * @param {string} allowedScopeSelector - CSS selector for valid parent elements.
 */
function normalizeScopedStyles(doc, allowedScopeSelector) {
	let scopedStyles = DOM.findAll('style[scoped]', doc.body);
	_.forEach(scopedStyles, function(el, index) {
		let scope = el.parentNode;
		if (!DOM.matches(scope, allowedScopeSelector)) {
			console.warn(`Removing <style scoped>. Must be child of ${allowedScopeSelector}`);
			scope.removeChild(el);
			return;
		}
		
		let scopeId = `__scope_${index}__`;
		scope.setAttribute('scopeid', scopeId);
		if (scope.hasAttribute('id')) scopeId = scope.getAttribute('id');
		else scope.setAttribute('id', scopeId);

		el.removeAttribute('scoped');
		let sheet = el.sheet;
		forRules(sheet, processRule, scope);
		let cssText = _.map(sheet.cssRules, function(rule) {
				return rule.cssText; 
			}).join('\n');
		el.textContent = cssText;
		DOM.insertNode('beforeend', doc.head, el);
		return;
	});
}

/**
 * Prefix a CSS rule's selectors with a scope ID. Handles style rules,
 * media/supports rules (recursively), and removes unsupported rule types.
 * Called via forRules() with `this` bound to the scope element.
 * @param {CSSRule} rule
 * @param {number} id - Rule index within parentRule.
 * @param {CSSStyleSheet|CSSGroupingRule} parentRule
 */
function processRule(rule, id, parentRule) {
	let scope = this;
	switch (rule.type) {
	case 1: // CSSRule.STYLE_RULE
		// prefix each selector in selector-chain with scopePrefix
		// selector-chain is split on COMMA (,) that is not inside BRACKETS. Technically: not followed by a RHB ')' unless first followed by LHB '(' 
		let scopeId = scope.getAttribute('scopeid');
		let scopePrefix = `#${scopeId} `;
		let selectorText = scopePrefix + rule.selectorText.replace(/,(?![^(]*\))/g, `, ${scopePrefix}`);
		let cssText = rule.cssText.replace(rule.selectorText, '');
		cssText = `${selectorText} ${cssText}`;
		parentRule.deleteRule(id);
		parentRule.insertRule(cssText, id);
		break;

	case 11: // CSSRule.COUNTER_STYLE_RULE
		break;

	case 4: // CSSRule.MEDIA_RULE
	case 12: // CSSRule.SUPPORTS_RULE
		forRules(rule, processRule, scope);
		break;
	
	default:
		console.warn('Deleting invalid rule for <style scoped>: \n' + rule.cssText);
		parentRule.deleteRule(id);
		break;
	}
}

/**
 * Iterate CSS rules in reverse order, invoking callback for each.
 * @param {CSSStyleSheet|CSSGroupingRule} parentRule
 * @param {Function} callback - Called with (rule, index, parentRule).
 * @param {*} context - Bound as `this` in callback.
 */
function forRules(parentRule, callback, context) {
	let ruleList = parentRule.cssRules;
	for (let i=ruleList.length-1; i>=0; i--) callback.call(context, ruleList[i], i, parentRule);
}

export default {
	parse: nativeParser,
	normalize,
	rebase,
	rebaseURL,
	normalizeScopedStyles
}
