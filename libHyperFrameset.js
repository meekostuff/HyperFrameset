/*!
 * HyperFrameset
 * Copyright 2009-2014 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

/* NOTE
	+ assumes DOMSprockets
*/
/* TODO
    + substantial error handling and notification needs to be added
    + <link rel="self" />
    + Would be nice if more of the internal functions were called as method, eg DOM.ready()...
        this would allow the boot-script to modify them as appropriate
    + Up-front feature testing to prevent boot on unsupportable platorms...
        e.g. can't create HTML documents
    + use requestAnimationFrame() when available
    + The passing of nodes between documents needs to be audited.
		Safari and IE10,11 in particular seem to require nodes to be imported / adopted
		(not fully understood right now)
 */

(function() {

var window = this;
var document = window.document;


if (!window.XMLHttpRequest) throw Error('HyperFrameset requires native XMLHttpRequest');
if (!window.Meeko || !window.Meeko.sprockets) throw Error('HyperFrameset requires DOMSprockets');

var vendorPrefix = 'meeko';

var _ = Meeko.stuff; // provided by DOMSprockets

// TODO these additions to Meeko.stuff should go in DOMSprockets

var without = function(a1, a2) {
	var result = [];
	_.forEach(a1, function(item) {
		if (_.includes(a2, item) || _.includes(result, item)) return;
		result.push(item);
	});
	return result;
}

var difference = function(a1, a2) {
	var result = [].concat(
		_.without(a1, a2),
		_.without(a2, a1)
	);
	return result;
}

_.defaults(_, {
	without: without, difference: difference
});
	

var logger = Meeko.logger; // provided by DOMSprockets or even boot-script

var Task = Meeko.Task;
var Promise = Meeko.Promise;

/*
 ### DOM utility functions
 */

var DOM = Meeko.DOM;

// WARN IE <= 8 would need styleText() to get/set <style> contents
// WARN old non-IE would need scriptText() to get/set <script> contents

var copyAttributes = function(node, srcNode) {
	_.forEach(_.map(srcNode.attributes), function(attr) {
		node.setAttribute(attr.name, attr.value); // WARN needs to be more complex for IE <= 7
	});
	return node;
}

var removeAttributes = function(node) {
	_.forEach(_.map(node.attributes), function(attr) {
		node.removeAttribute(attr.name);
	});
	return node;
}

var CREATE_DOCUMENT_COPIES_URL = (function() {
	var doc = document.implementation.createHTMLDocument('');
	return doc.URL === document.URL;
})();

var CLONE_DOCUMENT_COPIES_URL = (function() {
	try {
		var doc = document.cloneNode(false);
		if (doc.URL === document.URL) return true;
	}
	catch (err) { }
	return false;
})();
		
// NOTE we want create*Document() to have a URL
var CREATE_DOCUMENT_WITH_CLONE = !CREATE_DOCUMENT_COPIES_URL && CLONE_DOCUMENT_COPIES_URL;

var createDocument = function(srcDoc) { // modern browsers. IE >= 9
	if (!srcDoc) srcDoc = document;
	// TODO find doctype element??
	var doc;
	if (CREATE_DOCUMENT_WITH_CLONE) { 
		doc = srcDoc.cloneNode(false);
	}
	else {
		doc = srcDoc.implementation.createHTMLDocument('');
		doc.removeChild(doc.documentElement);
	}
	return doc;
}

var createHTMLDocument = function(title, srcDoc) { // modern browsers. IE >= 9
	if (!srcDoc) srcDoc = document;
	// TODO find doctype element??
	var doc;
	if (CREATE_DOCUMENT_WITH_CLONE) { 
		doc = srcDoc.cloneNode(false);
		docEl = doc.createElement('html');
		docEl.innerHTML = '<head><title>' + title + '</title></head><body></body>';
		doc.appendChild(docEl);
	}
	else {
		doc = srcDoc.implementation.createHTMLDocument('');
	}
	return doc;
}

var cloneDocument = function(srcDoc) {
	var doc = DOM.createDocument(srcDoc);
	var docEl = doc.importNode(srcDoc.documentElement, true);
	doc.appendChild(docEl); // NOTE already adopted

	// WARN sometimes IE9/IE10/IE11 doesn't read the content of inserted <style>
	// NOTE this doesn't seem to matter on IE10+. The following is precautionary
	_.forEach(DOM.findAll('style', doc), function(node) {
		var sheet = node.styleSheet || node.sheet;
		if (!sheet || sheet.cssText == null) return;
		if (sheet.cssText != '') return;
		node.textContent = node.textContent;
	});
	
	return doc;
}

var scrollToId = function(id) { // FIXME this isn't being used
	if (id) {
		var el = DOM.findId(id);
		if (el) el.scrollIntoView(true);
	}
	else window.scroll(0, 0);
}

var readyStateLookup = { // used in domReady() and checkStyleSheets()
	'uninitialized': false,
	'loading': false,
	'interactive': false,
	'loaded': true,
	'complete': true
}

var domReady = (function() { // WARN this assumes that document.readyState is valid or that content is ready...

var readyState = document.readyState;
var loaded = readyState ? readyStateLookup[readyState] : true;
var queue = [];

function domReady(fn) {
	if (typeof fn !== 'function') return;
	queue.push(fn);
	if (loaded) processQueue();
}

function processQueue() {
	_.forEach(queue, function(fn) { setTimeout(fn); });
	queue.length = 0;
}

var events = {
	'DOMContentLoaded': document,
	'load': window
};

if (!loaded) _.forOwn(events, function(node, type) { node.addEventListener(type, onLoaded, false); });

return domReady;

// NOTE the following functions are hoisted
function onLoaded(e) {
	loaded = true;
	_.forOwn(events, function(node, type) { node.removeEventListener(type, onLoaded, false); });
	processQueue();
}

})();

/* 
NOTE:  for more details on how checkStyleSheets() works cross-browser see 
http://aaronheckmann.blogspot.com/2010/01/writing-jquery-plugin-manager-part-1.html
TODO: does this still work when there are errors loading stylesheets??
*/
// TODO would be nice if this didn't need to be polled
// TODO should be able to use <link>.onload, see
// http://stackoverflow.com/a/13610128/108354
// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link
var checkStyleSheets = function() { 
	// check that every <link rel="stylesheet" type="text/css" /> 
	// has loaded
	return _.every(DOM.findAll('link'), function(node) {
		if (!node.rel || !/^stylesheet$/i.test(node.rel)) return true;
		if (node.type && !/^text\/css$/i.test(node.type)) return true;
		if (node.disabled) return true;
		
		// handle IE
		if (node.readyState) return readyStateLookup[node.readyState];

		var sheet = node.sheet || node.styleSheet;

		// handle webkit
		if (!sheet) return false;

		try {
			// Firefox should throw if not loaded or cross-domain
			var rules = sheet.rules || sheet.cssRules;
			return true;
		} 
		catch (error) {
			// handle Firefox cross-domain
			switch(error.name) {
			case 'NS_ERROR_DOM_SECURITY_ERR': case 'SecurityError':
				return true;
			case 'NS_ERROR_DOM_INVALID_ACCESS_ERR': case 'InvalidAccessError':
				return false;
			default:
				return true;
			}
		} 
	});
}

_.defaults(DOM, {
	copyAttributes: copyAttributes, removeAttributes: removeAttributes, // attrs
	ready: domReady, checkStyleSheets: checkStyleSheets, // events
	createDocument: createDocument, createHTMLDocument: createHTMLDocument, cloneDocument: cloneDocument, // documents
	scrollToId: scrollToId
});

/* parseHTML are AJAX utilities */
var parseHTML = function(html, details) {
	var parser = new HTMLParser();
	return parser.parse(html, details);
}

/* A few feature-detect constants for HTML loading & parsing */

/*
	HTML_IN_XHR indicates if XMLHttpRequest supports HTML parsing
*/
var HTML_IN_XHR = (function() { // FIXME more testing, especially Webkit
	if (!window.XMLHttpRequest) return false;
	var xhr = new XMLHttpRequest;
	if (!('responseType' in xhr)) return false;
	if (!('response' in xhr)) return false;
	xhr.open('get', document.URL, true);

	try { xhr.responseType = 'document'; } // not sure if any browser throws for this, but they should
	catch (err) { return false; }

	try { if (xhr.responseText == '') return false; } // Opera-12. Other browsers will throw
	catch(err) { }

	try { if (xhr.status) return false; } // this should be 0 but throws on Chrome and Safari-5.1
	catch(err) { // Chrome and Safari-5.1
		xhr.abort(); 
		try { xhr.responseType = 'document'; } // throws on Safari-5.1 which doesn't support HTML requests 
		catch(err2) { return false; }
	}

	return true;
})();

/*
	HTML_IN_DOMPARSER indicates if DOMParser supports 'text/html' parsing. Historically only Firefox did.
	Cross-browser support coming? https://developer.mozilla.org/en-US/docs/Web/API/DOMParser#Browser_compatibility
*/
var HTML_IN_DOMPARSER = (function() {

	try {
		var doc = (new DOMParser).parseFromString('', 'text/html');
		return !!doc;
	}
	catch(err) { return false; }

})();

_.defaults(DOM, {
	parseHTML: parseHTML,
	HTML_IN_XHR: HTML_IN_XHR, HTML_IN_DOMPARSER: HTML_IN_DOMPARSER
});

var CustomNS = Meeko.CustomNS = (function() {

function CustomNS(options) {
	if (!(this instanceof CustomNS)) return new CustomNS(options);
	var style = options.style = _.lc(options.style);
	var styleInfo = _.find(CustomNS.namespaceStyles, function(styleInfo) {
		return styleInfo.style === style;
	});
	if (!styleInfo) throw Error('Unexpected namespace style: ' + style);
	var name = options.name = _.lc(options.name);
	if (!name) throw Error('Unexpected name: ' + name);
	
	var nsDef = this;
	_.assign(nsDef, options);
	var separator = styleInfo.separator;
	nsDef.prefix = nsDef.name + separator;
	nsDef.selectorPrefix = nsDef.name + (separator === ':' ? '\\:' : separator);
}

_.defaults(CustomNS.prototype, {

lookupTagName: function(name) { return this.prefix + name; },
lookupSelector: function(name) { return this.selectorPrefix + name; }

});

CustomNS.namespaceStyles = [
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

_.forOwn(CustomNS.namespaceStyles, function(styleInfo) {
	styleInfo.configPrefix = styleInfo.configNamespace + styleInfo.separator;
});

CustomNS.getNamespaces = function(doc) { // NOTE modelled on IE8, IE9 document.namespaces interface
	var namespaces = [];
	_.forEach(_.map(doc.documentElement.attributes), function(attr) {
		var fullName = _.lc(attr.name);
		var styleInfo = _.find(CustomNS.namespaceStyles, function(styleInfo) {
			return (fullName.indexOf(styleInfo.configPrefix) === 0);
		});
		if (!styleInfo) return;
		var name = fullName.substr(styleInfo.configPrefix.length);
		var nsDef = new CustomNS({
			urn: attr.value,
			name: name,
			style: styleInfo.style
		});
		namespaces.push(nsDef);
	});
	return namespaces;
}

return CustomNS;

})();


var URL = Meeko.URL = (function() {

// TODO is this URL class compatible with the proposed DOM4 URL class??

var URL = function(str) {
	if (!(this instanceof URL)) return new URL(str);
	this.parse(str);
}

var keys = ['source','protocol','hostname','port','pathname','search','hash'];
var parser = /^([^:\/?#]+:)?(?:\/\/([^:\/?#]*)(?::(\d*))?)?([^?#]*)?(\?[^#]*)?(#.*)?$/;

URL.prototype.parse = function parse(str) {
	str = str.trim();
	var	m = parser.exec(str);

	for (var n=keys.length, i=0; i<n; i++) this[keys[i]] = m[i] || '';
	this.protocol = _.lc(this.protocol);
	this.supportsResolve = /^(http|https|ftp|file):$/i.test(this.protocol);
	if (!this.supportsResolve) return;
	this.hostname = _.lc(this.hostname);
	this.host = this.hostname;
	if (this.port) this.host += ':' + this.port;
	this.origin = this.protocol + '//' + this.host;
	if (this.pathname == '') this.pathname = '/';
	var pathParts = this.pathname.split('/'); // creates an array of at least 2 strings with the first string empty: ['', ...]
	pathParts.shift(); // leaves an array of at least 1 string [...]
	this.filename = pathParts.pop(); // filename could be ''
	this.basepath = pathParts.length ? '/' + pathParts.join('/') + '/' : '/'; // either '/rel-path-prepended-by-slash/' or '/'
	this.base = this.origin + this.basepath;
	this.nosearch = this.origin + this.pathname;
	this.nohash = this.nosearch + this.search;
	this.href = this.nohash + this.hash;
	this.toString = function() { return this.href; }
};

URL.prototype.resolve = function resolve(relURL) {
	relURL = relURL.trim();
	if (!this.supportsResolve) return relURL;
	var substr1 = relURL.charAt(0), substr2 = relURL.substr(0,2);
	var absURL =
		/^[a-zA-Z0-9-]+:/.test(relURL) ? relURL :
		substr2 == '//' ? this.protocol + relURL :
		substr1 == '/' ? this.origin + relURL :
		substr1 == '?' ? this.nosearch + relURL :
		substr1 == '#' ? this.nohash + relURL :
		substr1 != '.' ? this.base + relURL :
		substr2 == './' ? this.base + relURL.replace('./', '') :
		(function() {
			var myRel = relURL;
			var myDir = this.basepath;
			while (myRel.substr(0,3) == '../') {
				myRel = myRel.replace('../', '');
				myDir = myDir.replace(/[^\/]+\/$/, '');
			}
			return this.origin + myDir + myRel;
		}).call(this);
	return absURL;
}


return URL;

})();

var httpProxy = Meeko.httpProxy = (function() {

var methods = _.words('get'); // TODO words('get post put delete');
var responseTypes = _.words('document'); // TODO words('document json text');
var defaultInfo = {
	method: 'get',
	responseType: 'document'
}

// NOTE cache, etc is currently used only for landing page
// FIXME cacheLookup doesn't indicate if a resource is currently being fetched
// TODO an API like ServiceWorker may be more appropriate
var cache = [];

function cacheAdd(request, response) {
	var rq = _.defaults({}, request);
	var resp = _.defaults({}, response);
	resp.document = DOM.cloneDocument(response.document); // TODO handle other response types
	cache.push({
		request: rq,
		response: resp
	});
}

function cacheLookup(request) {
	var response;
	_.some(cache, function(entry) {
		if (!cacheMatch(request, entry)) return false;
		response = entry.response;
		return true;
	});
	if (!response) return;
	var resp = _.defaults({}, response);
	resp.document = DOM.cloneDocument(response.document); // TODO handle other response types
	return resp;
}

function cacheMatch(request, entry) {
	if (request.url !== entry.request.url) return false;
	// FIXME what testing is appropriate?? `method`, other headers??
	return true;
}

var httpProxy = {

add: function(response) { // NOTE this is only for the landing page
	var url = response.url;
	if (!url) throw Error('Invalid url in response object');
	if (!_.includes(responseTypes, response.type)) throw Error('Invalid type in response object');
	var request = {
		url: response.url
	}
	_.defaults(request, defaultInfo);
	return Promise.pipe(undefined, [

	function() {
		return normalize(response.document, request);
	},
	function(doc) {
		response.document = doc;
		cacheAdd(request, response);
	}

	]);
},

load: function(url, requestInfo) {
	var info = {
		url: url
	};
	if (requestInfo) _.defaults(info, requestInfo);
	_.defaults(info, defaultInfo);
	if (!_.includes(methods, info.method)) throw Error('method not supported: ' + info.method);
	if (!_.includes(responseTypes, info.responseType)) throw Error('responseType not supported: ' + info.responseType);
	return request(info);
}

}

var request = function(info) {
	var sendText = null;
	var method = _.lc(info.method);
	switch (method) {
	case 'post':
		throw Error('POST not supported'); // FIXME proper error handling
		info.body = serialize(info.body, info.type);
		return doRequest(info);
		break;
	case 'get':
		var response = cacheLookup(info);
		if (response) return Promise.resolve(response);
		return doRequest(info)
			.then(function(response) {
				cacheAdd(info, response);
				return response;
			});
		break;
	default:
		throw Error(_.uc(method) + ' not supported');
		break;
	}
}

var doRequest = function(info) {
return new Promise(function(resolve, reject) {
	var method = info.method;
	var url = info.url;
	var sendText = info.body; // FIXME not-implemented
	var xhr = new XMLHttpRequest;
	xhr.onreadystatechange = onchange;
	xhr.open(method, url, true);
	if (HTML_IN_XHR) xhr.responseType = info.responseType;
	xhr.send(sendText);
	function onchange() {
		if (xhr.readyState != 4) return;
		if (xhr.status != 200) { // FIXME what about other status codes?
			reject(function() { throw Error('Unexpected status ' + xhr.status + ' for ' + url); });
			return;
		}
		Promise.defer(onload); // Use delay to stop the readystatechange event interrupting other event handlers (on IE). 
	}
	function onload() {
		var result = handleResponse(xhr, info);
		resolve(result);
	}
});
}

function handleResponse(xhr, info) { // TODO handle info.responseType
	var response = {
		url: info.url,
		type: info.responseType,
		status: xhr.status,
		statusText: xhr.statusText
	};
	if (HTML_IN_XHR) {
		return normalize(xhr.response, info)
		.then(function(doc) {
			response.document = doc;
			return response;
		});
	}
	else {
		return DOM.parseHTML(new String(xhr.responseText), info)
		.then(function(doc) {
				response.document = doc;
				return response;
		});
	}
}

return httpProxy;

})();


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

/*
	resolveAll() resolves all URL attributes
*/
var resolveAll = function(doc, baseURL) {

	return Promise.pipe(null, [

	function () {
		var selector = Object.keys(urlAttributes).join(', ');
		return DOM.findAll(selector, doc);
	},

	function(nodeList) {
		return Promise.reduce(null, nodeList, function(dummy, el) {
			var tag = DOM.getTagName(el);
			var attrList = urlAttributes[tag];
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



/*
	normalize() is called between html-parsing (internal) and document normalising (external function).
	It is called after using the native parser:
	- with DOMParser#parseFromString(), see HTMLParser#nativeParser()
	- with XMLHttpRequest & xhr.responseType='document', see httpProxy's request()
	The innerHTMLParser also uses this call
*/
function normalize(doc, details) { 

	var baseURL = URL(details.url);

	_.forEach(DOM.findAll('style', doc.body), function(node) { // TODO support <style scoped>
		doc.head.appendChild(node); // NOTE no adoption
	});
	
	_.forEach(DOM.findAll('style', doc.head), function(node) {
		// TODO the following rewrites url() property values but isn't robust
		var text = node.textContent;
		var replacements = 0;
		text = text.replace(/\burl\(\s*(['"]?)([^\r\n]*)\1\s*\)/ig, function(match, quote, url) {
				absURL = baseURL.resolve(url);
				if (absURL === url) return match;
				replacements++;
				return "url(" + quote + absURL + quote + ")";
			});
		if (replacements) node.textContent = text;
	});

	return resolveAll(doc, baseURL, false);
}

var HTMLParser = Meeko.HTMLParser = (function() {

var HTMLParser = function() { // TODO should this receive options
	if (this instanceof HTMLParser) return;
	return new HTMLParser();
}

function nativeParser(html, details) {

	return Promise.pipe(null, [
		
	function() {
		var doc = (new DOMParser).parseFromString(html, 'text/html');
		return normalize(doc, details);
	}
	
	]);

}

function innerHTMLParser(html, details) {
	return Promise.pipe(null, [
		
	function() {
		var doc = DOM.createHTMLDocument('');
		var docElement = doc.documentElement;
		docElement.innerHTML = html;
		var m = html.match(/<html(?=\s|>)(?:[^>]*)>/i); // WARN this assumes there are no comments containing '<html' and no attributes containing '>'.
		var div = document.createElement('div');
		div.innerHTML = m[0].replace(/^<html/i, '<div');
		var htmlElement = div.firstChild;
		DOM.copyAttributes(docElement, htmlElement);
		return doc;
	},
	
	function(doc) {
		return normalize(doc, details);
	}
	
	]);
}


_.defaults(HTMLParser.prototype, {
	parse: HTML_IN_DOMPARSER ? nativeParser : innerHTMLParser
});

return HTMLParser;

})();


var scriptQueue = new function() {

/*
 WARN: This description comment was from the former scriptQueue implementation.
 It is still a correct description of behavior,
 but doesn't give a great insight into the current Promises-based implementation.
 
 We want <script>s to execute in document order (unless @async present)
 but also want <script src>s to download in parallel.
 The script queue inserts scripts until it is paused on a blocking script.
 The onload (or equivalent) or onerror handlers of the blocking script restart the queue.
 Inline <script> and <script src="..." async> are never blocking.
 Sync <script src> are blocking, but if `script.async=false` is supported by the browser
 then only the last <script src> (in a series of sync scripts) needs to pause the queue. See
	http://wiki.whatwg.org/wiki/Dynamic_Script_Execution_Order#My_Solution
 Script preloading is always initiated, even if the browser doesn't support it. See
	http://wiki.whatwg.org/wiki/Dynamic_Script_Execution_Order#readyState_.22preloading.22
	
 FIXME scriptQueue.push should also accept functions
*/
var queue = [],
	emptying = false;

var testScript = document.createElement('script'),
	supportsSync = (testScript.async === true);

this.push = function(node) {
return new Promise(function(resolve, reject) {
	if (emptying) throw Error('Attempt to append script to scriptQueue while emptying');
	
	// TODO assert node is in document

	// TODO this filtering may need reworking now we don't support older browsers
	if (!node.type || /^text\/javascript$/i.test(node.type)) {
		logger.info('Attempt to queue already executed script ' + node.src);
		resolve(); // TODO should this be reject() ??
		return;
	}

	if (!/^text\/javascript\?disabled$/i.test(node.type)) {
		logger.info('Unsupported script-type ' + node.type);
		resolve(); // TODO should this be reject() ??
		return;
	}

	var script = document.createElement('script');

	if (node.src) addListeners(); // WARN must use `node.src` because attrs not copied to `script` yet
	
	DOM.copyAttributes(script, node); 
	script.text = node.text;

	if (script.getAttribute('defer')) { // @defer is not appropriate. Implement as @async
		script.removeAttribute('defer');
		script.setAttribute('async', '');
		logger.warn('@defer not supported on scripts');
	}
	if (supportsSync && script.src && !script.hasAttribute('async')) script.async = false;
	script.type = 'text/javascript';
	
	// enabledFu resolves after script is inserted
	var enabledFu = Promise.applyTo(); 
	
	var prev = queue[queue.length - 1], prevScript = prev && prev.script;

	var triggerFu; // triggerFu allows this script to be enabled, i.e. inserted
	if (prev) {
		if (prevScript.hasAttribute('async') || script.src && supportsSync && !script.hasAttribute('async')) triggerFu = prev.enabled;
		else triggerFu = prev.complete; 
	}
	else triggerFu = Promise.resolve();
	
	triggerFu.then(enable, enable);

	var completeFu = Promise.applyTo();
	completeFu.then(resolve, reject);

	var current = { script: script, complete: completeFu, enabled: enabledFu };
	queue.push(current);
	return;

	// The following are hoisted
	function enable() {
		DOM.insertNode('replace', node, script);
		enabledFu.resolve(); 
		if (!script.src) {
			spliceItem(queue, current);
			completeFu.resolve();
		}
	}
	
	function onLoad(e) {
		removeListeners();
		spliceItem(queue, current);
		completeFu.resolve();
	}

	function onError(e) {
		removeListeners();
		spliceItem(queue, current);
		completeFu.reject(function() { throw Error('Script loading failed'); }); // FIXME throw NetworkError()
	}

	function addListeners() {
		script.addEventListener('load', onLoad, false);
		script.addEventListener('error', onError, false);
	}
	
	function removeListeners() {
		script.removeEventListener('load', onLoad, false);
		script.removeEventListener('error', onError, false);
	}
	
	function spliceItem(a, item) {
		for (var n=a.length, i=0; i<n; i++) {
			if (a[i] !== item) continue;
			a.splice(i, 1);
			return;
		}
	}

});
}

this.empty = function() {
return new Promise(function(resolve, reject) {
	
	emptying = true;
	if (queue.length <= 0) {
		emptying = false;
		resolve();
		return;
	}
	_.forEach(queue, function(value, i) {
		var acceptCallback = function() {
			if (queue.length <= 0) {
				emptying = false;
				resolve();
			}
		}
		value.complete.then(acceptCallback, acceptCallback);
	});

});
}

} // end scriptQueue


// wrapper for `history` mostly to provide locking around state-updates and throttling of popstate events
var historyManager = (function() {

var historyManager = {};

var stateTag = 'HyperFrameset';
var currentState;
var popStateHandler;
var started = false;

_.defaults(historyManager, {

getState: function() {
	return currentState;
},

start: function(data, title, url, onNewState, onPopState) { // FIXME this should call onPopState if history.state is defined
return scheduler.now(function() {
	if (started) throw Error('historyManager has already started');
	started = true;
	popStateHandler = onPopState;
	var newState = State.create(data, title, url);
	if (history.replaceState) {
		history.replaceState(newState.settings, title, url);
	}
	currentState = newState;
	return onNewState(newState);
});
},

newState: function(data, title, url, useReplace, callback) {
return scheduler.now(function() {
	var newState = State.create(data, title, url);
	if (history.replaceState) {
		if (useReplace) history.replaceState(newState.settings, title, url);
		else history.pushState(newState.settings, title, url);
	}
	currentState = newState;
	if (callback) return callback(newState);
});
},

replaceState: function(data, title, url, callback) {
	return this.newState(data, title, url, true, callback);
},

pushState: function(data, title, url, callback) {
	return this.newState(data, title, url, false, callback);
}

});

if (history.replaceState) window.addEventListener('popstate', function(e) {
		if (e.stopImmediatePropagation) e.stopImmediatePropagation();
		else e.stopPropagation();
		
		var newSettings = e.state;
		if (!newSettings[stateTag]) {
			logger.warn('Ignoring invalid PopStateEvent');
			return;
		}
		scheduler.reset(function() {
			currentState = new State(newSettings);
			if (!popStateHandler) return;
			return popStateHandler(currentState);
		});
	}, true);

function State(settings) {
	if (!settings[stateTag]) throw Error('Invalid settings for new State');
	this.settings = settings;
}

State.create = function(data, title, url) {
	var timeStamp = +(new Date);
	var settings = {
		title: title,
		url: url,
		timeStamp: timeStamp,
		data: data
	};
	settings[stateTag] = true;
	return new State(settings);
}

_.defaults(State.prototype, {

getData: function() {
	return this.settings.data;
},

update: function(data, callback) { // FIXME not being used. Can it be reomved?
	var state = this;
	return Promise.resolve(function() {
		if (state !== currentState) throw Error('Cannot update state: not current');
		return scheduler.now(function() {
			if (history.replaceState) history.replaceState(state.settings, title, url);
			return callback(state);
		});
	});
}

});

return historyManager;

})();


var scheduler = (function() { // NOTE only used in historyManager

var queue = [];
var maxSize = 1;
var processing = false;

function bump() {
	if (processing) return;
	processing = true;
	process();
}

function process() {
	if (queue.length <= 0) {
		processing = false;
		return;
	}
	var task = queue.shift();
	var promise = Promise.defer(task.fn);
	promise.then(process, process);
	promise.then(task.resolve, task.reject);
}

var scheduler = {
	
now: function(fn, fail) {
	return this.whenever(fn, fail, 0);
},

reset: function(fn) {
	queue.length = 0;
	return this.whenever(fn, null, 1);
},

whenever: function(fn, fail, max) {
return new Promise(function(resolve, reject) {

	if (max == null) max = maxSize;
	if (queue.length > max || (queue.length === max && processing)) {
		if (fail) Promise.defer(fail).then(resolve, reject);
		else reject(function() { throw Error('No `fail` callback passed to whenever()'); });
		return;
	}
	queue.push({ fn: fn, resolve: resolve, reject: reject });

	bump();
});
}

}

return scheduler;

})();


/* BEGIN HFrameset code */

var sprockets = Meeko.sprockets;
var controllers = Meeko.controllers;

var framer = Meeko.framer = (function() {

var FRAMESET_REL = 'frameset'; // NOTE http://lists.w3.org/Archives/Public/www-html/1996Dec/0143.html
var SELF_REL = 'self';

var HYPERFRAMESET_URN = 'hyperframeset';
var hfDefaultNamespace = {
	name: 'hf',
	style: 'vendor',
	urn: HYPERFRAMESET_URN
}


function registerFormElements() {

var eventConfig = 'form@submit,reset,input,change,invalid input,textarea@input,change,invalid,focus,blur select,fieldset@change,invalid,focus,blur button@click';

var eventTable = (function(config) {

var table = {};
_.forEach(config.split(/\s+/), function(combo) {
	var m = combo.split('@');
	var tags = m[0].split(',');
	var events = m[1].split(',');
	_.forEach(tags, function(tag) {
		table[tag] = _.map(events);
	});
});

return table;

})(eventConfig);


_.forOwn(eventTable, function(events, tag) {

var Interface = sprockets.evolve(sprockets.RoleType, {});
_.assign(Interface, {

attached: function(handlers) {
	var object = this;
	var element = object.element;
	if (!element.hasAttribute('configid')) return;
	var configID = _.words(element.getAttribute('configid'))[0];	
	var options = framer.definition.configData[configID];
	if (!options) return;
	_.forEach(events, function(type) {
		var ontype = 'on' + type;
		var callback = options[ontype];
		if (!callback) return;

		var fn = function() { callback.apply(object, arguments); };
		object[ontype] = fn;
		handlers.push({
			type: type,
			action: fn
		});
	});
}

});

sprockets.registerElement(tag, Interface);

});

} // END registerFormElements()

/*
 * HyperFrameset definitions
 */

var hfHeadTags = _.words('title meta link style script');

var HFrameDefinition = (function() {

function HFrameDefinition(el, frameset) {
	if (!el) return; // in case of inheritance
	this.frameset = frameset;
	this.init(el);
}

_.defaults(HFrameDefinition.prototype, {

init: function(el) {
    var frameDef = this;
	var frameset = frameDef.frameset;
	var hfNS = frameset.namespace;
	_.defaults(frameDef, {
		element: el,
		id: el.id,
		type: el.getAttribute('type'),
		mainSelector: el.getAttribute('main') // TODO consider using a hash in `@src`
    });
	var bodies = frameDef.bodies = [];
	_.forEach(_.map(el.childNodes), function(node) {
		var tag = DOM.getTagName(node);
		if (!tag) return;
		if (_.includes(hfHeadTags, tag)) return; // ignore typical <head> elements
		if (tag === hfNS.lookupTagName('body')) {
			el.removeChild(node);
			bodies.push(new HBodyDefinition(node, frameset));
			return;
		}
		logger.warn('Unexpected element in HFrame: ' + tag);
		return;
	});

	// FIXME create fallback bodies
},

render: function(resource, condition, details) {
var frameDef = this;
	var frameset = frameDef.frameset;
	var hfNS = frameset.namespace;
	if (!details) details = {};
	_.defaults(details, { // TODO more details??
		scope: framer.scope,
		url: resource && resource.url,
		mainSelector: frameDef.mainSelector,
		type: frameDef.type
	});
	var bodyDef = _.find(frameDef.bodies, function(body) { return body.condition === condition;});
	if (!bodyDef) return; // FIXME what to do here??
	return bodyDef.render(resource, details);
}

	
});

return HFrameDefinition;
})();


var HBodyDefinition = (function() {
	
function HBodyDefinition(el, frameset) {
	if (!el) return; // in case of inheritance
	this.frameset = frameset;
	this.init(el);
}

var conditions = _.words('uninitialized loading loaded error');

var conditionAliases = {
	'blank': 'uninitialized',
	'waiting': 'loading',
	'interactive': 'loaded',
	'complete': 'loaded'
}

function normalizeCondition(condition) {
	condition = _.lc(condition);
	if (_.includes(conditions, condition)) return condition;
	return conditionAliases[condition];
}

_.defaults(HBodyDefinition, {
	
conditions: conditions,
conditionAliases: conditionAliases

});

_.defaults(HBodyDefinition.prototype, {

init: function(el) {
	var bodyDef = this;
	var frameset = bodyDef.frameset;
	var hfNS = frameset.namespace;
	var condition = el.getAttribute('condition');
	var finalCondition;
	if (condition) {
		finalCondition = normalizeCondition(condition);
		if (!finalCondition) {
			finalCondition = condition;
			logger.warn('Frame body defined with unknown condition: ' + condition);
		}
	}
	else finalCondition = 'loaded';
		
	_.defaults(bodyDef, {
		element: el,
		condition: finalCondition,
		transforms: []
	});
	_.forEach(_.map(el.childNodes), function(node) {
		if (DOM.getTagName(node) === hfNS.lookupTagName('transform')) {
			el.removeChild(node);
			bodyDef.transforms.push(new HTransformDefinition(node, frameset));
		}	
	});
	if (!bodyDef.transforms.length && bodyDef.condition === 'loaded') {
		logger.warn('HBody definition for loaded content contains no HTransform definitions');
	}
},

render: function(resource, details) {
	var bodyDef = this;
	var frameset = bodyDef.frameset;
	var hfNS = frameset.namespace;
	if (bodyDef.transforms.length <= 0) {
		return bodyDef.element.cloneNode(true);
	}
	if (!resource) return null;
	var doc = resource.document; // FIXME what if resource is a Request?
	if (!doc) return null;
	var frag0 = doc;
	if (details.mainSelector) frag0 = DOM.find(details.mainSelector, doc);

	return Promise.reduce(frag0, bodyDef.transforms, function(fragment, transform) {
		return transform.process(fragment, details);
	})
	.then(function(fragment) {
		var el = bodyDef.element.cloneNode(false);
		DOM.insertNode('beforeend', el, fragment);
		return el;
	});
}

});

return HBodyDefinition;
})();


var HTransformDefinition = (function() {
	
function HTransformDefinition(el, frameset) {
	if (!el) return; // in case of inheritance
	this.frameset = frameset;
	this.init(el);
}

_.defaults(HTransformDefinition.prototype, {

init: function(el) {
	var transform = this;
	var frameset = transform.frameset;
	var hfNS = frameset.namespace;
	_.defaults(transform, {
		element: el,
		type: el.getAttribute('type') || 'main',
		format: el.getAttribute('format')
    });
	if (transform.type === 'main') transform.format = '';
	var doc = frameset.document; // or el.ownerDocument
	var frag = doc.createDocumentFragment();
	var node;
	while (node = el.firstChild) frag.appendChild(node); // NOTE no adoption

	var options;
	if (el.hasAttribute('configid')) {
		var configID = _.words(el.getAttribute('configid'))[0];
		options = frameset.configData[configID];
	}
	var processor = transform.processor = framer.createProcessor(transform.type, options);
	processor.loadTemplate(frag);
},

process: function(srcNode, details) {
	var transform = this;
	var frameset = transform.frameset;
	var hfNS = frameset.namespace;
	var decoder;
	if (transform.format) {
		decoder = framer.createDecoder(transform.format);
		decoder.init(srcNode);
	}
	else decoder = {
		srcNode: srcNode
	}
	var processor = transform.processor;
	var output = processor.transform(decoder, details);
	return output;
}

});

return HTransformDefinition;
})();


var HFramesetDefinition = (function() {

function HFramesetDefinition(doc, settings) {
	if (!doc) return; // in case of inheritance
	this.defaultNamespaces = [];
	this.addDefaultNamespace(hfDefaultNamespace);
	this.namespaces = null;
	this.init(doc, settings);
}

_.defaults(HFramesetDefinition.prototype, {

init: function(doc, settings) {
	var frameset = this;
	_.defaults(frameset, {
		url: settings.framesetURL
	});

	frameset.namespaces = [];
	var namespaces = CustomNS.getNamespaces(doc);
	_.forEach(namespaces, function(nsDef) {
		frameset.addNamespace(nsDef);
	});
	_.forEach(frameset.defaultNamespaces, function(nsDef) {
		frameset.addNamespace(nsDef);
	});
	var hfNS = frameset.namespace = frameset.lookupNamespace(HYPERFRAMESET_URN);

	// NOTE first rebase scope: urls
	var scopeURL = URL(settings.scope);
	rebase(doc, scopeURL);
	var frameElts = DOM.findAll(frameset.lookupSelector('frame'), doc.body);
	_.forEach(frameElts, function(el, index) { // FIXME hyperframes can't be outside of <body> OR descendants of repetition blocks
		// NOTE first rebase @src with scope: urls
		var src = el.getAttribute('src');
		if (src) {
			var newSrc = rebaseURL(src, scopeURL);
			if (newSrc != src) el.setAttribute('src', newSrc);
		}
	});

	// Add @id and @sourceurl to inline <script type="text/javascript">
	var scripts = DOM.findAll('script', doc);
	_.forEach(scripts, function(script, i) {
		// ignore non-javascript scripts
		if (script.type && !/^text\/javascript/.test(script.type)) return;
		// ignore external scripts
		if (script.hasAttribute('src')) return;
		var id = script.id;
		// TODO generating ID always has a chance of duplicating IDs
		if (!id) id = script.id = 'script[' + i + ']';
		if (script.hasAttribute('sourceurl')) return;
		var sourceURL = frameset.url + '#' + id;
		script.setAttribute('sourceurl', sourceURL);
	});

	
	var firstChild = doc.body.firstChild;
	_.forEach(DOM.findAll('script[for]', doc.head), function(script) {
		doc.body.insertBefore(script, firstChild);
		script.setAttribute('for', '');
		logger.info('Moved <script for> in frameset <head> to <body>');
	});

	var body = doc.body;
	body.parentNode.removeChild(body);
	frameset.document = doc;
	frameset.element = body;
},

preprocess: function() {
	var frameset = this;
	var hfNS = frameset.namespace;
	var body = frameset.element;
	_.defaults(frameset, {
		configData: {}, // Indexed by @sourceURL
		frames: {} // all hyperframe definitions. Indexed by @id (which may be auto-generated)
	});

	var scripts = DOM.findAll('script', body);
	_.forEach(scripts, function(script, i) {
		// Ignore non-javascript scripts
		if (script.type && !/^text\/javascript/.test(script.type)) return;

		var sourceURL = script.getAttribute('sourceurl'); // assuming @sourceurl preset

		if (script.hasAttribute('src')) { // external javascript in <body> is invalid
			logger.warn('Frameset <body> may not contain external scripts: \n' +
				script.cloneNode(false).outerHTML);
			script.parentNode.removeChild(script);
			return;
		}

		if (!script.hasAttribute('for')) {
			var fnText = script.text;
			fnText += '\n//# sourceURL=' + sourceURL;

			try {
				var fn = Function(fnText);
			}
			catch(err) { 
				logger.warn('Error evaluating inline script in frameset:\n' +
					frameset.url + '#' + script.id);
				Task.postError(err);
			}
			script.parentNode.removeChild(script); // physical <script> no longer needed
			return;
		}

		if (script.getAttribute('for') !== '') {
			logger.warn('<script> may only contain EMPTY @for: \n' +
				script.cloneNode(false).outerHTML);
			script.parentNode.removeChild(script);
			return;
		}

		var scriptFor = script;
		while (scriptFor = scriptFor.previousSibling) {
			if (scriptFor.nodeType !== 1) continue;
			var tag = DOM.getTagName(scriptFor);
			if (tag !== 'script' && tag !== 'style') break;
		}
		if (!scriptFor) scriptFor = script.parentNode;
		
		// FIXME @configID shouldn't be hard-wired here
		var configID = scriptFor.hasAttribute('configID') ? 
			scriptFor.getAttribute('configID') :
			'';
		// TODO we can add more than one configID to an element but only first is used
		configID = configID ?
			configID.replace(/\s*$/, ' ' + sourceURL) :
			sourceURL;
		scriptFor.setAttribute('configID', configID);

		var fnText = 'return (' + script.text + ');';

		fnText += '\n//# sourceURL=' + sourceURL;

		try {
			var fn = Function(fnText);
			var object = fn();
			frameset.configData[sourceURL] = object;
		}
		catch(err) { 
			logger.warn('Error evaluating inline script in frameset:\n' +
				frameset.url + '#' + script.id);
			Task.postError(err);
		}

		script.parentNode.removeChild(script); // physical <script> no longer needed
	});


	var frameElts = DOM.findAll(frameset.lookupSelector('frame'), body);
	var frameDefElts = [];
	var frameRefElts = [];
	_.forEach(frameElts, function(el, index) { // FIXME hyperframes can't be outside of <body> OR descendants of repetition blocks

		// NOTE even if the frame is only a declaration (@def && @def !== @id) it still has its content removed
		var placeholder = el.cloneNode(false);
		el.parentNode.replaceChild(placeholder, el); // NOTE no adoption

		var id = el.getAttribute('id');
		var defId = el.getAttribute('def');
		if (defId && defId !== id) {
			frameRefElts.push(el);
			return;
		}
		if (!id) {
			id = '__frame_' + index + '__'; // FIXME not guaranteed to be unique. Should be a function at top of module
			el.setAttribute('id', id);
		}
		if (!defId) {
			defId = id;
			placeholder.setAttribute('def', defId);
		}
		frameDefElts.push(el);
	});
	_.forEach(frameDefElts, function(el) {
		var id = el.getAttribute('id');
		frameset.frames[id] = new HFrameDefinition(el, frameset);
	});
	_.forEach(frameRefElts, function(el) {
		var defId = el.getAttribute('def');
		if (!frameset.frames[defId]) {
			logger.warn('HyperFrame references non-existant frame #' + defId);
		}
	});

},

render: function() {
	var frameset = this;
	return frameset.element.cloneNode(true);
},

addDefaultNamespace: function(nsSpec) {
	var framesetDef = this;
	var nsDef = new CustomNS(nsSpec);
	var matchingNS = _.find(framesetDef.defaultNamespaces, function(def) {
		if (_.lc(def.urn) === _.lc(nsDef.urn)) {
			if (def.prefix !== nsDef.prefix) logger.warn('Attempted to add default namespace with same urn as one already present: ' + def.urn);
			return true;
		}
		if (def.prefix === nsDef.prefix) {
			if (_.lc(def.urn) !== _.lc(nsDef.urn)) logger.warn('Attempted to add default namespace with same prefix as one already present: ' + def.prefix);
			return true;
		}
	});
	if (matchingNS) return;
	framesetDef.defaultNamespaces.push(nsDef);

	framesetDef.addNamespace(nsDef);
},

addNamespace: function(nsDef) {
	var framesetDef = this;
	if (!framesetDef.namespaces) return;

	var matchingNS = _.find(framesetDef.namespaces, function(def) {
		if (_.lc(def.urn) === _.lc(nsDef.urn)) {
			if (def.prefix !== nsDef.prefix) logger.warn('Attempted to add namespace with same urn as one already present: ' + def.urn);
			return true;
		}
		if (def.prefix === nsDef.prefix) {
			if (_.lc(def.urn) !== _.lc(nsDef.urn)) logger.warn('Attempted to add namespace with same prefix as one already present: ' + def.prefix);
			return true;
		}
	});
	if (matchingNS) return;
	framesetDef.namespaces.push(nsDef);
},

lookupNamespace: function(urn) {
	var framesetDef = this;
	urn = _.lc(urn);
	var nsDef = _.find(framesetDef.namespaces, function(def) {
		return (_.lc(def.urn) === urn);
	});
	return nsDef;
},


lookupPrefix: function(urn) {
	var framesetDef = this;
	var nsDef = framesetDef.lookupNamespace(urn);
	return nsDef && nsDef.prefix;
},

lookupNamespaceURI: function(prefix) {
	var framesetDef = this;
	prefix = _.lc(prefix);
	var nsDef = _.find(framesetDef.namespaces, function(def) {
		return (def.prefix === prefix);
	});
	return nsDef && nsDef.urn;
},

lookupTagNameNS: function(name, urn) {
	var framesetDef = this;
	var nsDef = framesetDef.lookupNamespace(urn);
	if (!nsDef) return ''; // TODO is this correct?
	return nsDef.prefix + name; // TODO _.lc(name) ??
},

lookupSelector: function(selector) {
	var hfNS = this.namespace;
	var tags = selector.split(/\s*,\s*|\s+/);
	return _.map(tags, function(tag) { return hfNS.lookupSelector(tag); }).join(', ');
}

});

/*
 Rebase scope URLs:
	scope:{path}
 is rewritten with `path` being relative to the current scope.
 */

function rebase(doc, scopeURL) {
	_.forOwn(urlAttributes, function(attrList, tag) {
		_.forEach(DOM.findAll(tag, doc), function(el) {
			_.forOwn(attrList, function(attrDesc, attrName) {
				var relURL = el.getAttribute(attrName);
				if (relURL == null) return;
				var url = rebaseURL(relURL, scopeURL);
				if (url != relURL) el[attrName] = url;
			});
		});
	});
}

function rebaseURL(url, baseURL) {
	var relURL = url.replace(/^scope:/i, '');
	if (relURL == url) return url;
	return baseURL.resolve(relURL);
}


return HFramesetDefinition;	
})();


/*
 * HyperFrameset sprockets
 */

// All HyperFrameset sprockets inherit from Base
var Base = (function() {

var Base = sprockets.evolve(sprockets.RoleType, {

});

_.assign(Base, {

iAttached: function(handlers) {
	var object = this;
	object.options = {};
	var element = object.element;
	if (!element.hasAttribute('configid')) return;
	var configID = _.words(element.getAttribute('configid'))[0];	
	var options = framer.definition.configData[configID];
	object.options = options;
}

});

return Base;
})();

// Almost all HyperFrameset sprockets inherit from Link
var Link = (function() {

var Link = sprockets.evolve(Base, {

role: 'link', // FIXME probably doesn't match functionality of aria "link"

lookup: function(url, details) {
	var link = this;
	var options = link.options;
	if (!options || !options.lookup) return false;
	var partial = options.lookup(url, details);
	if (partial === '' || partial === true) return true;
	if (partial == null || partial === false) return false;
	return inferChangeset(url, partial);
}

});

_.assign(Link, {

iAttached: function(handlers) {
	var object = this;
	var options = object.options;
	if (!options.lookup) return;

	handlers.push({
		type: 'requestnavigation',
		action: function(e) {
			if (e.defaultPrevented) return;
			var acceptDefault = framer.onRequestNavigation(e, this);
			if (acceptDefault === false) e.preventDefault();
		}
	});
}

});

return Link;
})();



var Layer = (function() {

var Layer = sprockets.evolve(Base, {

role: 'layer'

});

var zIndex = 1;

_.assign(Layer, {

iAttached: function(handlers) {
	this.css('z-index', zIndex++);
},

attached: function(handlers) {
	Base.iAttached.call(this, handlers);
	Layer.iAttached.call(this, handlers);
}

});

return Layer;
});

var Panel = (function() {

var Panel = sprockets.evolve(Link, {

role: 'panel',

});

_.assign(Panel, {

iAttached: function(handlers) {
	var height = this.attr('height');
	if (height) this.css('height', height); // FIXME units
	var width = this.attr('width');
	if (width) this.css('width', width); // FIXME units
	var minWidth = this.attr('minwidth');
	if (minWidth) this.css('min-width', minWidth); // FIXME units
}, 

attached: function(handlers) {
	Base.iAttached.call(this, handlers);
	Link.iAttached.call(this, handlers);
	Panel.iAttached.call(this, handlers);
},

iEnteredDocument: function() {
	var panel = this;
	var name = panel.attr('name'); 
	var value = panel.attr('value'); 
	if (!name && !value) return;
	panel.ariaToggle('hidden', true);
	if (!name) return; // being controlled by an ancestor
	controllers.listen(name, function(values) {
		panel.ariaToggle('hidden', !(_.includes(values, value)));
	});
},

enteredDocument: function() {
	Panel.iEnteredDocument.call(this);
}

});

return Panel;
})();

var Layout = (function() { // a Layout is a list of Panel (or other Layout) and perhaps separators for hlayout, vlayout

var Layout = sprockets.evolve(Link, {

role: 'group',

owns: {
	get: function() { return _.filter(this.element.children, function(el) { return DOM.matches(el, framer.definition.lookupSelector('hlayout, vlayout, deck, rdeck, panel, frame')); }); }
}

});

_.assign(Layout, {

iEnteredDocument: function() {
	var element = this.element;
	var parent = element.parentNode;

	// FIXME dimension setting should occur before becoming visible
	if (DOM.matches(parent, framer.definition.lookupSelector('layer'))) { // TODO vh, vw not tested on various platforms
		var height = this.attr('height'); // TODO css unit parsing / validation
		if (!height) height = '100vh';
		else height = height.replace('%', 'vh');
		this.css('height', height); // FIXME units
		var width = this.attr('width'); // TODO css unit parsing / validation
		if (!width) width = '100vw';
		else width = width.replace('%', 'vw');
		if (width) this.css('width', width); // FIXME units
	}
	_.forEach(_.map(element.childNodes), normalizeChild, element);
	return;
	
	function normalizeChild(node) {
		var element = this;
		if (DOM.matches(node, framer.definition.lookupSelector('hlayout, vlayout, deck, rdeck, panel, frame'))) return; 
		switch (node.nodeType) {
		case 1: // hide non-layout elements
			node.hidden = true;
			return;
		case 3: // hide text nodes by wrapping in <wbr hidden>
			if (/^\s*$/.test(node.nodeValue )) {
				element.removeChild(node);
				return;
			}
			var wbr = element.ownerDocument.createElement('wbr');
			wbr.hidden = true;
			element.replaceChild(wbr, node); // NOTE no adoption
			wbr.appendChild(node); // NOTE no adoption
			return;
		default:
			return;
		}
	}
},

enteredDocument: function() {
	Panel.iEnteredDocument.call(this);
	Layout.iEnteredDocument.call(this);
}

});

return Layout;
})();

var VLayout = (function() {

var VLayout = sprockets.evolve(Layout, {
});

_.assign(VLayout, {

iAttached: function() {
	var hAlign = this.attr('align'); // FIXME assert left/center/right/justify - also start/end (stretch?)
	if (hAlign) this.css('text-align', hAlign); // NOTE defaults defined in <style> above
},

attached: function(handlers) {
	Base.iAttached.call(this, handlers);
	Link.iAttached.call(this, handlers);
	Panel.iAttached.call(this, handlers);
	VLayout.iAttached.call(this, handlers);
},

enteredDocument: function() {
	Panel.iEnteredDocument.call(this);
	Layout.iEnteredDocument.call(this);
}

});

return VLayout;
})();

var HLayout = (function() {

var HLayout = sprockets.evolve(Layout, {
});

_.assign(HLayout, {

attached: function(handlers) {
	Base.iAttached.call(this, handlers);
	Link.iAttached.call(this, handlers);
	Panel.iAttached.call(this, handlers);
},

iEnteredDocument: function() {
	var vAlign = this.attr('align'); // FIXME assert top/middle/bottom/baseline - also start/end (stretch?)
	_.forEach(this.ariaGet('owns'), function(panel) {
		if (vAlign) panel.$.css('vertical-align', vAlign);
	});
},

enteredDocument: function() {
	Panel.iEnteredDocument.call(this);
	Layout.iEnteredDocument.call(this);
	HLayout.iEnteredDocument.call(this);
}

});

return HLayout;
})();

var Deck = (function() {

var Deck = sprockets.evolve(Layout, {

activedescendant: {
	set: function(item) { // if !item then hide all children
		
		var element = this.element;
		var panels = this.ariaGet('owns');
		if (item && !_.includes(panels, item)) throw Error('set activedescendant failed: item is not child of deck');
		_.forEach(panels, function(child) {
			if (child === item) child.ariaToggle('hidden', false);
			else child.ariaToggle('hidden', true);
		});
	
	}
}

	
});

_.assign(Deck, {

attached: function(handlers) {
	Base.iAttached.call(this, handlers);
	Link.iAttached.call(this, handlers);
	Panel.iAttached.call(this, handlers);
},

iEnteredDocument: function() {
	var deck = this;
	var name = deck.attr('name'); 
	if (!name) {
		deck.ariaSet('activedescendant', deck.ariaGet('owns')[0]);
		return;
	}
	controllers.listen(name, function(values) {
		var panels = deck.ariaGet('owns');
		var activePanel = _.find(panels, function(child) { 
			var value = child.getAttribute('value');
			if (!_.includes(values, value)) return false;
			return true;
		});
		if (activePanel) deck.ariaSet('activedescendant', activePanel);
	});

},

enteredDocument: function() {
	Layout.iEnteredDocument.call(this);
	Deck.iEnteredDocument.call(this);
}

});

return Deck;
})();

var ResponsiveDeck = (function() {

var ResponsiveDeck = sprockets.evolve(Deck, {
	
});

_.assign(ResponsiveDeck, {

attached: function(handlers) {
	Base.iAttached.call(this, handlers);
	Link.iAttached.call(this, handlers);
	Panel.iAttached.call(this, handlers);
	Deck.iAttached.call(this, handlers);
},

iEnteredDocument: function() {
	var width = parseFloat(window.getComputedStyle(this.element, null).width);
	var panels = this.ariaGet('owns');
	var activePanel = _.find(panels, function(panel) {
		var minWidth = window.getComputedStyle(panel, null).minWidth;
		if (minWidth == null || minWidth === '' || minWidth === '0px') return true;
		minWidth = parseFloat(minWidth); // FIXME minWidth should be "NNNpx" but need to test
		if (minWidth > width) return false;
		return true;
	});
	if (activePanel) {
		activePanel.$.css('height', '100%');
		activePanel.$.css('width', '100%');
		this.ariaSet('activedescendant', activePanel);
	}
},

enteredDocument: function() {
	Layout.iEnteredDocument.call(this);
	Panel.iEnteredDocument.call(this);
	Deck.iEnteredDocument.call(this);
	ResponsiveDeck.iEnteredDocument.call(this);
}

});

return ResponsiveDeck;
})();


var HFrame = (function() {

var HFrame = sprockets.evolve(Panel, {

role: 'frame',

frameEntered: function(frame) {
	this.frames.push(frame);
},

frameLeft: function(frame) {
	var index = this.frames.indexOf(frame);
	this.frames.splice(index);
},

preload: function(request) {
	var frame = this;
	return Promise.pipe(request, [
		
	function(request) { return frame.definition.render(request, 'loading'); },
	function(result) {
		if (!result) return;
		return frame.insert(result);
	}
	
	]);
},

load: function(response) { // FIXME need a teardown method that releases child-frames	
	var frame = this;
	if (response) frame.src = response.url;
	// else a no-src frame
	return Promise.pipe(response, [
	
	function(response) { 
		return frame.definition.render(response, 'loaded', {
			mainSelector: frame.mainSelector
			}); 
	},
	function(result) {
		if (!result) return;
		return frame.insert(result);
	}

	]);
},

insert: function(bodyElement) { // FIXME need a teardown method that releases child-frames	
	var frame = this;
	
	// FIXME .bodyElement will probably become .bodies[] for transition animations.
	if (frame.bodyElement) sprockets.removeNode(frame.bodyElement);
	sprockets.insertNode('beforeend', frame.element, bodyElement);
	frame.bodyElement = bodyElement;
},

});

_.assign(HFrame, {

iAttached: function() {
	var frame = this;
	var defId = frame.attr('def');
	frame.definition = framer.definition.frames[defId];
	_.defaults(frame, {
		frames: [],
		bodyElement: null,
		targetname: frame.attr('targetname'),
		src: frame.attr('src'),
		mainSelector: frame.attr('main') // TODO consider using a hash in `@src`
    });
},
attached: function(handlers) {
	Base.iAttached.call(this, handlers);
	Link.iAttached.call(this, handlers);
	Panel.iAttached.call(this, handlers);
	HFrame.iAttached.call(this, handlers);
},
iEnteredDocument: function() {
	var frame = this;
	framer.frameEntered(frame);
},
enteredDocument: function() {
	Panel.iEnteredDocument.call(this);
	HFrame.iEnteredDocument.call(this);
},
iLeftDocument: function() {
	var frame = this;
	framer.frameLeft(frame);
},
leftDocument: function() {
	this.iLeftDocument();
}

});

return HFrame;	
})();


var HFrameset = (function() {
	
var HFrameset = sprockets.evolve(Link, {

role: 'frameset',
isFrameset: true,

frameEntered: function(frame) {
	this.frames.push(frame);
},

frameLeft: function(frame) {
	var index = this.frames.indexOf(frame);
	this.frames.splice(index);
},

render: function() {

	var hframeset = this;
	var definition = hframeset.definition;
	var dstBody = this.element;

	var srcBody = definition.render();
	
	return Promise.pipe(null, [

	function() {
		_.forEach(_.map(srcBody.childNodes), function(node) {
			sprockets.insertNode('beforeend', dstBody, node);
		});
	}

	]);

}

});

_.assign(HFrameset, {

iAttached: function() {
	var frameset = this;
	frameset.definition = framer.definition;
	_.defaults(frameset, {
		frames: []
	});
}, 
attached: function(handlers) {
	Base.iAttached.call(this, handlers);
	Link.iAttached.call(this, handlers);
	HFrameset.iAttached.call(this, handlers);
},
iEnteredDocument: function() {
	var frameset = this;
	framer.framesetEntered(frameset);
	frameset.render();
},
enteredDocument: function() {
	HFrameset.iEnteredDocument.call(this);
},
iLeftDocument: function() { // FIXME should never be called??
	var frameset = this;
	framer.framesetLeft(frameset);
},
leftDocument: function() {
	HFrameset.iLeftDocument.call(this);
}

});


_.defaults(HFrameset, {
	
prepare: function(dstDoc, definition) {

	if (getFramesetMarker(dstDoc)) throw Error('The HFrameset has already been applied');

	var srcDoc = DOM.cloneDocument(definition.document);

	var selfMarker;
	
	return Promise.pipe(null, [

	function() { // remove all <link rel=stylesheet /> just in case
		// FIXME maybe remove all <link>
		var dstHead = dstDoc.head;
		_.forEach(DOM.findAll('link[rel|=stylesheet]', dstHead), function(node) {
			dstHead.removeChild(node);
		});
	},

	function() { // empty the body
		var dstBody = dstDoc.body;
		var node;
		while (node = dstBody.firstChild) dstBody.removeChild(node);
	},

	function() {
		selfMarker = getSelfMarker(dstDoc);
		if (selfMarker) return;
		selfMarker = dstDoc.createElement('link');
		selfMarker.rel = SELF_REL;
		selfMarker.href = dstDoc.URL;
		dstDoc.head.insertBefore(selfMarker, dstDoc.head.firstChild); // NOTE no adoption
	},

	function() {
		var framesetMarker = dstDoc.createElement('link');
		framesetMarker.rel = FRAMESET_REL;
		framesetMarker.href = definition.src;
		dstDoc.head.insertBefore(framesetMarker, selfMarker); // NOTE no adoption
	},
	
	function() {
		mergeElement(dstDoc.documentElement, srcDoc.documentElement);
		mergeElement(dstDoc.head, srcDoc.head);
		mergeHead(dstDoc, srcDoc.head, true);
		// allow scripts to run. FIXME scripts should always be appended to document.head
		_.forEach(DOM.findAll('script', dstDoc.head), function(script) {
			if (!script.hasAttribute('src') && script.hasAttribute('sourceurl')) {
				// FIXME what about non-JS scripts??
				script.text += '\n//# sourceURL=' + script.getAttribute('sourceurl');
			}
			scriptQueue.push(script);
		});
		return scriptQueue.empty();
	}
	
	]);

},

prerender: function(dstDoc, definition) { // FIXME where does this go
	var srcBody = definition.element;
	var dstBody = document.body;
	mergeElement(dstBody, srcBody);
}

});

// TODO separateHead and mergeHead are only called with isFrameset === true
function separateHead(dstDoc, isFrameset) {
	var dstHead = dstDoc.head;
	var framesetMarker = getFramesetMarker(dstDoc);
	if (!framesetMarker) throw Error('No ' + FRAMESET_REL + ' marker found. ');

	var selfMarker = getSelfMarker(dstDoc);
	// remove frameset / page elements except for <script type=text/javascript>
	if (isFrameset) _.forEach(DOM.siblings('after', framesetMarker, 'before', selfMarker), remove);
	else _.forEach(DOM.siblings('after', selfMarker), remove);
	
	function remove(node) {
		if (DOM.getTagName(node) == 'script' && (!node.type || node.type.match(/^text\/javascript/i))) return;
		dstHead.removeChild(node);
	}
}

function mergeHead(dstDoc, srcHead, isFrameset) {
	var baseURL = URL(dstDoc.URL);
	var dstHead = dstDoc.head;
	var framesetMarker = getFramesetMarker();
	if (!framesetMarker) throw Error('No ' + FRAMESET_REL + ' marker found. ');
	var selfMarker = getSelfMarker();

	separateHead(dstDoc, isFrameset);

	_.forEach(_.map(srcHead.childNodes), function(srcNode) {
		if (srcNode.nodeType != 1) return;
		switch (DOM.getTagName(srcNode)) {
		default:
			break;
		case 'title':
			if (isFrameset) return; // ignore <title> in frameset. FIXME what if topic content has no <title>?
			if (!srcNode.innerHTML) return; // IE will add a title even if non-existant
			break;
		case 'link': // FIXME no duplicates @rel, @href pairs
			break;
		case 'meta': // FIXME no duplicates, warn on clash
			if (srcNode.httpEquiv) return;
			break;
		case 'style': 
			break;
		case 'script':  // FIXME no duplicate @src
			if (!isFrameset) return; // WARN even non-js script-type is rejected
			if (!srcNode.type || /^text\/javascript$/i.test(srcNode.type)) srcNode.type = 'text/javascript?disabled';
			break;
		}
		if (isFrameset) DOM.insertNode('beforebegin', selfMarker, srcNode);
		else DOM.insertNode('beforeend', dstHead, srcNode);
		if (DOM.getTagName(srcNode) == 'link') srcNode.href = srcNode.getAttribute('href'); // Otherwise <link title="..." /> stylesheets don't work on Chrome
	});
}

function mergeElement(dst, src) { // NOTE this removes all dst (= landing page) attrs and imports all src (= frameset) attrs.
	DOM.removeAttributes(dst);
	DOM.copyAttributes(dst, src);
	dst.removeAttribute('style'); // FIXME is this appropriate? There should at least be a warning
}

function getFramesetMarker(doc) {
	if (!doc) doc = document;
	var marker = DOM.find('link[rel~=' + FRAMESET_REL + ']', doc.head);
	return marker;
}

function getSelfMarker(doc) {
	if (!doc) doc = document;
	var marker = DOM.find('link[rel~=' + SELF_REL + ']', doc.head); 
	return marker;
}

return HFrameset;
})();


function registerHyperFramesetElements() {

var framesetDef = framer.definition;

sprockets.registerElement('body', HFrameset);
sprockets.registerElement(framesetDef.lookupSelector('frame'), HFrame);

sprockets.registerElement(framesetDef.lookupSelector('layer'), Layer);
sprockets.registerElement(framesetDef.lookupSelector('panel'), Panel);
sprockets.registerElement(framesetDef.lookupSelector('vlayout'), VLayout);
sprockets.registerElement(framesetDef.lookupSelector('hlayout'), HLayout);
sprockets.registerElement(framesetDef.lookupSelector('deck'), Deck);
sprockets.registerElement(framesetDef.lookupSelector('rdeck'), ResponsiveDeck);

var cssText = [
'*[hidden] { display: none !important; }', // TODO maybe not !important
'html, body { margin: 0; padding: 0; }',
'html { width: 100%; height: 100%; }',
framesetDef.lookupSelector('layer, hlayout, vlayout, deck, rdeck, panel, frame, body') + ' { box-sizing: border-box; }', // TODO http://css-tricks.com/inheriting-box-sizing-probably-slightly-better-best-practice/
framesetDef.lookupSelector('layer') + ' { display: block; position: fixed; top: 0; left: 0; width: 0; height: 0; overflow: visible; }',
framesetDef.lookupSelector('hlayout, vlayout, deck, rdeck') + ' { display: block; width: 0; height: 0; overflow: hidden; text-align: left; margin: 0; padding: 0; }', // FIXME text-align: start
framesetDef.lookupSelector('hlayout, vlayout, deck, rdeck') + ' { width: 100%; height: 100%; }', // FIXME should be 0,0 before manual calculations
framesetDef.lookupSelector('frame, panel') + ' { display: block; width: auto; height: auto; overflow: auto; text-align: left; margin: 0; padding: 0; }', // FIXME text-align: start
framesetDef.lookupSelector('body') + ' { display: block; width: auto; height: auto; overflow: hidden; margin: 0; }',
framesetDef.lookupSelector('vlayout') + ' { height: 100%; overflow: hidden; }',
framesetDef.lookupSelector('hlayout') + ' { width: 100%; overflow: hidden; }',
framesetDef.lookupSelector('vlayout') + ' > * { display: block; float: left; width: 100%; height: auto; text-align: left; }',
framesetDef.lookupSelector('vlayout') + ' > *::after { clear: both; }',
framesetDef.lookupSelector('hlayout') + ' > * { display: block; float: left; width: auto; height: 100%; vertical-align: top; }',
framesetDef.lookupSelector('hlayout') + '::after { clear: both; }',
framesetDef.lookupSelector('deck') + ' > * { width: 100%; height: 100%; }',
framesetDef.lookupSelector('rdeck') + ' > * { width: 0; height: 0; }',
].join('\n');

var style = document.createElement('style');
style.textContent = cssText;
document.head.insertBefore(style, document.head.firstChild);

} // END registerLayoutElements()


var notify = function(msg) { // FIXME this isn't being used called everywhere it should
	var module;
	switch (msg.module) {
	case 'frameset': module = framer.frameset.options; break;
	default: return Promise.resolve();
	}
	var handler = module[msg.type];
	if (!handler) return Promise.resolve();
	var listener;

	if (handler[msg.stage]) listener = handler[msg.stage];
	else switch(msg.module) {
	case 'frame':
		listener =
			msg.type == 'bodyLeft' ? (msg.stage == 'before' ? handler : null) :
			msg.type == 'bodyEntered' ? (msg.stage == 'after' ? handler : null) :
			null;
		break;
	case 'frameset':
		listener =
			msg.type == 'leftState' ? (msg.stage == 'before' ? handler : null) :
			msg.type == 'enteredState' ? (msg.stage == 'after' ? handler : null) :
			null;
		break;
	default:
		throw Error(msg.module + ' is invalid module');
		break;
	}

	if (typeof listener == 'function') {
		var promise = Promise.defer(function() { listener(msg); }); // TODO isFunction(listener)
		promise['catch'](function(err) { throw Error(err); });
		return promise;
	}
	else return Promise.resolve();
}


var framer = {};

var framesetReady = Promise.applyTo();

_.defaults(framer, {

frameset: null,

started: false,

start: function(startOptions) {
	var framer = this;
	
	if (framer.started) throw Error('Already started');
	if (!startOptions || !startOptions.contentDocument) throw Error('No contentDocument passed to start()');

	framer.started = true;
	startOptions.contentDocument
	.then(function(doc) { // FIXME potential race condition between document finished loading and frameset rendering
		return httpProxy.add({
			url: document.URL,
			type: 'document',
			document: doc
		});
	});
	
	return Promise.pipe(null, [
		
	function() { // sanity check
		return Promise.wait(function() { return !!document.body; });		
	},

	function() { // lookup or detect framesetURL
		var framerConfig;
		framerConfig = framer.lookup(document.URL);
		if (framerConfig) return framerConfig;
		return startOptions.contentDocument
			.then(function(doc) {
				return framer.detect(doc);
			});
	},

	function(framerConfig) { // initiate fetch of framesetURL
		if (!framerConfig) throw Error('No frameset could be determined for this page');
		framer.scope = framerConfig.scope; // FIXME shouldn't set this until loadFramesetDefinition() returns success
		var framesetURL = URL(framerConfig.framesetURL);
		if (framesetURL.hash) logger.info('Ignoring hash component of frameset URL: ' + framesetURL.hash);
		framer.framesetURL = framerConfig.framesetURL = framesetURL.nohash;
		return httpProxy.load(framer.framesetURL, { responseType: 'document' })
		.then(function(response) {
			var framesetDoc = response.document;
			return new HFramesetDefinition(framesetDoc, framerConfig);
		});
	},

	function(definition) {
		return Promise.pipe(definition, [
		
		function() {
			framer.definition = definition;
			return HFrameset.prepare(document, definition)
		},

		function() { 
			return definition.preprocess();
		},

		function() {
			return HFrameset.prerender(document, definition)
		}

		]);
	},
	
	function() {
		window.addEventListener('click', function(e) {
			if (e.defaultPrevented) return;
			var acceptDefault = framer.onClick(e);
			if (acceptDefault === false) e.preventDefault();
		}, false); // onClick generates requestnavigation event
		window.addEventListener('submit', function(e) {
			if (e.defaultPrevented) return;
			var acceptDefault = framer.onSubmit(e);
			if (acceptDefault === false) e.preventDefault();
		}, false);
		
		registerFormElements();
		registerHyperFramesetElements();

		return sprockets.start({ manual: true }); // FIXME should be a promise
	},

	function() { // TODO ideally frameset rendering wouldn't start until after this step
		return framesetReady
		.then(function() {

			var changeset = framer.currentChangeset;
			// FIXME what if no changeset is returned
			return historyManager.start(changeset, '', document.URL,
				function(state) { }, // FIXME need some sort of rendering status
				function(state) { return framer.onPopState(state.getData()); }
				);
		});
	},

	function() { // FIXME this should wait until at least the landing document has been rendered in one frame

		notify({ // NOTE this doesn't prevent start() from resolving
			module: 'frameset',
			type: 'enteredState',
			stage: 'after',
			url: document.URL
		});

	},

	// TODO it would be nice if <body> wasn't populated until stylesheets were loaded
	function() {
		return Promise.wait(function() { return DOM.checkStyleSheets(); })
	}	
	
	]);

	
},

framesetEntered: function(frameset) {
	var framer = this;
	framer.frameset = frameset;
	var url = document.URL;
	framer.currentChangeset = frameset.lookup(url, {
		referrer: document.referrer
	});
	framesetReady.resolve();
},

framesetLeft: function(frameset) { // WARN this should never happen
	var framer = this;
	delete framer.frameset;
},

frameEntered: function(frame) {
	var parentFrame;
	var parentElement = DOM.closest(frame.element.parentNode, framer.definition.lookupSelector('frame')); // TODO frame.element.parentNode.ariaClosest('frame')
	if (parentElement) parentFrame = HFrame(parentElement);
	else {
		parentElement = document.body; // TODO  frame.elenent.parentNode.ariaClosest('frameset'); 
		parentFrame = HFrameset(parentElement);
	}
	parentFrame.frameEntered(frame);
	frame.parentFrame = parentFrame;

	if (frame.targetname === framer.currentChangeset.target) { // FIXME should only be used at startup
		frame.attr('src', framer.currentChangeset.url);
	}

	DOM.whenVisible(frame.element).then(function() { // FIXME could be clash with loadFrames() above

	var src = frame.attr('src');

	if (src == null) { // a non-src frame
		return frame.load(null, { condition: 'loaded' });
	}

	if (src === '') {
		return; // FIXME frame.load(null, { condition: 'uninitialized' })
	}
	
	var fullURL = URL(src);
	var nohash = fullURL.nohash;
	var hash = fullURL.hash;
	
	var request = { method: 'get', url: nohash, responseType: 'document'};
	return Promise.pipe(null, [ // FIXME how to handle `hash` if present??
	
	function() { return frame.preload(request); },
	function() { return httpProxy.load(nohash, request); },
	function(response) { return frame.load(response); }

	]);

	});
},

frameLeft: function(frame) {
	var parentFrame = frame.parentFrame;
	delete frame.parentFrame;
	parentFrame.frameLeft(frame);
},

onClick: function(e) { // return false means success
	var framer = this;

	if (e.button != 0) return; // FIXME what is the value for button in IE's W3C events model??
	if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return; // FIXME do these always trigger modified click behavior??

	// Find closest <a href> to e.target
	var linkElement = DOM.closest(e.target, 'a, [link]');
	if (!linkElement) return;
	var hyperlink;
	if (DOM.getTagName(linkElement) === 'a') hyperlink = linkElement;
	else {
		hyperlink = DOM.find('a, link', linkElement);
		if (!hyperlink) hyperlink = DOM.closest('a', linkElement);
		if (!hyperlink) return;
	}
	var href = hyperlink.getAttribute('href');
	if (!href) return; // not really a hyperlink

	var baseURL = URL(document.URL);
	var url = baseURL.resolve(href); // TODO probably don't need to resolve on browsers that support pushstate

	// NOTE The following creates a pseudo-event and dispatches to frames in a bubbling order.
	// FIXME May as well use a virtual event system, e.g. DOMSprockets
	var details = {
		url: url,
		element: hyperlink
	}; // TODO more details?? event??

	framer.triggerRequestNavigation(details.url, details);
	return false;
},

onSubmit: function(e) { // return false means success
	var framer = this;

	// test submit
	var form = e.target;
	if (form.target) return; // no iframe
	var baseURL = URL(document.URL);
	var action = baseURL.resolve(form.action); // TODO probably don't need to resolve on browsers that support pushstate
	
	var details = {
		element: form
	};
	var method = _.lc(form.method);
	switch(method) {
	case 'get':
		var oURL = URL(action);
		var query = encode(form);
		details.url = oURL.nosearch + (oURL.search || '?') + query + oURL.hash;
		break;
	default: return; // TODO handle POST
	}
	
	framer.triggerRequestNavigation(details.url, details);
	return false;
	
	function encode(form) {
		var data = [];
		_.forEach(form.elements, function(el) {
			if (!el.name) return;
			data.push(el.name + '=' + encodeURIComponent(el.value));
		});
		return data.join('&');
	}
},

triggerRequestNavigation: function(url, details) {
	Promise.defer(function() {
		var event = document.createEvent('CustomEvent');
		event.initCustomEvent('requestnavigation', true, true, details.url);
		var acceptDefault = details.element.dispatchEvent(event);
		if (acceptDefault !== false) {
			location.assign(details.url);
		}
	});
},

onRequestNavigation: function(e, frame) { // `return false` means success (so preventDefault)
	var framer = this;
	if (!frame) throw Error('Invalid frame / frameset in onRequestNavigation');
	// NOTE only pushState enabled browsers use this
	// We want panning to be the default behavior for clicks on hyperlinks - <a href>
	// Before panning to the next page, have to work out if that is appropriate
	// `return` means ignore the click

	var url = e.detail;
	var details = {
		url: url,
		element: e.target
	}
	
	if (!frame.isFrameset) {
		if (requestNavigation(frame, url, details)) return false;
		return;
	}
	
	// test hyperlinks
	var baseURL = URL(document.URL);
	var oURL = URL(url);
	if (oURL.origin != baseURL.origin) return; // no external urls

	// TODO perhaps should test same-site and same-page links
	var isPageLink = (oURL.nohash === baseURL.nohash); // TODO what about page-links that match the current hash?
	if (isPageLink) {
		framer.onPageLink(url, details);
		return false;
	}

	var frameset = frame;
	var framesetScope = framer.lookup(url);
	if (!framesetScope || !framer.compareFramesetScope(framesetScope)) { // allow normal browser navigation
		return;
	}
	
	if (requestNavigation(frameset, url, details)) return false;
	return;

	function requestNavigation(frame, url, details) { // `return true` means success
		var changeset = frame.lookup(url, details);
		if (changeset === '' || changeset === true) return true;
		if (changeset == null || changeset === false) return false;
		framer.load(url, changeset, frame.isFrameset);
		return true;
	}

},

onPageLink: function(url, details) {
	var framer = this;
	logger.warn('Ignoring on-same-page links for now.'); // FIXME
},

navigate: function(url, changeset) { // FIXME doesn't support replaceState
	var framer = this;	
	return framer.load(url, changeset, true);
},

load: function(url, changeset, changeState) { // FIXME doesn't support replaceState
	var framer = this;	
	var frameset = framer.frameset;
	var mustNotify = changeState || changeState === 0;
	var target = changeset.target;
	var frames = [];
	recurseFrames(frameset, function(frame) {
		if (frame.targetname !== target) return;
		frames.push(frame);
		return true;
	});
	
	var fullURL = URL(url);
	var hash = fullURL.hash;
	var nohash = fullURL.nohash;
	var request = { method: 'get', url: nohash, responseType: 'document' }; // TODO one day may support different response-type
	var response;

	return Promise.pipe(null, [

	function() {
		if (mustNotify) return notify({ // FIXME need a timeout on notify
			module: 'frameset',
			type: 'leftState',
			stage: 'before',
			url: document.URL
			// TODO details, resource, url, frames??
			});
	},
	function() {
		_.forEach(frames, function(frame) {
			frame.preload(request);
		});
	},
	function() {
		return httpProxy.load(nohash, request)
		.then(function(resp) { response = resp; });
	},
	function() { // FIXME how to handle `hash` if present??
		if (changeState) return historyManager.pushState(changeset, '', url, function(state) {
				loadFrames(frames, response);
			});
		else return loadFrames(frames, response);
	},
	function() { // FIXME need to wait for the DOM to stabilize before this notification
		if (mustNotify) return notify({ // FIXME need a timeout on notify
			module: 'frameset',
			type: 'enteredState',
			stage: 'after',
			url: url
			// TODO details, resource, url, frames??
			});
	}
		
	]);

	function loadFrames(frames, response) { // TODO promisify
		_.forEach(frames, function(frame) {
			frame.attr('src', response.url);
			DOM.whenVisible(frame.element).then(function() {
				frame.load(response); // FIXME this can potentially clash with framer.frameEntered code
			});
		});
	}
	
	function recurseFrames(parentFrame, fn) {
		_.forEach(parentFrame.frames, function(frame) {
			var found = fn(frame);
			if (!found) recurseFrames(frame, fn);
		});			
	}
},

onPopState: function(changeset) {
	var framer = this;
	var frameset = framer.frameset;
	var frames = [];
	var url = changeset.url;
	if (url !== document.URL) {
		logger.warn('Popped state URL does not match address-bar URL.');
		// FIXME needs an optional error recovery, perhaps reloading document.URL
	}
	framer.load(url, changeset, 0);
}

});


_.defaults(framer, {

lookup: function(docURL) {
	var framer = this;
	if (!framer.options.lookup) return;
	var result = framer.options.lookup(docURL);
	// FIXME if (result === '' || result === true) 
	if (result == null || result === false) return false;

	// FIXME error if `result` is a relative URL
	if (typeof result === 'string') result = implyFramesetScope(result, docURL);
	if (typeof result !== 'object' || !result.scope || !result.framesetURL) throw Error('Unexpected result from frameset lookup');
	return result;
},

detect: function(srcDoc) {
	var framer = this;
	if (!framer.options.detect) return;
	var result = framer.options.detect(srcDoc);
	// FIXME if (result === '' || result === true) 
	if (result == null || result === false) return false;

	// FIXME error if `result` is a relative URL
	if (typeof result === 'string') result = implyFramesetScope(result, document.URL);
	if (typeof result !== 'object' || !result.scope || !result.framesetURL) throw Error('Unexpected result from frameset detect');
	return result;
},

compareFramesetScope: function(settings) {
	var framer = this;
	if (framer.framesetURL !== settings.framesetURL) return false;
	if (framer.scope !== settings.scope) return false;
	return true;
}

});

function implyFramesetScope(framesetSrc, docSrc) {
	var docURL = URL(docSrc);
	var docSiteURL = URL(docURL.origin);
	var framesetSrc = docSiteURL.resolve(framesetSrc);
	var scope = implyScope(framesetSrc, docSrc);
	return {
		scope: scope,
		framesetURL: framesetSrc
	}
}

function implyScope(framesetSrc, docSrc) {
	var docURL = URL(docSrc);
	var framesetURL = URL(framesetSrc);
	var scope = docURL.base;
	var framesetBase = framesetURL.base;
	if (scope.indexOf(framesetBase) >= 0) scope = framesetBase;
	return scope;
}

function inferChangeset(url, partial) {
	var inferred = {
		url: url
	}
	
	switch (typeof partial) {
	case 'string':
		inferred.target = partial;
		break;
	case 'object':
		/*
		if (partial instanceof Array) {
			inferred.target = partial[0];
			inferred.targets = partial.slice(0);
			break;
		}
		*/
	default:
		throw Error('Invalid changeset returned from lookup()');
		break;
	}
	
	return inferred;
}


_.defaults(framer, {

options: {
	/* The following options are available (unless otherwise indicated) *
	lookup: function(url) {},
	detect: function(document) {},
	entering: { before: noop, after: noop },
	leaving: { before: noop, after: noop }, // TODO not called at all
	ready: noop // TODO should this be entering:complete ??
	/**/
},

config: function(options) {
	var framer = this;
	if (!options) return;
	_.assign(framer.options, options);
}

});

framer.filters = (function() {

var items = {};

return {

register: function(name, fn) {
	if (!/^[_a-zA-Z][_a-zA-Z0-9]*$/.test(name)) { // TODO should be in filters.register()
		logger.error('registerFilter called with invalid name: ' + name);
		return; // TODO throw??
	}
	if (this.has(name)) {
		logger.warn('A filter by that name already exists: ' + name);
		return; // TODO throw??
	}
	items[name] = fn;
},

has: function(name) {
	return (name in items);
},

get: function(name) { 
	if (!this.has(name)) throw name + ' is not a registered controller';
	return items[name];
},

evaluate: function(name, value, params) {
	var fn = this.get(name);
	// NOTE filter functions should only accept string_or_number_or_boolean
	// FIXME Need to wrap fn() to assert / cast supplied value and accept params
	var args = params.slice(0);
	args.unshift(value);
	return fn.apply(undefined, args);
}


};

})();



_.defaults(framer, {

decoders: {},

registerDecoder: function(type, constructor) {
	this.decoders[type] = constructor;
},

createDecoder: function(type, options) {
	return new this.decoders[type](options, this.definition);
},

processors: {},

registerProcessor: function(type, constructor) {
	this.processors[type] = constructor;
},

createProcessor: function(type, options) {
	return new this.processors[type](options, this.definition, this.filters);
},

registerFilter: function(name, fn) {
	this.filters.register(name, fn);
}

});

_.defaults(framer, {

	controllers: controllers,
	HFrameDefinition: HFrameDefinition,
	HFramesetDefinition: HFramesetDefinition,
	HFrame: HFrame,
	HFrameset: HFrameset,
	Layer: Layer,
	HLayout: HLayout,
	VLayout: VLayout,
	Deck: Deck,
	ResponsiveDeck: ResponsiveDeck

});

return framer;

})();

// end framer defn

}).call(window);

