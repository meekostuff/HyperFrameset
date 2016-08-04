
(function() {

var window = this;
var document = window.document;

var Meeko = window.Meeko;
var _ = window._ || Meeko.stuff; // WARN this could potentially use underscore.js / lodash.js but HAS NOT BEEN TESTED!!!

/*
 ### URL utility functions
 */
var URL = Meeko.URL = (function() {

// TODO Ideally Meeko.URL is read-only compatible with DOM4 URL
// NOTE This could use `document.createElement('a').href = url` except DOM is too slow

var URL = function(href, base) {
	if (!(this instanceof URL)) return new URL(href, base);
	var baseURL;
	if (base) baseURL = typeof base === 'string' ? new URL(base) : base;
	init.call(this, href, baseURL);
}

var init = function(href, baseURL) {
	if (baseURL) {
		href = baseURL.resolve(href);
		_.assign(this, new URL(href));
	}
	else {
		var url = parse(href);
		for (var key in url) this[key] = url[key]; // _.assign(this, url);
		enhance(this);
	}
}

var keys = ['source','protocol','hostname','port','pathname','search','hash'];
var parser = /^([^:\/?#]+:)?(?:\/\/([^:\/?#]*)(?::(\d*))?)?([^?#]*)?(\?[^#]*)?(#.*)?$/;

var parse = function(href) {
	href = href.trim();
	var m = parser.exec(href);
	var url = {};
	for (var n=keys.length, i=0; i<n; i++) url[keys[i]] = m[i] || '';
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
	var pathParts = url.pathname.split('/'); // creates an array of at least 2 strings with the first string empty: ['', ...]
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
	var substr1 = relHref.charAt(0), substr2 = relHref.substr(0,2);
	var absHref =
		/^[a-zA-Z0-9-]+:/.test(relHref) ? relHref :
		substr2 == '//' ? this.protocol + relHref :
		substr1 == '/' ? this.origin + relHref :
		substr1 == '?' ? this.nosearch + relHref :
		substr1 == '#' ? this.nohash + relHref :
		substr1 != '.' ? this.base + relHref :
		substr2 == './' ? this.base + relHref.replace('./', '') :
		(function() {
			var myRel = relHref;
			var myDir = this.basepath;
			while (myRel.substr(0,3) == '../') {
				myRel = myRel.replace('../', '');
				myDir = myDir.replace(/[^\/]+\/$/, '');
			}
			return this.origin + myDir + myRel;
		}).call(this);
	return absHref;
}

var urlAttributes = URL.attributes = (function() {
	
var AttributeDescriptor = function(tagName, attrName, loads, compound) {
	var testEl = document.createElement(tagName);
	var supported = attrName in testEl;
	var lcAttr = _.lc(attrName); // NOTE for longDesc, etc
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
	var attrName = this.attrName;
	var url = el.getAttribute(attrName);
	if (url == null) return;
	var finalURL = this.resolveURL(url, baseURL)
	if (finalURL !== url) el.setAttribute(attrName, finalURL);
},

resolveURL: function(url, baseURL) {
	var relURL = url.trim();
	var finalURL = relURL;
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

var urlAttributes = {};
_.forEach(_.words('link@<href script@<src img@<longDesc,<src,+srcset iframe@<longDesc,<src object@<data embed@<src video@<poster,<src audio@<src source@<src,+srcset input@formAction,<src button@formAction,<src a@+ping,href area@href q@cite blockquote@cite ins@cite del@cite form@action'), function(text) {
	var m = text.split('@'), tagName = m[0], attrs = m[1];
	var attrList = urlAttributes[tagName] = {};
	_.forEach(attrs.split(','), function(attrName) {
		var downloads = false;
		var compound = false;
		var modifier = attrName.charAt(0);
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
	var urlList = urlSet.split(/\s*,\s*/); // FIXME this assumes URLs don't contain ','
	_.forEach(urlList, function(urlDesc, i) {
		urlList[i] = urlDesc.replace(/^\s*(\S+)(?=\s|$)/, function(all, url) { return baseURL.resolve(url); });
	});
	return urlList.join(', ');
}

urlAttributes['img']['srcset'].resolveURL = resolveSrcset;
urlAttributes['source']['srcset'].resolveURL = resolveSrcset;

urlAttributes['a']['ping'].resolveURL = function(urlSet, baseURL) {
	var urlList = urlSet.split(/\s+/);
	_.forEach(urlList, function(url, i) {
		urlList[i] = baseURL.resolve(url);
	});
	return urlList.join(' ');
}

return urlAttributes;

})();


return URL;

})();


}).call(this);
