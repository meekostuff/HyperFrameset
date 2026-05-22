/*!
 * HyperFrameset framer
 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

/* TODO
    + substantial error handling and notification needs to be added
    + <link rel="self" />
 */

import * as _ from './stuff.mjs';
import Thenfu from './Thenfu.mjs';
import URLux from './URLux.mjs';
import * as DOM from './DOM.mjs';
import scriptQueue from './scriptQueue.mjs';
import httpProxy from './httpProxy.mjs';
import historyManager from './historyManager.mjs';
import sprockets from './sprockets.mjs';
import formElements, { ConfigurableBody } from './formElements.mjs';
import layoutElements, { HBase } from './layoutElements.mjs';
import frameElements, { frameDefinitions, HFrame } from './frameElements.mjs';
import { HFramesetDefinition } from './framesetDefinitions.mjs';
import { HYPERFRAMESET_URN } from './CustomNamespace.mjs';
import HFrameset from './HFrameset.mjs';

// FIXME DRY these @rel values with boot.js
const FRAMESET_REL = 'frameset'; // NOTE http://lists.w3.org/Archives/Public/www-html/1996Dec/0143.html
const SELF_REL = 'self';

let document = window.document;


class Framer {

options = {};
frameset = null;
started = false;
framesetReady = Promise.withResolvers();

config(options) {
	if (!options) return;
	_.assign(this.options, options);
}

/**
 * Content-first entry point. Use when the landing page is a content document
 * that references an external frameset. The content is captured, the frameset
 * is fetched and applied to the live document, then the captured content is
 * loaded into the appropriate frame.
 */
start(startOptions) {
	let framer = this;
	if (framer.started) throw Error('Already started');
	if (!startOptions || !startOptions.contentDocument) throw Error('No contentDocument passed to start()');

	framer.started = true;
	Thenfu.asap(startOptions.contentDocument)
	.then((doc) => { // FIXME potential race condition between document finished loading and frameset rendering
		return httpProxy.add({ url: document.URL, type: 'document', document: doc });
	});

	return Thenfu.pipe(null, [

	() => { // sanity check
		return Thenfu.wait(() => !!document.body);
	},

	() => { // lookup or detect frameset.URL
		let framerConfig;
		framerConfig = framer.lookup(document.URL);
		if (framerConfig) return framerConfig;
		return startOptions.contentDocument
			.then((doc) => framer.detect(doc));
	},

	(framerConfig) => { // initiate fetch of frameset.URL
		if (!framerConfig) throw Error('No frameset could be determined for this page');
		framer.scope = framerConfig.scope; // FIXME shouldn't set this until loadFramesetDefinition() returns success
		let framesetURL = URLux.create(framerConfig.framesetURL);
		if (framesetURL.hash) console.info(`Ignoring hash component of frameset URL: ${framesetURL.hash}`);
		framer.framesetURL = framerConfig.framesetURL = framesetURL.nohash;
		return httpProxy.load(framer.framesetURL, { responseType: 'document' })
		.then((response) => new HFramesetDefinition(response.document, framerConfig));
	},

	/** @param {HFramesetDefinition} definition */
	(definition) => {
		return Thenfu.pipe(definition, [
		() => {
			framer.definition = definition;
			return Framer.#prepareFrameset(document, definition);
		},
		() => definition.preprocess(),
		() => Framer.#prerenderFrameset(document, definition)
		]);
	},

	() => framer.#activate()

	]);
}

/** Shared post-boot pipeline: registers events, frames, sprockets, and starts history. */
#activate() {
	let framer = this;
	return Thenfu.pipe(null, [

	() => {
		window.addEventListener('click', (e) => {
			if (e.defaultPrevented) return;
			let acceptDefault = framer.onClick(e);
			if (acceptDefault === false) e.preventDefault();
		}, false); // onClick generates requestnavigation event
		window.addEventListener('submit', (e) => {
			if (e.defaultPrevented) return;
			let acceptDefault = framer.onSubmit(e);
			if (acceptDefault === false) e.preventDefault();
		}, false);

		Framer.#registerFrames(framer.definition);
		interceptFrameElements();
		retargetFramesetElements();
		let namespace = framer.definition.namespaces.lookupNamespace(HYPERFRAMESET_URN);
		layoutElements.register(namespace);
		frameElements.register(namespace);
		Framer.#registerFramesetElement();
		formElements.register();

		return sprockets.start({ manual: true }); // FIXME should be a promise
	},

	() => { // TODO ideally frameset rendering wouldn't start until after this step
		return framer.framesetReady.promise
		.then(() => {
			let changeset = framer.currentChangeset;
			// FIXME what if no changeset is returned
			return historyManager.start(changeset, '', document.URL,
				(state) => { }, // FIXME need some sort of rendering status
				(state) => framer.onPopState(state.getData())
			);
		});
	},

	() => { // FIXME this should wait until at least the landing document has been rendered in one frame
		Framer.#notify({ module: 'frameset', type: 'enteredState', stage: 'after', url: document.URL });
	},

	// TODO it would be nice if <body> wasn't populated until stylesheets were loaded
	() => Thenfu.wait(() => DOM.checkStyleSheets())

	]);
}

