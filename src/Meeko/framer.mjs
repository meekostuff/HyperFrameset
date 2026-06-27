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
import HistoryState from './HistoryState.mjs';
import {install} from './behaviors.mjs';
import layoutElements from './layoutElements.mjs';
import transcluder, {HTransclude, transcludeDefinitions} from './transcluder.mjs';
import {HFramesetDefinition} from './framesetDefinitions.mjs';
import {HYPERFRAMESET_URN} from './CustomNamespace.mjs';

// FIXME DRY these @rel values with boot.js
const FRAMESET_REL = 'frameset'; // NOTE http://lists.w3.org/Archives/Public/www-html/1996Dec/0143.html
const SELF_REL = 'self';

let document = window.document;

/**
 * Test if a node is an executable script (text/javascript, module, or no type).
 * @param {Node} node
 * @returns {boolean}
 */
function isExecutableScript(node) {
	if (node.localName !== 'script') return false;
	return !node.type || /^text\/javascript/i.test(node.type) || node.type === 'module';
}

/**
 * Walk siblings starting at inclusiveStart, calling callback for each.
 * Safe to use when the callback removes or moves nodes.
 * @param {Node} inclusiveStart - First node to visit.
 * @param {function(Node): void} callback - Called for each sibling.
 * @param {Node} [exclusiveEnd] - Optional stop node (not visited).
 */
function walkSiblings(inclusiveStart, callback, exclusiveEnd) {
	if (exclusiveEnd) console.assert(inclusiveStart.parentNode === exclusiveEnd.parentNode);
	let node = inclusiveStart;
	while (node && node !== exclusiveEnd) {
		let next = node.nextSibling;
		callback(node);
		node = next;
	}
}


class Framer {

/**
 * Configuration callbacks and lifecycle hooks.
 * @property {function(string): (Object|string|false|null)} [lookup] - Given a page URL, returns frameset config ({framesetURL, scope}), a framesetURL string, or falsy if unknown.
 * @property {function(Document): (Object|string|false|null)} [detect] - Given the landing page document, returns frameset config ({framesetURL, scope}), a framesetURL string, or falsy if unknown.
 * @property {{before?: Function, after?: Function}} [entering] - Lifecycle hooks called when navigating into a new state.
 * @property {{before?: Function, after?: Function}} [leaving] - Lifecycle hooks called when leaving the current state (not currently invoked).
 * @property {Function} [ready] - Called when the frameset is fully rendered and active.
 */
options = {};

/** @type {?HFrameset} The active frameset sprocket instance bound to document.body. */
frameset = null;

/** @type {boolean} Whether start() or startAsFrameset() has been called. */
started = false;

/** @type {{promise: Promise, resolve: Function, reject: Function}} Resolves when the frameset sprocket enters the document. */
framesetReady = Promise.withResolvers();

/** @type {?string} Base URL scope for resolving relative URLs within the frameset. */
scope = null;

/** @type {?string} Resolved URL of the frameset document (without hash). */
framesetURL = null;

/** @type {?HFramesetDefinition} Parsed frameset definition used for rendering. */
definition = null;

/** @type {?Object} Current navigation state: {url, target}. */
currentChangeset = null;

/**
 * Merge caller-provided options into the framer's configuration.
 * Typically called before start() to set lookup, detect, and lifecycle hooks.
 *
 * @param {Object} options - Configuration object to merge into this.options.
 */
config(options) {
	if (!options) return;
	_.assign(this.options, options);
}

/**
 * Main entry point for HyperFrameset initialization.
 *
 * In content-first mode (startOptions.contentDocument provided): the content document
 * is captured and cached in httpProxy, the frameset is resolved via lookup/detect,
 * fetched, and applied to the live document. The captured content is then loaded
 * into the appropriate frame.
 *
 * In frameset-first mode (no contentDocument): delegates to #startAsFrameset where
 * the landing page IS the frameset document.
 *
 * @param {Object} [startOptions] - Startup configuration.
 * @param {Promise<Document>} [startOptions.contentDocument] - Promise resolving to the captured landing page document.
 * @param {string} [startOptions.start_url] - Initial content URL for frameset-first mode.
 * @throws {Error} If already started.
 * @returns {Promise} Resolves when the frameset is fully active.
 */
start(startOptions) {
	let framer = this;
	if (framer.started) throw Error('Already started');
	framer.started = true;
	framer.behaviors = install({ globalName: 'behaviors', attr: '_config', container: document.head, autoProcess: false });
	if (!startOptions || !startOptions.contentDocument) {
		console.info("No contentDocument passed to start(). Assuming landing-page is the frameset.")
		return framer.#startAsFrameset(startOptions);
	}

	Thenfu.asap(startOptions.contentDocument)
	.then((doc) => { // FIXME potential race condition between document finished loading and frameset rendering
		return httpProxy.add({ url: document.URL, type: 'document', document: doc });
	});

	return Thenfu.pipe(null, [

	// Wait for document.body to exist
	() => {
		return Thenfu.wait(() => !!document.body);
	},

	// Resolve frameset URL via lookup (by URL) or detect (by inspecting content document)
	() => {
		let framerConfig;
		framerConfig = framer.lookup(document.URL);
		if (framerConfig) return framerConfig;
		return startOptions.contentDocument
			.then((doc) => framer.detect(doc));
	},

	// Fetch the frameset document and create a definition from it
	(framerConfig) => {
		if (!framerConfig) throw Error('No frameset could be determined for this page');
		framer.scope = framerConfig.scope; // FIXME shouldn't set this until loadFramesetDefinition() returns success
		let framesetURL = URLux.create(framerConfig.framesetURL);
		if (framesetURL.hash) console.info(`Ignoring hash component of frameset URL: ${framesetURL.hash}`);
		framer.framesetURL = framerConfig.framesetURL = framesetURL.nohash;
		return httpProxy.load(framer.framesetURL, { responseType: 'document' })
		.then((response) => new HFramesetDefinition(response.document, { ...framerConfig, behaviors: framer.behaviors }));
	},

	// Prepare the live document, preprocess the definition, and pre-render the frameset body
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

	// Register elements, start sprockets, initialize history
	() => framer.#activate()

	]);
}

/**
 * Frameset-first entry point. The landing page IS the frameset document.
 * No external frameset is fetched and no content document is captured.
 * The live document is used directly as the frameset definition, then frames
 * load their content via their @src attributes.
 *
 * If startOptions.start_url is provided, the address bar is updated via
 * history.replaceState so that downstream lookup sees the content URL
 * rather than the frameset URL.
 *
 * @limitation Frameset-first mode only supports GET navigation. Apps that
 * need to handle POST form submissions must use content-first mode instead.
 *
 * @param {Object} [startOptions] - Startup configuration.
 * @param {string} [startOptions.start_url] - URL to replace in the address bar, representing the initial content page.
 * @returns {Promise} Resolves when the frameset is fully active.
 */
#startAsFrameset(startOptions) {
	let framer = this;

