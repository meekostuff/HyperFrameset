/*!
 * HyperFrameset definitions
 * Copyright 2009-2016 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

import * as _ from './stuff.mjs';
import Task from './Task.mjs';
import Thenfu from './Thenfu.mjs';
import URL from './URL.mjs';
import * as DOM from './DOM.mjs';
import configData from './configData.mjs';
import CustomNamespace from './CustomNamespace.mjs';
import filters from './filters.mjs';
import decoders from './decoders.mjs';
import processors from './processors.mjs';

/* BEGIN HFrameset code */

const HYPERFRAMESET_URN = 'hyperframeset';
const hfDefaultNamespace = new CustomNamespace({
	name: 'hf',
	style: 'vendor',
	urn: HYPERFRAMESET_URN
});


const hfHeadTags = _.words('title meta link style script');

let HFrameDefinition = (function() {

function HFrameDefinition(el, framesetDef) {
	if (!el) return; // in case of inheritance
	this.framesetDefinition = framesetDef;
	this.init(el);
}

_.defaults(HFrameDefinition.prototype, {

init: function(el) {
    let frameDef = this;
	let framesetDef = frameDef.framesetDefinition;
	_.defaults(frameDef, {
		element: el,
		mainSelector: el.getAttribute('main') // TODO consider using a hash in `@src`
    });
	frameDef.bodies = [];
	_.forEach(_.map(el.childNodes), function(node) {
		let tag = DOM.getTagName(node);
		if (!tag) return;
		if (_.includes(hfHeadTags, tag)) return; // ignore typical <head> elements
		if (tag === framesetDef.namespaces.lookupTagNameNS('body', HYPERFRAMESET_URN)) {
			el.removeChild(node);
			frameDef.bodies.push(new HBodyDefinition(node, framesetDef));
			return;
		}
		console.warn('Unexpected element in HFrame: ' + tag);
		return;
	});

	// FIXME create fallback bodies
},

render: function(resource, condition, details) {
	let frameDef = this;
	let framesetDef = frameDef.framesetDefinition;
	if (!details) details = {};
	_.defaults(details, { // TODO more details??
		scope: framesetDef.scope,
		url: resource && resource.url,
		mainSelector: frameDef.mainSelector,
	});
	let bodyDef = _.find(frameDef.bodies, function(body) { return body.condition === condition;});
	if (!bodyDef) return; // FIXME what to do here??
	return bodyDef.render(resource, details);
}

	
});

return HFrameDefinition;
})();


let HBodyDefinition = (function() {
	
function HBodyDefinition(el, framesetDef) {
	if (!el) return; // in case of inheritance
	this.framesetDefinition = framesetDef;
	this.init(el);
}

let conditions = _.words('uninitialized loading loaded error');

let conditionAliases = {
	'blank': 'uninitialized',
	'waiting': 'loading',
	'interactive': 'loaded',
	'complete': 'loaded'
}

function normalizeCondition(condition) {
	condition = _.lc(condition);
	if (_.includes(conditions, condition)) return condition;
	return conditionAliases[condition];
}

_.defaults(HBodyDefinition, {
	
conditions: conditions,
conditionAliases: conditionAliases

});

_.defaults(HBodyDefinition.prototype, {

init: function(el) {
	let bodyDef = this;
	let framesetDef = bodyDef.framesetDefinition;
	let condition = el.getAttribute('condition');
	let finalCondition;
	if (condition) {
		finalCondition = normalizeCondition(condition);
		if (!finalCondition) {
			finalCondition = condition;
			console.warn('Frame body defined with unknown condition: ' + condition);
		}
	}
	else finalCondition = 'loaded';
		
	_.defaults(bodyDef, {
		element: el,
		condition: finalCondition,
		transforms: []
	});
	_.forEach(_.map(el.childNodes), function(node) {
		if (DOM.getTagName(node) === framesetDef.namespaces.lookupTagNameNS('transform', HYPERFRAMESET_URN)) {
			el.removeChild(node);
			bodyDef.transforms.push(new HTransformDefinition(node, framesetDef));
		}	
	});
	if (!bodyDef.transforms.length && bodyDef.condition === 'loaded') {
		console.warn('HBody definition for loaded content contains no HTransform definitions');
	}
},

render: function(resource, details) {
	let bodyDef = this;
	let framesetDef = bodyDef.framesetDefinition;
	if (bodyDef.transforms.length <= 0) {
		return bodyDef.element.cloneNode(true);
	}
	if (!resource) return null;
	let doc = resource.document; // FIXME what if resource is a Request?
	if (!doc) return null;
	let frag0 = doc;
	if (details.mainSelector) frag0 = DOM.find(details.mainSelector, doc);

	return Thenfu.reduce(frag0, bodyDef.transforms, function(fragment, transform) {
		return transform.process(fragment, details);
	})
	.then(function(fragment) {
		let el = bodyDef.element.cloneNode(false);
		// crop to <body> if it exists
		let htmlBody = DOM.find('body', fragment);
		if (htmlBody) fragment = DOM.adoptContents(htmlBody, el.ownerDocument);
		// remove all stylesheets
		_.forEach(DOM.findAll('link[rel~=stylesheet], style', fragment), function(node) {
			node.parentNode.removeChild(node);
		});
		DOM.insertNode('beforeend', el, fragment);
		return el;
	});
}

});

return HBodyDefinition;
})();


