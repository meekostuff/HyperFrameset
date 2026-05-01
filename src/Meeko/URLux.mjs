/*
 ### URLux - extended URL utility
 */

const document = window.document;

class URLux extends URL {

constructor(href, base) {
	super(href, base);
	this.supportsResolve = /^(https?|ftp|file):$/.test(this.protocol);
	if (!this.supportsResolve) return;
	const pathParts = this.pathname.split('/'); // ['', ...segments, filename]
	pathParts.shift();
	this.filename = pathParts.pop() || '';
	this.basepath = pathParts.length ? '/' + pathParts.join('/') + '/' : '/';
	this.base = this.origin + this.basepath;
	this.nosearch = this.origin + this.pathname;
	this.nohash = this.nosearch + this.search;
}

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

class AttributeDescriptor {

constructor(tagName, attrName, loads, compound) {
	this.tagName = tagName;
	this.attrName = attrName;
	this.loads = loads;
	this.compound = compound;
	this.supported = attrName in document.createElement(tagName);
}

resolve(el, baseURL) {
	const url = el.getAttribute(this.attrName);
	if (url == null) return;
	const finalURL = this.resolveURL(url, baseURL);
	if (finalURL !== url) el.setAttribute(this.attrName, finalURL);
}

resolveURL(url, baseURL) {
	const relURL = url.trim();
	if (relURL.charAt(0) === '') return relURL; // empty, but not null
	return baseURL.resolve(relURL);
}

}

function resolveSrcset(urlSet, baseURL) {
	return urlSet.split(/\s*,\s*/).map((urlDesc, i, list) =>
		urlDesc.replace(/^\s*(\S+)(?=\s|$)/, (all, url) => baseURL.resolve(url))
	).join(', ');
}

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

URLux.attributes = urlAttributes;
URLux.create = function(href, base) { return new URLux(href, base); };

export default URLux;