	let startURL = startOptions && startOptions.start_url;

	let framesetURL = URLux.create(document.URL);
	framer.framesetURL = framesetURL.nohash;
	framer.scope = Framer.#deriveScope(startOptions && startOptions.scope, startURL, framesetURL);

	let settings = { framesetURL: framer.framesetURL, scope: framer.scope, behaviors: framer.behaviors };
	let definition = new HFramesetDefinition(document, settings);

	framer.definition = definition;

	return Thenfu.pipe(null, [

		// Wait for document.body, then optionally hide it until preprocessing is done
		() => Thenfu.wait(() => !!document.body),
		() => { if (startOptions && startOptions.hide) document.body.hidden = true; },

		// Wait for DOM to be fully parsed
		() => new Promise(resolve => {
			if (document.readyState !== 'loading') resolve();
			else document.addEventListener('DOMContentLoaded', resolve, { once: true });
		}),

		// Replace the address bar URL with start_url so downstream code sees the content URL
		() => {
			if (startURL) history.replaceState(null, '', startURL);
		},

		// Parse frameset definition (extract frame configs, transforms, etc.)
		() => definition.preprocess(),

		// Insert frameset/self markers so content-specific head elements can be managed
		// Order: [self marker] [content elements] [frameset marker] [frameset elements]
		() => Framer.#insertMarkers(document.URL, framer.framesetURL),

		// Register elements, start sprockets, initialize history
		() => framer.#activate(),

		// Reveal the body now that the frameset is ready
		() => { if (startOptions && startOptions.hide) document.body.hidden = false; }
	]);
}

/**
 * Derive the scope for frameset-first mode.
 *
 * If scope is provided, uses it directly.
 * Otherwise infers from start_url's base directory (if start_url is provided)
 * or falls back to the frameset URL's base directory.
 *
 * @param {string|null} scope - Explicit scope override.
 * @param {string|null} startURL - Start URL to derive scope from.
 * @param {URLux} framesetURL - The parsed frameset URL.
 * @returns {string} The resolved scope URL.
 * @throws {Error} If start_url is not within the resolved scope.
 */
static #deriveScope(scope, startURL, framesetURL) {
	let resolvedStartURL = startURL ? URLux.create(framesetURL.resolve(startURL)).nohash : null;
	scope = scope || (resolvedStartURL ? URLux.create(resolvedStartURL).base : framesetURL.base);
	if (resolvedStartURL && resolvedStartURL.indexOf(scope) !== 0) {
		throw Error('start_url is not within scope: ' + resolvedStartURL);
	}
	return scope;
}

/**
 * Shared post-boot pipeline called by both start() and #startAsFrameset().
 * Registers global event listeners (click, submit), registers frame definitions,
 * applies monkey-patches for frame/frameset element lifecycle, registers all
 * sprocket elements, starts sprocket DOM monitoring, initializes history management,
 * and fires the enteredState notification.
 *
 * @returns {Promise} Resolves when stylesheets are loaded and frameset is fully active.
 */
