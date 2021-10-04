/*!
 * HyperFrameset Elements
 * Copyright 2009-2016 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

/* NOTE
	+ assumes DOMSprockets
*/

import * as _ from './stuff.mjs';
import Task from './Task.mjs';
import Thenfu from './Thenfu.mjs';
import URL from './URL.mjs';
import * as DOM from './DOM.mjs';
import httpProxy from './httpProxy.mjs';
import Registry from './Registry.mjs';
import sprockets from './sprockets.mjs';
import { Panel } from './layoutElements.mjs';

let document = window.document;

let namespace; // will be set by external call to registerFrameElements()

let frameDefinitions = new Registry({
	writeOnce: true,
	testKey: function(key) {
		return typeof key === 'string';
	},
	testValue: function(o) {
		return o != null && typeof o === 'object';
	}
});

let HFrame = (function() {

let HFrame = sprockets.evolve(Panel, {

role: 'frame',

isFrame: true,

preload: function(request) {
	let frame = this;
	return Thenfu.pipe(request, [
		
	function(request) { return frame.definition.render(request, 'loading'); },
	function(result) {
		if (!result) return;
		return frame.insert(result);
	}
	
	]);
},

load: function(response) { // FIXME need a teardown method that releases child-frames	
	let frame = this;
	if (response) frame.src = response.url;
	// else a no-src frame
	return Thenfu.pipe(response, [
	
	function(response) { 
		return frame.definition.render(response, 'loaded', {
			mainSelector: frame.mainSelector
			}); 
	},
	function(result) {
		if (!result) return;
		return frame.insert(result, frame.element.hasAttribute('replace'));
	}

	]);
},

insert: function(bodyElement, replace) { // FIXME need a teardown method that releases child-frames	
	let frame = this;
	let element = frame.element;
	
	let options = frame.options;

	// FIXME .bodyElement will probably become .bodies[] for transition animations.
	if (frame.bodyElement) {
		if (options && options.bodyLeft) {
			try { options.bodyLeft(frame, frame.bodyElement); } 
			catch (err) { Task.postError(err); }
		}
		sprockets.removeNode(frame.bodyElement);
	}

	if (replace) {
		let frag = DOM.adoptContents(bodyElement, element.ownerDocument);
		sprockets.insertNode('replace', element, frag);
		return;
	}

	sprockets.insertNode('beforeend', frame.element, bodyElement);
	frame.bodyElement = bodyElement;

	if (options && options.bodyEntered) {
		try { options.bodyEntered(frame, frame.bodyElement); } 
		catch (err) { Task.postError(err); }
	}
},

refresh: function() {
	let frame = this;
	let element = this.element;
	let src = frame.attr('src');

	return Thenfu.resolve().then(function() {

		if (src == null) { // a non-src frame
			return frame.load(null, { condition: 'loaded' });
		}

		if (src === '') {
			return; // FIXME frame.load(null, { condition: 'uninitialized' })
		}

		let fullURL = URL(src);
		let nohash = fullURL.nohash;
		let hash = fullURL.hash;

		let request = { method: 'get', url: nohash, responseType: 'document'};
		let response;

		return Thenfu.pipe(null, [ // FIXME how to handle `hash` if present??

			function() { return frame.preload(request); },
			function() { return httpProxy.load(nohash, request); },
			function(resp) { response = resp; },
			function() { return DOM.whenVisible(element); },
			function() { 
				// TODO there are probably better ways to monitor @src
				if (frame.attr('src') !== src) return; // WARN abort since src has changed
				return frame.load(response); 
			}

		]);

	});
}

});

_.assign(HFrame, {

attached: function(handlers) {
	Panel.attached.call(this, handlers);

	let frame = this;
	let def = frame.attr('def');
	frame.definition = frameDefinitions.get(def); // FIXME assert frameDefinitions.has(def)
	_.defaults(frame, {
		bodyElement: null,
		targetname: frame.attr('targetname'),
		src: frame.attr('src'),
		mainSelector: frame.attr('main') // TODO consider using a hash in `@src`
    });

	HFrame.observeAttributes.call(this, 'src');
},

enteredDocument: function() {
	Panel.enteredDocument.call(this);
	this.refresh();
},

leftDocument: function() {
	Panel.leftDocument.call(this);
	
	this.attributeObserver.disconnect();
},

attributeChanged: function(attrName) {
	if (attrName === 'src') this.refresh();
},

observeAttributes: function() {
	let attrList = [].splice.call(arguments, 0);
	let frame = this;
	let element = frame.element;
	let observer = observeAttributes(element, function(attrName) {
		HFrame.attributeChanged.call(frame, attrName);
	}, attrList);
	frame.attributeObserver = observer;
},
	
isFrame: function(element) {
	return !!element.$.isFrame;
}

});

function observeAttributes(element, callback, attrList) {
	let observer = new MutationObserver(function(mutations, observer) {
		_.forEach(mutations, function(record) {
			if (record.type !== 'attributes') return;
			callback.call(record.target, record.attributeName);
		});
	});
	observer.observe(element, { attributes: true, attributeFilter: attrList, subtree: false });
	
	return observer;
}

return HFrame;	
})();

function registerFrameElements(ns) {

namespace = ns; // TODO assert ns instanceof CustomNamespace

sprockets.registerElement(namespace.lookupSelector('frame'), HFrame);

let cssText = [
namespace.lookupSelector('frame') + ' { box-sizing: border-box; }', // TODO http://css-tricks.com/inheriting-box-sizing-probably-slightly-better-best-practice/
namespace.lookupSelector('frame') + ' { display: block; width: auto; height: auto; text-align: left; margin: 0; padding: 0; }' // FIXME text-align: start
].join('\n');

let style = document.createElement('style');
style.textContent = cssText;
document.head.insertBefore(style, document.head.firstChild);

} // END registerFrameElements()

let frameElements = {

register: registerFrameElements

}

export {

	HFrame,
	frameElements,
	frameDefinitions

}

export default frameElements;
