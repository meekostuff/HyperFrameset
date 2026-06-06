/*!
 * HFramesetDefinition
 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */
import * as _ from './stuff.mjs';
import URLux from './URLux.mjs';
import * as DOM from './DOM.mjs';
import configData from './configData.mjs';
import CustomNamespace, {HYPERFRAMESET_URN} from './CustomNamespace.mjs';
import HFrameDefinition from './HFrameDefinition.mjs';
import htmlParser from './htmlParser.mjs';

const { rebase, rebaseURL, normalizeScopedStyles } = htmlParser;

/** Fallback namespace registered when the frameset document doesn't declare one. */
const hfDefaultNamespace = new CustomNamespace({
	name: 'hf',
	style: 'vendor',
	urn: HYPERFRAMESET_URN
});

/**
 * Represents a parsed and normalized frameset document definition.
 * 
 * Constructed from a frameset HTML document, this class extracts the body as a
 * template, rebases URLs to the frameset's scope, processes inline scripts into
 * configuration data, and registers frame definitions for later instantiation.
 * 
 * The lifecycle is: construct (via init) → preprocess → render.
 * 
 * @property {string} url - The resolved URL of the frameset document.
 * @property {string} scope - The base URL scope for resolving relative URLs.
 * @property {Document} document - The frameset document (with body detached).
 * @property {HTMLElement} element - The detached <body> element used as a render template.
 * @property {Object} frames - Map of frame definition IDs to HFrameDefinition instances.
 * @property {NamespaceCollection} namespaces - Custom namespace declarations found in the document.
 */
class HFramesetDefinition {

/**
 * @param {Document} doc - The frameset HTML document to process.
 * @param {Object} settings
 * @param {string} settings.framesetURL - The resolved URL of the frameset.
 * @param {string} settings.scope - The base scope URL for relative URL resolution.
 */
constructor(doc, settings) {
	if (!doc) return; // in case of inheritance
	this.namespaces = null;
	this.init(doc, settings);
}

/**
 * Initializes the definition from a frameset document:
 * - Registers custom namespaces (or adds the default hf: namespace).
 * - Rebases all URLs relative to the scope.
 * - Assigns @id and @sourceurl to inline scripts.
 * - Moves <script for> from <head> to <body> and plain scripts from <body> to <head>.
 * - Normalizes scoped styles.
 * - Detaches the <body> for use as a render template.
 * 
 * @param {Document} doc - The frameset document.
 * @param {Object} settings - Contains framesetURL and scope.
 */
init(doc, settings) {
	this.#initMetadata(doc, settings);
	this.#rebaseURLs(doc);
	this.#normalizeScripts(doc);
	this.#normalizeStyles(doc);
	let body = doc.body;
	this.document = doc;
	this.element = body;
}

#initMetadata(doc, settings) {
	let framesetDef = this;
	_.defaults(framesetDef, {
		url: settings.framesetURL,
		scope: settings.scope
	});

	let namespaces = framesetDef.namespaces = CustomNamespace.getNamespaces(doc);
	if (!namespaces.lookupNamespace(HYPERFRAMESET_URN)) {
		namespaces.add(hfDefaultNamespace);
	}
}

#rebaseURLs(doc) {
	let framesetDef = this;
	let scopeURL = URLux.create(framesetDef.scope);
	rebase(doc, scopeURL);
	let frameElts = DOM.findAll(
		framesetDef.namespaces.lookupSelector('frame', HYPERFRAMESET_URN), 
		doc.body);
	_.forEach(frameElts, (el, index) => { // FIXME hyperframes can't be outside of <body> OR descendants of repetition blocks
		let src = el.getAttribute('src');
		if (src) {
			let newSrc = rebaseURL(src, scopeURL);
			if (newSrc != src) el.setAttribute('src', newSrc);
		}
	});
}

#normalizeScripts(doc) {
	let framesetDef = this;

	// warn about not using @id
	let idElements = DOM.findAll('*[id]:not(script)', doc.body);
	if (idElements.length) {
		let firstId = idElements[0].getAttribute('id');
		console.warn(`@id is strongly discouraged in frameset-documents (except on <<script>>).
			Found ${idElements.length}, first @id is ${firstId}`);
	}

	// Add @id and @sourceurl to inline <script type="text/javascript">
	let scripts = DOM.findAll('script', doc);
	_.forEach(scripts, (script, i) => {
		// ignore non-javascript scripts
		if (script.type && !/^text\/javascript/.test(script.type)) return;
		// ignore external scripts
		if (script.hasAttribute('src')) return;
		let id = script.id;
		// TODO generating ID always has a chance of duplicating IDs
		if (!id) id = script.id = `script[${i}]`; // FIXME doc that i is zero-indexed
		let sourceURL;
		if (script.hasAttribute('sourceurl')) sourceURL = script.getAttribute('sourceurl');
		else {
			sourceURL = `${framesetDef.url}__${id}`; // FIXME this should be configurable
			script.setAttribute('sourceurl', sourceURL);
		}
		script.text += `\n//# sourceURL=${sourceURL}`;
	});

	// Move all <script for> in <head> to <body>
	let firstChild = doc.body.firstChild;
	_.forEach(DOM.findAll('script[for]', doc.head), (script) => {
		doc.body.insertBefore(script, firstChild);
		script.setAttribute('for', '');
		console.info('Moved <script for> in frameset <head> to <body>');
	});

	// Move all non-@for, javascript <script> in <body> to <head>
	_.forEach(DOM.findAll('script', doc.body), (script) => {
		// ignore non-javascript scripts
		if (script.type && !/^text\/javascript/.test(script.type)) return;
		// ignore @for scripts
		if (script.hasAttribute('for')) return;
		doc.head.appendChild(script);
		console.info('Moved <script> in frameset <body> to <head>');
	});
}