#activate() {
	let framer = this;
	return Thenfu.pipe(null, [

	// Register global event listeners, frame definitions, frameset elements, and start DOM monitoring
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
		framer.#registerFramesetElement();
		let namespace = framer.definition.namespaces.lookupNamespace(HYPERFRAMESET_URN);
		layoutElements.register(namespace);
		transcluder.registerElement(namespace, 'transclude', HTransclude);
		transcluder.registerElement(namespace, 'frame', HFrame);
	},

	() => {
		navigation.addEventListener('navigate', (e) => {
			if (!e.canIntercept) return;
			// WARN: We intercept all traversals unconditionally
			//   because e.destination.getState() is unreliable in WebKit,
			//   so we can't validate before intercepting.
			//   HyperFrameset assumes it owns all history entries in the document.
			if (e.navigationType === 'traverse') {
				e.intercept({
					handler: () => {
						let settings = navigation.currentEntry.getState();
						if (!HistoryState.isValid(settings)) return;
						let state = new HistoryState(settings);
						this.onPopState(state.getData());
					}
				});
			}
			// TODO intercept 'reload' to support re-rendering POST response pages
			//   without a real network request. Requires storing POST body in entry state.
		});
	},

	// Wait for the frameset to enter the document, then start history management
	// TODO ideally frameset rendering wouldn't start until after this step
	() => {
		let url = document.URL;
		if (url === this.framesetURL) return; // frameset-first with no start_url — no changeset
		this.currentChangeset = this.frameset.lookup(url, {referrer: document.referrer});
		console.debug('framesetEntered: lookup returned', this.currentChangeset, 'for', url);
		if (!this.currentChangeset && this.options.lookup) {
			let target = this.options.lookup(url);
			if (target) this.currentChangeset = Framer.#inferChangeset(url, target);
			console.debug('framesetEntered: options.lookup returned', this.currentChangeset);
		}
	},

	() => {
		let changeset = this.currentChangeset;
		if (changeset) {
			this.load(document.URL, changeset, 'replace');
		}
	},

	// Fire the enteredState lifecycle notification
	() => { // FIXME this should wait until at least the landing document has been rendered in one frame
		Framer.#notify({ module: 'frameset', type: 'enteredState', stage: 'after', url: document.URL });
	},

	// Wait for all stylesheets to finish loading before considering the frameset ready
	// TODO it would be nice if <body> wasn't populated until stylesheets were loaded
	() => DOM.cssReady()

	]);
}
	/**
 * Called when an HFrame connects to the document.
 * If this frame's targetname matches the current changeset, sets its @src.
 *
 * @param {HFrame} frame - The HFrame element that connected.
 */
frameEntered(frame) {
	let targetName = frame.getAttribute('targetname');
	console.debug('frameEntered:', targetName, 'currentChangeset:', this.currentChangeset);
	if (this.currentChangeset && targetName === this.currentChangeset.target) {
		frame.setAttribute('src', this.currentChangeset.url);
		console.debug('frameEntered: set src to', frame.getAttribute('src'));
	}
}

/**
 * Global click handler. Intercepts left-clicks on hyperlinks (or elements with [link]),
 * resolves the href against the current URL, and dispatches a 'requestnavigation'
 * custom event. Returns false to indicate the default click action should be prevented.
 *
 * Ignores modified clicks (ctrl, meta, alt, shift) and non-primary button clicks.
 *
 * @param {MouseEvent} e - The click event.
 * @returns {false|undefined} false if navigation was intercepted, undefined otherwise.
 */