framesetEntered(frameset) {
	this.frameset = frameset;
	let url = document.URL;
	this.currentChangeset = frameset.lookup(url, { referrer: document.referrer });
	this.framesetReady.resolve();
}

framesetLeft(frameset) { // WARN this should never happen
	delete this.frameset;
}

frameEntered(frame) {
	let parentFrame;
	let parentElement = DOM.closest(frame.element.parentNode, HFrame.isFrame);
	if (parentElement) parentFrame = parentElement.$;
	else {
		parentElement = document.body;
		parentFrame = parentElement.$;
	}
	parentFrame.frameEntered(frame);
	frame.parentFrame = parentFrame;

	if (frame.targetname === this.currentChangeset.target) { // FIXME should only be used at startup
		frame.attr('src', this.currentChangeset.url);
	}
}

frameLeft(frame) {
	let parentFrame = frame.parentFrame;
	delete frame.parentFrame;
	parentFrame.frameLeft(frame);
}

onClick(e) { // return false means success
	if (e.button != 0) return; // FIXME what is the value for button in IE's W3C events model??
	if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return; // FIXME do these always trigger modified click behavior??

	// Find closest <a href> to e.target
	let linkElement = DOM.closest(e.target, 'a, [link]');
	if (!linkElement) return;
	let hyperlink;
	if (DOM.getTagName(linkElement) === 'a') hyperlink = linkElement;
	else {
		hyperlink = DOM.find('a, link', linkElement);
		if (!hyperlink) hyperlink = DOM.closest('a', linkElement);
		if (!hyperlink) return;
	}
	let href = hyperlink.getAttribute('href');
	if (!href) return; // not really a hyperlink

	let baseURL = URLux.create(document.URL);
	let url = baseURL.resolve(href);

	let details = { url: url, element: hyperlink };
	this.triggerRequestNavigation(details.url, details);
	return false;
}

onSubmit(e) { // return false means success
	let form = e.target;
	if (form.target) return; // no iframe
	let baseURL = URLux.create(document.URL);
	let action = baseURL.resolve(form.action);

	let details = { element: form };
	let method = _.lc(form.method);
	switch(method) {
	case 'get':
		let oURL = URLux.create(action);
		let query = Framer.#encode(form);
		details.url = oURL.nosearch + (oURL.search || '?') + query + oURL.hash;
		break;
	default: return; // TODO handle POST
	}

	this.triggerRequestNavigation(details.url, details);
	return false;
}

triggerRequestNavigation(url, details) {
	Thenfu.defer(() => {
		let event = document.createEvent('CustomEvent');
		event.initCustomEvent('requestnavigation', true, true, details.url);
		let acceptDefault = details.element.dispatchEvent(event);
		if (acceptDefault !== false) { location.assign(details.url); }
	});
}

onRequestNavigation(e, frame) { // `return false` means success (so preventDefault)
	if (!frame) throw Error('Invalid frame / frameset in onRequestNavigation');

	let url = e.detail;
	let details = { url: url, element: e.target };
	let framer = this;

	if (!frame.isFrameset) {
		if (requestNavigation(frame, url, details)) return false;
		return;
	}

	// test hyperlinks
	let baseURL = URLux.create(document.URL);
	let oURL = URLux.create(url);
	if (oURL.origin != baseURL.origin) return; // no external urls

	let isPageLink = (oURL.nohash === baseURL.nohash);
	if (isPageLink) { framer.onPageLink(url, details); return false; }

	let frameset = frame;
	let framesetScope = framer.lookup(url);
	if (!framesetScope || !framer.compareFramesetScope(framesetScope)) return;

	if (requestNavigation(frameset, url, details)) return false;
	return;

	function requestNavigation(frame, url, details) {
		let changeset = frame.lookup(url, details);
		if (changeset === '' || changeset === true) return true;
		if (changeset == null || changeset === false) return false;
		framer.load(url, changeset, frame.isFrameset);
		return true;
	}
}

