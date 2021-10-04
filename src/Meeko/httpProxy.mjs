import * as _ from './stuff.mjs';
import URL from './URL.mjs';
import * as DOM from './DOM.mjs';
import Thenfu from './Thenfu.mjs';
import htmlParser from './htmlParser.mjs';

/*
	HTML_IN_XHR indicates if XMLHttpRequest supports HTML parsing
*/
const HTML_IN_XHR = (function() { // FIXME more testing, especially Webkit
	if (!window.XMLHttpRequest) return false;
	let xhr = new XMLHttpRequest;
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


let httpProxy = (function() {

	let methods = _.words('get'); // TODO words('get post put delete');
	let responseTypes = _.words('document'); // TODO words('document json text');
	let defaultInfo = {
		method: 'get',
		responseType: 'document'
	}

// NOTE cache, etc is currently used only for landing page
// TODO test that cacheAdd/Lookup doesn't trigger new XHR when url already pending
// TODO an API like ServiceWorker may be more appropriate
	let cache = [];

	function cacheAdd(request, response) {
		let rq = _.defaults({}, request);
		let resp;

		let entry = {
			invalid: false,
			request: rq
		};

		if (Thenfu.isThenable(response)) entry.response = response.then(
			cloneResponse,
			function (status) {
				entry.invalid = true;
				entry.response = null;
			}
		);
		else entry.response = cloneResponse(response);

		cache.push(entry);
	}

	function cacheLookup(request) {
		let entry = _.find(cache, function (entry) {
			if (!cacheMatch(request, entry)) return false;
			return true;
		});
		if (!(entry && entry.response)) return;
		let response = entry.response;
		if (Thenfu.isThenable(response)) return response.then(cloneResponse);
		else return cloneResponse(response);
	}

	function cacheMatch(request, entry) {
		if (entry.invalid || entry.response == null) return false;
		if (request.url !== entry.request.url) return false;
		// FIXME what testing is appropriate?? `method`, other headers??
		return true;
	}

	function cloneResponse(response) {
		let resp = _.defaults({}, response);
		resp.document = DOM.cloneDocument(response.document); // TODO handle other response types
		return resp;
	}


	let httpProxy = {

		HTML_IN_XHR: HTML_IN_XHR,

		add: function (response) { // NOTE this is only for the landing page
			let url = response.url;
			if (!url) throw Error('Invalid url in response object');
			if (!_.includes(responseTypes, response.type)) throw Error('Invalid type in response object');
			let request = {
				url: response.url
			}
			_.defaults(request, defaultInfo);
			return Thenfu.pipe(undefined, [

				function () {
					return htmlParser.normalize(response.document, request);
				},
				function (doc) {
					response.document = doc;
					cacheAdd(request, response);
				}

			]);
		},

		load: function (url, requestInfo) {
			let info = {
				url: url
			};
			if (requestInfo) _.defaults(info, requestInfo);
			_.defaults(info, defaultInfo);
			if (!_.includes(methods, info.method)) throw Error('method not supported: ' + info.method);
			if (!_.includes(responseTypes, info.responseType)) throw Error('responseType not supported: ' + info.responseType);
			return request(info);
		}

	}

	let request = function (info) {
		let sendText = null;
		let method = _.lc(info.method);
		switch (method) {
			case 'post':
				throw Error('POST not supported'); // FIXME proper error handling
				info.body = serialize(info.body, info.type);
				return doRequest(info);
				break;
			case 'get':
				let response = cacheLookup(info);
				if (response) return Thenfu.resolve(response);
				return doRequest(info)
					.then(function (response) {
						cacheAdd(info, response);
						return response;
					});
				break;
			default:
				throw Error(_.uc(method) + ' not supported');
				break;
		}
	}

	let doRequest = function (info) {
		return new Thenfu(function (resolve, reject) {
			let method = info.method;
			let url = info.url;
			let sendText = info.body; // FIXME not-implemented
			let xhr = new XMLHttpRequest;
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
				let protocol = new URL(url).protocol;
				switch (protocol) {
					case 'http:':
					case 'https:':
						switch (xhr.status) {
							default:
								reject(function () {
									throw Error('Unexpected status ' + xhr.status + ' for ' + url);
								});
								return;

							// FIXME what about other status codes?
							case 200:
								break; // successful so just continue
						}
						break;

					default:
						if (HTML_IN_XHR ? !xhr.response : !xhr.responseText) {
							reject(function () {
								throw Error('No response for ' + url);
							});
							return;
						}
						break;
				}

				Thenfu.defer(onload); // Use delay to stop the readystatechange event interrupting other event handlers (on IE).
			}

			function onload() {
				let result = handleResponse(xhr, info);
				resolve(result);
			}
		});
	}

	function handleResponse(xhr, info) { // TODO handle info.responseType
		let response = {
			url: info.url,
			type: info.responseType,
			status: xhr.status,
			statusText: xhr.statusText
		};
		if (HTML_IN_XHR) {
			return htmlParser.normalize(xhr.response, info)
				.then(function (doc) {
					response.document = doc;
					return response;
				});
		} else {
			return htmlParser.parse(new String(xhr.responseText), info)
				.then(function (doc) {
					response.document = doc;
					return response;
				});
		}
	}

	return httpProxy;
})();

export default httpProxy;