onClick(e) { // return false means success
	if (e.button != 0) return; // FIXME what is the value for button in IE's W3C events model??
	if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return; // FIXME do these always trigger modified click behavior??

	// Find closest <a href> to e.target
	let linkElement = DOM.closest(e.target, 'a, [link]');
	if (!linkElement) return;
	let hyperlink;
	if (linkElement.localName === 'a') hyperlink = linkElement;
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

/**
 * Global submit handler. Intercepts form submissions (GET only), serializes form
 * data into a query string, resolves the action URL, and dispatches a
 * 'requestnavigation' custom event. Returns false to prevent default submission.
 *
 * Ignores forms with a @target attribute (those target an iframe).
 *
 * @param {Event} e - The submit event.
 * @returns {false|undefined} false if navigation was intercepted, undefined otherwise.
 */
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

/**
 * Dispatches a 'requestnavigation' CustomEvent on the source element.
 * The event bubbles up through the DOM, giving frame/frameset sprockets a chance
 * to intercept it. If no handler prevents default, falls back to location.assign().
 *
 * Deferred via Thenfu.defer() to avoid re-entrancy during event handling.
 *
 * @param {string} url - The resolved navigation URL.
 * @param {Object} details - Navigation context.
 * @param {string} details.url - The target URL.
 * @param {Element} details.element - The source element (link or form).
 */
triggerRequestNavigation(url, details) {
	Thenfu.defer(() => {
		let event = new CustomEvent('requestnavigation', { bubbles: true, cancelable: true, detail: details.url });
		let acceptDefault = details.element.dispatchEvent(event);
		if (acceptDefault !== false) { location.assign(details.url); }
	});
}

/**
 * Handles a 'requestnavigation' event that has bubbled up to a frame or frameset sprocket.
 *
 * The requestnavigation event bubbles from the source element (e.g. a clicked link)
 * up through ancestor frames. Each frame with an options.lookup gets a chance to
 * handle the navigation in this order:
 *   1. Nearest ancestor frame — if its lookup returns a changeset, navigation is handled here.
 *   2. Next nearest ancestor frame — if the previous frame's lookup returned false/null,
 *      the event continues bubbling.
 *   3. The frameset (body) — last chance for in-page navigation. Applies additional guards:
 *      rejects cross-origin URLs, handles same-page links separately, and verifies the URL
 *      is within the current frameset's scope before attempting pushState navigation.
 *   4. If no sprocket prevents default, triggerRequestNavigation falls back to location.assign().
 *
 * @param {CustomEvent} e - The requestnavigation event. e.detail is the target URL.
 * @param {Object} frame - The frame or frameset sprocket that received the event.
 * @returns {false|undefined} false if navigation was handled (preventDefault), undefined to allow continued bubbling.
 */
onRequestNavigation(e, frame) { // `return false` means success (so preventDefault)
	if (!frame) throw Error('Invalid frame / frameset in onRequestNavigation');

	let url = e.detail;
	let details = { url: url, element: e.target };
	let framer = this;

	if (!frame.isFrameset) {
		if (framer.requestNavigation(frame, url, details)) return false;
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

	if (framer.requestNavigation(frameset, url, details)) return false;
}

/**
 * Attempt in-page navigation for a frame or frameset. Calls the frame's lookup
 * to resolve the URL to a changeset.
 *
 * Possible outcomes:
 *   - lookup returns a changeset object → triggers framer.load() for pushState
 *     navigation and returns true (handled).
 *   - lookup returns '' or true → signals success without loading (navigation
 *     accepted but no content change needed), returns true.
 *   - lookup returns null or false → this frame does not handle the URL,
 *     returns false so the event continues bubbling to the next ancestor.
 *
 * @param {Object} frame - The frame or frameset sprocket to attempt navigation on.
 * @param {string} url - The resolved target URL.
 * @param {Object} details - Navigation context with url and source element.
 * @returns {boolean} true if navigation was handled, false to continue bubbling.
 */
requestNavigation(frame, url, details) {
	let changeset = frame.lookup(url, details);
	if (changeset === '' || changeset === true) return true;
	if (changeset == null || changeset === false) return false;
	this.load(url, changeset, frame.isFrameset);
	return true;
}

/**
 * Handles same-page link navigation (where only the hash differs).
 * Currently a no-op placeholder.
 *
 * @param {string} url - The full URL including hash.
 * @param {Object} details - Navigation context with url and element.
 */
onPageLink(url, details) {
	console.warn('Ignoring on-same-page links for now.'); // FIXME
}

/**
 * Public API for programmatic navigation. Loads content into the target frame
 * and pushes a new history state.
 *
 * @param {string} url - The URL to navigate to.
 * @param {Object} changeset - Navigation state with target frame info.
 * @param {string} changeset.target - The targetname of the frame to load content into.
 * @returns {Promise} Resolves when navigation is complete.
 */
navigate(url, changeset) { // FIXME doesn't support replaceState
	return this.load(url, changeset, true);
}

/**
 * Core navigation implementation. Finds matching frames by target name,
 * sets their @src to trigger content loading, fetches the document via httpProxy,
 * optionally pushes history state, and fires lifecycle notifications.
 *
 * @param {string} url - The URL to load.
 * @param {Object} changeset - Navigation state.
 * @param {string} changeset.target - The targetname of the frame(s) to update.
 * @param {boolean|string|number} changeState - 'replace' for replaceState, truthy for pushState, 0/falsy for no state change (popstate).
 * @returns {Promise} Resolves when the load pipeline completes.
 */
load(url, changeset, changeState) { // FIXME doesn't support replaceState
	let mustNotify = changeState || changeState === 0;
	let target = changeset.target;
	let frames = document.body.querySelectorAll(`[targetname="${target}"]`);
	frames = Array.from(frames).filter(el => el instanceof HFrame);

	let fullURL = URLux.create(url);
	let hash = fullURL.hash;
	let nohash = fullURL.nohash;
	let request = { method: 'get', url: nohash, responseType: 'document' };
	let response;

	return Thenfu.pipe(null, [
	// Notify lifecycle: leaving current state
	() => {
		// TODO disabled for 'replace' assumes this is the landing page. Might need to rethink this.
		if (changeState !== 'replace' && mustNotify) return Framer.#notify({ module: 'frameset', type: 'leftState', stage: 'before', url: document.URL });
	},
	// Set @src on matching frames to trigger their refresh/load cycle
	() => { _.forEach(frames, (frame) => { frame.setAttribute('src', fullURL); }); },
	// Fetch the document via httpProxy
	// NOTE .load() is just to sync pushState
	() => httpProxy.load(nohash, request).then((resp) => { response = resp; }),
	// Update history state (push, replace, or skip)
	() => {
		if (changeState) {
			let state = HistoryState.create(changeset, '', url);
			if (changeState === 'replace') history.replaceState(null, '', url);
			else history.pushState(null, '', url);
			navigation.updateCurrentEntry({ state: state.settings });
		}
	},
	// Notify lifecycle: entered new state
	() => {
		if (mustNotify) return Framer.#notify({ module: 'frameset', type: 'enteredState', stage: 'after', url: url });
	}
	]);
}

/**
 * History popstate handler. Called when the user navigates back/forward.
 * Loads the popped state's URL into the appropriate frame without pushing
 * a new history entry.
 *
 * @param {Object} changeset - The navigation state retrieved from the popped history entry.
 * @param {string} changeset.url - The URL of the popped state.
 * @param {string} changeset.target - The target frame name.
 */
onPopState(changeset) {
	let url = changeset.url;
	if (url !== document.URL) {
		console.warn('Popped state URL does not match address-bar URL.');
	}
	this.load(url, changeset, 0);
}

/**
 * Resolve a document URL to a frameset scope configuration using options.lookup.
 * In content-first mode, options.lookup returns a frameset URL string which is
 * then resolved to a { scope, framesetURL } object via #implyFramesetScope.
 *
 * @param {string} docURL - The document URL to look up.
 * @returns {Object|false|undefined} { scope, framesetURL } if found, false if explicitly not handled, undefined if no lookup configured.
 * @throws {Error} If options.lookup returns an invalid result.
 */
lookup(docURL) {
	if (!this.options.lookup) {
		if (docURL.indexOf(this.scope) === 0) return { scope: this.scope, framesetURL: this.framesetURL };
		return false;
	}
	let result = this.options.lookup(docURL);
	if (result == null || result === false) return false;
	if (typeof result === 'string') result = Framer.#implyFramesetScope(result, docURL);
	if (typeof result !== 'object' || !result.scope || !result.framesetURL) throw Error('Unexpected result from frameset lookup');
	return result;
}

/**
 * Resolve a frameset from the content document itself using options.detect.
 * Used as a fallback when options.lookup doesn't match. Typically inspects the
 * document for a <link rel="frameset"> element.
 *
 * @param {Document} srcDoc - The content document to inspect.
 * @returns {Object|false|undefined} { scope, framesetURL } if detected, false if not, undefined if no detect configured.
 * @throws {Error} If options.detect returns an invalid result.
 */
detect(srcDoc) {
	if (!this.options.detect) return;
	let result = this.options.detect(srcDoc);
	if (result == null || result === false) return false;
	if (typeof result === 'string') result = Framer.#implyFramesetScope(result, document.URL);
	if (typeof result !== 'object' || !result.scope || !result.framesetURL) throw Error('Unexpected result from frameset detect');
	return result;
}

/**
 * Check whether a given frameset scope configuration matches the currently active
 * frameset. Used during navigation to determine if a URL belongs to the same
 * frameset (and can be handled in-page) or requires a full page load.
 *
 * @param {Object} settings - Scope to compare.
 * @param {string} settings.framesetURL - The frameset URL to compare.
 * @param {string} settings.scope - The scope to compare.
 * @returns {boolean} true if both framesetURL and scope match the current frameset.
 */
compareFramesetScope(settings) {
	if (this.framesetURL !== settings.framesetURL) return false;
	if (this.scope !== settings.scope) return false;
	return true;
}

/**
 * Build a changeset object from a URL and a partial result (target name string).
 * Public wrapper around the static #inferChangeset for use by patched sprocket methods.
 *
 * @param {string} url - The navigation URL.
 * @param {string} partial - The target frame name returned by a lookup function.
 * @returns {Object} Changeset object: { url, target }.
 */
inferChangeset(url, partial) {
	return Framer.#inferChangeset(url, partial);
}

// --- Static private helpers ---

/**
 * URL-encode form data as a query string (application/x-www-form-urlencoded).
 *
 * @param {HTMLFormElement} form - The form element to encode.
 * @returns {string} Encoded query string (without leading '?').
 */
static #encode(form) {
	let data = [];
	_.forEach(form.elements, (el) => {
		if (!el.name) return;
		data.push(el.name + '=' + encodeURIComponent(el.value));
	});
	return data.join('&');
}

/**
 * Prepare the live document to receive the frameset.
 * Strips existing stylesheets and body content, inserts frameset/self marker links
 * in <head>, merges attributes and head elements from the frameset definition,
 * and executes any frameset scripts.
 *
 * The definition document is cloned (to avoid mutating the cached definition).
 * <head> is partitioned by selfMarker/framesetMarker <link> into zones: [self marker] [content elements] [frameset marker] [frameset elements].
 *
 * @param {Document} dstDoc - The live document to prepare.
 * @param {HFramesetDefinition} definition - The parsed frameset definition.
 * @returns {Promise} Resolves when preparation (including script execution) is complete.
 * @throws {Error} If the frameset marker already exists (double application).
 */
static #prepareFrameset(dstDoc, definition) {
	if (Framer.#getFramesetMarker(dstDoc)) throw Error('The HFrameset has already been applied');

	let srcDoc = DOM.cloneDocument(definition.document);

	return Thenfu.pipe(null, [
	// Strip existing stylesheets from the live document head
	() => {
		let dstHead = dstDoc.head;
		_.forEach(DOM.findAll('link[rel|=stylesheet]', dstHead), (node) => { dstHead.removeChild(node); });
	},
	// Clear the live document body
	() => {
		let dstBody = dstDoc.body;
		let node;
		while (node = dstBody.firstChild) dstBody.removeChild(node);
	},
	// Ensure self/frameset markers are in place
	() => Framer.#insertMarkers(dstDoc.URL, definition.src),
	// Merge frameset attributes and head elements into the live document, then execute scripts
	() => {
		Framer.#mergeElement(dstDoc.documentElement, srcDoc.documentElement);
		Framer.#mergeElement(dstDoc.head, srcDoc.head);
		Framer.#mergeHead(dstDoc, srcDoc.head, true);
		_.forEach(DOM.findAll('script', dstDoc.head), (script) => { scriptQueue.push(script); });
		return scriptQueue.empty();
	}
	]);
}

/**
 * Copy attributes from the frameset definition's body element onto the live document's body.
 * Does not copy child nodes — those are inserted later by HFrameset.render().
 *
 * TODO: a more appropriate method name
 *
 * @param {Document} dstDoc - The live document.
 * @param {HFramesetDefinition} definition - The parsed frameset definition.
 */
static #prerenderFrameset(dstDoc, definition) {
	let srcBody = definition.element;
	let dstBody = dstDoc.body;
	Framer.#mergeElement(dstBody, srcBody);
}

