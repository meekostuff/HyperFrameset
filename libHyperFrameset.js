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
		if (_.contains(a2, item) || _.contains(result, item)) return;
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

// TODO call these as Promise methods rather than with local vars
var asap = Promise.asap;
var delay = Promise.delay;
var wait = Promise.wait;
var pipe = Promise.pipe;



/*
 ### DOM utility functions
 */

var DOM = Meeko.DOM;

var getTagName = function(el) {
	return el && el.nodeType === 1 ? _.lc(el.tagName) : '';
}

var siblings = function(conf, refNode, conf2, refNode2) {
	
	conf = _.lc(conf);
	if (conf2) {
		conf2 = _.lc(conf2);
		if (conf === 'ending' || conf === 'before') throw Error('siblings() startNode looks like stopNode');
		if (conf2 === 'starting' || conf2 === 'after') throw Error('siblings() stopNode looks like startNode');
		if (!refNode2 || refNode2.parentNode !== refNode.parentNode) throw Error('siblings() startNode and stopNode are not siblings');
	}
	
	var nodeList = [];
	if (!refNode || !refNode.parentNode) return nodeList;
	var node, stopNode, first = refNode.parentNode.firstChild;

	switch (conf) {
	case 'starting': node = refNode; break;
	case 'after': node = refNode.nextSibling; break;
	case 'ending': node = first; stopNode = refNode.nextSibling; break;
	case 'before': node = first; stopNode = refNode; break;
	default: throw Error(conf + ' is not a valid configuration in siblings()');
	}
	if (conf2) switch (conf2) {
	case 'ending': stopNode = refNode2.nextSibling; break;
	case 'before': stopNode = refNode2; break;
	}
	
	if (!node) return nodeList; // FIXME is this an error??
	for (;node && node!==stopNode; node=node.nextSibling) nodeList.push(node);
	return nodeList;
}
var matchesElement = function(selector, node) { // WARN only matches by tagName
	var tag = _.lc(selector);
	var matcher = function(el) {
		return (el.nodeType === 1 && getTagName(el) === tag);
	}
	return (node) ? matcher(node) : matcher;
}
var firstChild = function(parent, matcher) { // WARN only matches by tagName or matcher function
	var fn = (typeof matcher == 'function') ? 
		matcher : 
		matchesElement(matcher);
	var nodeList = parent.childNodes;
	for (var n=nodeList.length, i=0; i<n; i++) {
		var node = nodeList[i];
		if (fn(node)) return node;
	}
}
var insertNode = function(conf, refNode, node) { // like imsertAdjacentHTML but with a node and auto-adoption
	var doc = refNode.ownerDocument;
	if (doc.adoptNode) node = doc.adoptNode(node); // Safari 5 was throwing because imported nodes had been added to a document node
	switch(conf) {
	case 'beforebegin': refNode.parentNode.insertBefore(node, refNode); break;
	case 'afterend': refNode.parentNode.insertBefore(node, refNode.nextSilbing); break;
	case 'afterbegin': refNode.insertBefore(node, refNode.firstChild); break;
	case 'beforeend': refNode.appendChild(node); break;
	case 'replace': refNode.parentNode.replaceChild(node, refNode);
	}
	return refNode;
}

var textContent = document.documentElement.textContent ?
function(el, text) { // NOTE https://developer.mozilla.org/en-US/docs/Web/API/Node.textContent#Differences_from_innerText
	if (typeof text === 'undefined') return el.textContent;
	el.textContent = text;
} :
function(el, text) {
	if (typeof text === 'undefined') return el.innerText;
	el.innerText = text;
}

var scriptText = (function() {

var script = document.createElement('script');
return ('text' in script) ? standard :
	('textContent' in script) ? alternate :
	legacy;

function standard(el, val) { // all IE, current non-IE
	if (val === null) val = '';
	if (typeof val === 'undefined') return el.text;
	el.text = val;
}

function alternate(el, val) { // old non-IE
	if (val === null) val = '';
	if (typeof val === 'undefined') return el.textContent;
	el.textContent = val;
}

function legacy(el, val) { // really old non-IE
	if (val === null) val = '';
	var textNode = el.firstChild;
	if (typeof val === 'undefined') return textNode ? textNode.nodeValue : '';
	if (textNode) el.removeChild(textNode);
	var doc = el.ownerDocument;
	el.appendChild(doc.createTextNode(val)); // NOTE no adoption
}

})();
	
function styleText(node, text) { // TODO IE <style> can have `.sheet` independent of `.textContent` (but probably not for parsed documents)
	if (typeof text === 'undefined') return node.textContent;
	node.textContent = text;
}

var hasAttribute = function(node, attrName) { // WARN needs to be more complex for IE <= 7
	return node.hasAttribute(attrName);
}

var copyAttributes = function(node, srcNode) {
	_.forEach(_.toArray(srcNode.attributes), function(attr) {
		node.setAttribute(attr.name, attr.value); // WARN needs to be more complex for IE <= 7
	});
	return node;
}

var removeAttributes = function(node) {
	_.forEach(_.toArray(node.attributes), function(attr) {
		node.removeAttribute(attr.name);
	});
	return node;
}

var createDocument = function() { // modern browsers. IE >= 9
	var doc = document.implementation.createHTMLDocument('');
	doc.removeChild(doc.documentElement);
	return doc;
}

var createHTMLDocument = function(title) { // modern browsers. IE >= 9
	return document.implementation.createHTMLDocument(title);
}

