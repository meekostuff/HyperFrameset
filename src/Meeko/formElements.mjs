/*!
 * HyperFrameset
 * Copyright 2009-2016 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

/* NOTE
	+ assumes DOMSprockets
*/

import * as _ from './stuff.mjs';
import Task from './Task.mjs';
import * as DOM from './DOM.mjs';
import configData from './configData.mjs';
import sprockets from './sprockets.mjs';

let document = window.document;

const eventConfig = 'form@submit,reset,input,change,invalid input,textarea@input,change,invalid,focus,blur select,fieldset@change,invalid,focus,blur button@click';

let eventTable = (function(config) {

let table = {};
_.forEach(config.split(/\s+/), function(combo) {
	let m = combo.split('@');
	let tags = m[0].split(',');
	let events = m[1].split(',');
	_.forEach(tags, function(tag) {
		table[tag] = _.map(events);
	});
});

return table;

})(eventConfig);


let elements = {};
let interfaces = {};

function registerFormElements() {
	_.forOwn(elements, function(ClassName, tag) {
		let Interface = interfaces[ClassName];
		sprockets.registerElement(tag, Interface);
	});
}

_.forOwn(eventTable, function(events, tag) {

let ClassName = 'Configurable' + _.ucFirst(tag);

let Interface = sprockets.evolve(sprockets.RoleType, {});
_.assign(Interface, {

attached: function(handlers) {
	let object = this;
	let element = object.element;
	if (!element.hasAttribute('config')) return;
	let configID = _.words(element.getAttribute('config'))[0];
	let options = configData.get(configID);
	if (!options) return;
	_.forEach(events, function(type) {
		let ontype = 'on' + type;
		let callback = options[ontype];
		if (!callback) return;

		let fn = function() { callback.apply(object, arguments); };
		object[ontype] = fn;
		handlers.push({
			type: type,
			action: fn
		});
	});
}

});

interfaces[ClassName] = Interface;
elements[tag] = ClassName;

});

// NOTE handlers are registered for "body@submit,reset,input,change" in HFrameset
let ConfigurableBody = sprockets.evolve(sprockets.RoleType, {});
_.assign(ConfigurableBody, {

attached: function(handlers) {
	let object = this;
	let element = object.element;
	if (!element.hasAttribute('config')) return;
	let configID = _.words(element.getAttribute('config'))[0];
	let options = configData.get(configID);
	if (!options) return;

	let events = _.words('submit reset change input');
	let needClickWatcher = false;

	_.forEach(events, function(type) {
		let ontype = 'on' + type;
		let callback = options[ontype];
		if (!callback) return;

		let fn = function(e) {
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
			let type = e.target.type;
			if (!(type === 'submit' || type === 'reset')) return;
			Task.asap(function() {
				let pseudoEvent = document.createEvent('CustomEvent');
				// NOTE pseudoEvent.detail = e.target
				pseudoEvent.initCustomEvent(type, true, true, e.target);
				pseudoEvent.preventDefault();
				element.dispatchEvent(pseudoEvent);
			});
		}, false);
	}
}

});

elements['body'] = 'ConfigurableBody';
interfaces['ConfigurableBody'] = ConfigurableBody;

let formElements = {

	register: registerFormElements

}

export {
	ConfigurableBody
}

export let {
	// FIXME can we export these interfaces programmatically?
	ConfigurableForm,
	ConfigurableInput,
	ConfigurableTextarea,
	ConfigurableFieldset,
	ConfigurableSelect,
	ConfigurableButton
} = interfaces;

export default formElements;