onPageLink(url, details) {
	console.warn('Ignoring on-same-page links for now.'); // FIXME
}

navigate(url, changeset) { // FIXME doesn't support replaceState
	return this.load(url, changeset, true);
}

load(url, changeset, changeState) { // FIXME doesn't support replaceState
	let framer = this;
	let frameset = framer.frameset;
	let mustNotify = changeState || changeState === 0;
	let target = changeset.target;
	let frames = [];
	recurseFrames(frameset, (frame) => {
		if (frame.targetname !== target) return;
		frames.push(frame);
		return true;
	});

	let fullURL = URLux.create(url);
	let hash = fullURL.hash;
	let nohash = fullURL.nohash;
	let request = { method: 'get', url: nohash, responseType: 'document' };
	let response;

	return Thenfu.pipe(null, [
	() => {
		if (mustNotify) return Framer.#notify({ module: 'frameset', type: 'leftState', stage: 'before', url: document.URL });
	},
	() => { _.forEach(frames, (frame) => { frame.attr('src', fullURL); }); },
	() => httpProxy.load(nohash, request).then((resp) => { response = resp; }),
	() => { if (changeState) return historyManager.pushState(changeset, '', url, (state) => {}); },
	() => {
		if (mustNotify) return Framer.#notify({ module: 'frameset', type: 'enteredState', stage: 'after', url: url });
	}
	]);

	function recurseFrames(parentFrame, fn) {
		_.forEach(parentFrame.frames, (frame) => {
			let found = fn(frame);
			if (!found) recurseFrames(frame, fn);
		});
	}
}

onPopState(changeset) {
	let url = changeset.url;
	if (url !== document.URL) {
		console.warn('Popped state URL does not match address-bar URL.');
	}
	this.load(url, changeset, 0);
}

lookup(docURL) {
	if (!this.options.lookup) return;
	let result = this.options.lookup(docURL);
	if (result == null || result === false) return false;
	if (typeof result === 'string') result = Framer.#implyFramesetScope(result, docURL);
	if (typeof result !== 'object' || !result.scope || !result.framesetURL) throw Error('Unexpected result from frameset lookup');
	return result;
}

detect(srcDoc) {
	if (!this.options.detect) return;
	let result = this.options.detect(srcDoc);
	if (result == null || result === false) return false;
	if (typeof result === 'string') result = Framer.#implyFramesetScope(result, document.URL);
	if (typeof result !== 'object' || !result.scope || !result.framesetURL) throw Error('Unexpected result from frameset detect');
	return result;
}

compareFramesetScope(settings) {
	if (this.framesetURL !== settings.framesetURL) return false;
	if (this.scope !== settings.scope) return false;
	return true;
}

inferChangeset(url, partial) {
	return Framer.#inferChangeset(url, partial);
}

// --- Static private helpers ---

static #encode(form) {
	let data = [];
	_.forEach(form.elements, (el) => {
		if (!el.name) return;
		data.push(el.name + '=' + encodeURIComponent(el.value));
	});
	return data.join('&');
}

