/*!
 * HyperFrameset definitions
 * Copyright 2009-2016 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

(function(classnamespace) {

var global = this;

var Meeko = global.Meeko;
var _ = Meeko.stuff;
var Task = Meeko.Task;
var Promise = Meeko.Promise;

var DOM = Meeko.DOM;
var URL = Meeko.URL;
var CustomNamespace = Meeko.CustomNamespace;
var NamespaceCollection = Meeko.NamespaceCollection;
var configData = Meeko.configData;

var filters = Meeko.filters;
var decoders = Meeko.decoders;
var processors = Meeko.processors;


/* BEGIN HFrameset code */

var HYPERFRAMESET_URN = 'hyperframeset';
var hfDefaultNamespace = new CustomNamespace({
	name: 'hf',
	style: 'vendor',
	urn: HYPERFRAMESET_URN
});


var hfHeadTags = _.words('title meta link style script');

var HFrameDefinition = (function() {

function HFrameDefinition(el, framesetDef) {
	if (!el) return; // in case of inheritance
	this.framesetDefinition = framesetDef;
	this.init(el);
}

_.defaults(HFrameDefinition.prototype, {

init: function(el) {
    var frameDef = this;
	var framesetDef = frameDef.framesetDefinition;
	_.defaults(frameDef, {
		element: el,
		mainSelector: el.getAttribute('main') // TODO consider using a hash in `@src`
    });
	var bodies = frameDef.bodies = [];
	_.forEach(_.map(el.childNodes), function(node) {
		var tag = DOM.getTagName(node);
		if (!tag) return;
		if (_.includes(hfHeadTags, tag)) return; // ignore typical <head> elements
		if (tag === framesetDef.namespaces.lookupTagNameNS('body', HYPERFRAMESET_URN)) {
			el.removeChild(node);
			bodies.push(new HBodyDefinition(node, framesetDef));
			return;
		}
		console.warn('Unexpected element in HFrame: ' + tag);
		return;
	});

	// FIXME create fallback bodies
},

render: function(resource, condition, details) {
	var frameDef = this;
	var framesetDef = frameDef.framesetDefinition;
	if (!details) details = {};
	_.defaults(details, { // TODO more details??
		scope: framesetDef.scope,
		url: resource && resource.url,
		mainSelector: frameDef.mainSelector,
	});
	var bodyDef = _.find(frameDef.bodies, function(body) { return body.condition === condition;});
	if (!bodyDef) return; // FIXME what to do here??
	return bodyDef.render(resource, details);
}

	
});

return HFrameDefinition;
})();