/**
 * Remove head elements in a zone, preserving executable scripts.
 *
 * Order: [self marker] [content elements] [frameset marker] [frameset elements]
 * When isFrameset=true, removes nodes after framesetMarker (old frameset elements).
 * When isFrameset=false, removes nodes between selfMarker and framesetMarker (old content elements).
 * Scripts with type text/javascript or module are preserved (see isExecutableScript).
 *
 * @param {Document} dstDoc - The live document.
 * @param {boolean} isFrameset - Whether to separate frameset-owned elements (true) or content-owned (false).
 * @throws {Error} If no frameset marker is found.
 */
static #separateHead(dstDoc, isFrameset) {
	let framesetMarker = Framer.#getFramesetMarker(dstDoc);
	if (!framesetMarker) throw Error(`No ${FRAMESET_REL} marker found. `);
	let selfMarker = Framer.#getSelfMarker(dstDoc);
	// Order: [self marker] [content elements] [frameset marker] [frameset elements]
	if (isFrameset) Framer.#removeBetween(framesetMarker);
	else Framer.#removeBetween(selfMarker, framesetMarker);
}

/**
 * Remove sibling nodes between two boundaries, skipping executable scripts.
 * @param {Node} exclusiveStart - Start node (not removed); removal begins at its nextSibling.
 * @param {Node} [exclusiveEnd] - Optional end node (not removed); removal stops before it.
 */
