
import * as _ from './stuff.mjs';

let document = window.document;

/*
 ### URL utility functions
 */

// TODO Ideally this URL is read-only compatible with DOM4 URL
// NOTE This could use `document.createElement('a').href = url` except DOM is too slow

let URL = function(href, base) {
	if (!(this instanceof URL)) return new URL(href, base);
	let baseURL;
	if (base) baseURL = typeof base === 'string' ? new URL(base) : base;
	init.call(this, href, baseURL);
}

function init(href, baseURL) {
	if (baseURL) {
		href = baseURL.resolve(href);
		_.assign(this, new URL(href));
	}
	else {
		let url = parse(href);
		for (let key in url) this[key] = url[key]; // _.assign(this, url);
		enhance(this);
	}
}

let keys = ['source','protocol','hostname','port','pathname','search','hash'];
let parser = /^([^:\/?#]+:)?(?:\/\/([^:\/?#]*)(?::(\d*))?)?([^?#]*)?(\?[^#]*)?(#.*)?$/;

function parse(href) {
	href = href.trim();
	let m = parser.exec(href);
	let url = {};
	for (let n=keys.length, i=0; i<n; i++) url[keys[i]] = m[i] || '';
	return url;
}

function enhance(url) {
	url.protocol = _.lc(url.protocol);
	url.supportsResolve = /^(http|https|ftp|file):$/i.test(url.protocol);
	if (!url.supportsResolve) return;
	if (url.hostname) url.hostname = _.lc(url.hostname);
	if (!url.host) {
		url.host = url.hostname;
		if (url.port) url.host += ':' + url.port;
	}
	if (!url.origin || url.origin === 'null') url.origin = url.protocol + '//' + url.host;
	if (!url.pathname) url.pathname = '/';
	let pathParts = url.pathname.split('/'); // creates an array of at least 2 strings with the first string empty: ['', ...]
	pathParts.shift(); // leaves an array of at least 1 string [...]
	url.filename = pathParts.pop(); // filename could be ''
	url.basepath = pathParts.length ? '/' + pathParts.join('/') + '/' : '/'; // either '/rel-path-prepended-by-slash/' or '/'
	url.base = url.origin + url.basepath;
	url.nosearch = url.origin + url.pathname;
	url.nohash = url.nosearch + url.search;
	url.href = url.nohash + url.hash;
	url.toString = function() { return url.href; }
};

URL.prototype.resolve = function resolve(relHref) {
	relHref = relHref.trim();
	if (!this.supportsResolve) return relHref;
	let substr1 = relHref.charAt(0), substr2 = relHref.substr(0,2);
	let absHref =
		/^[a-zA-Z0-9-]+:/.test(relHref) ? relHref :
		substr2 == '//' ? this.protocol + relHref :
		substr1 == '/' ? this.origin + relHref :
		substr1 == '?' ? this.nosearch + relHref :
		substr1 == '#' ? this.nohash + relHref :
		substr1 != '.' ? this.base + relHref :
		substr2 == './' ? this.base + relHref.replace('./', '') :
		(function() {
			let myRel = relHref;
			let myDir = this.basepath;
			while (myRel.substr(0,3) == '../') {
				myRel = myRel.replace('../', '');
				myDir = myDir.replace(/[^\/]+\/$/, '');
			}
			return this.origin + myDir + myRel;
		}).call(this);
	return absHref;
}

let urlAttributes = URL.attributes = (function() {
	
function AttributeDescriptor(tagName, attrName, loads, compound) {
	let testEl = document.createElement(tagName);
	let supported = attrName in testEl;
	let lcAttr = _.lc(attrName); // NOTE for longDesc, etc
	_.defaults(this, { // attrDesc
		tagName: tagName,
		attrName: attrName,
		loads: loads,
		compound: compound,
		supported: supported
	});
}

_.defaults(AttributeDescriptor.prototype, {

resolve: function(el, baseURL) {
	let attrName = this.attrName;
	let url = el.getAttribute(attrName);
	if (url == null) return;
	let finalURL = this.resolveURL(url, baseURL)
	if (finalURL !== url) el.setAttribute(attrName, finalURL);
},

resolveURL: function(url, baseURL) {
	let relURL = url.trim();
	let finalURL = relURL;
	switch (relURL.charAt(0)) {
		case '': // empty, but not null. TODO should this be a warning??
			break;
		
		default:
			finalURL = baseURL.resolve(relURL);
			break;
	}
	return finalURL;
}

});

let urlAttributes = {};
_.forEach(_.words('link@<href script@<src img@<longDesc,<src,+srcset iframe@<longDesc,<src object@<data embed@<src video@<poster,<src audio@<src source@<src,+srcset input@formAction,<src button@formAction,<src a@+ping,href area@href q@cite blockquote@cite ins@cite del@cite form@action'), function(text) {
	let m = text.split('@'), tagName = m[0], attrs = m[1];
	let attrList = urlAttributes[tagName] = {};
	_.forEach(attrs.split(','), function(attrName) {
		let downloads = false;
		let compound = false;
		let modifier = attrName.charAt(0);
		switch (modifier) {
		case '<':
			downloads = true;
			attrName = attrName.substr(1);
			break;
		case '+':
			compound = true;
			attrName = attrName.substr(1);
			break;
		}
		attrList[attrName] = new AttributeDescriptor(tagName, attrName, downloads, compound);
	});
});

function resolveSrcset(urlSet, baseURL) {
	let urlList = urlSet.split(/\s*,\s*/); // FIXME this assumes URLs don't contain ','
	_.forEach(urlList, function(urlDesc, i) {
		urlList[i] = urlDesc.replace(/^\s*(\S+)(?=\s|$)/, function(all, url) { return baseURL.resolve(url); });
	});
	return urlList.join(', ');
}

urlAttributes['img']['srcset'].resolveURL = resolveSrcset;
urlAttributes['source']['srcset'].resolveURL = resolveSrcset;

urlAttributes['a']['ping'].resolveURL = function(urlSet, baseURL) {
	let urlList = urlSet.split(/\s+/);
	_.forEach(urlList, function(url, i) {
		urlList[i] = baseURL.resolve(url);
	});
	return urlList.join(' ');
}

return urlAttributes;

})();

export default URL;
