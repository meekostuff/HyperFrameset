/*!
 Binding
 (c) Sean Hogan, 2008,2012,2013,2014,2016
 Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
*/

/* NOTE
Requires some features not implemented on older browsers:
element.matchesSelector (or prefixed equivalent) - IE9+
element.querySelectorAll - IE8+
element.addEventListener - IE9+
element.dispatchEvent - IE9+
Object.create - IE9+
*/

/* FIXME
- event modifiers aren't filtering
- everything in the sprockets code (apart from the Binding implementation) is a BIG BALL OF MUD
*/

import * as _ from './stuff.mjs';
import Task from './Task.mjs';
import * as DOM from './DOM.mjs';
import BindingDefinition from './BindingDefinition.mjs';


let document = window.document;

class Binding {
	constructor(definition) {
		let binding = this;
		binding.definition = definition;
		binding.object = Object.create(definition.prototype);
		binding.handlers = definition.handlers ? _.map(definition.handlers) : [];
		binding.listeners = [];
		binding.inDocument = null; // TODO state assertions in attach/onenter/leftDocumentCallback/detach
	}
}

_.assign(Binding.prototype, {

	attach: function(element) {
		let binding = this;
		let definition = binding.definition;
		let object = binding.object;

		object.element = element;
		binding.attachedCallback();

		_.forEach(binding.handlers, function(handler) {
			let listener = binding.addHandler(handler); // handler might be ignored ...
			if (listener) binding.listeners.push(listener);// ... resulting in an undefined listener
		});
	},

	attachedCallback: function() {
		let binding = this;
		let definition = binding.definition;
		let object = binding.object;

		binding.inDocument = false;
		if (definition.attached) definition.attached.call(object, binding.handlers); // FIXME try/catch
	},

	enteredDocumentCallback: function() {
		let binding = this;
		let definition = binding.definition;
		let object = binding.object;

		binding.inDocument = true;
		if (definition.enteredDocument) definition.enteredDocument.call(object);
	},

	leftDocumentCallback: function() {
		let binding = this;
		let definition = binding.definition;
		let object = binding.object;

		binding.inDocument = false;
		if (definition.leftDocument) definition.leftDocument.call(object);
	},

	detach: function() {
		let binding = this;
		let definition = binding.definition;
		let object = binding.object;

		_.forEach(binding.listeners, binding.removeListener, binding);
		binding.listeners.length = 0;

		binding.detachedCallback();
	},

	detachedCallback: function() {
		let binding = this;
		let definition = binding.definition;
		let object = binding.object;

		binding.inDocument = null;
		if (definition.detached) definition.detached.call(object);
	},

	addHandler: function(handler) {
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
		let fn = function(event) {
			if (fn.normalize) event = fn.normalize(event);
			try {
				return handleEvent.call(object, event, handler);
			}
			catch (error) {
				Task.postError(error);
				throw error;
			}
		}
		fn.type = type;
		fn.capture = capture;
		element.addEventListener(type, fn, capture);
		return fn;
	},

	removeListener: function(fn) {
		let binding = this;
		let object = binding.object;
		let element = object.element;
		let type = fn.type;
		let capture = fn.capture;
		element.removeEventListener(type, fn, capture);
	},

});

_.assign(Binding, {

getInterface: function(element) {
	let nodeData = DOM.getData(element);
	if (nodeData && nodeData.object) return nodeData;
},

enteredDocumentCallback: function(element) {
	let binding = Binding.getInterface(element);
	if (!binding) return;
	binding.enteredDocumentCallback();
},

leftDocumentCallback: function(element) {
	let binding = Binding.getInterface(element);
	if (!binding) return;
	binding.leftDocumentCallback();
},

managedEvents: [],

manageEvent: function(type) {
	if (_.includes(this.managedEvents, type)) return;
	this.managedEvents.push(type);
	window.addEventListener(type, function(event) {
		// NOTE stopPropagation() prevents custom default-handlers from running. DOMSprockets nullifies it.
		event.stopPropagation = function() { console.debug('event.stopPropagation() is a no-op'); }
		event.stopImmediatePropagation = function() { console.debug('event.stopImmediatePropagation() is a no-op'); }
	}, true);
}

});

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


