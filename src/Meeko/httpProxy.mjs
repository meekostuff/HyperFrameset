
/*!
 * httpProxy
 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */
import * as _ from './stuff.mjs';
import URLux from './URLux.mjs';
import * as DOM from './DOM.mjs';
import Thenfu from './Thenfu.mjs';
import htmlParser from './htmlParser.mjs';

/** @constant {boolean} XMLHttpRequest supports responseType 'document' */
const HTML_IN_XHR = true;

/**
 * HTTP client with response caching and HTML document parsing.
 * Fetches URLs via XMLHttpRequest, parses responses into DOM documents,
 * and caches GET responses by URL.
 */
class HttpProxy {
	#methods = _.words('get'); // TODO words('get post put delete');
	#responseTypes = _.words('document'); // TODO words('document json text');
	#defaultInfo = {
		method: 'get',
		responseType: 'document'
	};
	#cache = [];

	#cacheAdd(request, response) {
		const rq = _.defaults({}, request);
		const entry = {
			invalid: false,
			request: rq
		};

		if (Thenfu.isThenable(response)) entry.response = response.then(
			this.#cloneResponse,
			(status) => {
				entry.invalid = true;
				entry.response = null;
			}
		);
		else entry.response = this.#cloneResponse(response);

		this.#cache.push(entry);
	}

	#cacheLookup(request) {
		const entry = _.find(this.#cache, (entry) => {
			if (!this.#cacheMatch(request, entry)) return false;
			return true;
		});
		if (!(entry && entry.response)) return;
		const response = entry.response;
		if (Thenfu.isThenable(response)) return response.then(this.#cloneResponse);
		else return this.#cloneResponse(response);
	}

	#cacheMatch(request, entry) {
		if (entry.invalid || entry.response == null) return false;
		if (request.url !== entry.request.url) return false;
		// FIXME what testing is appropriate?? `method`, other headers??
		return true;
	}

	#cloneResponse(response) {
		const resp = _.defaults({}, response);
		resp.document = DOM.cloneDocument(response.document); // TODO handle other response types
		return resp;
	}

	/**
	 * Add a pre-existing response to the cache.
	 * The document is normalized (relative URLs resolved) before caching.
	 * @param {Object} response
	 * @param {string} response.url - The URL to cache under
	 * @param {string} response.type - Response type ('document')
	 * @param {Document} response.document - The document to cache
	 * @returns {Promise} Resolves when caching is complete
	 */
	add(response) { // NOTE this is only for the landing page
		const url = response.url;
		if (!url) throw Error('Invalid url in response object');
		if (!_.includes(this.#responseTypes, response.type)) throw Error('Invalid type in response object');
		const request = {
			url: response.url
		};
		_.defaults(request, this.#defaultInfo);
		return Thenfu.pipe(undefined, [

			() => htmlParser.normalize(response.document, request),
			(doc) => {
				response.document = doc;
				this.#cacheAdd(request, response);
			}

		]);
	}

	/**
	 * Fetch a URL, returning a cached response if available.
	 * @param {string} url - URL to fetch
	 * @param {Object} [requestInfo]
	 * @param {string} [requestInfo.method='get'] - HTTP method
	 * @param {string} [requestInfo.responseType='document'] - Response type
	 * @returns {Promise} Resolves with { url, type, status, statusText, document }
	 */
	load(url, requestInfo) {
		const info = {
			url: url
		};
		if (requestInfo) _.defaults(info, requestInfo);
		_.defaults(info, this.#defaultInfo);
		if (!_.includes(this.#methods, info.method)) throw Error(`method not supported: ${info.method}`);
		if (!_.includes(this.#responseTypes, info.responseType)) throw Error(`responseType not supported: ${info.responseType}`);
		return this.#request(info);
	}

	#request(info) {
		const method = _.lc(info.method);
		switch (method) {
			case 'post':
				throw Error('POST not supported'); // FIXME proper error handling
			case 'get':
				const response = this.#cacheLookup(info);
				if (response) return Thenfu.asap(response);
				let pending = this.#doRequest(info);
				this.#cacheAdd(info, pending);
				return pending;
			default:
				let METHOD = _.uc(method);
				throw Error(`${METHOD} not supported`);
		}
	}

	#doRequest(info) {
		return new Promise((resolve, reject) => {
			const method = info.method;
			const url = info.url;
			const sendText = info.body; // FIXME not-implemented
			const xhr = new XMLHttpRequest;
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
				const protocol = URLux.create(url).protocol;
				switch (protocol) {
					case 'http:':
					case 'https:':
						switch (xhr.status) {
							default:
								reject(() => {
									throw Error(`Unexpected status ${xhr.status} for ${url}`);
								});
								return;

							// FIXME what about other status codes?
							case 200:
								break; // successful so just continue
						}
						break;

					default:
						if (HTML_IN_XHR ? !xhr.response : !xhr.responseText) {
							reject(() => {
								throw Error(`No response for ${url}`);
							});
							return;
						}
						break;
				}

				Thenfu.defer(onload); // Use delay to stop the readystatechange event interrupting other event handlers (on IE).
			}

			const onload = () => {
				const result = this.#handleResponse(xhr, info);
				resolve(result);
			};
		});
	}

	#handleResponse(xhr, info) { // TODO handle info.responseType
		const response = {
			url: info.url,
			type: info.responseType,
			status: xhr.status,
			statusText: xhr.statusText
		};
		if (HTML_IN_XHR) {
			return htmlParser.normalize(xhr.response, info)
				.then((doc) => {
					response.document = doc;
					return response;
				});
		} else {
			return htmlParser.parse(String(xhr.responseText), info)
				.then((doc) => {
					response.document = doc;
					return response;
				});
		}
	}
}

export default new HttpProxy();
