/*!
 * HyperFrameset
 * Copyright 2009-2016 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

/* NOTE
	+ assumes DOMSprockets
*/

(function(classnamespace) {

var window = this;
var document = window.document;

var Meeko = window.Meeko;
var _ = Meeko.stuff; // provided by DOMSprockets
var Task = Meeko.Task;
var Promise = Meeko.Promise;
var URL = Meeko.URL;
var DOM = Meeko.DOM;
var configData = Meeko.configData;

var sprockets = Meeko.sprockets;

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


var elements = {};

function registerFormElements() {
	_.forOwn(elements, function(ClassName, tag) {
		var Interface = classnamespace[ClassName];
		sprockets.registerElement(tag, Interface);
	});
}

_.forOwn(eventTable, function(events, tag) {

var ClassName = 'Configurable' + _.ucFirst(tag);

var Interface = sprockets.evolve(sprockets.RoleType, {});
_.assign(Interface, {

attached: function(handlers) {
	var object = this;
	var element = object.element;
	if (!element.hasAttribute('config')) return;
	var configID = _.words(element.getAttribute('config'))[0];	
	var options = configData.get(configID);
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

classnamespace[ClassName] = Interface;
elements[tag] = ClassName;

});

// NOTE handlers are registered for "body@submit,reset,input,change" in HFrameset
var ConfigurableBody = sprockets.evolve(sprockets.RoleType, {});
_.assign(ConfigurableBody, {

attached: function(handlers) {
	var object = this;
	var element = object.element;
	if (!element.hasAttribute('config')) return;
	var configID = _.words(element.getAttribute('config'))[0];	
	var options = configData.get(configID);
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

});

elements['body'] = 'ConfigurableBody';

formElements = {

register: registerFormElements

}

_.defaults(classnamespace, {

ConfigurableBody: ConfigurableBody,
formElements: formElements

});


}).call(this, this.Meeko);