static #removeBetween(exclusiveStart, exclusiveEnd) {
	walkSiblings(exclusiveStart.nextSibling, (node) => {
		if (!isExecutableScript(node)) node.remove();
	}, exclusiveEnd);
}

/**
 * Merge <head> elements from a source document (frameset or content) into the live document.
 * Uses the frameset/self markers to position elements in the correct zone.
 *
 * The <head> is structured as: [selfMarker] [content elements] [framesetMarker] [frameset elements].
 * When isFrameset=true, source elements are appended after framesetMarker (end of head).
 * When isFrameset=false, source elements are inserted before framesetMarker (content zone).
 * Scripts are disabled (type suffixed with ?disabled) when merging frameset head.
 *
 * @param {Document} dstDoc - The live document.
 * @param {HTMLHeadElement} srcHead - The source head element to merge from.
 * @param {boolean} isFrameset - Whether the source is a frameset document (true) or content document (false).
 * @throws {Error} If no frameset marker is found.
 */
static #mergeHead(dstDoc, srcHead, isFrameset) {
	let baseURL = URLux.create(dstDoc.URL);
	let dstHead = dstDoc.head;
	let framesetMarker = Framer.#getFramesetMarker();
	if (!framesetMarker) throw Error(`No ${FRAMESET_REL} marker found. `);
	let selfMarker = Framer.#getSelfMarker();

	Framer.#separateHead(dstDoc, isFrameset);

	_.forEach(Array.from(srcHead.childNodes), (srcNode) => {
		if (srcNode.nodeType !== 1) return;
		switch (srcNode.localName) {
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
		// Order: [self marker] [content elements] [frameset marker] [frameset elements]
		if (isFrameset) DOM.insertNode('beforeend', dstHead, srcNode);
		else DOM.insertNode('beforebegin', framesetMarker, srcNode);
		if (srcNode.localName === 'link') srcNode.href = srcNode.getAttribute('href');
	});
}

