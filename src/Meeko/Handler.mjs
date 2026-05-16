/*!
 Handler - event matching and XBL handler conversion
 (c) Sean Hogan, 2008-2026
 Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
*/

/**
 * @typedef {Object} Handler
 * @property {string} type - DOM event type (e.g. 'click', 'keydown', 'submit')
 * @property {Function} [action] - Callback invoked with (event, delegator). Return false to preventDefault.
 * @property {string} [delegator] - CSS selector for event delegation to descendant elements.
 * @property {number} [eventPhase] - 0=any, 1=capture, 2=target only, 3=bubble only.
 * @property {number[]} [button] - Mouse button filter (0=left, 1=middle, 2=right).
 * @property {number[]} [clickCount] - Click count filter (e.g. [2] for double-click).
 * @property {string} [key] - Key identifier filter (e.g. 'Enter', 'U+0020').
 * @property {number[]} [keyLocation] - Key location filter (standard, left, right, numpad).
 * @property {Array<{key: string, condition: number}>} [modifiers] - Modifier key requirements.
 *   condition: 1=MUST be active, -1=MUST NOT be active, 0=OPTIONAL.
 * @property {boolean} [preventDefault] - If true, prevent default after action.
 * @property {boolean} [stopPropagation] - If true, stop propagation after action.
 */

import * as _ from './stuff.mjs';

/**
 * Convert an XBL-style handler configuration object into a Handler descriptor.
 * Parses event type, phase, propagation, default-action, and event filters
 * (mouse buttons, click count, keyboard keys, modifiers, mutation attributes).
 * @param {Object} config - XBL handler configuration
 * @param {string} config.event - Event type
 * @param {string} [config.phase] - Event phase ('capture', 'target', 'bubble', 'default-action')
 * @param {string} [config['default-action']] - 'cancel' or 'perform'
 * @param {string} [config.propagate] - 'stop' or 'continue'
 * @param {string} [config.button] - Space-separated button numbers
 * @param {string} [config['click-count']] - Space-separated click counts
 * @param {string} [config.key] - Key identifier
 * @param {string} [config['key-location']] - Space-separated key locations
 * @param {string} [config.modifiers] - Space-separated modifier specs (e.g. '+control -shift alt?')
 * @param {Function} [config.action] - Handler action callback
 * @returns {Handler} The constructed handler descriptor
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
			if (null == result) console.info(`Ignoring invalid property ${attrName}: ${attrValue}`);
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

/**
 * Test whether a handler matches a given event based on type, phase, and event-specific filters
 * (mouse buttons, keyboard keys, modifiers).
 * @param {Handler} handler - The handler descriptor
 * @param {Event} event - The DOM event to test
 * @param {boolean} ignorePhase - If true, skip the event phase check
 * @returns {boolean} True if the handler matches the event
 */
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

/**
 * Test whether the modifier keys in an event match the handler's modifier requirements.
 * @param {Array} modifiers - Array of modifier descriptors with {key, condition} where
 *   condition is 1 (MUST be active), -1 (MUST NOT be active), or 0 (OPTIONAL)
 * @param {Event} event - The DOM event with ctrlKey, shiftKey, altKey, metaKey
 * @returns {boolean} True if modifiers match
 */
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

export { convertXBLHandler, matchesEvent, modifiersMatchEvent };