static #prepareFrameset(dstDoc, definition) {
	if (Framer.#getFramesetMarker(dstDoc)) throw Error('The HFrameset has already been applied');

	let srcDoc = DOM.cloneDocument(definition.document);
	let selfMarker;

	return Thenfu.pipe(null, [
	() => {
		let dstHead = dstDoc.head;
		_.forEach(DOM.findAll('link[rel|=stylesheet]', dstHead), (node) => { dstHead.removeChild(node); });
	},
	() => {
		let dstBody = dstDoc.body;
		let node;
		while (node = dstBody.firstChild) dstBody.removeChild(node);
	},
	() => {
		selfMarker = Framer.#getSelfMarker(dstDoc);
		if (selfMarker) return;
		selfMarker = dstDoc.createElement('link');
		selfMarker.rel = SELF_REL;
		selfMarker.href = dstDoc.URL;
		dstDoc.head.insertBefore(selfMarker, dstDoc.head.firstChild);
	},
	() => {
		let framesetMarker = dstDoc.createElement('link');
		framesetMarker.rel = FRAMESET_REL;
		framesetMarker.href = definition.src;
		dstDoc.head.insertBefore(framesetMarker, selfMarker);
	},
	() => {
		Framer.#mergeElement(dstDoc.documentElement, srcDoc.documentElement);
		Framer.#mergeElement(dstDoc.head, srcDoc.head);
		Framer.#mergeHead(dstDoc, srcDoc.head, true);
		_.forEach(DOM.findAll('script', dstDoc.head), (script) => { scriptQueue.push(script); });
		return scriptQueue.empty();
	}
	]);
}

static #prerenderFrameset(dstDoc, definition) {
	let srcBody = definition.element;
	let dstBody = dstDoc.body;
	Framer.#mergeElement(dstBody, srcBody);
}

static #separateHead(dstDoc, isFrameset) {
	let dstHead = dstDoc.head;
	let framesetMarker = Framer.#getFramesetMarker(dstDoc);
	if (!framesetMarker) throw Error(`No ${FRAMESET_REL} marker found. `);
	let selfMarker = Framer.#getSelfMarker(dstDoc);
	if (isFrameset) _.forEach(DOM.siblings('after', framesetMarker, 'before', selfMarker), remove);
	else _.forEach(DOM.siblings('after', selfMarker), remove);
	function remove(node) {
		if (DOM.getTagName(node) == 'script' && (!node.type || node.type.match(/^text\/javascript/i))) return;
		dstHead.removeChild(node);
	}
}

static #mergeHead(dstDoc, srcHead, isFrameset) {
	let baseURL = URLux.create(dstDoc.URL);
	let dstHead = dstDoc.head;
	let framesetMarker = Framer.#getFramesetMarker();
	if (!framesetMarker) throw Error(`No ${FRAMESET_REL} marker found. `);
	let selfMarker = Framer.#getSelfMarker();

	Framer.#separateHead(dstDoc, isFrameset);

	_.forEach(Array.from(srcHead.childNodes), (srcNode) => {
		if (srcNode.nodeType != 1) return;
		switch (DOM.getTagName(srcNode)) {
		default: break;
		case 'title':
			if (isFrameset) return;
			if (!srcNode.innerHTML) return;
			break;
		case 'link': break;
		case 'meta':
			if (srcNode.httpEquiv) return;
			break;
		case 'style': break;
		case 'script':
			if (!isFrameset) return;
			if (!srcNode.type || /^text\/javascript$/i.test(srcNode.type)) srcNode.type = 'text/javascript?disabled';
			break;
		}
		if (isFrameset) DOM.insertNode('beforebegin', selfMarker, srcNode);
		else DOM.insertNode('beforeend', dstHead, srcNode);
		if (DOM.getTagName(srcNode) == 'link') srcNode.href = srcNode.getAttribute('href');
	});
}

static #mergeElement(dst, src) {
	if (dst === src) return;
	DOM.removeAttributes(dst);
	DOM.copyAttributes(dst, src);
	dst.removeAttribute('style'); // FIXME is this appropriate?
}

static #getFramesetMarker(doc) {
	if (!doc) doc = document;
	return DOM.find(`link[rel~=${FRAMESET_REL}]`, doc.head);
}

static #getSelfMarker(doc) {
	if (!doc) doc = document;
	return DOM.find(`link[rel~=${SELF_REL}]`, doc.head);
}

static #implyFramesetScope(framesetSrc, docSrc) {
	let docURL = URLux.create(docSrc);
	let docSiteURL = URLux.create(docURL.origin);
	framesetSrc = docSiteURL.resolve(framesetSrc);
	let scope = Framer.#implyScope(framesetSrc, docSrc);
	return { scope: scope, framesetURL: framesetSrc };
}

static #implyScope(framesetSrc, docSrc) {
	let docURL = URLux.create(docSrc);
	let framesetURL = URLux.create(framesetSrc);
	let scope = docURL.base;
	let framesetBase = framesetURL.base;
	if (scope.indexOf(framesetBase) >= 0) scope = framesetBase;
	return scope;
}

