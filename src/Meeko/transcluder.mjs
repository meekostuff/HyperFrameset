/*!
 * transcluder
 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

import Thenfu from './Thenfu.mjs';
import URLux from './URLux.mjs';
import * as DOM from './DOM.mjs';
import httpProxy from './httpProxy.mjs';
import { instance } from './behaviors.mjs';
import { Panel } from './layoutElements.mjs';

// TODO DRY with HFramesetDefinition.mjs which defines the same constant
/** Attribute name for the frame declaration reference, linking a placeholder to its definition. */
const DEF_ATTR = 'def';

/** @type {function(string): Object|undefined} Lookup function for frame definitions, set via setDefinitionLookup. */
let definitionLookup;

/**
 * Set the function used to resolve a frame definition by its defid.
 * Must be called before any transclusion elements connect.
 * @param {function(string): Object|undefined} fn - Lookup function that takes a defid and returns a definition.
 */
function setDefinitionLookup(fn) {
	definitionLookup = fn;
}

/** @type {Object} Global values available in all template expression scopes. */
let _globals = {};

/**
 * Set global values available in all template expression scopes.
 * @param {Object} globals - Object whose properties are available by name in expressions.
 */
function setGlobals(globals) {
	_globals = globals;
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
	document.head.append(style);
}

let transcluder = {
	registerElement,
	setDefinitionLookup,
	setGlobals
};

class HTransclude extends Panel {

static observedAttributes = ["src"];

connectedCallback() {
	let def = this.getAttribute(DEF_ATTR);
	this.definition = definitionLookup(def);
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
	if (name === 'src') {
		console.info(`[HyperFrameset] Frame "${this.targetname || '(unnamed)'}" src changed: "${oldValue}" → "${newValue}"`);
		this.refresh();
	}
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
	let details = { mainSelector: this.mainSelector };
	Object.assign(details, _globals);
	// Merge frameset-level globals (from body's behavior config)
	let bodyBehavior = document.body.behavior;
	if (bodyBehavior && bodyBehavior.globals) Object.assign(details, bodyBehavior.globals);
	// Merge frame-level globals (from this frame's behavior config)
	let options = this.options;
	if (options && options.globals) Object.assign(details, options.globals);
	return Thenfu.pipe(response, [
		(response) => this.definition.render(response, 'loaded', details),
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
			(resp) => {
				response = resp;
				if (response && response.status === 404) {
					console.warn(`[HyperFrameset] Frame "${this.targetname || '(unnamed)'}" src returned 404: ${nohash}`);
				} else if (!response || !response.document) {
					console.warn(`[HyperFrameset] Frame "${this.targetname || '(unnamed)'}" src returned empty/null document: ${nohash}`);
				}
			},
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

export {
	HTransclude,
	transcluder
}

export default transcluder;