let HTransformDefinition = (function() {
	
function HTransformDefinition(el, framesetDef) {
	if (!el) return; // in case of inheritance
	this.framesetDefinition = framesetDef;
	this.init(el);
}

_.defaults(HTransformDefinition.prototype, {

init: function(el) {
	let transform = this;
	let framesetDef = transform.framesetDefinition;
	_.defaults(transform, {
		element: el,
		type: el.getAttribute('type') || 'main',
		format: el.getAttribute('format')
    });
	if (transform.type === 'main') transform.format = '';
	let doc = framesetDef.document; // or el.ownerDocument
	let frag = doc.createDocumentFragment();
	let node;
	while (node = el.firstChild) frag.appendChild(node); // NOTE no adoption

	let options;
	if (el.hasAttribute('config')) {
		let configID = _.words(el.getAttribute('config'))[0];
		options = configData.get(configID);
	}
	let processor = transform.processor = processors.create(transform.type, options, framesetDef.namespaces);
	processor.loadTemplate(frag);
},

process: function(srcNode, details) {
	let transform = this;
	let framesetDef = transform.framesetDefinition;
	let decoder;
	if (transform.format) {
		decoder = decoders.create(transform.format, {}, framesetDef.namespaces);
		decoder.init(srcNode);
	}
	else decoder = {
		srcNode: srcNode
	}
	let processor = transform.processor;
	let output = processor.transform(decoder, details);
	return output;
}

});

return HTransformDefinition;
})();


let HFramesetDefinition = (function() {

function HFramesetDefinition(doc, settings) {
	if (!doc) return; // in case of inheritance
	this.namespaces = null;
	this.init(doc, settings);
}

_.defaults(HFramesetDefinition.prototype, {

init: function(doc, settings) {
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
},

preprocess: function() {
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
			Task.postError(err);
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

},

render: function() {
	let framesetDef = this;
	return framesetDef.element.cloneNode(true);
}

});

/*
 Rebase scope URLs:
	scope:{path}
 is rewritten with `path` being relative to the current scope.
 */

let urlAttributes = URL.attributes;

function rebase(doc, scopeURL) {
	_.forOwn(urlAttributes, function(attrList, tag) {
		_.forEach(DOM.findAll(tag, doc), function(el) {
			_.forOwn(attrList, function(attrDesc, attrName) {
				let relURL = el.getAttribute(attrName);
				if (relURL == null) return;
				let url = rebaseURL(relURL, scopeURL);
				if (url != relURL) el[attrName] = url;
			});
		});
	});
}

function rebaseURL(url, baseURL) {
	let relURL = url.replace(/^scope:/i, '');
	if (relURL == url) return url;
	return baseURL.resolve(relURL);
}

function normalizeScopedStyles(doc, allowedScopeSelector) {
	let scopedStyles = DOM.findAll('style[scoped]', doc.body);
	let dummyDoc = DOM.createHTMLDocument('', doc);
	_.forEach(scopedStyles, function(el, index) {
		let scope = el.parentNode;
		if (!DOM.matches(scope, allowedScopeSelector)) {
			console.warn('Removing <style scoped>. Must be child of ' + allowedScopeSelector);
			scope.removeChild(el);
			return;
		}
		
		let scopeId = '__scope_' + index + '__';
		scope.setAttribute('scopeid', scopeId);
		if (scope.hasAttribute('id')) scopeId = scope.getAttribute('id');
		else scope.setAttribute('id', scopeId);

		el.removeAttribute('scoped');
		let sheet = el.sheet || (function() {
			// Firefox doesn't seem to instatiate el.sheet in XHR documents
			let dummyEl = dummyDoc.createElement('style');
			dummyEl.textContent = el.textContent;
			DOM.insertNode('beforeend', dummyDoc.head, dummyEl);
			return dummyEl.sheet;
		})();
		forRules(sheet, processRule, scope);
		let cssText = _.map(sheet.cssRules, function(rule) {
				return rule.cssText; 
			}).join('\n');
		el.textContent = cssText;
		DOM.insertNode('beforeend', doc.head, el);
		return;
	});
}

function processRule(rule, id, parentRule) {
	let scope = this;
	switch (rule.type) {
	case 1: // CSSRule.STYLE_RULE
		// prefix each selector in selector-chain with scopePrefix
		// selector-chain is split on COMMA (,) that is not inside BRACKETS. Technically: not followed by a RHB ')' unless first followed by LHB '(' 
		let scopeId = scope.getAttribute('scopeid');
		let scopePrefix = '#' + scopeId + ' ';
		let selectorText = scopePrefix + rule.selectorText.replace(/,(?![^(]*\))/g, ', ' + scopePrefix);
		let cssText = rule.cssText.replace(rule.selectorText, '');
		cssText = selectorText + ' ' + cssText;
		parentRule.deleteRule(id);
		parentRule.insertRule(cssText, id);
		break;

	case 11: // CSSRule.COUNTER_STYLE_RULE
		break;

	case 4: // CSSRule.MEDIA_RULE
	case 12: // CSSRule.SUPPORTS_RULE
		forRules(rule, processRule, scope);
		break;
	
	default:
		console.warn('Deleting invalid rule for <style scoped>: \n' + rule.cssText);
		parentRule.deleteRule(id);
		break;
	}
}

function forRules(parentRule, callback, context) {
	let ruleList = parentRule.cssRules;
	for (let i=ruleList.length-1; i>=0; i--) callback.call(context, ruleList[i], i, parentRule);
}
	

return HFramesetDefinition;	
})();


_.defaults(HFramesetDefinition, {

HYPERFRAMESET_URN: HYPERFRAMESET_URN

});

export {

	HFrameDefinition,
	HFramesetDefinition,
	HBodyDefinition,
	HTransformDefinition

}