var HBodyDefinition = (function() {
	
function HBodyDefinition(el, framesetDef) {
	if (!el) return; // in case of inheritance
	this.framesetDefinition = framesetDef;
	this.init(el);
}

var conditions = _.words('uninitialized loading loaded error');

var conditionAliases = {
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
	var bodyDef = this;
	var framesetDef = bodyDef.framesetDefinition;
	var condition = el.getAttribute('condition');
	var finalCondition;
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
	var bodyDef = this;
	var framesetDef = bodyDef.framesetDefinition;
	if (bodyDef.transforms.length <= 0) {
		return bodyDef.element.cloneNode(true);
	}
	if (!resource) return null;
	var doc = resource.document; // FIXME what if resource is a Request?
	if (!doc) return null;
	var frag0 = doc;
	if (details.mainSelector) frag0 = DOM.find(details.mainSelector, doc);

	return Promise.reduce(frag0, bodyDef.transforms, function(fragment, transform) {
		return transform.process(fragment, details);
	})
	.then(function(fragment) {
		var el = bodyDef.element.cloneNode(false);
		// crop to <body> if it exists
		var htmlBody = DOM.find('body', fragment);
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


var HTransformDefinition = (function() {
	
function HTransformDefinition(el, framesetDef) {
	if (!el) return; // in case of inheritance
	this.framesetDefinition = framesetDef;
	this.init(el);
}

_.defaults(HTransformDefinition.prototype, {

init: function(el) {
	var transform = this;
	var framesetDef = transform.framesetDefinition;
	_.defaults(transform, {
		element: el,
		type: el.getAttribute('type') || 'main',
		format: el.getAttribute('format')
    });
	if (transform.type === 'main') transform.format = '';
	var doc = framesetDef.document; // or el.ownerDocument
	var frag = doc.createDocumentFragment();
	var node;
	while (node = el.firstChild) frag.appendChild(node); // NOTE no adoption

	var options;
	if (el.hasAttribute('config')) {
		var configID = _.words(el.getAttribute('config'))[0];
		options = configData.get(configID);
	}
	var processor = transform.processor = processors.create(transform.type, options, framesetDef.namespaces);
	processor.loadTemplate(frag);
},

process: function(srcNode, details) {
	var transform = this;
	var framesetDef = transform.framesetDefinition;
	var decoder;
	if (transform.format) {
		decoder = decoders.create(transform.format, {}, framesetDef.namespaces);
		decoder.init(srcNode);
	}
	else decoder = {
		srcNode: srcNode
	}
	var processor = transform.processor;
	var output = processor.transform(decoder, details);
	return output;
}

});

return HTransformDefinition;
})();


var HFramesetDefinition = (function() {

function HFramesetDefinition(doc, settings) {
	if (!doc) return; // in case of inheritance
	this.namespaces = null;
	this.init(doc, settings);
}

_.defaults(HFramesetDefinition.prototype, {

init: function(doc, settings) {
	var framesetDef = this;
	_.defaults(framesetDef, {
		url: settings.framesetURL,
		scope: settings.scope
	});

	var namespaces = framesetDef.namespaces = CustomNamespace.getNamespaces(doc);
	if (!namespaces.lookupNamespace(HYPERFRAMESET_URN)) {
		namespaces.add(hfDefaultNamespace);
	}

	// NOTE first rebase scope: urls
	var scopeURL = URL(settings.scope);
	rebase(doc, scopeURL);
	var frameElts = DOM.findAll(
		framesetDef.namespaces.lookupSelector('frame', HYPERFRAMESET_URN), 
		doc.body);
	_.forEach(frameElts, function(el, index) { // FIXME hyperframes can't be outside of <body> OR descendants of repetition blocks
		// NOTE first rebase @src with scope: urls
		var src = el.getAttribute('src');
		if (src) {
			var newSrc = rebaseURL(src, scopeURL);
			if (newSrc != src) el.setAttribute('src', newSrc);
		}
	});

	// warn about not using @id
	var idElements = DOM.findAll('*[id]:not(script)', doc.body);
	if (idElements.length) {
		console.warn('@id is strongly discouraged in frameset-documents (except on <script>).\n' +
			'Found ' + idElements.length + ', ' + 
			'first @id is ' + idElements[0].getAttribute('id')
		);
	}

	// Add @id and @sourceurl to inline <script type="text/javascript">
	var scripts = DOM.findAll('script', doc);
	_.forEach(scripts, function(script, i) {
		// ignore non-javascript scripts
		if (script.type && !/^text\/javascript/.test(script.type)) return;
		// ignore external scripts
		if (script.hasAttribute('src')) return;
		var id = script.id;
		// TODO generating ID always has a chance of duplicating IDs
		if (!id) id = script.id = 'script[' + i + ']'; // FIXME doc that i is zero-indexed
		var sourceURL;
		if (script.hasAttribute('sourceurl')) sourceURL = script.getAttribute('sourceurl');
		else {
			sourceURL = framesetDef.url + '__' + id; // FIXME this should be configurable
			script.setAttribute('sourceurl', sourceURL);
		}
		script.text += '\n//# sourceURL=' + sourceURL;
	});

	// Move all <script for> in <head> to <body>
	var firstChild = doc.body.firstChild;
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

	var allowedScope = 'panel, frame';
	var allowedScopeSelector = framesetDef.namespaces.lookupSelector(allowedScope, HYPERFRAMESET_URN);
	normalizeScopedStyles(doc, allowedScopeSelector);

	var body = doc.body;
	body.parentNode.removeChild(body);
	framesetDef.document = doc;
	framesetDef.element = body;
},

preprocess: function() {
	var framesetDef = this;
	var body = framesetDef.element;
	_.defaults(framesetDef, {
		frames: {} // all hyperframe definitions. Indexed by @defid (which may be auto-generated)
	});

	var scripts = DOM.findAll('script', body);
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

		var sourceURL = script.getAttribute('sourceurl');

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

		var scriptFor = script;
		while (scriptFor = scriptFor.previousSibling) {
			if (scriptFor.nodeType !== 1) continue;
			var tag = DOM.getTagName(scriptFor);
			if (tag !== 'script' && tag !== 'style') break;
		}
		if (!scriptFor) scriptFor = script.parentNode;
		
		// FIXME @config shouldn't be hard-wired here
		var configID = scriptFor.hasAttribute('config') ? 
			scriptFor.getAttribute('config') :
			'';
		// TODO we can add more than one @config to an element but only first is used
		configID = configID ?
			configID.replace(/\s*$/, ' ' + sourceURL) :
			sourceURL;
		scriptFor.setAttribute('config', configID);

		var fnText = 'return (' + script.text + '\n);';

		try {
			var fn = Function(fnText);
			var object = fn();
			configData.set(sourceURL, object);
		}
		catch(err) { 
			console.warn('Error evaluating inline script in frameset:\n' +
				framesetDef.url + '#' + script.id);
			Task.postError(err);
		}

		script.parentNode.removeChild(script); // physical <script> no longer needed
	});

	var frameElts = DOM.findAll(
		framesetDef.namespaces.lookupSelector('frame', HYPERFRAMESET_URN), 
		body);
	var frameDefElts = [];
	var frameRefElts = [];
	_.forEach(frameElts, function(el, index) { // FIXME hyperframes can't be outside of <body> OR descendants of repetition blocks

		// NOTE even if the frame is only a declaration (@def && @def !== @defid) it still has its content removed
		var placeholder = el.cloneNode(false);
		el.parentNode.replaceChild(placeholder, el); // NOTE no adoption

		var defId = el.getAttribute('defid');
		var def = el.getAttribute('def');
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
		var defId = el.getAttribute('defid');
		framesetDef.frames[defId] = new HFrameDefinition(el, framesetDef);
	});
	_.forEach(frameRefElts, function(el) {
		var def = el.getAttribute('def');
		var ref = framesetDef.frames[def];
		if (!ref) {
			console.warn('Frame declaration references non-existant frame definition: ' + def);
			return;
		}
		var refEl = ref.element;
		if (!refEl.hasAttribute('scopeid')) return;
		var id = el.getAttribute('id');
		if (id) {
			console.warn('Frame declaration references a frame definition with scoped-styles but these cannot be applied because the frame declaration has its own @id: ' + id);
			return;
		}
		id = refEl.getAttribute('id');
		var scopeId = refEl.getAttribute('scopeid');
		if (id !== scopeId) {
			console.warn('Frame declaration references a frame definition with scoped-styles but these cannot be applied because the frame definition has its own @id: ' + id);
			return;
		}
		el.setAttribute('id', scopeId);
	});

},

render: function() {
	var framesetDef = this;
	return framesetDef.element.cloneNode(true);
}

});

/*
 Rebase scope URLs:
	scope:{path}
 is rewritten with `path` being relative to the current scope.
 */

var urlAttributes = URL.attributes;

function rebase(doc, scopeURL) {
	_.forOwn(urlAttributes, function(attrList, tag) {
		_.forEach(DOM.findAll(tag, doc), function(el) {
			_.forOwn(attrList, function(attrDesc, attrName) {
				var relURL = el.getAttribute(attrName);
				if (relURL == null) return;
				var url = rebaseURL(relURL, scopeURL);
				if (url != relURL) el[attrName] = url;
			});
		});
	});
}

function rebaseURL(url, baseURL) {
	var relURL = url.replace(/^scope:/i, '');
	if (relURL == url) return url;
	return baseURL.resolve(relURL);
}

function normalizeScopedStyles(doc, allowedScopeSelector) {
	var scopedStyles = DOM.findAll('style[scoped]', doc.body);
	var dummyDoc = DOM.createHTMLDocument('', doc);
	_.forEach(scopedStyles, function(el, index) {
		var scope = el.parentNode;
		if (!DOM.matches(scope, allowedScopeSelector)) {
			console.warn('Removing <style scoped>. Must be child of ' + allowedScopeSelector);
			scope.removeChild(el);
			return;
		}
		
		var scopeId = '__scope_' + index + '__';
		scope.setAttribute('scopeid', scopeId);
		if (scope.hasAttribute('id')) scopeId = scope.getAttribute('id');
		else scope.setAttribute('id', scopeId);

		el.removeAttribute('scoped');
		var sheet = el.sheet || (function() {
			// Firefox doesn't seem to instatiate el.sheet in XHR documents
			var dummyEl = dummyDoc.createElement('style');
			dummyEl.textContent = el.textContent;
			DOM.insertNode('beforeend', dummyDoc.head, dummyEl);
			return dummyEl.sheet;
		})();
		forRules(sheet, processRule, scope);
		var cssText = _.map(sheet.cssRules, function(rule) { 
				return rule.cssText; 
			}).join('\n');
		el.textContent = cssText;
		DOM.insertNode('beforeend', doc.head, el);
		return;
	});
}

function processRule(rule, id, parentRule) {
	var scope = this;
	switch (rule.type) {
	case 1: // CSSRule.STYLE_RULE
		// prefix each selector in selector-chain with scopePrefix
		// selector-chain is split on COMMA (,) that is not inside BRACKETS. Technically: not followed by a RHB ')' unless first followed by LHB '(' 
		var scopeId = scope.getAttribute('scopeid');
		var scopePrefix = '#' + scopeId + ' ';
		var selectorText = scopePrefix + rule.selectorText.replace(/,(?![^(]*\))/g, ', ' + scopePrefix); 
		var cssText = rule.cssText.replace(rule.selectorText, '');
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
	var ruleList = parentRule.cssRules;
	for (var i=ruleList.length-1; i>=0; i--) callback.call(context, ruleList[i], i, parentRule);
}
	

return HFramesetDefinition;	
})();


_.defaults(HFramesetDefinition, {

HYPERFRAMESET_URN: HYPERFRAMESET_URN

});

_.defaults(classnamespace, {

	HFrameDefinition: HFrameDefinition,
	HFramesetDefinition: HFramesetDefinition,
	HBodyDefinition: HBodyDefinition,
	HTransformDefinition: HTransformDefinition

});

}).call(this, this.Meeko);

