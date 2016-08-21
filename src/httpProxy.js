(function() {

var window = this;
var Meeko = window.Meeko;
var _ = Meeko.stuff;
var URL = Meeko.URL;
var DOM = Meeko.DOM;
var Promise = Meeko.Promise;
var htmlParser = Meeko.htmlParser;

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


var httpProxy = Meeko.httpProxy = (function() {

var methods = _.words('get'); // TODO words('get post put delete');
var responseTypes = _.words('document'); // TODO words('document json text');
var defaultInfo = {
	method: 'get',
	responseType: 'document'
}

// NOTE cache, etc is currently used only for landing page
// TODO test that cacheAdd/Lookup doesn't trigger new XHR when url already pending
// TODO an API like ServiceWorker may be more appropriate
var cache = [];

function cacheAdd(request, response) {
	var rq = _.defaults({}, request);
	var resp;

	var entry = {
		invalid: false,
		request: rq
	};

	if (Promise.isPromise(response)) entry.response = response.then(
		cloneResponse,
		function(status) { 
			entry.invalid = true; 
			entry.response = null; 
		}
	);
	else entry.response = cloneResponse(response);

	cache.push(entry);
}

function cacheLookup(request) {
	var entry = _.find(cache, function(entry) {
		if (!cacheMatch(request, entry)) return false;
		return true;
	});
	if (!(entry && entry.response)) return;
	var response = entry.response;
	if (Promise.isPromise(response)) return response.then(cloneResponse);
	else return cloneResponse(response);
}

function cacheMatch(request, entry) {
	if (entry.invalid || entry.response == null) return false;
	if (request.url !== entry.request.url) return false;
	// FIXME what testing is appropriate?? `method`, other headers??
	return true;
}

function cloneResponse(response) {
	var resp = _.defaults({}, response);
	resp.document = DOM.cloneDocument(response.document); // TODO handle other response types
	return resp;
}


var httpProxy = {

HTML_IN_XHR: HTML_IN_XHR,

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
		return htmlParser.normalize(response.document, request);
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
	if (HTML_IN_XHR) {
		xhr.responseType = info.responseType;
		// WARN overrideMimeType is needed for file:/// on Firefox
		// TODO test cross-browser
		// FIXME shouldn't be assuming text/html
		if (info.responseType === 'document' && xhr.overrideMimeType) xhr.overrideMimeType('text/html');
	}
	xhr.send(sendText);
	function onchange() { // FIXME rewrite this to use onload/onerror/onabort/ontimeout
		if (xhr.readyState != 4) return;
		var protocol = new URL(url).protocol;
		switch (protocol) {
		case 'http:': case 'https:':
			switch (xhr.status) {
			default:
				reject(function() { throw Error('Unexpected status ' + xhr.status + ' for ' + url); });
				return;
				
			// FIXME what about other status codes?
			case 200:
				break; // successful so just continue
			}
			break;

		default:
			if (HTML_IN_XHR ? !xhr.response : !xhr.responseText) {
				reject(function() { throw Error('No response for ' + url); });
				return;
			}
			break;
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
		return htmlParser.normalize(xhr.response, info)
		.then(function(doc) {
			response.document = doc;
			return response;
		});
	}
	else {
		return htmlParser.parse(new String(xhr.responseText), info)
		.then(function(doc) {
				response.document = doc;
				return response;
		});
	}
}

return httpProxy;

})();

}).call(this);

