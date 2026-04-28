import * as _ from './stuff.mjs';
import URL from './URL.mjs';
import * as DOM from './DOM.mjs';
import configData from './configData.mjs';
import CustomNamespace, { HYPERFRAMESET_URN } from './CustomNamespace.mjs';
import HFrameDefinition from './HFrameDefinition.mjs';
import htmlParser from './htmlParser.mjs';

const { rebase, rebaseURL, normalizeScopedStyles } = htmlParser;

/** Fallback namespace registered when the frameset document doesn't declare one. */
const hfDefaultNamespace = new CustomNamespace({
	name: 'hf',
	style: 'vendor',
	urn: HYPERFRAMESET_URN
});


class HFramesetDefinition {

constructor(doc, settings) {
	if (!doc) return; // in case of inheritance
	this.namespaces = null;
	this.init(doc, settings);
}

init(doc, settings) {
	let framesetDef = this;
	_.defaults(framesetDef, {
		url: settings.framesetURL,
		scope: settings.scope
	});

	let namespaces = framesetDef.namespaces = CustomNamespace.getNamespaces(doc);
	if (!namespaces.lookupNamespace(HYPERFRAMESET_URN)) {
		namespaces.add(hfDefaultNamespace);
	}

	// NOTE first rebase scope: urls
	let scopeURL = URL(settings.scope);
	rebase(doc, scopeURL);
	let frameElts = DOM.findAll(
		framesetDef.namespaces.lookupSelector('frame', HYPERFRAMESET_URN), 
		doc.body);
	_.forEach(frameElts, function(el, index) { // FIXME hyperframes can't be outside of <body> OR descendants of repetition blocks
		// NOTE first rebase @src with scope: urls
		let src = el.getAttribute('src');
		if (src) {
			let newSrc = rebaseURL(src, scopeURL);
			if (newSrc != src) el.setAttribute('src', newSrc);
		}
	});

	// warn about not using @id
	let idElements = DOM.findAll('*[id]:not(script)', doc.body);
	if (idElements.length) {
		console.warn('@id is strongly discouraged in frameset-documents (except on <script>).\n' +
			'Found ' + idElements.length + ', ' + 
			'first @id is ' + idElements[0].getAttribute('id')
		);
	}

	// Add @id and @sourceurl to inline <script type="text/javascript">
	let scripts = DOM.findAll('script', doc);
	_.forEach(scripts, function(script, i) {
		// ignore non-javascript scripts
		if (script.type && !/^text\/javascript/.test(script.type)) return;
		// ignore external scripts
		if (script.hasAttribute('src')) return;
		let id = script.id;
		// TODO generating ID always has a chance of duplicating IDs
		if (!id) id = script.id = 'script[' + i + ']'; // FIXME doc that i is zero-indexed
		let sourceURL;
		if (script.hasAttribute('sourceurl')) sourceURL = script.getAttribute('sourceurl');
		else {
			sourceURL = framesetDef.url + '__' + id; // FIXME this should be configurable
			script.setAttribute('sourceurl', sourceURL);
		}
		script.text += '\n//# sourceURL=' + sourceURL;
	});

	// Move all <script for> in <head> to <body>
	let firstChild = doc.body.firstChild;
	_.forEach(DOM.findAll('script[for]', doc.head), function(script) {
		doc.body.insertBefore(script, firstChild);
		script.setAttribute('for', '');
		console.info('Moved <script for> in frameset <head> to <body>');
	});

	// Move all non-@for, javascript <script> in <body> to <head>
	_.forEach(DOM.findAll('script', doc.body), function(script) {
		// ignore non-javascript scripts
		if (script.type && !/^text\/javascript/.test(script.type)) return;
		// ignore @for scripts
		if (script.hasAttribute('for')) return;
		doc.head.appendChild(script);
		console.info('Moved <script> in frameset <body> to <head>');
	});

	let allowedScope = 'panel, frame';
	let allowedScopeSelector = framesetDef.namespaces.lookupSelector(allowedScope, HYPERFRAMESET_URN);
	normalizeScopedStyles(doc, allowedScopeSelector);

	let body = doc.body;
	body.parentNode.removeChild(body);
	framesetDef.document = doc;
	framesetDef.element = body;
}

preprocess() {
	let framesetDef = this;
	let body = framesetDef.element;
	_.defaults(framesetDef, {
		frames: {} // all hyperframe definitions. Indexed by @defid (which may be auto-generated)
	});

	let scripts = DOM.findAll('script', body);
	_.forEach(scripts, function(script, i) {
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
	_.forEach(frameElts, function(el, index) { // FIXME hyperframes can't be outside of <body> OR descendants of repetition blocks

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
	_.forEach(frameDefElts, function(el) {
		let defId = el.getAttribute('defid');
		framesetDef.frames[defId] = new HFrameDefinition(el, framesetDef);
	});
	_.forEach(frameRefElts, function(el) {
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

render() {
	let framesetDef = this;
	return framesetDef.element.cloneNode(true);
}

}

export default HFramesetDefinition;
