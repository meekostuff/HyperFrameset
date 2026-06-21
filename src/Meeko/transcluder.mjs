/*!
 * transcluder
 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

import * as _ from './stuff.mjs';
import Thenfu from './Thenfu.mjs';
import URLux from './URLux.mjs';
import * as DOM from './DOM.mjs';
import httpProxy from './httpProxy.mjs';
import Registry from './Registry.mjs';
import { instance } from './behaviors.mjs';
import { Panel } from './layoutElements.mjs';

let transcludeDefinitions = new Registry({
	writeOnce: true,
	keyValidator: (key) => typeof key === 'string',
	valueValidator: (o) => o != null && typeof o === 'object'
});

class HTransclude extends Panel {

static observedAttributes = ["src"];

connectedCallback() {
	let def = this.getAttribute('def');
	this.definition = transcludeDefinitions.get(def);
	this.bodyElement = null;
	this.targetname = this.getAttribute('targetname');
	this.src = this.getAttribute('src');
	this.mainSelector = this.getAttribute('main');
	this._connected = true;
	console.debug('HTransclude connected:', this.targetname, 'src:', this.src);
	this.refresh();
}

disconnectedCallback() {
	this._connected = false;
}

attributeChangedCallback(name, oldValue, newValue) {
	if (!this._connected) return;
	if (name === 'src') this.refresh();
}

get options() {
	let behaviors = instance();
	return behaviors.getInstance(this);
}

preload(request) {
	return Thenfu.pipe(request, [
		(request) => this.definition.render(request, 'loading'),
		(result) => { if (result) return this.insert(result); }
	]);
}

load(response) {
	if (response) this.src = response.url;
	return Thenfu.pipe(response, [
		(response) => this.definition.render(response, 'loaded', { mainSelector: this.mainSelector }),
		(result) => { if (result) return this.insert(result, this.hasAttribute('replace')); }
	]);
}

insert(bodyElement, replace) {
	let options = this.options;

	if (this.bodyElement) {
		if (options && options.bodyLeft) {
			try { options.bodyLeft(this, this.bodyElement); }
			catch (err) { window.reportError(err); }
		}
		this.bodyElement.remove();
	}

	if (replace) {
		let frag = DOM.adoptContents(bodyElement, this.ownerDocument);
		let parent = this.parentNode;
		let next = this.nextSibling;
		this.remove();
		if (next) parent.insertBefore(frag, next);
		else parent.appendChild(frag);
		return;
	}

	this.appendChild(bodyElement);
	this.bodyElement = bodyElement;

	if (options && options.bodyEntered) {
		try { options.bodyEntered(this, this.bodyElement); }
		catch (err) { window.reportError(err); }
	}
}

refresh() {
	let src = this.getAttribute('src');

	return Thenfu.asap().then(() => {

		if (src == null) {
			return this.load(null);
		}

		if (src === '') return;

		let fullURL = URLux.create(src);
		let nohash = fullURL.nohash;

		let request = { method: 'get', url: nohash, responseType: 'document' };
		let response;

		return Thenfu.pipe(null, [
			() => this.preload(request),
			() => httpProxy.load(nohash, request),
			(resp) => { response = resp; },
			() => DOM.whenVisible(this),
			() => {
				if (this.getAttribute('src') !== src) return; // abort if src changed
				return this.load(response);
			}
		]);
	});
}

static isFrame(element) { return element instanceof HTransclude; }

}

/**
 * Register a transclusion custom element with the detected namespace.
 * @param {CustomNamespace} ns - The namespace for resolving tag names.
 * @param {string} name - The element name (e.g. 'frame' or 'transclude').
 * @param {Function} Cls - The custom element class.
 */
function registerElement(ns, name, Cls) {
	let tagName = ns.lookupTagName(name);
	customElements.define(tagName, Cls);

	let cssText = `${tagName} { box-sizing: border-box; display: block; width: auto; height: auto; text-align: left; margin: 0; padding: 0; }`;
	let style = document.createElement('style');
	style.textContent = cssText;
	document.head.insertBefore(style, document.head.firstChild);
}

let transcluder = {
	registerElement
};

export {
	HTransclude,
	transcluder,
	transcludeDefinitions
}

export default transcluder;