/*
	FIXME: What are we going to do with this dead-code?
	TODO: better reporting of invalid content
*/
let convertXBLHandler = function(config) {
	let handler = {}
	handler.type = config.event;
	if (null == config.event) console.warn('Invalid handler: event property undeclared');

	function lookupValue(attrName, lookup) {
		let attrValue = config[attrName];
		let result;
		if (attrValue) {
			result = lookup[attrValue];
			if (null == result) console.info('Ignoring invalid property ' + attrName + ': ' + attrValue);
		}
		return result;
	}

	handler.eventPhase = lookupValue('phase', {
		'capture': 1, // Event.CAPTURING_PHASE,
		'target': 2, // Event.AT_TARGET,
		'bubble': 3, // Event.BUBBLING_PHASE,
		'default-action': 0x78626C44 
	}) || 0;

	handler.preventDefault = lookupValue('default-action', {
		'cancel' : true,
		'perform' : false
	}) || false;

	handler.stopPropagation = lookupValue('propagate', {
		'stop': true,
		'continue': false
	}) || false;
	
	function attrText_to_numArray(attr) {				
		let attrText = config[attr];
		if (!attrText) return null;
		let result = [];
		let strings = attrText.split(/\s+/);
		for (let n=strings.length, i=0; i<n; i++) {
			let text = strings[i];
			let num = Number(text);
			if (NaN != num && Math.floor(num) == num) result.push(num);
		}
		return result;
	}

	// Event Filters: mouse / keyboard / text / mutation / modifiers
	
	// mouse
	handler.button = attrText_to_numArray('button');
	handler.clickCount = attrText_to_numArray('click-count');
	
	// keyboard
	handler.key = config.key;
	handler.keyLocation = [];
	let keyLocationText = config['key-location']
	let keyLocationStrings =  (keyLocationText) ? keyLocationText.split(/\s+/) : [];
	for (let n=keyLocationStrings.length, i=0; i<n; i++) {
		let text = keyLocationStrings[i];
		switch (text) {
			case 'standard': handler.keyLocation.push(KeyboardEvent.DOM_KEY_LOCATION_STANDARD); break;
			case 'left': handler.keyLocation.push(KeyboardEvent.DOM_KEY_LOCATION_LEFT); break;
			case 'right': handler.keyLocation.push(KeyboardEvent.DOM_KEY_LOCATION_RIGHT); break;
			case 'numpad': handler.keyLocation.push(KeyboardEvent.DOM_KEY_LOCATION_NUMPAD); break;
		}
	}

	// text
	handler.text = config.text;
	
	// non-standard
	handler.filter = new RegExp(config.filter, '');
	
	// mutation
	// FIXME not supported anymore
	handler.attrName = config['attr-name'];
	handler.attrChange = [];
	let attrChangeText = config['attr-change'];
	let attrChangeStrings =  (attrChangeText) ? attrChangeText.split(/\s+/) : [];
	for (let n=attrChangeStrings.length, i=0; i<n; i++) {
		let text = attrChangeStrings[i];
		switch (text) {
			case 'modification': handler.attrChange.push(MutationEvent.MODIFICATION); break;
			case 'addition': handler.attrChange.push(MutationEvent.ADDITION); break;
			case 'removal': handler.attrChange.push(MutationEvent.REMOVAL); break;
		}
	}
	handler.prevValue = config['prev-value'];
	handler.newValue = config['new-value'];
	
	// modifiers
	// TODO should handler.modifiers be {} or []?
	if (null != config['modifiers']) {
		handler.modifiers = [];
		let modifiersText = config['modifiers'];
		let modifiersStrings = (modifiersText) ? modifiersText.split(/\s+/) : [];
		for (let n=modifiersStrings, i=0; i<n; i++) {
			let text = modifiersStrings[i];
			let m;
			m = /^([+-]?)([a-z]+)(\??)$/.exec(text);
			if (m) {
				let key = m[2];
				let condition = 1; // MUST
				if (m[3]) condition = 0; // OPTIONAL
				else if (m[1] == '+') condition = 1; // MUST
				else if (m[1] == '-') condition = -1; // MUST NOT
				handler.modifiers.push({ key: key, condition: condition });
			}
		}
	}
	else handler.modifiers = null;
	handler.action = config.action;
	
	return handler;
}

let EventModules = {};
EventModules.AllEvents = {};
registerModule('FocusEvents', 'focus blur focusin focusout');
registerModule('MouseEvents', 'click dblclick mousedown mouseup mouseover mouseout mousemove mousewheel');
registerModule('KeyboardEvents', 'keydown keyup');
registerModule('UIEvents', 'load unload abort error select change submit reset resize scroll');

