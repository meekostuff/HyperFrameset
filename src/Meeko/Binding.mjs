/*!
 Binding
 (c) Sean Hogan, 2008-2026
 Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
*/

/**
 * @fileoverview Binding system for attaching behavior objects to DOM elements.
 * Elements are matched to definitions via CSS selectors (registered externally).
 * Each bound element gets a sprocket instance with lifecycle callbacks and event handlers.
 */

import * as _ from './stuff.mjs';
import * as DOM from './DOM.mjs';
import { matchesEvent, modifiersMatchEvent } from './Handler.mjs';


let document = window.document;

class Binding {

	constructor(definition) {
		let binding = this;
		binding.definition = definition;
		binding.object = Object.create(definition.prototype);
		binding.handlers = definition.handlers ? Array.from(definition.handlers) : [];
		binding.listeners = [];
		binding.inDocument = null; // TODO state assertions in attach/onenter/leftDocumentCallback/detach
	}

	attach(element) {
		let binding = this;
		let definition = binding.definition;
		let object = binding.object;

		object.element = element;
		binding.attachedCallback();

		_.forEach(binding.handlers, (handler) => {
			let listener = binding.addHandler(handler); // handler might be ignored ...
			if (listener) binding.listeners.push(listener);// ... resulting in an undefined listener
		});
	}

	attachedCallback() {
		let binding = this;
		let definition = binding.definition;
		let object = binding.object;

		binding.inDocument = false;
		if (definition.attached) definition.attached.call(object, binding.handlers); // FIXME try/catch
	}

	enteredDocumentCallback() {
		let binding = this;
		let definition = binding.definition;
		let object = binding.object;

		binding.inDocument = true;
		if (definition.enteredDocument) definition.enteredDocument.call(object);
	}

	leftDocumentCallback() {
		let binding = this;
		let definition = binding.definition;
		let object = binding.object;

		binding.inDocument = false;
		if (definition.leftDocument) definition.leftDocument.call(object);
	}

	detach() {
		let binding = this;
		let definition = binding.definition;
		let object = binding.object;

		_.forEach(binding.listeners, binding.removeListener, binding);
		binding.listeners.length = 0;

		binding.detachedCallback();
	}

	detachedCallback() {
		let binding = this;
		let definition = binding.definition;
		let object = binding.object;

		binding.inDocument = null;
		if (definition.detached) definition.detached.call(object);
	}

	/**
	 * Register a DOM event listener for a handler descriptor.
	 * @param {Handler} handler - The handler to register.
	 * @returns {Function|undefined} The listener function, or undefined if ignored.
	 */
	addHandler(handler) {
		let binding = this;
		let object = binding.object;
		let element = object.element;
		let type = handler.type;
		let capture = (handler.eventPhase === 1); // Event.CAPTURING_PHASE
		if (capture) {
			console.warn('Capture phase for events not supported');
			return; // FIXME should this convert to bubbling instead??
		}

		Binding.manageEvent(type);
		let fn = (event) => {
			if (fn.normalize) event = fn.normalize(event);
			try {
				return handleEvent.call(object, event, handler);
			}
			catch (error) {
				window.reportError(error);
				throw error;
			}
		}
		fn.type = type;
		fn.capture = capture;
		element.addEventListener(type, fn, capture);
		return fn;
	}

	removeListener(fn) {
		let binding = this;
		let object = binding.object;
		let element = object.element;
		let type = fn.type;
		let capture = fn.capture;
		element.removeEventListener(type, fn, capture);
	}

	// --- Static methods ---

	static managedEvents = [];

	static getInterface(element) {
		let nodeData = DOM.getData(element);
		if (nodeData && nodeData.object) return nodeData;
	}

	static enteredDocumentCallback(element) {
		let binding = Binding.getInterface(element);
		if (!binding) return;
		binding.enteredDocumentCallback();
	}

	static leftDocumentCallback(element) {
		let binding = Binding.getInterface(element);
		if (!binding) return;
		binding.leftDocumentCallback();
	}

	static manageEvent(type) {
		if (_.includes(this.managedEvents, type)) return;
		this.managedEvents.push(type);
		window.addEventListener(type, (event) => {
			// NOTE stopPropagation() prevents custom default-handlers from running. DOMSprockets nullifies it.
			event.stopPropagation = () => { console.debug('event.stopPropagation() is a no-op'); }
			event.stopImmediatePropagation = () => { console.debug('event.stopImmediatePropagation() is a no-op'); }
		}, true);
	}

	static attachBinding(definition, element) {
		let binding;
		if (DOM.hasData(element)) {
			binding = DOM.getData(element);
			if (binding.definition !== definition) throw Error('Mismatch between definition and binding already present');
			console.warn('Binding definition applied when binding already present');
			return binding;
		}
		binding = new Binding(definition);
		DOM.setData(element, binding);
		binding.attach(element);
		return binding;
	}

	static enableBinding(element) {
		if (!DOM.hasData(element)) throw Error('No binding attached to element');
		let binding = DOM.getData(element);
		if (!binding.inDocument) binding.enteredDocumentCallback();
	}

	// TODO disableBinding() ??

	static detachBinding(element) {
		if (!DOM.hasData(element)) throw Error('No binding attached to element');
		let binding = DOM.getData(element);
		if (binding.inDocument) binding.leftDocumentCallback();
		binding.detach();
		DOM.setData(element, null);
	}

}

/**
 * Dispatch an event to the appropriate handler action.
 * Called with `this` bound to the sprocket instance (the object with `.element`, `.attr()`, etc.).
 * @this {Object} The sprocket instance (binding.object)
 * @param {Event} event - The DOM event
 * @param {Handler} handler - The handler descriptor
 */
function handleEvent(event, handler) {
	let bindingImplementation = this;
	let target = event.target;
	let current = bindingImplementation.element;
	if (!DOM.hasData(current)) throw Error('Handler called on non-bound element');
	if (!matchesEvent(handler, event, true)) return; // NOTE the phase check is below
	let delegator = current;
	if (handler.delegator) {
		let el = DOM.closest(target, handler.delegator, current);
		if (!el) return;
		delegator = el;
	}
	switch (handler.eventPhase) { // FIXME DOMSprockets doesn't intend to support eventPhase
	case 1:
		throw Error('Capture phase for events not supported');
	case 2:
		if (delegator !== target) return;
		break;
	case 3:
		if (delegator === target) return;
		break;
	default:
		break;
	}

	if (handler.action) {
		let result = handler.action.call(bindingImplementation, event, delegator);
		if (result === false) event.preventDefault();
	}
}


export default Binding;
