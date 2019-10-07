
import * as _ from './stuff.mjs';
import URL from './URL.mjs';
import * as DOM from './DOM.mjs';
import Promise from './Promise.mjs';

/*
	HTML_IN_DOMPARSER indicates if DOMParser supports 'text/html' parsing. Historically only Firefox did.
	Cross-browser support coming? https://developer.mozilla.org/en-US/docs/Web/API/DOMParser#Browser_compatibility
*/
const HTML_IN_DOMPARSER = (function() {

	try {
		let doc = (new DOMParser).parseFromString('', 'text/html');
		return !!doc;
	}
	catch(err) { return false; }

})();


/*
	normalize() is called between html-parsing (internal) and document normalising (external function).
	It is called after using the native parser:
	- with DOMParser#parseFromString(), see htmlParser#nativeParser()
	- with XMLHttpRequest & xhr.responseType='document', see httpProxy's request()
	The innerHTMLParser also uses this call
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

function innerHTMLParser(html, details) {
	return Promise.pipe(null, [
		
	function() {
		let doc = DOM.createHTMLDocument('');
		let docElement = doc.documentElement;
		docElement.innerHTML = html;
		let m = html.match(/<html(?=\s|>)(?:[^>]*)>/i); // WARN this assumes there are no comments containing '<html' and no attributes containing '>'.
		let div = document.createElement('div');
		div.innerHTML = m[0].replace(/^<html/i, '<div');
		let htmlElement = div.firstChild;
		DOM.copyAttributes(docElement, htmlElement);
		return doc;
	},
	
	function(doc) {
		return normalize(doc, details);
	}
	
	]);
}

export default {
	HTML_IN_DOMPARSER,
	parse: HTML_IN_DOMPARSER ? nativeParser : innerHTMLParser,
	normalize
}