static #inferChangeset(url, partial) {
	let inferred = { url: url };
	switch (typeof partial) {
	case 'string': inferred.target = partial; break;
	default: throw Error('Invalid changeset returned from lookup()');
	}
	return inferred;
}

static #notify(msg) {
	let module;
	switch (msg.module) {
	case 'frameset': module = framer.frameset.options; break;
	default: return Thenfu.asap();
	}
	let handler = module[msg.type];
	if (!handler) return Thenfu.asap();
	let listener;
	if (handler[msg.stage]) listener = handler[msg.stage];
	else switch(msg.module) {
	case 'frame':
		listener = msg.type == 'bodyLeft' ? (msg.stage == 'before' ? handler : null) :
			msg.type == 'bodyEntered' ? (msg.stage == 'after' ? handler : null) : null;
		break;
	case 'frameset':
		listener = msg.type == 'leftState' ? (msg.stage == 'before' ? handler : null) :
			msg.type == 'enteredState' ? (msg.stage == 'after' ? handler : null) : null;
		break;
	default: throw Error(msg.module + ' is invalid module');
	}
	if (typeof listener == 'function') {
		let promise = Thenfu.defer(() => { listener(msg); });
		promise['catch']((err) => { throw Error(err); });
		return promise;
	}
	return Thenfu.asap();
}

static #registerFrames(framesetDef) {
	_.forOwn(framesetDef.frames, (o, key) => { frameDefinitions.set(key, o); });
}

static #registerFramesetElement() {
	sprockets.registerElement('body', HFrameset);
	let cssText = ['html, body { margin: 0; padding: 0; }', 'html { width: 100%; height: 100%; }'];
	let style = document.createElement('style');
	style.textContent = cssText.join('\n');
	document.head.insertBefore(style, document.head.firstChild);
}

} // end class Framer

let framer = new Framer();

// FIXME Monkey-patch HFrameset lifecycle to integrate with framer
HFrameset.attached = function(handlers) {
	HBase.attached.call(this, handlers);
	let frameset = this;
	frameset.definition = framer.definition; // TODO remove `framer` dependency
	_.defaults(frameset, { frames: [] });
	ConfigurableBody.attached.call(this, handlers); // FIXME
};
HFrameset.enteredDocument = function() {
	let frameset = this;
	framer.framesetEntered(frameset); // TODO remove `framer` dependency
	frameset.render();
};
HFrameset.leftDocument = function() { // FIXME should never be called??
	let frameset = this;
	framer.framesetLeft(frameset); // TODO remove `framer` dependency
};

// FIXME Monkey-patch to allow creation of tree of frames
function interceptFrameElements() {

_.assign(HFrame.prototype, {
frameEntered: function(frame) { this.frames.push(frame); },
frameLeft: function(frame) { let index = this.frames.indexOf(frame); this.frames.splice(index); }
});

HFrame._attached = HFrame.attached;
HFrame._enteredDocument = HFrame.enteredDocument;
HFrame._leftDocument = HFrame.leftDocument;

_.assign(HFrame, {
attached: function(handlers) { this.frames = []; HFrame._attached.call(this, handlers); },
enteredDocument: function() { framer.frameEntered(this); HFrame._enteredDocument.call(this); },
leftDocument: function() { framer.frameLeft(this); HFrame._leftDocument.call(this); }
});

} // end patch

// FIXME Monkey-patch to allow all HyperFrameset sprockets to retarget requestnavigation events
function retargetFramesetElements() {

_.assign(HBase.prototype, {
lookup: function(url, details) {
	let link = this;
	let options = link.options;
	if (!options || !options.lookup) return false;
	let partial = options.lookup(url, details);
	if (partial === '' || partial === true) return true;
	if (partial == null || partial === false) return false;
	return framer.inferChangeset(url, partial);
}
});

HBase._attached = HBase.attached;
HBase.attached = function(handlers) {
	HBase._attached.call(this, handlers);
	let object = this;
	let options = object.options;
	if (!options.lookup) return;
	handlers.push({
		type: 'requestnavigation',
		action: function(e) {
			if (e.defaultPrevented) return;
			let acceptDefault = framer.onRequestNavigation(e, this);
			if (acceptDefault === false) e.preventDefault();
		}
	});
};

} // end retarget

export default framer;