/**
 * Copy all attributes from a source element to a destination element,
 * removing any existing attributes on the destination first.
 * Also removes any inline @style that was copied.
 *
 * @param {Element} dst - The destination element.
 * @param {Element} src - The source element to copy attributes from.
 */
static #mergeElement(dst, src) {
	if (dst === src) return;
	DOM.removeAttributes(dst);
	DOM.copyAttributes(dst, src);
	dst.removeAttribute('style'); // FIXME is this appropriate?
}

/**
 * Find the <link rel="frameset"> marker in the document head.
 *
 * @param {Document} [doc=document] - The document to search.
 * @returns {Element|null} The frameset marker link element, or null.
 */
static #getFramesetMarker(doc) {
	if (!doc) doc = document;
	return DOM.find(`link[rel~=${FRAMESET_REL}]`, doc.head);
}

/**
 * Find the <link rel="self"> marker in the document head.
 *
 * @param {Document} [doc=document] - The document to search.
 * @returns {Element|null} The self marker link element, or null.
 */
static #getSelfMarker(doc) {
	if (!doc) doc = document;
	return DOM.find(`link[rel~=${SELF_REL}]`, doc.head);
}

/**
 * Insert frameset/self marker links into the document head.
 * Establishes the head partitioning: [frameset marker] [frameset elements] [self marker] [content elements].
 *
 * In content-first mode (isFrameset=false): the self marker goes first (at the top),
 * frameset marker is inserted before it. Frameset elements will be merged between them later.
 *
 * In frameset-first mode (isFrameset=true): the frameset marker goes first (before existing content),
 * self marker goes last (after existing frameset content).
 *
 * Reuses an existing self marker if boot.js already created one.
 *
 * @param {string} selfURL - The URL for the self marker (content page URL).
 * @param {string} framesetURL - The URL for the frameset marker.
 * @param {boolean} isFrameset - true if the landing page is the frameset document.
 */
static #insertMarkers(selfURL, framesetURL) {
	let head = document.head;

	let framesetMarker = document.createElement('link');
	framesetMarker.rel = FRAMESET_REL;
	framesetMarker.href = framesetURL;

	let selfMarker = Framer.#getSelfMarker();
	if (!selfMarker) {
		selfMarker = document.createElement('link');
		selfMarker.rel = SELF_REL;
		selfMarker.href = selfURL;
		head.prepend(selfMarker);
	}

	// Frameset marker goes at end: [self marker] [content] [frameset marker] [frameset elements]
	head.append(framesetMarker);

	// Move startup executable scripts above self marker (they're infrastructure, not content)
	walkSiblings(selfMarker.nextSibling, (node) => {
		if (isExecutableScript(node)) head.insertBefore(node, selfMarker);
	}, framesetMarker);
}

/**
 * Given a frameset source URL and a document URL, resolve the frameset URL
 * relative to the document's origin and infer the scope (common base path).
 *
 * @param {string} framesetSrc - The frameset URL (possibly relative to site root).
 * @param {string} docSrc - The document URL to resolve against.
 * @returns {Object} { scope: string, framesetURL: string } with fully resolved URLs.
 */
static #implyFramesetScope(framesetSrc, docSrc) {
	let docURL = URLux.create(docSrc);
	let docSiteURL = URLux.create(docURL.origin);
	framesetSrc = docSiteURL.resolve(framesetSrc);
	let scope = Framer.#implyScope(framesetSrc, docSrc);
	return { scope: scope, framesetURL: framesetSrc };
}

/**
 * Infer the scope (base directory) that is common to both the frameset URL
 * and the document URL. Uses the document's base path, narrowing to the
 * frameset's base path if the document is within it.
 *
 * @param {string} framesetSrc - Fully resolved frameset URL.
 * @param {string} docSrc - Fully resolved document URL.
 * @returns {string} The inferred scope URL (a directory path).
 */
static #implyScope(framesetSrc, docSrc) {
	let docURL = URLux.create(docSrc);
	let framesetURL = URLux.create(framesetSrc);
	let scope = docURL.base;
	let framesetBase = framesetURL.base;
	if (scope.indexOf(framesetBase) >= 0) scope = framesetBase;
	return scope;
}