var cloneDocument = function(srcDoc, options) {
	var doc = createDocument(options);
	var docEl = doc.importNode(srcDoc.documentElement, true);
	doc.appendChild(docEl); // NOTE already adopted

	// WARN sometimes IE9/IE10 doesn't read the content of inserted <style>
	_.forEach(DOM.findAll('style', doc), function(node) {
		if (node.styleSheet && node.styleSheet.cssText == '') styleText(node, styleText(node));
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

var addEvent = 
	document.addEventListener && function(node, event, fn) { return node.addEventListener(event, fn, false); } ||
	document.attachEvent && function(node, event, fn) { return node.attachEvent('on' + event, fn); } ||
	function(node, event, fn) { node['on' + event] = fn; }

var removeEvent = 
	document.removeEventListener && function(node, event, fn) { return node.removeEventListener(event, fn, false); } ||
	document.detachEvent && function(node, event, fn) { return node.detachEvent('on' + event, fn); } ||
	function(node, event, fn) { if (node['on' + event] == fn) node['on' + event] = null; }

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

if (!loaded) _.forOwn(events, function(node, type) { addEvent(node, type, onLoaded); });

return domReady;

// NOTE the following functions are hoisted
function onLoaded(e) {
	loaded = true;
	_.forOwn(events, function(node, type) { removeEvent(node, type, onLoaded); });
	processQueue();
}

})();

function isVisible(element) {
	var closestHidden = DOM.closest(element, '[hidden]');
	return (!closestHidden);
}


function whenVisible(element) { // FIXME this quite possibly causes leaks if closestHidden is removed from document before removeEventListener
	return new Promise(function(resolve, reject) {	
		var closestHidden = DOM.closest(element, '[hidden]');
		if (!closestHidden) {
			resolve();
			return;
		}
		var listener = function(e) {
			if (e.target.hidden) return;
			closestHidden.removeEventListener('visibilitychange', listener, false);
			whenVisible(element).then(resolve);
		}
		closestHidden.addEventListener('visibilitychange', listener, false);
	});
}

/* 
NOTE:  for more details on how checkStyleSheets() works cross-browser see 
http://aaronheckmann.blogspot.com/2010/01/writing-jquery-plugin-manager-part-1.html
TODO: does this still work when there are errors loading stylesheets??
*/
var checkStyleSheets = function() { // TODO would be nice if this didn't need to be polled
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
	getTagName: getTagName, hasAttribute: hasAttribute, matchesElement: matchesElement, // properties
	siblings: siblings, firstChild: firstChild, // selections
	copyAttributes: copyAttributes, removeAttributes: removeAttributes, textContent: textContent, scriptText: scriptText, // attrs
	insertNode: insertNode, // nodes
	ready: domReady, addEvent: addEvent, removeEvent: removeEvent, // events
	createDocument: createDocument, createHTMLDocument: createHTMLDocument, cloneDocument: cloneDocument, // documents
	isVisible: isVisible, whenVisible: whenVisible,
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

var CustomDOM = Meeko.CustomDOM = (function() {

function CustomDOM(options) {
	var style = options.style = _.lc(options.style);
	var styleInfo = CustomDOM.namespaceStyles[style];
	if (!styleInfo) throw Error('Unexpected style: ' + style);
	var ns = options.name = _.lc(options.name);
	if (!ns) throw Error('Unexpected name: ' + ns);
	
	var cdom = this;
	_.assign(cdom, options);
	var separator = styleInfo.separator;
	cdom.prefix = cdom.name + separator;
	cdom.selectorPrefix = cdom.name + (separator === ':' ? '\\:' : separator);
}

_.defaults(CustomDOM.prototype, {

mkTagName: function(name) { return this.prefix + name; },
mkSelector: function(name) { return this.selectorPrefix + name; }

});

CustomDOM.separator = {
	'vendor': '-',
	'xml': ':'
};

CustomDOM.namespaceStyles = {
	'vendor': {
		configNamespace: 'custom',
		separator: '-'
	},
	'xml': {
		configNamespace: 'xmlns',
		separator: ':'
	}
}

_.forOwn(CustomDOM.namespaceStyles, function(styleInfo) {
	styleInfo.configPrefix = styleInfo.configNamespace + styleInfo.separator;
});

CustomDOM.getNamespaces = function(doc) { // NOTE modelled on IE8, IE9 document.namespaces interface
	var namespaces = [];
	_.forEach(_.toArray(doc.documentElement.attributes), function(attr) {
		var style;
		var name;
		var fullName = _.lc(attr.name);
		for (var style in CustomDOM.namespaceStyles) {
			var styleInfo = CustomDOM.namespaceStyles[style];
			if (fullName.indexOf(styleInfo.configPrefix) !== 0) continue;
			var name = fullName.substr(styleInfo.configPrefix.length);
			namespaces.push({
				style: style,
				name: name,
				urn: attr.value
			});
			break;
		}
	});
	return namespaces;
}

return CustomDOM;

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
	str = _.trim(str);
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
	relURL = _.trim(relURL);
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
	resp.document = response.document.cloneNode(true); // TODO handle other response types
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
	resp.document = response.document.cloneNode(true); // TODO handle other response types
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
	if (!_.contains(responseTypes, response.type)) throw Error('Invalid type in response object');
	var request = {
		url: response.url
	}
	_.defaults(request, defaultInfo);
	response.document = normalize(response.document, request);
	cacheAdd(request, response);
},

load: function(url, requestInfo) {
	var info = {
		url: url
	};
	if (requestInfo) _.defaults(info, requestInfo);
	_.defaults(info, defaultInfo);
	if (!_.contains(methods, info.method)) throw Error('method not supported: ' + info.method);
	if (!_.contains(responseTypes, info.responseType)) throw Error('responseType not supported: ' + info.responseType);
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
		asap(onload); // Use delay to stop the readystatechange event interrupting other event handlers (on IE). 
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
		response.document = normalize(xhr.response, info);
		return response;
	}
	else {
		return parseHTML(new String(xhr.responseText), info)
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
	var relURL = _.trim(url);
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
	var urlList = urlSet.split(/\s*,\s*/); // WARN this assumes URLs don't contain ','
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

	_.forOwn(urlAttributes, function(attrList, tag) {
		var elts;
		_.forOwn(attrList, function(attrDesc, attrName) {
			if (!elts) elts = DOM.findAll(tag, doc);
			_.forEach(elts, function(el) {
				attrDesc.resolve(el, baseURL);
			});
		});
	});
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

	_.forEach(DOM.findAll('script', doc), function(node) { // FIXME is this needed anymore, now older browsers are not supported?
		if (!node.type || /^text\/javascript$/i.test(node.type)) node.type = 'text/javascript?disabled';
	});

	_.forEach(DOM.findAll('style', doc.body), function(node) { // TODO support <style scoped>
		doc.head.appendChild(node); // NOTE no adoption
	});
	
	_.forEach(DOM.findAll('style', doc.head), function(node) {
		// TODO the following rewrites url() property values but isn't robust
		var text = styleText(node);
		var replacements = 0;
		text = text.replace(/\burl\(\s*(['"]?)([^\r\n]*)\1\s*\)/ig, function(match, quote, url) {
				absURL = baseURL.resolve(url);
				if (absURL === url) return match;
				replacements++;
				return "url(" + quote + absURL + quote + ")";
			});
		if (replacements) styleText(node, text);
	});

	resolveAll(doc, baseURL, false);

	return doc;	
}

var HTMLParser = Meeko.HTMLParser = (function() {

var HTMLParser = function() { // TODO should this receive options
	if (this instanceof HTMLParser) return;
	return new HTMLParser();
}

function nativeParser(html, details) {

	return pipe(null, [
		
	function() {
		var doc = (new DOMParser).parseFromString(html, 'text/html');
		normalize(doc, details);
		return doc;		
	}
	
	]);

}

function innerHTMLParser(html, details) {
	return pipe(null, [
		
	function() {
		var doc = createHTMLDocument('');
		var docElement = doc.documentElement;
		docElement.innerHTML = html;
		var m = html.match(/<html(?=\s|>)(?:[^>]*)>/i); // WARN this assumes there are no comments containing '<html' and no attributes containing '>'.
		var div = document.createElement('div');
		div.innerHTML = m[0].replace(/^<html/i, '<div');
		var htmlElement = div.firstChild;
		copyAttributes(docElement, htmlElement);
		return doc;
	},
	
	function(doc) {
		normalize(doc, details);
		return doc;
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
	
	copyAttributes(script, node); 
	scriptText(script, scriptText(node));

	if (script.getAttribute('defer')) { // @defer is not appropriate. Implement as @async
		script.removeAttribute('defer');
		script.setAttribute('async', '');
		logger.warn('@defer not supported on scripts');
	}
	if (supportsSync && script.src && !DOM.hasAttribute(script, 'async')) script.async = false;
	script.type = 'text/javascript';
	
	// enabledFu resolves after script is inserted
	var enabledFu = new Promise(); 
	
	var prev = queue[queue.length - 1], prevScript = prev && prev.script;

	var triggerFu; // triggerFu allows this script to be enabled, i.e. inserted
	if (prev) {
		if (DOM.hasAttribute(prevScript, 'async') || script.src && supportsSync && !DOM.hasAttribute(script, 'async')) triggerFu = prev.enabled;
		else triggerFu = prev.complete; 
	}
	else triggerFu = Promise.resolve();
	
	triggerFu.then(enable, enable);

	var completeFu = new Promise();
	completeFu.then(resolve, reject);

	var current = { script: script, complete: completeFu, enabled: enabledFu };
	queue.push(current);
	return;

	// The following are hoisted
	function enable() {
		insertNode('replace', node, script);
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
		addEvent(script, 'load', onLoad);
		addEvent(script, 'error', onError);
	}
	
	function removeListeners() {
		removeEvent(script, 'load', onLoad);
		removeEvent(script, 'error', onError);
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

update: function(data, callback) {
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

function createState(data, title, url) {
	var timeStamp = +(new Date);
	var state = {
		title: title,
		url: url,
		timeStamp: timeStamp,
		data: data
	};
	state[stateTag] = true;
	return state;
}

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
	var promise = asap(task.fn);
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
		if (fail) asap(fail).then(resolve, reject);
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

var framer = Meeko.framer = (function() {

var hfDefaultNamespace = {
	name: 'hf',
	style: 'vendor'
}

var hfHeadTags = _.words('title meta link style script');

var HFrameDefinition = (function() {

function HFrameDefinition(el, frameset) {
	if (!el) return; // in case of inheritance
	this.frameset = frameset;
	this.init(el);
}

_.defaults(HFrameDefinition, {

/*
 Paging handlers are either a function, or an object with `before` and / or `after` listeners. 
 This means that before and after listeners are registered as a pair, which is desirable.
*/
options: { 
	duration: 0
	/* The following options are also available *
	entering: { before: hide, after: show },
	leaving: { before: hide, after: show }
	/**/
}

});

_.defaults(HFrameDefinition.prototype, {

config: function(options) {
	var frameDef = this;
	_.assign(frameDef.options, options);
},

lookup: function(url, details) {
	var frameDef = this;
	var options = frameDef.options;
	if (!options.lookup) return;
	var partial = options.lookup(url, details);
	if (!partial) return;
	return inferChangeset(url, partial);
},

detect: function(doc, details) {
	var frameDef = this;
	var options = frameDef.options;
	if (!options.detect) return;
	var partial = options.detect(doc, details);
	if (!partial) return;
	return inferChangeset(details.url, partial);
},

init: function(el) {
    var frameDef = this;
	var frameset = frameDef.frameset;
	var cdom = frameset.cdom;
	_.defaults(frameDef, {
		options: _.defaults({}, HFrameDefinition.options),
		element: el,
		id: el.id,
		type: el.getAttribute('type'),
		mainSelector: el.getAttribute('main') // TODO consider using a hash in `@src`
    });
	var bodies = frameDef.bodies = [];
	_.forEach(_.toArray(el.childNodes), function(node) {
		var tag = getTagName(node);
		if (!tag) return;
		if (tag === 'script') { // TODO factor out common code with <script for=""> evaluation in <head>
			// FIXME only the first <script> should be eval'd. Latter scripts should produce warnings.
			var script = node;
			if (script.src) {
				logger.warn('Ignoring <script> declaration - @src not compatible with HFrame options scripts');
				return;
			}
			var options;
			try {
				options = (Function('return (' + scriptText(script) + ');'))();
			}
			catch(err) { 
				Task.postError(err);
				return; 
			}
			_.assign(frameDef.options, options);
			return;
		}
		if (_.contains(hfHeadTags, tag)) return; // ignore typical <head> elements
		if (tag === cdom.mkTagName('body')) {
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
	var cdom = frameset.cdom;
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
	if (_.contains(conditions, condition)) return condition;
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
	var cdom = frameset.cdom;
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
	_.forEach(_.toArray(el.childNodes), function(node) {
		if (getTagName(node) === cdom.mkTagName('transform')) {
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
	var cdom = frameset.cdom;
	var fragment;
	if (bodyDef.transforms.length <= 0) {
		return bodyDef.element.cloneNode(true);
	}
	if (!resource) return null;
	var doc = resource.document; // FIXME what if resource is a Request?
	if (!doc) return null;
	fragment = doc;
	if (details.mainSelector) fragment = DOM.find(details.mainSelector, doc);
	_.forEach(bodyDef.transforms, function(transform) {
		fragment = transform.process(fragment, details);
	});
	var el = bodyDef.element.cloneNode(false);
	DOM.insertNode('beforeend', el, fragment);
	return el;
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
	var cdom = frameset.cdom;
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
	var processor = transform.processor = framer.createProcessor(transform.type);
	processor.loadTemplate(frag);
},

process: function(srcNode, details) {
	var transform = this;
	var frameset = transform.frameset;
	var cdom = frameset.cdom;
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
	this.init(doc, settings);
}

_.defaults(HFramesetDefinition, {

options: {
	// lookup: function(url, details) {},
	// detect: function(doc, details) {}
}

});

_.defaults(HFramesetDefinition.prototype, {

config: function(options) {
	var frameset = this;
	_.assign(frameset.options, options);
},

lookup: function(url, details) {
	var frameset = this;
	var options = frameset.options;
	if (!options.lookup) return;
	var partial = options.lookup(url, details);
	if (!partial) return;
	return inferChangeset(url, partial);
},

detect: function(doc, details) {
	var frameset = this;
	var options = frameset.options;
	if (!options.detect) return;
	var partial = options.detect(doc, details);
	if (!partial) return;
	return inferChangeset(details.url, partial);
},

init: function(doc, settings) {
	var frameset = this;
	_.defaults(frameset, {
		options: _.defaults({}, HFramesetDefinition.options),
		frames: {} // all hyperframe definitions. Indexed by @id (which may be auto-generated)
	});

	var hfNS = hfDefaultNamespace;
	frameset.namespaces = CustomDOM.getNamespaces(doc);
	_.some(frameset.namespaces, function(ns) {
		if (_.lc(ns.urn) !== 'hyperframeset') return false;
		hfNS = ns;
		return true;
	});
	
	var cdom = frameset.cdom = new CustomDOM(hfNS);

	// NOTE first rebase scope: urls
	var scopeURL = URL(settings.scope);
	rebase(doc, scopeURL);
	
	var body = doc.body;
	body.parentNode.removeChild(body);
	frameset.document = doc;
	frameset.element = body;
	var frameElts = DOM.findAll(frameset.mkSelector('frame'), body);
	var frameDefElts = [];
	var frameRefElts = [];
	_.forEach(frameElts, function(el, index) { // FIXME hyperframes can't be outside of <body> OR descendants of repetition blocks
		// NOTE first rebase @src with scope: urls
		var src = el.getAttribute('src');
		if (src) {
			var newSrc = rebaseURL(src, scopeURL);
			if (newSrc != src) el.setAttribute('src', newSrc);
		}
		
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

mkSelector: function(selector) {
	var cdom = this.cdom;
	var tags = selector.split(/\s*,\s*|\s+/);
	return _.map(tags, function(tag) { return cdom.mkSelector(tag); }).join(', ');
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
 
var controllers = (function() {

return {

values: {},

listeners: {},

create: function(name) {
	this.values[name] = [];
	this.listeners[name] = [];
},

has: function(name) {
	return (name in this.values);
},

get: function(name) { 
	if (!this.has(name)) throw name + ' is not a registered controller';
	return this.values[name];
},

set: function(name, value) {
	if (!this.has(name)) throw name + ' is not a registered controller';
	if (value === false || value == null) value = [];
	else if (typeof value === 'string' || !('length' in value)) value = [ value ];
	var oldValue = this.values[name];
	if (_.difference(value, oldValue).length <= 0) return;
	this.values[name] = value;
	_.forEach(this.listeners[name], function(listener) {
		Task.asap(function() { listener(value); });
	});	
},

listen: function(name, listener) {
	if (!this.has(name)) throw name + ' is not a registered controller';
	this.listeners[name].push(listener);
	var value = this.values[name];
	Task.asap(function() { listener(value) });
}

};

})();

var Layer = (function() {

var Layer = sprockets.evolve(sprockets.RoleType, {

role: 'layer'

});

var zIndex = 1;

_.assign(Panel, {

attached: function() {
	this.css('z-index', zIndex++);
}

});

return Layer;
});

var Panel = (function() {

var Panel = sprockets.evolve(sprockets.RoleType, {

role: 'panel',

});

_.assign(Panel, {

attached: function() {
	var height = this.attr('height');
	if (height) this.css('height', height); // FIXME units
	var width = this.attr('width');
	if (width) this.css('width', width); // FIXME units
	var minWidth = this.attr('minwidth');
	if (minWidth) this.css('min-width', minWidth); // FIXME units
}, 

enteredDocument: function() {
	var panel = this;
	var name = panel.attr('name'); 
	var value = panel.attr('value'); 
	if (!name && !value) return;
	panel.ariaToggle('hidden', true);
	if (!name) return; // being controlled by an ancestor
	controllers.listen(name, function(values) {
		panel.ariaToggle('hidden', !(_.contains(values, value)));
	});

}

});

return Panel;
})();

var Layout = (function() { // a Layout is a list of Panel (or other Layout) and perhaps separators for hlayout, vlayout

var Layout = sprockets.evolve(sprockets.RoleType, {

role: 'group',

owns: {
	get: function() { return _.filter(this.element.children, function(el) { return DOM.matches(el, framer.definition.mkSelector('hlayout, vlayout, deck, rdeck, panel, frame')); }); }
}

});

_.assign(Layout, {

attached: function() {
	Panel.attached.call(this);
},

enteredDocument: function() {
	var element = this.element;
	var parent = element.parentNode;
	if (DOM.matches(parent, framer.definition.mkSelector('layer'))) { // TODO vh, vw not tested on various platforms
		var height = this.attr('height'); // TODO css unit parsing / validation
		if (!height) height = '100vh';
		else height = height.replace('%', 'vh');
		this.css('height', height); // FIXME units
		var width = this.attr('width'); // TODO css unit parsing / validation
		if (!width) width = '100vw';
		else width = width.replace('%', 'vw');
		if (width) this.css('width', width); // FIXME units
	}
	_.forEach(_.toArray(element.childNodes), normalizeChild, element);
	return;
	
	function normalizeChild(node) {
		var element = this;
		if (DOM.matches(node, framer.definition.mkSelector('hlayout, vlayout, deck, rdeck, panel, frame'))) return; // FIXME doesn't take into account custom ns and other layout tags
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
}

});

return Layout;
})();

var VLayout = (function() {

var VLayout = sprockets.evolve(Layout, {
});

_.assign(VLayout, {

attached: function() {
	Layout.attached.call(this);
	var hAlign = this.attr('align'); // FIXME assert left/center/right/justify - also start/end (stretch?)
	if (hAlign) this.css('text-align', hAlign); // NOTE defaults defined in <style> above
},

enteredDocument: function() {
	Panel.enteredDocument.call(this);
	Layout.enteredDocument.call(this);
	_.forEach(this.ariaGet('owns'), function(panel) {
	});
}

});

return VLayout;
})();

var HLayout = (function() {

var HLayout = sprockets.evolve(Layout, {
});

_.assign(HLayout, {

attached: function() {
	Layout.attached.call(this);
},

enteredDocument: function() {
	Panel.enteredDocument.call(this);
	Layout.enteredDocument.call(this);
	var vAlign = this.attr('align'); // FIXME assert top/middle/bottom/baseline - also start/end (stretch?)
	_.forEach(this.ariaGet('owns'), function(panel) {
		if (vAlign) panel.$.css('vertical-align', vAlign);
	});
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
		if (item && !_.contains(panels, item)) throw Error('set activedescendant failed: item is not child of deck');
		_.forEach(panels, function(child) {
			if (child === item) child.ariaToggle('hidden', false);
			else child.ariaToggle('hidden', true);
		});
	
	}
}

	
});

_.assign(Deck, {

attached: function() {
	Layout.attached.call(this);
},

enteredDocument: function() {
	Layout.enteredDocument.call(this);
	var deck = this;
	var name = deck.attr('name'); 
	if (!name) {
		deck.ariaSet('activedescendant', deck.ariaGet('owns')[0]);
		return;
	}
	controllers.listen(name, function(values) {
		var panels = deck.ariaGet('owns');
		var active;
		_.some(panels, function(child) { 
			var value = child.getAttribute('value');
			if (!_.contains(values, value)) return false;
			active = child;
			return true;
		});
		if (active) deck.ariaSet('activedescendant', active);
	});

}

});

return Deck;
})();

var ResponsiveDeck = (function() {

var ResponsiveDeck = sprockets.evolve(Deck, {
	
});

_.assign(ResponsiveDeck, {

attached: function() {
	Deck.attached.call(this);
},

enteredDocument: function() {
	Deck.enteredDocument.call(this);
	var width = parseFloat(window.getComputedStyle(this.element, null).width);
	var panels = this.ariaGet('owns');
	var activePanel;
	_.some(panels, function(panel) {
		var minWidth = window.getComputedStyle(panel, null).minWidth;
		if (minWidth == null || minWidth === '' || minWidth === '0px') {
			activePanel = panel;
			return true;
		}
		minWidth = parseFloat(minWidth); // FIXME minWidth should be "NNNpx" but need to test
		if (minWidth > width) return false;
		activePanel = panel;
		return true;
	});
	if (activePanel) {
		activePanel.$.css('height', '100%');
		activePanel.$.css('width', '100%');
		this.ariaSet('activedescendant', activePanel);
	}
}

});

return ResponsiveDeck;
})();


function registerLayoutElements() {

var framesetDef = framer.definition;

sprockets.registerElement(framesetDef.mkSelector('layer'), Layer);
sprockets.registerElement(framesetDef.mkSelector('panel'), Panel);
sprockets.registerElement(framesetDef.mkSelector('vlayout'), VLayout);
sprockets.registerElement(framesetDef.mkSelector('hlayout'), HLayout);
sprockets.registerElement(framesetDef.mkSelector('deck'), Deck);
sprockets.registerElement(framesetDef.mkSelector('rdeck'), ResponsiveDeck);

var cssText = [
'*[hidden] { display: none !important; }', // TODO maybe not !important
'html, body { margin: 0; padding: 0; }',
'html { width: 100%; height: 100%; }',
framesetDef.mkSelector('layer, hlayout, vlayout, deck, rdeck, panel, frame, body') + ' { box-sizing: border-box; }', // TODO http://css-tricks.com/inheriting-box-sizing-probably-slightly-better-best-practice/
framesetDef.mkSelector('layer') + ' { display: block; position: fixed; top: 0; left: 0; width: 0; height: 0; overflow: visible; }',
framesetDef.mkSelector('hlayout, vlayout, deck, rdeck') + ' { display: block; width: 0; height: 0; overflow: hidden; text-align: left; margin: 0; padding: 0; }', // FIXME text-align: start
framesetDef.mkSelector('hlayout, vlayout, deck, rdeck') + ' { width: 100%; height: 100%; }', // FIXME should be 0,0 before manual calculations
framesetDef.mkSelector('frame, panel') + ' { display: block; width: auto; height: auto; overflow: auto; text-align: left; margin: 0; padding: 0; }', // FIXME text-align: start
framesetDef.mkSelector('body') + ' { display: block; width: auto; height: auto; overflow: hidden; margin: 0; }',
framesetDef.mkSelector('vlayout') + ' { height: 100%; overflow: hidden; }',
framesetDef.mkSelector('hlayout') + ' { width: 100%; overflow: hidden; }',
framesetDef.mkSelector('vlayout') + ' > * { display: block; width: 100%; height: auto; text-align: left; }',
framesetDef.mkSelector('hlayout') + ' > * { display: block; float: left; width: auto; height: 100%; vertical-align: top; }',
framesetDef.mkSelector('hlayout') + '::after { clear: both; }',
framesetDef.mkSelector('deck') + ' > * { width: 100%; height: 100%; }',
framesetDef.mkSelector('rdeck') + ' > * { width: 0; height: 0; }',
].join('\n');

var style = document.createElement('style');
styleText(style, cssText);
document.head.insertBefore(style, document.head.firstChild);

}

var HFrame = (function() {

var HFrame = sprockets.evolve(sprockets.RoleType, {

role: 'frame',

init: function() {
	var frame = this;
	_.defaults(frame, {
		frames: [],
		bodyElement: null,
		name: frame.attr('name'),
		src: frame.attr('src'),
		mainSelector: frame.attr('main') // TODO consider using a hash in `@src`
    });
},

frameEntered: function(frame) {
	this.frames.push(frame);
},

frameLeft: function(frame) {
	var index = this.frames.indexOf(frame);
	this.frames.splice(index);
},

preload: function(request) {
	var frame = this;
	return pipe(request, [
		
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
	return pipe(response, [
	
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
	if (frame.bodyElement) frame.element.removeChild(frame.bodyElement);
	DOM.insertNode('beforeend', frame.element, bodyElement);
	frame.bodyElement = bodyElement;
},

});

_.assign(HFrame, {

attached: Panel.attached

});

return HFrame;	
})();


var HFrameset = (function() {
	
var HFrameset = sprockets.evolve(sprockets.RoleType, {

role: 'frameset',
isFrameset: true,

init: function() {
	this.frames = [];	
},

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
	
	return pipe(null, [

	function() {
		mergeElement(dstBody, srcBody);

		_.forEach(_.toArray(srcBody.childNodes), function(node) {
			DOM.insertNode('beforeend', dstBody, node);
		});
	}

	]);

}

});

_.defaults(HFrameset, {
	
prerender: function(dstDoc, definition) {

	if (getFramesetMarker(dstDoc)) throw Error('The HFrameset has already been applied');

	var srcDoc = cloneDocument(definition.document);

	var selfMarker;
	
	return pipe(null, [

	function() {
		var dstBody = dstDoc.body;
		var node;
		while (node = dstBody.firstChild) dstBody.removeChild(node);
	},

	function() {
		selfMarker = getSelfMarker(dstDoc);
		if (selfMarker) return;
		selfMarker = dstDoc.createElement('link');
		selfMarker.rel = selfRel;
		selfMarker.href = dstDoc.URL;
		dstDoc.head.insertBefore(selfMarker, dstDoc.head.firstChild); // NOTE no adoption
	},

	function() {
		var framesetMarker = dstDoc.createElement('link');
		framesetMarker.rel = framesetRel;
		framesetMarker.href = definition.src;
		dstDoc.head.insertBefore(framesetMarker, selfMarker); // NOTE no adoption
	},
	
	function() {
		mergeElement(dstDoc.documentElement, srcDoc.documentElement);
		mergeElement(dstDoc.head, srcDoc.head);
		mergeHead(dstDoc, srcDoc.head, true);
		// allow scripts to run. FIXME scripts should always be appended to document.head
		var forScripts = [];
		_.forEach(DOM.findAll('script', dstDoc.head), function(script) {
			var forAttr = script.getAttribute('for');
			if (forAttr) { // TODO possibly we want to evaluate forScripts in document order
				forScripts.push(script);
				return;
			}
			scriptQueue.push(script);
		});
		return scriptQueue.empty().then(function() { return forScripts; });
	},
	
	function(forScripts) {
		_.forEach(forScripts, function(script) {
			var forAttr = script.getAttribute('for');
			if (script.src) {
				logger.warn('Ignoring <script> declaration - @for not compatible with @src');
				return;
			}
			var forOptions;
			try {
				forOptions = (Function('return (' + scriptText(script) + ');'))();
			}
			catch(err) { 
				Task.postError(err);
				return; 
			}
			
			var cdom = definition.cdom;
			switch(forAttr) {
			case cdom.mkTagName('frameset'):
				definition.config(forOptions);
				break;
			case cdom.mkTagName('frame'):
				_.assign(HFrameDefinition.options, forOptions);
				break;
			default:
				logger.warn('Unsupported value of @for on <script>: ' + forAttr);
			}
		}); // FIXME this breaks if a script inserts other scripts
	}
	
	]);

}

});

function separateHead(dstDoc, isFrameset) {
	var dstHead = dstDoc.head;
	var framesetMarker = getFramesetMarker(dstDoc);
	if (!framesetMarker) throw Error('No ' + framesetRel + ' marker found. ');

	var selfMarker = getSelfMarker(dstDoc);
	// remove frameset / page elements except for <script type=text/javascript>
	if (isFrameset) _.forEach(siblings('after', framesetMarker, 'before', selfMarker), remove);
	else _.forEach(siblings('after', selfMarker), remove);
	
	function remove(node) {
		if (getTagName(node) == 'script' && (!node.type || node.type.match(/^text\/javascript/i))) return;
		dstHead.removeChild(node);
	}
}

function mergeHead(dstDoc, srcHead, isFrameset) {
	var baseURL = URL(dstDoc.URL);
	var dstHead = dstDoc.head;
	var framesetMarker = getFramesetMarker();
	if (!framesetMarker) throw Error('No ' + framesetRel + ' marker found. ');
	var selfMarker = getSelfMarker();

	separateHead(dstDoc, isFrameset);

	_.forEach(_.toArray(srcHead.childNodes), function(srcNode) {
		if (srcNode.nodeType != 1) return;
		switch (getTagName(srcNode)) {
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
			break;
		}
		if (isFrameset) insertNode('beforebegin', selfMarker, srcNode);
		else insertNode('beforeend', dstHead, srcNode);
		if (getTagName(srcNode) == 'link') srcNode.href = srcNode.getAttribute('href'); // Otherwise <link title="..." /> stylesheets don't work on Chrome
	});
}

function mergeElement(dst, src) { // NOTE this removes all dst (= landing page) attrs and imports all src (= frameset) attrs.
	removeAttributes(dst);
	copyAttributes(dst, src);
	dst.removeAttribute('style'); // FIXME is this appropriate? There should at least be a warning
}

var framesetRel = 'frameset'; // NOTE http://lists.w3.org/Archives/Public/www-html/1996Dec/0143.html
var selfRel = 'self';
var framesetRelRegex = new RegExp('\\b' + framesetRel + '\\b', 'i');
function getFramesetMarker(doc) {
	if (!doc) doc = document;
	var marker = firstChild(doc.head, function(el) {
		return el.nodeType == 1 &&
			getTagName(el) == 'link' &&
			framesetRelRegex.test(el.rel);
	});
	return marker;
}

var selfRelRegex = new RegExp('\\b' + selfRel + '\\b', 'i');
function getSelfMarker(doc) {
	if (!doc) doc = document;
	var marker = firstChild(doc.head, function(el) {
		return el.nodeType == 1 &&
			getTagName(el) == 'link' &&
			selfRelRegex.test(el.rel);
	});
	return marker;
}

return HFrameset;
})();


var notify = function(msg) { // FIXME this isn't being used called everywhere it should
	var module;
	switch (msg.module) {
	case 'frameset': module = framer.definition.options; break;
	case 'frame': module = HFrameDefinition.options; break;
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
		var promise = asap(function() { listener(msg); }); // TODO isFunction(listener)
		promise['catch'](function(err) { throw Error(err); });
		return promise;
	}
	else return Promise.resolve();
}


var framer = {};

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
		httpProxy.add({
			url: document.URL,
			type: 'document',
			document: doc
		});
	});
	
	return pipe(null, [
		
	function() { // sanity check
		return wait(function() { return !!document.body; });		
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
		framer.framesetURL = framesetURL.nohash;
		return httpProxy.load(framer.framesetURL, { responseType: 'document' })
		.then(function(response) {
			var framesetDoc = response.document;
			return new HFramesetDefinition(framesetDoc, framerConfig);
		});
	},

	function(definition) {
		framer.definition = definition;
		return HFrameset.prerender(document, definition);
	},
	
	function () {
		var url = document.URL;
		var changeset = framer.currentChangeset = framer.definition.lookup(url, {
			referrer: document.referrer
		});
		// FIXME what if no changeset is returned
		return historyManager.start(changeset, '', document.URL,
				function(state) { }, // FIXME need some sort of rendering status
				function(state) { return framer.onPopState(state.getData()); }
			);
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
		
		registerLayoutElements();

		sprockets.registerElement('body', { // FIXME should target the body using 'hf-frameset' as @is
			prototype: HFrameset.prototype, 
			attached: function() {
				var frameset = this;
				frameset.definition = framer.definition;
				if (frameset.init) frameset.init();
				frameset._ready = {};
				frameset.ready = new Promise(frameset._ready); // FIXME should this be in the HFrameset definition?
			}, 
			enteredDocument: function() {
				var frameset = this;
				framer.frameset = frameset;
				frameset.render()
				.then(function() { frameset._ready.resolve(); }); 
			},
			leftDocument: function() { // FIXME should never be called??
				delete framer.frameset;
			},
			handlers: [
			{
				type: 'requestnavigation',
				action: function(e) {
					if (e.defaultPrevented) return;
					var acceptDefault = framer.onRequestNavigation(e, this);
					if (acceptDefault === false) e.preventDefault();
				}
			}
			]
			
			});

		sprockets.registerElement(framer.definition.mkSelector('frame'), {
			prototype: HFrame.prototype,
			attached: function() {
				HFrame.attached.call(this);
				var frame = this;
				var defId = frame.attr('def');
				frame.definition = framer.definition.frames[defId];
				if (frame.init) frame.init();
			},
			enteredDocument: function() {
				var frame = this;
				var parentFrame;
				var parentElement = DOM.closest(frame.element.parentNode, framer.definition.mkSelector('frame')); // TODO frame.element.parentNode.ariaClosest('frame')
				if (parentElement) parentFrame = HFrame(parentElement);
				else {
					parentElement = document.body; // TODO  frame.elenent.parentNode.ariaClosest('frameset'); 
					parentFrame = HFrameset(parentElement);
				}
				frame.parentFrame = parentFrame;
				parentFrame.frameEntered(frame);
				framer.frameEntered(frame);
			},
			leftDocument: function() {
				var frame = this;
				frame.parentFrame.frameLeft(frame);
				delete frame.parentFrame;
				// FIXME notify framer
			},
			
			handlers: [
			{
				type: 'requestnavigation',
				action: function(e) {
					if (e.defaultPrevented) return;
					var acceptDefault = framer.onRequestNavigation(e, this);
					if (acceptDefault === false) e.preventDefault();
				}
			}
			]
			
			});

		return sprockets.start(); // FIXME should be a promise
	},
	
	function() { // NOTE this doesn't prevent start() from resolving
		pipe(null, [

		function() {
			return notify({ // FIXME should this be called before stylesheets are confirmed?
				module: 'frameset',
				type: 'enteredState',
				stage: 'before',
				url: document.URL
			});
		},
		
		function() {
			return HFrameset(document.body).ready;
		},
		
		function() { // FIXME this should wait until at least the landing document has been rendered in one frame
			return notify({
				module: 'frameset',
				type: 'enteredState',
				stage: 'after',
				url: document.URL
			});
		}
		
		]);
	},

	// TODO it would be nice if <body> wasn't populated until stylesheets were loaded
	function() {
		return wait(function() { return checkStyleSheets(); })
	}	
	
	]);

	
},

onClick: function(e) { // return false means success
	var framer = this;

	if (e.button != 0) return; // FIXME what is the value for button in IE's W3C events model??
	if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return; // FIXME do these always trigger modified click behavior??

	// Find closest <a href> to e.target
	var linkElement = DOM.closest(e.target, 'a, [link]');
	if (!linkElement) return;
	var hyperlink;
	if (getTagName(linkElement) === 'a') hyperlink = linkElement;
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
		_.forEach(_.toArray(form.elements), function(el) {
			if (!el.name) return;
			data.push(el.name + '=' + encodeURIComponent(el.value));
		});
		return data.join('&');
	}
},

triggerRequestNavigation: function(url, details) {
	asap(function() {
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
		var changeset = frame.definition.lookup(url, details);
		if (!changeset) return false;
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
		if (frame.name !== target) return;
		frames.push(frame);
		return true;
	});
	
	var fullURL = URL(url);
	var hash = fullURL.hash;
	var nohash = fullURL.nohash;
	var request = { method: 'get', url: nohash, responseType: 'document' }; // TODO one day may support different response-type
	var response;

	return pipe(null, [

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
	function() {
		if (mustNotify) return notify({ // FIXME need a timeout on notify
			module: 'frameset',
			type: 'enteredState',
			stage: 'before',
			url: url
			// TODO details, resource, url, frames??
			});
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
			if (DOM.isVisible(frame.element)) frame.load(response); // FIXME if !isVisible then **probably** handled by framer.frameEntered code
		});
	}
	
	function recurseFrames(parentFrame, fn) {
		_.forEach(parentFrame.frames, function(frame) {
			var found = fn(frame);
			if (!found) recurseFrames(frame, fn);
		});			
	}
},

frameEntered: function(frame) {
	if (frame.name === framer.currentChangeset.target) { // FIXME should only be used at startup
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
	return pipe(null, [ // FIXME how to handle `hash` if present??
	
	function() { return frame.preload(request); },
	function() { return httpProxy.load(nohash, request); },
	function(response) { return frame.load(response); }

	]);

	});
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
	if (result == null) return null;

	// FIXME error if `result` is a relative URL
	if (typeof result === 'string') result = implyFramesetScope(result, docURL);
	if (typeof result !== 'object' || !result.scope || !result.framesetURL) throw Error('Unexpected result from frameset lookup');
	return result;
},

detect: function(srcDoc) {
	var framer = this;
	if (!framer.options.detect) return;
	var result = framer.options.detect(srcDoc);
	if (result == null) return null;

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
	_.assign(framer.options, options);
}

});


_.defaults(framer, {

decoders: {},

registerDecoder: function(type, constructor) {
	this.decoders[type] = constructor;
},

createDecoder: function(type) {
	return new this.decoders[type];	
},

processors: {},

registerProcessor: function(type, constructor) {
	this.processors[type] = constructor;
},

createProcessor: function(type) {
	return new this.processors[type];	
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

