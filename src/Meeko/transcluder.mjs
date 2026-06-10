/*!
 * transcluder
 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

import * as _ from './stuff.mjs';
import Thenfu from './Thenfu.mjs';
import URLux from './URLux.mjs';
import * as DOM from './DOM.mjs';
import httpProxy from './httpProxy.mjs';
import Registry from './Registry.mjs';
import sprockets from './sprockets.mjs';
import { Panel } from './layoutElements.mjs';

let transcludeDefinitions = new Registry({
	writeOnce: true,
	keyValidator: (key) => {
		return typeof key === 'string';
	},
	valueValidator: (o) => {
		return o != null && typeof o === 'object';
	}
});

class HTransclude extends Panel {

static { sprockets.withAria(this, { role: 'frame', isFrame: true }); }

preload(request) {
	let frame = this;
	return Thenfu.pipe(request, [

	(request) => { return frame.definition.render(request, 'loading'); },
	(result) => {
		if (!result) return;
		return frame.insert(result);
	}

	]);
}

load(response) { // FIXME need a teardown method that releases child-frames
	let frame = this;
	if (response) frame.src = response.url;
	// else a no-src frame
	return Thenfu.pipe(response, [

	(response) => {
		return frame.definition.render(response, 'loaded', {
			mainSelector: frame.mainSelector
			});
	},
	(result) => {
		if (!result) return;
		return frame.insert(result, frame.element.hasAttribute('replace'));
	}

	]);
}

insert(bodyElement, replace) {
	let frame = this;
	let element = frame.element;

	let options = frame.options;

	// FIXME .bodyElement will probably become .bodies[] for transition animations.
	if (frame.bodyElement) {
		if (options && options.bodyLeft) {
			try { options.bodyLeft(frame, frame.bodyElement); }
			catch (err) { window.reportError(err); }
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
		catch (err) { window.reportError(err); }
	}
}

refresh() {
	let frame = this;
	let element = this.element;
	let src = frame.attr('src');

	return Thenfu.asap().then(() => {

		if (src == null) { // a non-src frame
			return frame.load(null, { condition: 'loaded' });
		}

		if (src === '') {
			return; // FIXME frame.load(null, { condition: 'uninitialized' })
		}

		let fullURL = URLux.create(src);
		let nohash = fullURL.nohash;
		let hash = fullURL.hash;

		let request = { method: 'get', url: nohash, responseType: 'document'};
		let response;

		return Thenfu.pipe(null, [ // FIXME how to handle `hash` if present??

			() => { return frame.preload(request); },
			() => { return httpProxy.load(nohash, request); },
			(resp) => { response = resp; },
			() => { return DOM.whenVisible(element); },
			() => {
				// TODO there are probably better ways to monitor @src
				if (frame.attr('src') !== src) return; // WARN abort since src has changed
				return frame.load(response);
			}

		]);

	});
}

static attached(handlers) {
	Panel.attached.call(this, handlers);

	let frame = this;
	let def = frame.attr('def');
	frame.definition = transcludeDefinitions.get(def); // FIXME assert transcludeDefinitions.has(def)
	_.defaults(frame, {
		bodyElement: null,
		targetname: frame.attr('targetname'),
		src: frame.attr('src'),
		mainSelector: frame.attr('main') // TODO consider using a hash in `@src`
	});

	HTransclude.observeAttributes.call(this, 'src');
}

static enteredDocument() {
	Panel.enteredDocument.call(this);
	this.refresh();
}

static leftDocument() {
	Panel.leftDocument.call(this);
	this.attributeObserver.disconnect();
}

static attributeChanged(attrName) {
	if (attrName === 'src') this.refresh();
}

static observeAttributes() {
	let attrList = [].splice.call(arguments, 0);
	let frame = this;
	let element = frame.element;
	let observer = observeAttributes(element, (attrName) => {
		HTransclude.attributeChanged.call(frame, attrName);
	}, attrList);
	frame.attributeObserver = observer;
}

static isFrame(element) {
	return !!element.$.isFrame;
}

}

function observeAttributes(element, callback, attrList) {
	let observer = new MutationObserver((mutations, observer) => {
		_.forEach(mutations, (record) => {
			if (record.type !== 'attributes') return;
			callback.call(record.target, record.attributeName);
		});
	});
	observer.observe(element, { attributes: true, attributeFilter: attrList, subtree: false });

	return observer;
}

/**
 * Register a transclusion element with the given namespace, element name, and sprocket class.
 *
 * @param {CustomNamespace} ns - The namespace for resolving element selectors.
 * @param {string} name - The element name to register (e.g. 'frame' or 'transclude').
 * @param {Function} SprocketClass - The sprocket class to register (HTransclude or a subclass).
 */
function registerElement(ns, name, SprocketClass) {

	let selector = ns.lookupSelector(name);
	let cssText = 'box-sizing: border-box; display: block; width: auto; height: auto; text-align: left; margin: 0; padding: 0;';
	sprockets.registerElement(selector, SprocketClass, cssText);
}

let transcluder = {
	registerElement
};

export {
	HTransclude,
	transcluder,
	transcludeDefinitions
}

export default transcluder;