/**
 * Build a changeset object from a URL and a partial lookup result.
 * Currently only supports string partials (interpreted as target frame names).
 *
 * @param {string} url - The navigation URL.
 * @param {string} partial - The target frame name.
 * @returns {Object} { url, target }
 * @throws {Error} If partial is not a string.
 */
static #inferChangeset(url, partial) {
	let inferred = { url: url };
	switch (typeof partial) {
	case 'string': inferred.target = partial; break;
	default: throw Error('Invalid changeset returned from lookup()');
	}
	return inferred;
}

/**
 * Dispatch a lifecycle notification to the frameset's configured options handlers.
 * Looks up handler by msg.type (e.g. 'enteredState', 'leftState') and msg.stage
 * ('before' or 'after') on the frameset body sprocket's options object.
 *
 * TODO: Clarify the full set of valid msg combinations ({ module, type, stage })
 * and when each is expected to fire. The dispatch logic for 'frame' module messages
 * (bodyLeft, bodyEntered) doesn't appear to be invoked from this file currently.
 *
 * @param {Object} msg - Notification descriptor.
 * @param {string} msg.module - 'frameset' or 'frame'.
 * @param {string} msg.type - Event type: 'enteredState', 'leftState', 'bodyEntered', 'bodyLeft'.
 * @param {string} msg.stage - 'before' or 'after'.
 * @param {string} msg.url - The relevant URL for this notification.
 * @returns {Promise} Resolves after the handler (if any) completes.
 */
static #notify(msg) {
	let module;
	switch (msg.module) {
	case 'frameset': module = framer.frameset.behavior; break;
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

/**
 * Register all frame definitions from the frameset definition into the
 * global transcludeDefinitions registry, keyed by their definition name.
 *
 * @param {HFramesetDefinition} framesetDef - The frameset definition containing frame configs.
 */
static #registerFrames(framesetDef) {
	_.forOwn(framesetDef.frames, (o, key) => { transcludeDefinitions.set(key, o); });
}

/**
 * Register the HFrameset element on <body> and inject base CSS reset styles.
 */
#registerFramesetElement() {
	let cssText = ['html, body { margin: 0; padding: 0; }', 'html { width: 100%; height: 100%; }'];
	let style = document.createElement('style');
	style.textContent = cssText.join('\n');
	document.head.append(style);

	let element = document.body;
	this.frameset  = new HFrameset(element);
	// Listen for requestnavigation if lookup is available
	// TODO replace this with 'navigate' listener.
	element.addEventListener('requestnavigation', (e) => {
		if (e.defaultPrevented) return;
		// Read page-author's lookup from behavior (script[for] on body)
		if (!this.frameset?.element?.behavior?.lookup) return;

		let acceptDefault = this.onRequestNavigation(e, this.frameset);
		if (acceptDefault === false) e.preventDefault();
	});

	this.frameset.render();
}

} // end class Framer

let framer = new Framer();

/**
 * HFrameset — manages the frameset layout on <body>.
 * Not registered via customElements.define (body can't be a custom element).
 * Lifecycle methods are called manually by the framer.
 */
class HFrameset {

constructor(body) {
	this.element = body;
	this.behavior = this.element.behavior;
	this.isFrameset = true;
	this.definition = framer.definition;
}

lookup(url, details) {
	let partial = this.element.behavior.lookup(url, details);
	if (partial === '' || partial === true) return true;
	if (partial == null || partial === false) return false;
	return framer.inferChangeset(url, partial);
}

render() {
	let definition = this.definition;
	let dstBody = this.element;

	if (definition.element === dstBody) return;

	let srcBody = definition.render();

	return Thenfu.pipe(null, [
	function() {
		_.forEach(Array.from(srcBody.childNodes), function(node) {
			dstBody.appendChild(node);
		});
	}
	]);
}

}

/**
 * HFrame extends HTransclude with routing awareness: frame-tree participation,
 * targetname-based navigation, and framer lifecycle integration.
 */
class HFrame extends HTransclude {

	connectedCallback() {
		this.addEventListener('requestnavigation', (e) => {
			if (e.defaultPrevented) return;
			if (this.behavior.lookup) {
				let acceptDefault = framer.onRequestNavigation(e, this);
				if (acceptDefault === false) e.preventDefault();
			}
		});
		framer.frameEntered(this);
		super.connectedCallback();
	}

	disconnectedCallback() {
		super.disconnectedCallback();
	}

	lookup(url, details) {
		let element = this;
		if (!element.behavior.lookup) return false;
		let partial = element.behavior.lookup(url, details);
		if (partial === '' || partial === true) return true;
		if (partial == null || partial === false) return false;
		return framer.inferChangeset(url, partial);
	}

	static isFrame(element) { return HTransclude.isFrame(element); }
}

export { HFrameset, HFrame };
export default framer;
