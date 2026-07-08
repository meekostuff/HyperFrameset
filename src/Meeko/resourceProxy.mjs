/*!
 * ResourceProxy
 * Copyright 2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */
import * as _ from './stuff.mjs';
import URLux from './URLux.mjs';
import * as DOM from './DOM.mjs';
import Thenfu from './Thenfu.mjs';
import htmlParser from './htmlParser.mjs';

/**
 * @typedef {Object} ResourceResponse
 * @property {string} url - The URL of the resource.
 * @property {string} type - Response type: 'document', 'json', or 'text'.
 * @property {number} [status] - HTTP status code.
 * @property {string} [statusText] - HTTP status text.
 * @property {*} body - The response content (Document, Object, or String depending on type).
 */

/**
 * Resource proxy with custom protocol handlers, caching, and multi-type support.
 * Fetches URLs via custom handlers or XHR, caches GET responses by URL.
 */
class ResourceProxy {

	/** @type {Map<string, function(string, Object): Promise<ResourceResponse>>} */
	#handlers = new Map();

	#methods = _.words('get');
	#responseTypes = _.words('document json text');
	#defaultInfo = {
		method: 'get',
		responseType: 'document'
	};
	#cache = [];

	/**
	 * Register a handler for a URL protocol or prefix.
	 * When load() encounters a URL starting with this prefix, the handler is called
	 * instead of making a network request.
	 *
	 * @param {string} protocol - Protocol prefix to match (e.g. 'api:', 'local:').
	 * @param {function(string, Object): Promise<ResourceResponse>|ResourceResponse} handler
	 */
	register(protocol, handler) {
		this.#handlers.set(protocol, handler);
	}

	/**
	 * Add a pre-existing response to the cache.
	 * Documents are normalized (relative URLs resolved) before caching.
	 *
	 * @param {ResourceResponse} response
	 * @returns {Promise} Resolves when caching is complete.
	 */
	add(response) {
		const url = response.url;
		if (!url) throw Error('Invalid url in response object');
		if (!_.includes(this.#responseTypes, response.type)) throw Error('Invalid type in response object');
		const request = { url: response.url };
		_.defaults(request, this.#defaultInfo);

		if (response.type === 'document') {
			return Thenfu.pipe(undefined, [
				() => htmlParser.normalize(response.body, request),
				(doc) => {
					response.body = doc;
					this.#cacheAdd(request, response);
				}
			]);
		}

		this.#cacheAdd(request, response);
		return Thenfu.asap();
	}

	/**
	 * Fetch a resource. Resolution order:
	 * 1. Custom handlers (matched by URL prefix)
	 * 2. Cache (matched by URL)
	 * 3. XHR fetch
	 *
	 * @param {string} url - URL to fetch.
	 * @param {Object} [requestInfo]
	 * @param {string} [requestInfo.method='get'] - HTTP method.
	 * @param {string} [requestInfo.responseType='document'] - Expected response type.
	 * @returns {Promise<ResourceResponse>}
	 */
	load(url, requestInfo) {
		const info = { url };
		if (requestInfo) _.defaults(info, requestInfo);
		_.defaults(info, this.#defaultInfo);

		// Check custom handlers first
		for (let [protocol, handler] of this.#handlers) {
			if (url.startsWith(protocol)) {
				return Thenfu.asap(handler(url, info)).then((response) => {
					if (!response.url) response.url = url;
					return response;
				});
			}
		}

		if (!_.includes(this.#methods, info.method)) throw Error(`method not supported: ${info.method}`);
		if (!_.includes(this.#responseTypes, info.responseType)) throw Error(`responseType not supported: ${info.responseType}`);
		return this.#request(info);
	}

	// --- Cache ---

	#cacheAdd(request, response) {
		const rq = _.defaults({}, request);
		const entry = { invalid: false, request: rq };

		if (Thenfu.isThenable(response)) {
			entry.response = response.then(
				(r) => this.#cloneResponse(r),
				() => { entry.invalid = true; entry.response = null; }
			);
		} else {
			entry.response = this.#cloneResponse(response);
		}

		this.#cache.push(entry);
	}

	#cacheLookup(request) {
		const entry = _.find(this.#cache, (entry) => {
			if (entry.invalid || entry.response == null) return false;
			if (request.url !== entry.request.url) return false;
			return true;
		});
		if (!(entry && entry.response)) return;
		const response = entry.response;
		if (Thenfu.isThenable(response)) return response.then((r) => this.#cloneResponse(r));
		else return this.#cloneResponse(response);
	}

	#cloneResponse(response) {
		const resp = _.defaults({}, response);
		switch (response.type) {
		case 'document':
			resp.body = DOM.cloneDocument(response.body);
			break;
		case 'json':
			resp.body = JSON.parse(JSON.stringify(response.body));
			break;
		case 'text':
			// strings are immutable, no clone needed
			break;
		}
		return resp;
	}

	// --- XHR ---

	#request(info) {
		const method = _.lc(info.method);
		switch (method) {
		case 'post':
			throw Error('POST not supported');
		case 'get':
			const response = this.#cacheLookup(info);
			if (response) return Thenfu.asap(response);
			let pending = this.#doRequest(info);
			this.#cacheAdd(info, pending);
			return pending;
		default:
			throw Error(`${_.uc(method)} not supported`);
		}
	}

	#doRequest(info) {
		return new Promise((resolve, reject) => {
			const method = info.method;
			const url = info.url;
			const xhr = new XMLHttpRequest;
			xhr.onreadystatechange = onchange;
			xhr.open(method, url, true);

			if (info.responseType === 'document') {
				xhr.responseType = 'document';
				if (xhr.overrideMimeType) xhr.overrideMimeType('text/html');
			}

			xhr.send(null);

			function onchange() {
				if (xhr.readyState != 4) return;
				const protocol = URLux.create(url).protocol;
				switch (protocol) {
				case 'http:':
				case 'https:':
					if (xhr.status !== 200) {
						reject(() => { throw Error(`Unexpected status ${xhr.status} for ${url}`); });
						return;
					}
					break;
				default:
					if (!xhr.response && !xhr.responseText) {
						reject(() => { throw Error(`No response for ${url}`); });
						return;
					}
					break;
				}
				Thenfu.defer(onload);
			}

			const onload = () => {
				const result = this.#handleResponse(xhr, info);
				resolve(result);
			};
		});
	}

	#handleResponse(xhr, info) {
		const response = {
			url: info.url,
			type: info.responseType,
			status: xhr.status,
			statusText: xhr.statusText
		};

		switch (info.responseType) {
		case 'document':
			return htmlParser.normalize(xhr.response, info)
				.then((doc) => { response.body = doc; return response; });
		case 'json':
			try { response.body = JSON.parse(xhr.responseText); }
			catch (e) { response.body = null; }
			return response;
		case 'text':
			response.body = xhr.responseText;
			return response;
		default:
			response.body = xhr.response || xhr.responseText;
			return response;
		}
	}
}

export default new ResourceProxy();
