/*!
 * HFramesetDefinition
 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */
import * as _ from './stuff.mjs';
import URLux from './URLux.mjs';
import * as DOM from './DOM.mjs';
import CustomNamespace, {HYPERFRAMESET_URN} from './CustomNamespace.mjs';
import HFrameDefinition from './HFrameDefinition.mjs';
import htmlParser from './htmlParser.mjs';

const { rebase, rebaseURL, normalizeScopedStyles } = htmlParser;

/** Attribute name for the frame definition ID (on both the frame element and its template wrapper). */
const DEFID_ATTR = 'defid';

/** Attribute name for the frame declaration reference (on the placeholder element, pointing to a defid). */
const DEF_ATTR = 'def';

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
 */
class HFramesetDefinition {

/** @type {string} The resolved URL of the frameset document. */
url;

/** @type {string} The base URL scope for resolving relative URLs. */
scope;

/** @type {NamespaceCollection} Custom namespace declarations found in the document. */
namespaces;

/** @type {Document} The frameset document (with body detached). */
document;

/** @type {HTMLElement} The detached <body> element used as a render template. */
element;

/** @type {Node} Container where frame definition templates are stored. Defaults to the frameset document's head. */
frameContainer;

/**
 * @param {Document} doc - The frameset HTML document to process.
 * @param {Object} settings
 * @param {BehaviorRegistry} settings.behaviors - The installed behaviors instance (required).
 * @param {string} settings.framesetURL - The resolved URL of the frameset.
 * @param {string} settings.scope - The base scope URL for relative URL resolution.
 * @param {Node} [settings.frameContainer] - Where to store frame definition templates. Defaults to window.document.head.
 */
constructor(doc, settings) {
	if (!doc) return; // in case of inheritance
	if (!settings?.behaviors) throw Error('HFramesetDefinition requires settings.behaviors');
	this.behaviors = settings.behaviors;
	if (settings.frameContainer) this.frameContainer = settings.frameContainer;
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
	if (!this.frameContainer) this.frameContainer = doc.head;
}

#initMetadata(doc, settings) {
	_.defaults(this, {
		url: settings.framesetURL,
		scope: settings.scope
	});

	let namespaces = this.namespaces = CustomNamespace.getNamespaces(doc);
	if (!namespaces.lookupNamespace(HYPERFRAMESET_URN)) {
		namespaces.add(hfDefaultNamespace);
	}
}

#rebaseURLs(doc) {
	let scopeURL = URLux.create(this.scope);
	rebase(doc, scopeURL);
	let frameElts = DOM.findAll(
		this.namespaces.lookupSelector('frame', HYPERFRAMESET_URN),
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
		// ignore @for scripts (behaviors handles sourceURL)
		if (script.hasAttribute('for')) return;
		this.#normalizeScript(script, i);
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

#normalizeScript(script, i) {
	let id = script.id;
	// TODO generating ID always has a chance of duplicating IDs
	if (!id) id = script.id = `script[${i}]`; // FIXME doc that i is zero-indexed
	let sourceURL;
	if (script.hasAttribute('sourceurl')) sourceURL = script.getAttribute('sourceurl');
	else {
		sourceURL = `${this.url}__${id}`; // FIXME this should be configurable
		script.setAttribute('sourceurl', sourceURL);
	}
	script.text += `\n//# sourceURL=${sourceURL}`;
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
	this.#preprocessScripts();
	this.#preprocessFrames();
}

#preprocessScripts() {
	let body = this.element;

	// Validate: warn and remove any scripts that shouldn't be in body
	let scripts = DOM.findAll('script', body);
	_.forEach(scripts, (script) => {
		if (script.type && !/^text\/javascript/.test(script.type)) return;
		if (script.hasAttribute('src')) {
			console.warn('Frameset <body> may not contain external scripts: \n' +
				script.cloneNode(false).outerHTML);
			script.parentNode.removeChild(script);
			return;
		}
		if (!script.hasAttribute('for')) {
			console.warn('Frameset <body> may not contain non-@for scripts:\n' +
				this.url + '#' + script.id);
			script.parentNode.removeChild(script);
			return;
		}
		if (script.getAttribute('for') !== '') {
			console.warn('<script> may only contain EMPTY @for: \n' +
				script.cloneNode(false).outerHTML);
			script.parentNode.removeChild(script);
			return;
		}
	});

	this.behaviors.processScripts(body);
}

#preprocessFrames() {
	let body = this.element;
	let container = this.frameContainer;
	let frameElts = DOM.findAll(
		this.namespaces.lookupSelector('frame', HYPERFRAMESET_URN),
		body);
	let frameDefElts = [];
	let frameRefElts = [];
	_.forEach(frameElts, (el, index) => { // FIXME hyperframes can't be outside of <body> OR descendants of repetition blocks

		// NOTE even if the frame is only a declaration (@def && @def !== @defid) it still has its content removed
		let placeholder = el.cloneNode(false);
		el.parentNode.replaceChild(placeholder, el); // NOTE no adoption

		let defId = el.getAttribute(DEFID_ATTR);
		let def = el.getAttribute(DEF_ATTR);
		if (def && def !== defId) {
			frameRefElts.push(el);
			return;
		}
		if (!defId) {
			defId = '__frame_' + index + '__'; // FIXME not guaranteed to be unique. Should be a function at top of module
			el.setAttribute(DEFID_ATTR, defId);
		}
		if (!def) {
			def = defId;
			placeholder.setAttribute(DEF_ATTR, def);
		}
		frameDefElts.push(el);
	});
	_.forEach(frameDefElts, (el) => {
		// Wrap in <template> so the definition is inert (not matched by document-level selectors)
		// but still inspectable in devtools.
		let tmpl = container.ownerDocument.createElement('template');
		tmpl.setAttribute(DEFID_ATTR, el.getAttribute(DEFID_ATTR));
		tmpl.content.appendChild(el);
		container.appendChild(tmpl);
	});
	_.forEach(frameRefElts, (el) => {
		let def = el.getAttribute(DEF_ATTR);
		let tmpl = DOM.find(`template[${DEFID_ATTR}="${def}"]`, container);
		let refEl = tmpl && tmpl.content.firstElementChild;
		if (!refEl) {
			console.warn('Frame declaration references non-existant frame definition: ' + def);
			return;
		}
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
 * Get all frame definition IDs from the template elements stored in the frame container.
 * @returns {string[]} Array of defid values.
 */
get frameIds() {
	let templates = DOM.findAll(`template[${DEFID_ATTR}]`, this.frameContainer);
	return templates.map(tmpl => tmpl.getAttribute(DEFID_ATTR));
}

/**
 * Look up a frame definition by its defid. Queries the frame definition element
 * from a <template> in the frame container and lazily constructs an HFrameDefinition instance (cached).
 * 
 * @param {string} defId - The frame definition ID (@defid attribute value).
 * @returns {HFrameDefinition|undefined} The frame definition, or undefined if not found.
 */
getFrame(defId) {
	let tmpl = DOM.find(`template[${DEFID_ATTR}="${defId}"]`, this.frameContainer);
	if (!tmpl) return undefined;
	let el = tmpl.content.firstElementChild;
	if (!el) return undefined;
	return new HFrameDefinition(el, this);
}

/**
 * Returns a deep clone of the processed body template, ready for insertion
 * into the live document.
 * @returns {HTMLElement} A cloned body element.
 */
render() {
	return this.element.cloneNode(true);
}

}

export default HFramesetDefinition;
