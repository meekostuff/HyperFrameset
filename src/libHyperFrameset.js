/*!
 * HyperFrameset
 * Copyright 2009-2016 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

/* NOTE
	+ assumes DOMSprockets
*/
/* TODO
    + substantial error handling and notification needs to be added
    + <link rel="self" />
    + Would be nice if more of the internal functions were called as method, eg DOM.ready()...
        this would allow the boot-script to modify them as appropriate
    + Up-front feature testing to prevent boot on unsupportable platorms...
        e.g. can't create HTML documents
    + use requestAnimationFrame() when available
    + The passing of nodes between documents needs to be audited.
		Safari and IE10,11 in particular seem to require nodes to be imported / adopted
		(not fully understood right now)
 */

(function() {

var window = this;
var document = window.document;


if (!window.XMLHttpRequest) throw Error('HyperFrameset requires native XMLHttpRequest');


var _ = Meeko.stuff; // provided by DOMSprockets

var Task = Meeko.Task;
var Promise = Meeko.Promise;
var URL = Meeko.URL;

/*
 ### DOM utility functions
 */

var DOM = Meeko.DOM;
var htmlParser = Meeko.htmlParser;
var httpProxy = Meeko.httpProxy;
var CustomNamespace = Meeko.CustomNamespace;
var NamespaceCollection = Meeko.NamespaceCollection;

var scriptQueue = new function() {

/*
 WARN: This description comment was from the former scriptQueue implementation.
 It is still a correct description of behavior,
 but doesn't give a great insight into the current Promises-based implementation.
 
 We want <script>s to execute in document order (unless @async present)
 but also want <script src>s to download in parallel.
 The script queue inserts scripts until it is paused on a blocking script.
 The onload (or equivalent) or onerror handlers of the blocking script restart the queue.
 Inline <script> and <script src="..." async> are never blocking.
 Sync <script src> are blocking, but if `script.async=false` is supported by the browser
 then only the last <script src> (in a series of sync scripts) needs to pause the queue. See
	http://wiki.whatwg.org/wiki/Dynamic_Script_Execution_Order#My_Solution
 Script preloading is always initiated, even if the browser doesn't support it. See
	http://wiki.whatwg.org/wiki/Dynamic_Script_Execution_Order#readyState_.22preloading.22
	
 FIXME scriptQueue.push should also accept functions
*/
var queue = [],
	emptying = false;

var testScript = document.createElement('script'),
	supportsSync = (testScript.async === true);

this.push = function(node) {
return new Promise(function(resolve, reject) {
	if (emptying) throw Error('Attempt to append script to scriptQueue while emptying');
	
	// TODO assert node is in document

	// TODO this filtering may need reworking now we don't support older browsers
	if (!node.type || /^text\/javascript$/i.test(node.type)) {
		console.info('Attempt to queue already executed script ' + node.src);
		resolve(); // TODO should this be reject() ??
		return;
	}

	if (!/^text\/javascript\?disabled$/i.test(node.type)) {
		console.info('Unsupported script-type ' + node.type);
		resolve(); // TODO should this be reject() ??
		return;
	}

	var script = document.createElement('script');

	if (node.src) addListeners(); // WARN must use `node.src` because attrs not copied to `script` yet
	
	DOM.copyAttributes(script, node); 
	script.text = node.text;

	if (script.getAttribute('defer')) { // @defer is not appropriate. Implement as @async
		script.removeAttribute('defer');
		script.setAttribute('async', '');
		console.warn('@defer not supported on scripts');
	}
	if (supportsSync && script.src && !script.hasAttribute('async')) script.async = false;
	script.type = 'text/javascript';
	
	// enabledFu resolves after script is inserted
	var enabledFu = Promise.applyTo(); 
	
	var prev = queue[queue.length - 1], prevScript = prev && prev.script;

	var triggerFu; // triggerFu allows this script to be enabled, i.e. inserted
	if (prev) {
		if (prevScript.hasAttribute('async') || script.src && supportsSync && !script.hasAttribute('async')) triggerFu = prev.enabled;
		else triggerFu = prev.complete; 
	}
	else triggerFu = Promise.resolve();
	
	triggerFu.then(enable, enable);

	var completeFu = Promise.applyTo();
	completeFu.then(resolve, reject);

	var current = { script: script, complete: completeFu, enabled: enabledFu };
	queue.push(current);
	return;

	// The following are hoisted
	function enable() {
		DOM.insertNode('replace', node, script);
		enabledFu.resolve(); 
		if (!script.src) {
			spliceItem(queue, current);
			completeFu.resolve();
		}
	}
	
	function onLoad(e) {
		removeListeners();
		spliceItem(queue, current);
		completeFu.resolve();
	}

	function onError(e) {
		removeListeners();
		spliceItem(queue, current);
		completeFu.reject(function() { throw Error('Script loading failed'); }); // FIXME throw NetworkError()
	}

	function addListeners() {
		script.addEventListener('load', onLoad, false);
		script.addEventListener('error', onError, false);
	}
	
	function removeListeners() {
		script.removeEventListener('load', onLoad, false);
		script.removeEventListener('error', onError, false);
	}
	
	function spliceItem(a, item) {
		for (var n=a.length, i=0; i<n; i++) {
			if (a[i] !== item) continue;
			a.splice(i, 1);
			return;
		}
	}

});
}

this.empty = function() {
return new Promise(function(resolve, reject) {
	
	emptying = true;
	if (queue.length <= 0) {
		emptying = false;
		resolve();
		return;
	}
	_.forEach(queue, function(value, i) {
		var acceptCallback = function() {
			if (queue.length <= 0) {
				emptying = false;
				resolve();
			}
		}
		value.complete.then(acceptCallback, acceptCallback);
	});

});
}

} // end scriptQueue


/* BEGIN HFrameset code */

var historyManager = Meeko.historyManager;
var sprockets = Meeko.sprockets;
var controllers = Meeko.controllers;
var filters = Meeko.filters;
var decoders = Meeko.decoders;
var processors = Meeko.processors;


var framer = Meeko.framer = (function() {

// FIXME DRY these @rel values with boot.js
var FRAMESET_REL = 'frameset'; // NOTE http://lists.w3.org/Archives/Public/www-html/1996Dec/0143.html
var SELF_REL = 'self';

var HYPERFRAMESET_URN = 'hyperframeset';
var hfDefaultNamespace = new CustomNamespace({
	name: 'hf',
	style: 'vendor',
	urn: HYPERFRAMESET_URN
});


function registerFormElements() {

var eventConfig = 'form@submit,reset,input,change,invalid input,textarea@input,change,invalid,focus,blur select,fieldset@change,invalid,focus,blur button@click';

var eventTable = (function(config) {

var table = {};
_.forEach(config.split(/\s+/), function(combo) {
	var m = combo.split('@');
	var tags = m[0].split(',');
	var events = m[1].split(',');
	_.forEach(tags, function(tag) {
		table[tag] = _.map(events);
	});
});

return table;

})(eventConfig);


_.forOwn(eventTable, function(events, tag) {

var Interface = sprockets.evolve(sprockets.RoleType, {});
_.assign(Interface, {

attached: function(handlers) {
	var object = this;
	var element = object.element;
	if (!element.hasAttribute('configid')) return;
	var configID = _.words(element.getAttribute('configid'))[0];	
	var options = framer.definition.configData[configID];
	if (!options) return;
	_.forEach(events, function(type) {
		var ontype = 'on' + type;
		var callback = options[ontype];
		if (!callback) return;

		var fn = function() { callback.apply(object, arguments); };
		object[ontype] = fn;
		handlers.push({
			type: type,
			action: fn
		});
	});
}

});

sprockets.registerElement(tag, Interface);

});

} // END registerFormElements()

// NOTE handlers are registered for "body@submit,reset,input,change" in HFrameset
function registerBodyAsPseudoForm(object, handlers) {
	var element = object.element;
	if (!element.hasAttribute('configid')) return;
	var configID = _.words(element.getAttribute('configid'))[0];	
	var options = framer.definition.configData[configID];
	if (!options) return;

	var events = _.words('submit reset change input');
	var needClickWatcher = false;

	_.forEach(events, function(type) {
		var ontype = 'on' + type;
		var callback = options[ontype];
		if (!callback) return;

		var fn = function(e) { 
			if (DOM.closest(e.target, 'form')) return;
			callback.apply(object, arguments); 
		};
		object[ontype] = fn;
		handlers.push({
			type: type,
			action: fn
		});
		
		switch (type) {
		default: break;
		case 'submit': case 'reset': needClickWatcher = true;
		}
	});

	if (needClickWatcher) {
		document.addEventListener('click', function(e) { 
			if (DOM.closest(e.target, 'form')) return;
			var type = e.target.type;
			if (!(type === 'submit' || type === 'reset')) return;
			Task.asap(function() {
				var pseudoEvent = document.createEvent('CustomEvent');
				// NOTE pseudoEvent.detail = e.target
				pseudoEvent.initCustomEvent(type, true, true, e.target);
				pseudoEvent.preventDefault();
				element.dispatchEvent(pseudoEvent);
			});
		}, false);
	}
}


/*
 * HyperFrameset definitions
 */

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
		scope: framer.scope,
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
	if (el.hasAttribute('configid')) {
		var configID = _.words(el.getAttribute('configid'))[0];
		options = framesetDef.configData[configID];
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
		url: settings.framesetURL
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

	
	var firstChild = doc.body.firstChild;
	_.forEach(DOM.findAll('script[for]', doc.head), function(script) {
		doc.body.insertBefore(script, firstChild);
		script.setAttribute('for', '');
		console.info('Moved <script for> in frameset <head> to <body>');
	});

	var scopedStyles = DOM.findAll('style[scoped]', doc.body);
	var allowedScope = 'panel, frame';
	var allowedScopeSelector = framesetDef.namespaces.lookupSelector(allowedScope, HYPERFRAMESET_URN);
	var dummyDoc = document.implementation.createHTMLDocument('');
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
		var scopePrefix = '#' + scopeId + ' ';

		el.removeAttribute('scoped');
		var sheet = el.sheet || (function() {
			// Firefox doesn't seem to instatiate el.sheet in XHR documents
			var dummyEl = dummyDoc.createElement('style');
			dummyEl.textContent = el.textContent;
			DOM.insertNode('beforeend', dummyDoc.head, dummyEl);
			return dummyEl.sheet;
		})();
		forRules(sheet, processRule);
		var cssText = _.map(sheet.cssRules, function(rule) { 
				return rule.cssText; 
			}).join('\n');
		el.textContent = cssText;
		DOM.insertNode('beforeend', doc.head, el);
		return;

		function processRule(rule, id) {
			var parentRule = rule.parentRule || sheet;
			switch (rule.type) {
			case 1: // CSSRule.STYLE_RULE
				// prefix each selector in selector-chain with scopePrefix
				// selector-chain is split on COMMA (,) that is not inside BRACKETS. Technically: not followed by a RHB ')' unless first followed by LHB '(' 
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
				forRules(rule, processRule);
				break;
			
			default:
				console.warn('Deleting invalid rule for <style scoped>: \n' + rule.cssText);
				parentRule.deleteRule(id);
				break;
			}
		}
		
		function forRules(parentRule, callback) {
			var ruleList = parentRule.cssRules;
			for (var i=ruleList.length-1; i>=0; i--) callback(ruleList[i], i, ruleList);
		}
		
	});

	var body = doc.body;
	body.parentNode.removeChild(body);
	framesetDef.document = doc;
	framesetDef.element = body;
},

preprocess: function() {
	var framesetDef = this;
	var body = framesetDef.element;
	_.defaults(framesetDef, {
		configData: {}, // Indexed by @sourceURL
		frames: {} // all hyperframe definitions. Indexed by @defid (which may be auto-generated)
	});

	var scripts = DOM.findAll('script', body);
	_.forEach(scripts, function(script, i) {
		// Ignore non-javascript scripts
		if (script.type && !/^text\/javascript/.test(script.type)) return;

		if (script.hasAttribute('src')) { // external javascript in <body> is invalid
			console.warn('Frameset <body> may not contain external scripts: \n' +
				script.cloneNode(false).outerHTML);
			script.parentNode.removeChild(script);
			return;
		}

		var sourceURL = script.getAttribute('sourceurl');

		if (!script.hasAttribute('for')) {
			var newScript = script.cloneNode(true);

			try {
				DOM.insertNode('beforeend', document.head, newScript);
			}
			catch(err) { // TODO test if this actually catches script errors
				console.warn('Error evaluating inline script in frameset:\n' +
					framesetDef.url + '#' + script.id);
				Task.postError(err);
			}
			script.parentNode.removeChild(script); // physical <script> no longer needed
			return;
		}

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
		
		// FIXME @configID shouldn't be hard-wired here
		var configID = scriptFor.hasAttribute('configID') ? 
			scriptFor.getAttribute('configID') :
			'';
		// TODO we can add more than one configID to an element but only first is used
		configID = configID ?
			configID.replace(/\s*$/, ' ' + sourceURL) :
			sourceURL;
		scriptFor.setAttribute('configID', configID);

		var fnText = 'return (' + script.text + '\n);';

		try {
			var fn = Function(fnText);
			var object = fn();
			framesetDef.configData[sourceURL] = object;
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


return HFramesetDefinition;	
})();


/*
 * HyperFrameset sprockets
 */

// All HyperFrameset sprockets inherit from Base
var Base = (function() {

var Base = sprockets.evolve(sprockets.RoleType, {

});

_.assign(Base, {

iAttached: function(handlers) {
	var object = this;
	object.options = {};
	var element = object.element;
	if (!element.hasAttribute('configid')) return;
	var configID = _.words(element.getAttribute('configid'))[0];	
	var options = framer.definition.configData[configID];
	object.options = options;
}

});

return Base;
})();

// Almost all HyperFrameset sprockets inherit from Link
var Link = (function() {

var Link = sprockets.evolve(Base, {

role: 'link', // FIXME probably doesn't match functionality of aria "link"

lookup: function(url, details) {
	var link = this;
	var options = link.options;
	if (!options || !options.lookup) return false;
	var partial = options.lookup(url, details);
	if (partial === '' || partial === true) return true;
	if (partial == null || partial === false) return false;
	return inferChangeset(url, partial);
}

});

_.assign(Link, {

iAttached: function(handlers) {
	var object = this;
	var options = object.options;
	if (!options.lookup) return;

	handlers.push({
		type: 'requestnavigation',
		action: function(e) {
			if (e.defaultPrevented) return;
			var acceptDefault = framer.onRequestNavigation(e, this);
			if (acceptDefault === false) e.preventDefault();
		}
	});
}

});

return Link;
})();



var Layer = (function() {

var Layer = sprockets.evolve(Base, {

role: 'layer'

});

var zIndex = 1;

_.assign(Layer, {

iAttached: function(handlers) {
	this.css('z-index', zIndex++);
},

attached: function(handlers) {
	Base.iAttached.call(this, handlers);
	Layer.iAttached.call(this, handlers);
}

});

return Layer;
})();

var Popup = (function() {

var Popup = sprockets.evolve(Base, {

role: 'popup',

});

_.assign(Popup, {

attached: function(handlers) {
	Base.iAttached.call(this, handlers);
},

iEnteredDocument: function() {
	var panel = this;
	var name = panel.attr('name'); 
	var value = panel.attr('value'); 
	if (!name && !value) return;
	panel.ariaToggle('hidden', true);
	if (!name) return; // being controlled by an ancestor
	controllers.listen(name, function(values) {
		panel.ariaToggle('hidden', !(_.includes(values, value)));
	});
},

enteredDocument: function() {
	Popup.iEnteredDocument.call(this);
}

});

return Popup;
})();

var Panel = (function() {

var Panel = sprockets.evolve(Link, {

role: 'panel',

});

_.assign(Panel, {

iAttached: function(handlers) {
	var overflow = this.attr('overflow');
	if (overflow) this.css('overflow', overflow); // FIXME sanity check
	var height = this.attr('height');
	if (height) this.css('height', height); // FIXME units
	var width = this.attr('width');
	if (width) this.css('width', width); // FIXME units
	var minWidth = this.attr('minwidth');
	if (minWidth) this.css('min-width', minWidth); // FIXME units
}, 

attached: function(handlers) {
	Base.iAttached.call(this, handlers);
	Link.iAttached.call(this, handlers);
	Panel.iAttached.call(this, handlers);
},

iEnteredDocument: function() {
	var panel = this;
	var name = panel.attr('name'); 
	var value = panel.attr('value'); 
	if (!name && !value) return;
	panel.ariaToggle('hidden', true);
	if (!name) return; // being controlled by an ancestor
	controllers.listen(name, function(values) {
		panel.ariaToggle('hidden', !(_.includes(values, value)));
	});
},

enteredDocument: function() {
	Panel.iEnteredDocument.call(this);
}

});

return Panel;
})();

var Layout = (function() { // a Layout is a list of Panel (or other Layout) and perhaps separators for hlayout, vlayout

var Layout = sprockets.evolve(Link, {

role: 'group',

owns: {
	get: function() { 
		var namespaces = framer.definition.namespaces;
		return _.filter(this.element.children, function(el) { 
			return DOM.matches(el, 
				namespaces.lookupSelector(
					'hlayout, vlayout, deck, rdeck, panel, frame', 
					HYPERFRAMESET_URN
				)
			); 
		}); 
	}
}

});

_.assign(Layout, {

iEnteredDocument: function() {
	var namespaces = framer.definition.namespaces;
	var element = this.element;
	var parent = element.parentNode;

	// FIXME dimension setting should occur before becoming visible
	if (DOM.matches(parent, namespaces.lookupSelector('layer', HYPERFRAMESET_URN))) { // TODO vh, vw not tested on various platforms
		var height = this.attr('height'); // TODO css unit parsing / validation
		if (!height) height = '100vh';
		else height = height.replace('%', 'vh');
		this.css('height', height); // FIXME units
		var width = this.attr('width'); // TODO css unit parsing / validation
		if (!width) width = '100vw';
		else width = width.replace('%', 'vw');
		if (width) this.css('width', width); // FIXME units
	}
	_.forEach(_.map(element.childNodes), normalizeChild, element);
	return;
	
	function normalizeChild(node) {
		var element = this;
		if (DOM.matches(node, namespaces.lookupSelector('hlayout, vlayout, deck, rdeck, panel, frame', HYPERFRAMESET_URN))) return; 
		switch (node.nodeType) {
		case 1: // hide non-layout elements
			node.hidden = true;
			return;
		case 3: // hide text nodes by wrapping in <wbr hidden>
			if (/^\s*$/.test(node.nodeValue )) {
				element.removeChild(node);
				return;
			}
			var wbr = element.ownerDocument.createElement('wbr');
			wbr.hidden = true;
			element.replaceChild(wbr, node); // NOTE no adoption
			wbr.appendChild(node); // NOTE no adoption
			return;
		default:
			return;
		}
	}
},

enteredDocument: function() {
	Panel.iEnteredDocument.call(this);
	Layout.iEnteredDocument.call(this);
}

});

return Layout;
})();

var VLayout = (function() {

var VLayout = sprockets.evolve(Layout, {
});

_.assign(VLayout, {

iAttached: function() {
	var hAlign = this.attr('align'); // FIXME assert left/center/right/justify - also start/end (stretch?)
	if (hAlign) this.css('text-align', hAlign); // NOTE defaults defined in <style> above
},

attached: function(handlers) {
	Base.iAttached.call(this, handlers);
	Link.iAttached.call(this, handlers);
	Panel.iAttached.call(this, handlers);
	VLayout.iAttached.call(this, handlers);
},

enteredDocument: function() {
	Panel.iEnteredDocument.call(this);
	Layout.iEnteredDocument.call(this);
}

});

return VLayout;
})();

var HLayout = (function() {

var HLayout = sprockets.evolve(Layout, {
});

_.assign(HLayout, {

attached: function(handlers) {
	Base.iAttached.call(this, handlers);
	Link.iAttached.call(this, handlers);
	Panel.iAttached.call(this, handlers);
},

iEnteredDocument: function() {
	var vAlign = this.attr('align'); // FIXME assert top/middle/bottom/baseline - also start/end (stretch?)
	_.forEach(this.ariaGet('owns'), function(panel) {
		if (vAlign) panel.$.css('vertical-align', vAlign);
	});
},

enteredDocument: function() {
	Panel.iEnteredDocument.call(this);
	Layout.iEnteredDocument.call(this);
	HLayout.iEnteredDocument.call(this);
}

});

return HLayout;
})();

var Deck = (function() {

var Deck = sprockets.evolve(Layout, {

activedescendant: {
	set: function(item) { // if !item then hide all children
		
		var element = this.element;
		var panels = this.ariaGet('owns');
		if (item && !_.includes(panels, item)) throw Error('set activedescendant failed: item is not child of deck');
		_.forEach(panels, function(child) {
			if (child === item) child.ariaToggle('hidden', false);
			else child.ariaToggle('hidden', true);
		});
	
	}
}

	
});

_.assign(Deck, {

attached: function(handlers) {
	Base.iAttached.call(this, handlers);
	Link.iAttached.call(this, handlers);
	Panel.iAttached.call(this, handlers);
},

iEnteredDocument: function() {
	var deck = this;
	var name = deck.attr('name'); 
	if (!name) {
		deck.ariaSet('activedescendant', deck.ariaGet('owns')[0]);
		return;
	}
	controllers.listen(name, function(values) {
		var panels = deck.ariaGet('owns');
		var activePanel = _.find(panels, function(child) { 
			var value = child.getAttribute('value');
			if (!_.includes(values, value)) return false;
			return true;
		});
		if (activePanel) deck.ariaSet('activedescendant', activePanel);
	});

},

enteredDocument: function() {
	Layout.iEnteredDocument.call(this);
	Deck.iEnteredDocument.call(this);
}

});

return Deck;
})();

var ResponsiveDeck = (function() {

var ResponsiveDeck = sprockets.evolve(Deck, {
	
});

_.assign(ResponsiveDeck, {

attached: function(handlers) {
	Base.iAttached.call(this, handlers);
	Link.iAttached.call(this, handlers);
	Panel.iAttached.call(this, handlers);
	Deck.iAttached.call(this, handlers);
},

iEnteredDocument: function() {
	var width = parseFloat(window.getComputedStyle(this.element, null).width);
	var panels = this.ariaGet('owns');
	var activePanel = _.find(panels, function(panel) {
		var minWidth = window.getComputedStyle(panel, null).minWidth;
		if (minWidth == null || minWidth === '' || minWidth === '0px') return true;
		minWidth = parseFloat(minWidth); // FIXME minWidth should be "NNNpx" but need to test
		if (minWidth > width) return false;
		return true;
	});
	if (activePanel) {
		activePanel.$.css('height', '100%');
		activePanel.$.css('width', '100%');
		this.ariaSet('activedescendant', activePanel);
	}
},

enteredDocument: function() {
	Layout.iEnteredDocument.call(this);
	Panel.iEnteredDocument.call(this);
	Deck.iEnteredDocument.call(this);
	ResponsiveDeck.iEnteredDocument.call(this);
}

});

return ResponsiveDeck;
})();


var HFrame = (function() {

var HFrame = sprockets.evolve(Panel, {

role: 'frame',

frameEntered: function(frame) {
	this.frames.push(frame);
},

frameLeft: function(frame) {
	var index = this.frames.indexOf(frame);
	this.frames.splice(index);
},

preload: function(request) {
	var frame = this;
	return Promise.pipe(request, [
		
	function(request) { return frame.definition.render(request, 'loading'); },
	function(result) {
		if (!result) return;
		return frame.insert(result);
	}
	
	]);
},

load: function(response) { // FIXME need a teardown method that releases child-frames	
	var frame = this;
	if (response) frame.src = response.url;
	// else a no-src frame
	return Promise.pipe(response, [
	
	function(response) { 
		return frame.definition.render(response, 'loaded', {
			mainSelector: frame.mainSelector
			}); 
	},
	function(result) {
		if (!result) return;
		return frame.insert(result);
	}

	]);
},

insert: function(bodyElement) { // FIXME need a teardown method that releases child-frames	
	var frame = this;
	
	// FIXME .bodyElement will probably become .bodies[] for transition animations.
	if (frame.bodyElement) sprockets.removeNode(frame.bodyElement);
	sprockets.insertNode('beforeend', frame.element, bodyElement);
	frame.bodyElement = bodyElement;
},

});

_.assign(HFrame, {

iAttached: function() {
	var frame = this;
	var def = frame.attr('def');
	frame.definition = framer.definition.frames[def];
	_.defaults(frame, {
		frames: [],
		bodyElement: null,
		targetname: frame.attr('targetname'),
		src: frame.attr('src'),
		mainSelector: frame.attr('main') // TODO consider using a hash in `@src`
    });
},
attached: function(handlers) {
	Base.iAttached.call(this, handlers);
	Link.iAttached.call(this, handlers);
	Panel.iAttached.call(this, handlers);
	HFrame.iAttached.call(this, handlers);
},
iEnteredDocument: function() {
	var frame = this;
	framer.frameEntered(frame);
},
enteredDocument: function() {
	Panel.iEnteredDocument.call(this);
	HFrame.iEnteredDocument.call(this);
},
iLeftDocument: function() {
	var frame = this;
	framer.frameLeft(frame);
},
leftDocument: function() {
	this.iLeftDocument();
}

});

return HFrame;	
})();


var HFrameset = (function() {
	
var HFrameset = sprockets.evolve(Link, {

role: 'frameset',
isFrameset: true,

frameEntered: function(frame) {
	this.frames.push(frame);
},

frameLeft: function(frame) {
	var index = this.frames.indexOf(frame);
	this.frames.splice(index);
},

render: function() {

	var frameset = this;
	var definition = frameset.definition;
	var dstBody = this.element;

	var srcBody = definition.render();
	
	return Promise.pipe(null, [

	function() {
		_.forEach(_.map(srcBody.childNodes), function(node) {
			sprockets.insertNode('beforeend', dstBody, node);
		});
	}

	]);

}

});

_.assign(HFrameset, {

iAttached: function() {
	var frameset = this;
	frameset.definition = framer.definition;
	_.defaults(frameset, {
		frames: []
	});
}, 
attached: function(handlers) {
	Base.iAttached.call(this, handlers);
	Link.iAttached.call(this, handlers);
	HFrameset.iAttached.call(this, handlers);
	registerBodyAsPseudoForm(this, handlers); // NOTE not .call()
},
iEnteredDocument: function() {
	var frameset = this;
	framer.framesetEntered(frameset);
	frameset.render();
},
enteredDocument: function() {
	HFrameset.iEnteredDocument.call(this);
},
iLeftDocument: function() { // FIXME should never be called??
	var frameset = this;
	framer.framesetLeft(frameset);
},
leftDocument: function() {
	HFrameset.iLeftDocument.call(this);
}

});


_.defaults(HFrameset, {
	
prepare: function(dstDoc, definition) {

	if (getFramesetMarker(dstDoc)) throw Error('The HFrameset has already been applied');

	var srcDoc = DOM.cloneDocument(definition.document);

	var selfMarker;
	
	return Promise.pipe(null, [

	function() { // remove all <link rel=stylesheet /> just in case
		// FIXME maybe remove all <link>
		var dstHead = dstDoc.head;
		_.forEach(DOM.findAll('link[rel|=stylesheet]', dstHead), function(node) {
			dstHead.removeChild(node);
		});
	},

	function() { // empty the body
		var dstBody = dstDoc.body;
		var node;
		while (node = dstBody.firstChild) dstBody.removeChild(node);
	},

	function() {
		selfMarker = getSelfMarker(dstDoc);
		if (selfMarker) return;
		selfMarker = dstDoc.createElement('link');
		selfMarker.rel = SELF_REL;
		selfMarker.href = dstDoc.URL;
		dstDoc.head.insertBefore(selfMarker, dstDoc.head.firstChild); // NOTE no adoption
	},

	function() {
		var framesetMarker = dstDoc.createElement('link');
		framesetMarker.rel = FRAMESET_REL;
		framesetMarker.href = definition.src;
		dstDoc.head.insertBefore(framesetMarker, selfMarker); // NOTE no adoption
	},
	
	function() {
		mergeElement(dstDoc.documentElement, srcDoc.documentElement);
		mergeElement(dstDoc.head, srcDoc.head);
		mergeHead(dstDoc, srcDoc.head, true);
		// allow scripts to run. FIXME scripts should always be appended to document.head
		_.forEach(DOM.findAll('script', dstDoc.head), function(script) {
			scriptQueue.push(script);
		});
		return scriptQueue.empty();
	}
	
	]);

},

prerender: function(dstDoc, definition) { // FIXME where does this go
	var srcBody = definition.element;
	var dstBody = document.body;
	mergeElement(dstBody, srcBody);
}

});

// TODO separateHead and mergeHead are only called with isFrameset === true
function separateHead(dstDoc, isFrameset) {
	var dstHead = dstDoc.head;
	var framesetMarker = getFramesetMarker(dstDoc);
	if (!framesetMarker) throw Error('No ' + FRAMESET_REL + ' marker found. ');

	var selfMarker = getSelfMarker(dstDoc);
	// remove frameset / page elements except for <script type=text/javascript>
	if (isFrameset) _.forEach(DOM.siblings('after', framesetMarker, 'before', selfMarker), remove);
	else _.forEach(DOM.siblings('after', selfMarker), remove);
	
	function remove(node) {
		if (DOM.getTagName(node) == 'script' && (!node.type || node.type.match(/^text\/javascript/i))) return;
		dstHead.removeChild(node);
	}
}

function mergeHead(dstDoc, srcHead, isFrameset) {
	var baseURL = URL(dstDoc.URL);
	var dstHead = dstDoc.head;
	var framesetMarker = getFramesetMarker();
	if (!framesetMarker) throw Error('No ' + FRAMESET_REL + ' marker found. ');
	var selfMarker = getSelfMarker();

	separateHead(dstDoc, isFrameset);

	_.forEach(_.map(srcHead.childNodes), function(srcNode) {
		if (srcNode.nodeType != 1) return;
		switch (DOM.getTagName(srcNode)) {
		default:
			break;
		case 'title':
			if (isFrameset) return; // ignore <title> in frameset. FIXME what if topic content has no <title>?
			if (!srcNode.innerHTML) return; // IE will add a title even if non-existant
			break;
		case 'link': // FIXME no duplicates @rel, @href pairs
			break;
		case 'meta': // FIXME no duplicates, warn on clash
			if (srcNode.httpEquiv) return;
			break;
		case 'style': 
			break;
		case 'script':  // FIXME no duplicate @src
			if (!isFrameset) return; // WARN even non-js script-type is rejected
			if (!srcNode.type || /^text\/javascript$/i.test(srcNode.type)) srcNode.type = 'text/javascript?disabled';
			break;
		}
		if (isFrameset) DOM.insertNode('beforebegin', selfMarker, srcNode);
		else DOM.insertNode('beforeend', dstHead, srcNode);
		if (DOM.getTagName(srcNode) == 'link') srcNode.href = srcNode.getAttribute('href'); // Otherwise <link title="..." /> stylesheets don't work on Chrome
	});
}

function mergeElement(dst, src) { // NOTE this removes all dst (= landing page) attrs and imports all src (= frameset) attrs.
	DOM.removeAttributes(dst);
	DOM.copyAttributes(dst, src);
	dst.removeAttribute('style'); // FIXME is this appropriate? There should at least be a warning
}

function getFramesetMarker(doc) {
	if (!doc) doc = document;
	var marker = DOM.find('link[rel~=' + FRAMESET_REL + ']', doc.head);
	return marker;
}

function getSelfMarker(doc) {
	if (!doc) doc = document;
	var marker = DOM.find('link[rel~=' + SELF_REL + ']', doc.head); 
	return marker;
}

return HFrameset;
})();


function registerHyperFramesetElements() {

var namespaces = framer.definition.namespaces;

sprockets.registerElement('body', HFrameset);
sprockets.registerElement(namespaces.lookupSelector('frame', HYPERFRAMESET_URN), HFrame);

sprockets.registerElement(namespaces.lookupSelector('layer', HYPERFRAMESET_URN), Layer);
sprockets.registerElement(namespaces.lookupSelector('popup', HYPERFRAMESET_URN), Popup);
sprockets.registerElement(namespaces.lookupSelector('panel', HYPERFRAMESET_URN), Panel);
sprockets.registerElement(namespaces.lookupSelector('vlayout', HYPERFRAMESET_URN), VLayout);
sprockets.registerElement(namespaces.lookupSelector('hlayout', HYPERFRAMESET_URN), HLayout);
sprockets.registerElement(namespaces.lookupSelector('deck', HYPERFRAMESET_URN), Deck);
sprockets.registerElement(namespaces.lookupSelector('rdeck', HYPERFRAMESET_URN), ResponsiveDeck);

var cssText = [
'*[hidden] { display: none !important; }', // TODO maybe not !important
'html, body { margin: 0; padding: 0; }',
'html { width: 100%; height: 100%; }',
namespaces.lookupSelector('layer, popup, hlayout, vlayout, deck, rdeck, panel, frame, body', HYPERFRAMESET_URN) + ' { box-sizing: border-box; }', // TODO http://css-tricks.com/inheriting-box-sizing-probably-slightly-better-best-practice/
namespaces.lookupSelector('layer', HYPERFRAMESET_URN) + ' { display: block; position: fixed; top: 0; left: 0; width: 0; height: 0; }',
namespaces.lookupSelector('hlayout, vlayout, deck, rdeck', HYPERFRAMESET_URN) + ' { display: block; width: 0; height: 0; text-align: left; margin: 0; padding: 0; }', // FIXME text-align: start
namespaces.lookupSelector('hlayout, vlayout, deck, rdeck', HYPERFRAMESET_URN) + ' { width: 100%; height: 100%; }', // FIXME should be 0,0 before manual calculations
namespaces.lookupSelector('frame, panel', HYPERFRAMESET_URN) + ' { display: block; width: auto; height: auto; text-align: left; margin: 0; padding: 0; }', // FIXME text-align: start
namespaces.lookupSelector('body', HYPERFRAMESET_URN) + ' { display: block; width: auto; height: auto; margin: 0; }',
namespaces.lookupSelector('popup', HYPERFRAMESET_URN) + ' { display: block; position: relative; width: 0; height: 0; }',
namespaces.lookupSelector('popup', HYPERFRAMESET_URN) + ' > * { position: absolute; top: 0; left: 0; }', // TODO or change 'body' styling above
namespaces.lookupSelector('vlayout', HYPERFRAMESET_URN) + ' { height: 100%; }',
namespaces.lookupSelector('hlayout', HYPERFRAMESET_URN) + ' { width: 100%; overflow-y: hidden; }',
namespaces.lookupSelector('vlayout', HYPERFRAMESET_URN) + ' > * { display: block; float: left; width: 100%; height: auto; text-align: left; }',
namespaces.lookupSelector('vlayout', HYPERFRAMESET_URN) + ' > *::after { clear: both; }',
namespaces.lookupSelector('hlayout', HYPERFRAMESET_URN) + ' > * { display: block; float: left; width: auto; height: 100%; vertical-align: top; overflow-y: auto; }',
namespaces.lookupSelector('hlayout', HYPERFRAMESET_URN) + '::after { clear: both; }',
namespaces.lookupSelector('deck', HYPERFRAMESET_URN) + ' > * { width: 100%; height: 100%; }',
namespaces.lookupSelector('rdeck', HYPERFRAMESET_URN) + ' > * { width: 0; height: 0; }',
].join('\n');

var style = document.createElement('style');
style.textContent = cssText;
document.head.insertBefore(style, document.head.firstChild);

} // END registerLayoutElements()


var notify = function(msg) { // FIXME this isn't being used called everywhere it should
	var module;
	switch (msg.module) {
	case 'frameset': module = framer.frameset.options; break;
	default: return Promise.resolve();
	}
	var handler = module[msg.type];
	if (!handler) return Promise.resolve();
	var listener;

	if (handler[msg.stage]) listener = handler[msg.stage];
	else switch(msg.module) {
	case 'frame':
		listener =
			msg.type == 'bodyLeft' ? (msg.stage == 'before' ? handler : null) :
			msg.type == 'bodyEntered' ? (msg.stage == 'after' ? handler : null) :
			null;
		break;
	case 'frameset':
		listener =
			msg.type == 'leftState' ? (msg.stage == 'before' ? handler : null) :
			msg.type == 'enteredState' ? (msg.stage == 'after' ? handler : null) :
			null;
		break;
	default:
		throw Error(msg.module + ' is invalid module');
		break;
	}

	if (typeof listener == 'function') {
		var promise = Promise.defer(function() { listener(msg); }); // TODO isFunction(listener)
		promise['catch'](function(err) { throw Error(err); });
		return promise;
	}
	else return Promise.resolve();
}


var framer = {};

var framesetReady = Promise.applyTo();

_.defaults(framer, {

frameset: null,

started: false,

start: function(startOptions) {
	var framer = this;
	
	if (framer.started) throw Error('Already started');
	if (!startOptions || !startOptions.contentDocument) throw Error('No contentDocument passed to start()');

	framer.started = true;
	startOptions.contentDocument
	.then(function(doc) { // FIXME potential race condition between document finished loading and frameset rendering
		return httpProxy.add({
			url: document.URL,
			type: 'document',
			document: doc
		});
	});
	
	return Promise.pipe(null, [
		
	function() { // sanity check
		return Promise.wait(function() { return !!document.body; });		
	},

	function() { // lookup or detect frameset.URL
		var framerConfig;
		framerConfig = framer.lookup(document.URL);
		if (framerConfig) return framerConfig;
		return startOptions.contentDocument
			.then(function(doc) {
				return framer.detect(doc);
			});
	},

	function(framerConfig) { // initiate fetch of frameset.URL
		if (!framerConfig) throw Error('No frameset could be determined for this page');
		framer.scope = framerConfig.scope; // FIXME shouldn't set this until loadFramesetDefinition() returns success
		var framesetURL = URL(framerConfig.framesetURL);
		if (framesetURL.hash) console.info('Ignoring hash component of frameset URL: ' + framesetURL.hash);
		framer.framesetURL = framerConfig.framesetURL = framesetURL.nohash;
		return httpProxy.load(framer.framesetURL, { responseType: 'document' })
		.then(function(response) {
			var framesetDoc = response.document;
			return new HFramesetDefinition(framesetDoc, framerConfig);
		});
	},

	function(definition) {
		return Promise.pipe(definition, [
		
		function() {
			framer.definition = definition;
			return HFrameset.prepare(document, definition)
		},

		function() { 
			return definition.preprocess();
		},

		function() {
			return HFrameset.prerender(document, definition)
		}

		]);
	},
	
	function() {
		window.addEventListener('click', function(e) {
			if (e.defaultPrevented) return;
			var acceptDefault = framer.onClick(e);
			if (acceptDefault === false) e.preventDefault();
		}, false); // onClick generates requestnavigation event
		window.addEventListener('submit', function(e) {
			if (e.defaultPrevented) return;
			var acceptDefault = framer.onSubmit(e);
			if (acceptDefault === false) e.preventDefault();
		}, false);
		
		registerFormElements();
		registerHyperFramesetElements();

		return sprockets.start({ manual: true }); // FIXME should be a promise
	},

	function() { // TODO ideally frameset rendering wouldn't start until after this step
		return framesetReady
		.then(function() {

			var changeset = framer.currentChangeset;
			// FIXME what if no changeset is returned
			return historyManager.start(changeset, '', document.URL,
				function(state) { }, // FIXME need some sort of rendering status
				function(state) { return framer.onPopState(state.getData()); }
				);
		});
	},

	function() { // FIXME this should wait until at least the landing document has been rendered in one frame

		notify({ // NOTE this doesn't prevent start() from resolving
			module: 'frameset',
			type: 'enteredState',
			stage: 'after',
			url: document.URL
		});

	},

	// TODO it would be nice if <body> wasn't populated until stylesheets were loaded
	function() {
		return Promise.wait(function() { return DOM.checkStyleSheets(); })
	}	
	
	]);

	
},

framesetEntered: function(frameset) {
	var framer = this;
	framer.frameset = frameset;
	var url = document.URL;
	framer.currentChangeset = frameset.lookup(url, {
		referrer: document.referrer
	});
	framesetReady.resolve();
},

framesetLeft: function(frameset) { // WARN this should never happen
	var framer = this;
	delete framer.frameset;
},

frameEntered: function(frame) {
	var namespaces = framer.definition.namespaces;
	var parentFrame;
	var parentElement = DOM.closest(frame.element.parentNode, namespaces.lookupSelector('frame', HYPERFRAMESET_URN)); // TODO frame.element.parentNode.ariaClosest('frame')
	if (parentElement) parentFrame = HFrame(parentElement);
	else {
		parentElement = document.body; // TODO  frame.elenent.parentNode.ariaClosest('frameset'); 
		parentFrame = HFrameset(parentElement);
	}
	parentFrame.frameEntered(frame);
	frame.parentFrame = parentFrame;

	if (frame.targetname === framer.currentChangeset.target) { // FIXME should only be used at startup
		frame.attr('src', framer.currentChangeset.url);
	}

	DOM.whenVisible(frame.element).then(function() { // FIXME could be clash with loadFrames() above

	var src = frame.attr('src');

	if (src == null) { // a non-src frame
		return frame.load(null, { condition: 'loaded' });
	}

	if (src === '') {
		return; // FIXME frame.load(null, { condition: 'uninitialized' })
	}
	
	var fullURL = URL(src);
	var nohash = fullURL.nohash;
	var hash = fullURL.hash;
	
	var request = { method: 'get', url: nohash, responseType: 'document'};
	return Promise.pipe(null, [ // FIXME how to handle `hash` if present??
	
	function() { return frame.preload(request); },
	function() { return httpProxy.load(nohash, request); },
	function(response) { return frame.load(response); }

	]);

	});
},

frameLeft: function(frame) {
	var parentFrame = frame.parentFrame;
	delete frame.parentFrame;
	parentFrame.frameLeft(frame);
},

onClick: function(e) { // return false means success
	var framer = this;

	if (e.button != 0) return; // FIXME what is the value for button in IE's W3C events model??
	if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return; // FIXME do these always trigger modified click behavior??

	// Find closest <a href> to e.target
	var linkElement = DOM.closest(e.target, 'a, [link]');
	if (!linkElement) return;
	var hyperlink;
	if (DOM.getTagName(linkElement) === 'a') hyperlink = linkElement;
	else {
		hyperlink = DOM.find('a, link', linkElement);
		if (!hyperlink) hyperlink = DOM.closest('a', linkElement);
		if (!hyperlink) return;
	}
	var href = hyperlink.getAttribute('href');
	if (!href) return; // not really a hyperlink

	var baseURL = URL(document.URL);
	var url = baseURL.resolve(href); // TODO probably don't need to resolve on browsers that support pushstate

	// NOTE The following creates a pseudo-event and dispatches to frames in a bubbling order.
	// FIXME May as well use a virtual event system, e.g. DOMSprockets
	var details = {
		url: url,
		element: hyperlink
	}; // TODO more details?? event??

	framer.triggerRequestNavigation(details.url, details);
	return false;
},

onSubmit: function(e) { // return false means success
	var framer = this;

	// test submit
	var form = e.target;
	if (form.target) return; // no iframe
	var baseURL = URL(document.URL);
	var action = baseURL.resolve(form.action); // TODO probably don't need to resolve on browsers that support pushstate
	
	var details = {
		element: form
	};
	var method = _.lc(form.method);
	switch(method) {
	case 'get':
		var oURL = URL(action);
		var query = encode(form);
		details.url = oURL.nosearch + (oURL.search || '?') + query + oURL.hash;
		break;
	default: return; // TODO handle POST
	}
	
	framer.triggerRequestNavigation(details.url, details);
	return false;
	
	function encode(form) {
		var data = [];
		_.forEach(form.elements, function(el) {
			if (!el.name) return;
			data.push(el.name + '=' + encodeURIComponent(el.value));
		});
		return data.join('&');
	}
},

triggerRequestNavigation: function(url, details) {
	Promise.defer(function() {
		var event = document.createEvent('CustomEvent');
		event.initCustomEvent('requestnavigation', true, true, details.url);
		var acceptDefault = details.element.dispatchEvent(event);
		if (acceptDefault !== false) {
			location.assign(details.url);
		}
	});
},

onRequestNavigation: function(e, frame) { // `return false` means success (so preventDefault)
	var framer = this;
	if (!frame) throw Error('Invalid frame / frameset in onRequestNavigation');
	// NOTE only pushState enabled browsers use this
	// We want panning to be the default behavior for clicks on hyperlinks - <a href>
	// Before panning to the next page, have to work out if that is appropriate
	// `return` means ignore the click

	var url = e.detail;
	var details = {
		url: url,
		element: e.target
	}
	
	if (!frame.isFrameset) {
		if (requestNavigation(frame, url, details)) return false;
		return;
	}
	
	// test hyperlinks
	var baseURL = URL(document.URL);
	var oURL = URL(url);
	if (oURL.origin != baseURL.origin) return; // no external urls

	// TODO perhaps should test same-site and same-page links
	var isPageLink = (oURL.nohash === baseURL.nohash); // TODO what about page-links that match the current hash?
	if (isPageLink) {
		framer.onPageLink(url, details);
		return false;
	}

	var frameset = frame;
	var framesetScope = framer.lookup(url);
	if (!framesetScope || !framer.compareFramesetScope(framesetScope)) { // allow normal browser navigation
		return;
	}
	
	if (requestNavigation(frameset, url, details)) return false;
	return;

	function requestNavigation(frame, url, details) { // `return true` means success
		var changeset = frame.lookup(url, details);
		if (changeset === '' || changeset === true) return true;
		if (changeset == null || changeset === false) return false;
		framer.load(url, changeset, frame.isFrameset);
		return true;
	}

},

onPageLink: function(url, details) {
	var framer = this;
	console.warn('Ignoring on-same-page links for now.'); // FIXME
},

navigate: function(url, changeset) { // FIXME doesn't support replaceState
	var framer = this;	
	return framer.load(url, changeset, true);
},

load: function(url, changeset, changeState) { // FIXME doesn't support replaceState
	var framer = this;	
	var frameset = framer.frameset;
	var mustNotify = changeState || changeState === 0;
	var target = changeset.target;
	var frames = [];
	recurseFrames(frameset, function(frame) {
		if (frame.targetname !== target) return;
		frames.push(frame);
		return true;
	});
	
	var fullURL = URL(url);
	var hash = fullURL.hash;
	var nohash = fullURL.nohash;
	var request = { method: 'get', url: nohash, responseType: 'document' }; // TODO one day may support different response-type
	var response;

	return Promise.pipe(null, [

	function() {
		if (mustNotify) return notify({ // FIXME need a timeout on notify
			module: 'frameset',
			type: 'leftState',
			stage: 'before',
			url: document.URL
			// TODO details, resource, url, frames??
			});
	},
	function() {
		_.forEach(frames, function(frame) {
			frame.preload(request);
		});
	},
	function() {
		return httpProxy.load(nohash, request)
		.then(function(resp) { response = resp; });
	},
	function() { // FIXME how to handle `hash` if present??
		if (changeState) return historyManager.pushState(changeset, '', url, function(state) {
				loadFrames(frames, response);
			});
		else return loadFrames(frames, response);
	},
	function() { // FIXME need to wait for the DOM to stabilize before this notification
		if (mustNotify) return notify({ // FIXME need a timeout on notify
			module: 'frameset',
			type: 'enteredState',
			stage: 'after',
			url: url
			// TODO details, resource, url, frames??
			});
	}
		
	]);

	function loadFrames(frames, response) { // TODO promisify
		_.forEach(frames, function(frame) {
			frame.attr('src', response.url);
			DOM.whenVisible(frame.element).then(function() {
				frame.load(response); // FIXME this can potentially clash with framer.frameEntered code
			});
		});
	}
	
	function recurseFrames(parentFrame, fn) {
		_.forEach(parentFrame.frames, function(frame) {
			var found = fn(frame);
			if (!found) recurseFrames(frame, fn);
		});			
	}
},

onPopState: function(changeset) {
	var framer = this;
	var frameset = framer.frameset;
	var frames = [];
	var url = changeset.url;
	if (url !== document.URL) {
		console.warn('Popped state URL does not match address-bar URL.');
		// FIXME needs an optional error recovery, perhaps reloading document.URL
	}
	framer.load(url, changeset, 0);
}

});


_.defaults(framer, {

lookup: function(docURL) {
	var framer = this;
	if (!framer.options.lookup) return;
	var result = framer.options.lookup(docURL);
	// FIXME if (result === '' || result === true) 
	if (result == null || result === false) return false;

	// FIXME error if `result` is a relative URL
	if (typeof result === 'string') result = implyFramesetScope(result, docURL);
	if (typeof result !== 'object' || !result.scope || !result.framesetURL) throw Error('Unexpected result from frameset lookup');
	return result;
},

detect: function(srcDoc) {
	var framer = this;
	if (!framer.options.detect) return;
	var result = framer.options.detect(srcDoc);
	// FIXME if (result === '' || result === true) 
	if (result == null || result === false) return false;

	// FIXME error if `result` is a relative URL
	if (typeof result === 'string') result = implyFramesetScope(result, document.URL);
	if (typeof result !== 'object' || !result.scope || !result.framesetURL) throw Error('Unexpected result from frameset detect');
	return result;
},

compareFramesetScope: function(settings) {
	var framer = this;
	if (framer.framesetURL !== settings.framesetURL) return false;
	if (framer.scope !== settings.scope) return false;
	return true;
}

});

function implyFramesetScope(framesetSrc, docSrc) {
	var docURL = URL(docSrc);
	var docSiteURL = URL(docURL.origin);
	var framesetSrc = docSiteURL.resolve(framesetSrc);
	var scope = implyScope(framesetSrc, docSrc);
	return {
		scope: scope,
		framesetURL: framesetSrc
	}
}

function implyScope(framesetSrc, docSrc) {
	var docURL = URL(docSrc);
	var framesetURL = URL(framesetSrc);
	var scope = docURL.base;
	var framesetBase = framesetURL.base;
	if (scope.indexOf(framesetBase) >= 0) scope = framesetBase;
	return scope;
}

function inferChangeset(url, partial) {
	var inferred = {
		url: url
	}
	
	switch (typeof partial) {
	case 'string':
		inferred.target = partial;
		break;
	case 'object':
		/*
		if (partial instanceof Array) {
			inferred.target = partial[0];
			inferred.targets = partial.slice(0);
			break;
		}
		*/
	default:
		throw Error('Invalid changeset returned from lookup()');
		break;
	}
	
	return inferred;
}


_.defaults(framer, {

options: {
	/* The following options are available (unless otherwise indicated) *
	lookup: function(url) {},
	detect: function(document) {},
	entering: { before: noop, after: noop },
	leaving: { before: noop, after: noop }, // TODO not called at all
	ready: noop // TODO should this be entering:complete ??
	/**/
},

config: function(options) {
	var framer = this;
	if (!options) return;
	_.assign(framer.options, options);
}

});


_.defaults(framer, {

	HFrameDefinition: HFrameDefinition,
	HFramesetDefinition: HFramesetDefinition,
	HFrame: HFrame,
	HFrameset: HFrameset,
	Layer: Layer,
	HLayout: HLayout,
	VLayout: VLayout,
	Deck: Deck,
	ResponsiveDeck: ResponsiveDeck

});

return framer;

})();

// end framer defn

}).call(window);

