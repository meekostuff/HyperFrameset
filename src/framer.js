/*!
 * HyperFrameset framer
 * Copyright 2009-2016 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

/* TODO
    + substantial error handling and notification needs to be added
    + <link rel="self" />
 */

(function(classnamespace) {

var window = this;
var document = window.document;

var Meeko = window.Meeko;
var _ = Meeko.stuff; // provided by DOMSprockets

var Task = Meeko.Task;
var Promise = Meeko.Promise;
var URL = Meeko.URL;

/*
 ### DOM utility functions
 */

var DOM = Meeko.DOM;
var scriptQueue = Meeko.scriptQueue;
var htmlParser = Meeko.htmlParser;
var httpProxy = Meeko.httpProxy;
var CustomNamespace = Meeko.CustomNamespace;
var NamespaceCollection = Meeko.NamespaceCollection;

var historyManager = Meeko.historyManager;
var sprockets = Meeko.sprockets;

var formElements = Meeko.formElements;
var layoutElements = Meeko.layoutElements;
var frameElements = Meeko.frameElements;
var frameDefinitions = Meeko.frameDefinitions; // FIXME "exported" from frameElements
var HFramesetDefinition = Meeko.HFramesetDefinition;
var HYPERFRAMESET_URN = HFramesetDefinition.HYPERFRAMESET_URN;
var HFrame = Meeko.HFrame;

// FIXME DRY these @rel values with boot.js
var FRAMESET_REL = 'frameset'; // NOTE http://lists.w3.org/Archives/Public/www-html/1996Dec/0143.html
var SELF_REL = 'self';


var framer = {};

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
			return prepareFrameset(document, definition)
		},

		function() { 
			return definition.preprocess();
		},

		function() {
			return prerenderFrameset(document, definition)
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
		
		registerFrames(framer.definition);
		interceptFrameElements();
		retargetFramesetElements();
		var namespace = framer.definition.namespaces.lookupNamespace(HYPERFRAMESET_URN);
		layoutElements.register(namespace);
		frameElements.register(namespace);
		registerFramesetElement();
		formElements.register();

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

	
}

});

var prepareFrameset = function(dstDoc, definition) {

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

}

var prerenderFrameset = function(dstDoc, definition) { // FIXME where does this go
	var srcBody = definition.element;
	var dstBody = document.body;
	mergeElement(dstBody, srcBody);
}

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


_.defaults(framer, {

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
	var parentElement = DOM.closest(frame.element.parentNode, HFrame.isFrame); // TODO frame.element.parentNode.ariaClosest('frame')
	if (parentElement) parentFrame = parentElement.$;
	else {
		parentElement = document.body; // TODO  frame.element.parentNode.ariaClosest('frameset'); 
		parentFrame = parentElement.$;
	}
	parentFrame.frameEntered(frame);
	frame.parentFrame = parentFrame;

	if (frame.targetname === framer.currentChangeset.target) { // FIXME should only be used at startup
		frame.attr('src', framer.currentChangeset.url);
	}
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
			frame.attr('src', fullURL);
		});
	},
	function() { // NOTE .load() is just to sync pushState
		return httpProxy.load(nohash, request)
		.then(function(resp) { response = resp; });
	},
	function() { // FIXME how to handle `hash` if present??
		if (changeState) return historyManager.pushState(changeset, '', url, function(state) {});
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
},

inferChangeset: inferChangeset

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

function registerFrames(framesetDef) {
	_.forOwn(framesetDef.frames, function(o, key) {
		frameDefinitions.set(key, o);
	});
}

// FIXME Monkey-patch to allow creation of tree of frames
function interceptFrameElements() {

_.assign(HFrame.prototype, {

frameEntered: function(frame) {
	this.frames.push(frame);
},

frameLeft: function(frame) {
	var index = this.frames.indexOf(frame);
	this.frames.splice(index);
}

});

HFrame._attached = HFrame.attached;
HFrame._enteredDocument = HFrame.enteredDocument;
HFrame._leftDocument = HFrame.leftDocument;

_.assign(HFrame, {

attached: function(handlers) {
	this.frames = [];
	HFrame._attached.call(this, handlers);
},

enteredDocument: function() {
	framer.frameEntered(this);
	HFrame._enteredDocument.call(this);
},

leftDocument: function() {
	framer.frameLeft(this); 
	HFrame._leftDocument.call(this);
}

});

} // end patch


var HFrameset = (function() {
	
var HBase = Meeko.HBase;
var HFrameset = sprockets.evolve(HBase, {

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

attached: function(handlers) {
	HBase.attached.call(this, handlers);

	var frameset = this;
	frameset.definition = Meeko.framer.definition; // TODO remove `framer` dependency
	_.defaults(frameset, {
		frames: []
	});

	Meeko.ConfigurableBody.attached.call(this, handlers); // FIXME
}, 

enteredDocument: function() {
	var frameset = this;
	framer.framesetEntered(frameset); // TODO remove `framer` dependency
	frameset.render();
},

leftDocument: function() { // FIXME should never be called??
	var frameset = this;
	framer.framesetLeft(frameset); // TODO remove `framer` dependency
}

});

return HFrameset;
})();

// FIXME Monkey-patch to allow all HyperFrameset sprockets to retarget requestnavigation events
function retargetFramesetElements() {

var HBase = Meeko.HBase;
_.assign(HBase.prototype, {

lookup: function(url, details) {
	var link = this;
	var options = link.options;
	if (!options || !options.lookup) return false;
	var partial = options.lookup(url, details);
	if (partial === '' || partial === true) return true;
	if (partial == null || partial === false) return false;
	return framer.inferChangeset(url, partial);
}

});

HBase._attached = HBase.attached;

HBase.attached = function(handlers) {
	HBase._attached.call(this, handlers);
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

} // end retarget

function registerFramesetElement() {

	sprockets.registerElement('body', HFrameset);
	var cssText = [
	'html, body { margin: 0; padding: 0; }',
	'html { width: 100%; height: 100%; }'
	];
	var style = document.createElement('style');
	style.textContent = cssText;
	document.head.insertBefore(style, document.head.firstChild);

}



_.defaults(classnamespace, {

	HFrameset: HFrameset,
	framer: framer

});

}).call(this, this.Meeko);