#normalizeStyles(doc) {
	let allowedScope = 'panel, frame';
	let allowedScopeSelector = this.namespaces.lookupSelector(allowedScope, HYPERFRAMESET_URN);
	normalizeScopedStyles(doc, allowedScopeSelector);
}
	/**
 * Processes the detached body template:
 * - Evaluates <script for> elements and stores results in configData.
 * - Associates config IDs with their target elements via @config attributes.
 * - Extracts frame definition elements and creates HFrameDefinition instances.
 * - Resolves frame declaration references (@def) to their definitions.
 * 
 * Must be called after construction and before render().
 */
preprocess() {
	let framesetDef = this;
	let body = framesetDef.element;
	_.defaults(framesetDef, {
		frames: {} // all hyperframe definitions. Indexed by @defid (which may be auto-generated)
	});

	let scripts = DOM.findAll('script', body);
	_.forEach(scripts, (script, i) => {
		// Ignore non-javascript scripts
		if (script.type && !/^text\/javascript/.test(script.type)) return;

		// TODO probably don't need this as handled by init()
		if (script.hasAttribute('src')) { // external javascript in <body> is invalid
			console.warn('Frameset <body> may not contain external scripts: \n' +
				script.cloneNode(false).outerHTML);
			script.parentNode.removeChild(script);
			return;
		}

		let sourceURL = script.getAttribute('sourceurl');

		// TODO probably don't need this as handled by init()
		if (!script.hasAttribute('for')) {
			console.warn('Frameset <body> may not contain non-@for scripts:\n' +
					framesetDef.url + '#' + script.id);
			script.parentNode.removeChild(script); 
			return;
		}

		// TODO should this be handled by init() ??
		if (script.getAttribute('for') !== '') {
			console.warn('<script> may only contain EMPTY @for: \n' +
				script.cloneNode(false).outerHTML);
			script.parentNode.removeChild(script);
			return;
		}

		let scriptFor = script;
		while (scriptFor = scriptFor.previousSibling) {
			if (scriptFor.nodeType !== 1) continue;
			let tag = DOM.getTagName(scriptFor);
			if (tag !== 'script' && tag !== 'style') break;
		}
		if (!scriptFor) scriptFor = script.parentNode;
		
		// FIXME @config shouldn't be hard-wired here
		let configID = scriptFor.hasAttribute('config') ?
			scriptFor.getAttribute('config') :
			'';
		// TODO we can add more than one @config to an element but only first is used
		configID = configID ?
			configID.replace(/\s*$/, ' ' + sourceURL) :
			sourceURL;
		scriptFor.setAttribute('config', configID);

		let fnText = 'return (' + script.text + '\n);';

		try {
			let fn = Function(fnText);
			let object = fn();
			configData.set(sourceURL, object);
		}
		catch(err) { 
			console.warn('Error evaluating inline script in frameset:\n' +
				framesetDef.url + '#' + script.id);
			window.reportError(err);
		}

		script.parentNode.removeChild(script); // physical <script> no longer needed
	});

	let frameElts = DOM.findAll(
		framesetDef.namespaces.lookupSelector('frame', HYPERFRAMESET_URN), 
		body);
	let frameDefElts = [];
	let frameRefElts = [];
	_.forEach(frameElts, (el, index) => { // FIXME hyperframes can't be outside of <body> OR descendants of repetition blocks

		// NOTE even if the frame is only a declaration (@def && @def !== @defid) it still has its content removed
		let placeholder = el.cloneNode(false);
		el.parentNode.replaceChild(placeholder, el); // NOTE no adoption

		let defId = el.getAttribute('defid');
		let def = el.getAttribute('def');
		if (def && def !== defId) {
			frameRefElts.push(el);
			return;
		}
		if (!defId) {
			defId = '__frame_' + index + '__'; // FIXME not guaranteed to be unique. Should be a function at top of module
			el.setAttribute('defid', defId);
		}
		if (!def) {
			def = defId;
			placeholder.setAttribute('def', def);
		}
		frameDefElts.push(el);
	});
	_.forEach(frameDefElts, (el) => {
		let defId = el.getAttribute('defid');
		framesetDef.frames[defId] = new HFrameDefinition(el, framesetDef);
	});
	_.forEach(frameRefElts, (el) => {
		let def = el.getAttribute('def');
		let ref = framesetDef.frames[def];
		if (!ref) {
			console.warn('Frame declaration references non-existant frame definition: ' + def);
			return;
		}
		let refEl = ref.element;
		if (!refEl.hasAttribute('scopeid')) return;
		let id = el.getAttribute('id');
		if (id) {
			console.warn('Frame declaration references a frame definition with scoped-styles but these cannot be applied because the frame declaration has its own @id: ' + id);
			return;
		}
		id = refEl.getAttribute('id');
		let scopeId = refEl.getAttribute('scopeid');
		if (id !== scopeId) {
			console.warn('Frame declaration references a frame definition with scoped-styles but these cannot be applied because the frame definition has its own @id: ' + id);
			return;
		}
		el.setAttribute('id', scopeId);
	});

}

/**
 * Returns a deep clone of the processed body template, ready for insertion
 * into the live document.
 * @returns {HTMLElement} A cloned body element.
 */
render() {
	let framesetDef = this;
	return framesetDef.element.cloneNode(true);
}

}

export default HFramesetDefinition;