function registerModule(modName, evTypes) {
	let mod = {};
	EventModules[modName] = mod;
	_.forEach(_.words(evTypes), registerEvent, mod);
}
function registerEvent(evType) {
	EventModules.AllEvents[evType] = true;
	this[evType] = true;
}

let matchesEvent = function(handler, event, ignorePhase) {
	// type
	let allEvents = EventModules.AllEvents;
	let mouseEvents = EventModules.MouseEvents;
	let keyboardEvents = EventModules.KeyboardEvents;
	let uiEvents = EventModules.UIEvents;

	if (event.type != handler.type) return false;

	// phase
	if (!ignorePhase && !phaseMatchesEvent(handler.eventPhase, event)) return false;
	
	let evType = event.type;

	// MouseEvents
	if (evType in mouseEvents) { // FIXME needs testing. Bound to be cross-platform issues still
		if (handler.button && handler.button.length) {
			if (!_.includes(handler.button, event.button) == -1) return false;
		}
		if (handler.clickCount && handler.clickCount.length) { 
			let count = 1;
			// if ('dblclick' == event.type) count = 2;
			if ('click' == event.type) count = (event.detail) ? event.detail : 1;
			if (!_.includes(handler.clickCount, count)) return false;
		}
		if (handler.modifiers) {
			if (!modifiersMatchEvent(handler.modifiers, event)) return false;
		}
	}

	// KeyboardEvents
	// NOTE some of these are non-standard
	let ourKeyIdentifiers = {
		Backspace: 'U+0008', Delete: 'U+007F', Escape: 'U+001B', Space: 'U+0020', Tab: 'U+0009'
	}

	if (evType in keyboardEvents) {
		if (handler.key) {
			let success = false;
			let keyId = event.keyIdentifier;
			if (/^U\+00....$/.test(keyId)) { // TODO Needed for Safari-2. It would be great if this test could be done elsewhere
				keyId = keyId.replace(/^U\+00/, 'U+');
			}
			if (handler.key != keyId && ourKeyIdentifiers[handler.key] != keyId) return false;
		}

		// TODO key-location		
		if (handler.modifiers || handler.key) {
			if (!modifiersMatchEvent(handler.modifiers || [ 'none' ], event)) return false;
		}
	}

	// UI events
	if (evType in uiEvents) { } // TODO
	
	// user-defined events
	if (!(evType in allEvents)) { } // TODO should these be optionally allowed / prevented??

	return true;
}

let modifiersMatchEvent = function(modifiers, event) {
	// TODO comprehensive modifiers list
	// event.getModifierState() -> evMods
	// Need to account for any positives
	// Fields are set to -1 when accounted for
	let evMods = {
		control: event.ctrlKey,
		shift: event.shiftKey,
		alt: event.altKey,
		meta: event.metaKey
	};

	let evMods_any = event.ctrlKey || event.shiftKey || event.altKey || event.metaKey;
	let evMods_none = !evMods_any;

	let any = false;

	if (modifiers)	{
		for (let i=0, n=modifiers.length; i<n; i++) {
			let modifier = modifiers[i];
			switch (modifier.key) {
				case 'none':
					if (evMods_any) return false;
					break;
	
				case 'any':
					any = true;
					break;
	
				default:
					let active = evMods[modifier.key];
					switch (modifier.condition) {
						case -1:
							if (active) return false;
							break;
						case 0:
							if (active) evMods[modifier.key] = -1;
							break;
						case 1:
							if (!active) return false;
							evMods[modifier.key] = -1;
							break;
					}				
			}
		}
	}
	
	if (any) return true;
	
	// Fail if any positive modifiers not accounted for
	for (let key in evMods) {
		if (evMods[key] > 0) return false;
	}
	return true;
}


function attachBinding(definition, element) {
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

function enableBinding(element) {
	if (!DOM.hasData(element)) throw Error('No binding attached to element');
	let binding = DOM.getData(element);
	if (!binding.inDocument) binding.enteredDocumentCallback();
}

// TODO disableBinding() ??

function detachBinding(element) {
	if (!DOM.hasData(element)) throw Error('No binding attached to element');
	let binding = DOM.getData(element);
	if (binding.inDocument) binding.leftDocumentCallback();
	binding.detach();
	DOM.setData(element, null);
}

_.assign(Binding, {
	attachBinding,
	enableBinding,
	detachBinding
});

export default Binding;