
import * as _ from './stuff.mjs';
import URL from './URL.mjs';
import * as DOM from './DOM.mjs';
import Promise from './Promise.mjs';

/*
	normalize() is called between html-parsing (internal) and document normalising (external function).
	It is called after using the native parser:
	- with DOMParser#parseFromString(), see htmlParser#nativeParser()
	- with XMLHttpRequest & xhr.responseType='document', see httpProxy's request()
*/
function normalize(doc, details) { 

	let baseURL = URL(details.url);

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
				return "url(" + quote + absURL + quote + ")";
			});
		if (replacements) node.textContent = text;
	});

	return resolveAll(doc, baseURL, false);
}

/*
	resolveAll() resolves all URL attributes
*/
let urlAttributes = URL.attributes;

function resolveAll(doc, baseURL) {

	return Promise.pipe(null, [

	function () {
		let selector = Object.keys(urlAttributes).join(', ');
		return DOM.findAll(selector, doc);
	},

	function(nodeList) {
		return Promise.reduce(null, nodeList, function(dummy, el) {
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

function nativeParser(html, details) {

	return Promise.pipe(null, [
		
	function() {
		let doc = (new DOMParser).parseFromString(html, 'text/html');
		return normalize(doc, details);
	}
	
	]);

}

export default {
	parse: nativeParser,
	normalize
}
