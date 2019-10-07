/*!
 Sprocket
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

let document = window.document;

let sprockets = (function() {
/* FIXME
	- auto DOM monitoring for node insertion / removal should be a start() option
	- manual control must allow attached, enteredView, leftView lifecycle management
	- binding registration must be blocked after sprockets.start()
*/

let sprockets = {};

let activeListeners = {};

function attachBinding(definition, element) {
	let binding;
	if (DOM.hasData(element)) {
		binding = DOM.getData(element);
		if (binding.definition !== rule.definition) throw Error('Mismatch between definition and binding already present');
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


let Binding = function(definition) {
	let binding = this;
	binding.definition = definition;
	binding.object = Object.create(definition.prototype);
	binding.handlers = definition.handlers ? _.map(definition.handlers) : [];
	binding.listeners = [];
	binding.inDocument = null; // TODO state assertions in attach/onenter/leftDocumentCallback/detach
}

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
	let capture = (handler.eventPhase == 1); // Event.CAPTURING_PHASE
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
	let target = (element === document.documentElement && _.includes(redirectedWindowEvents, type)) ? window : element;
	target.removeEventListener(type, fn, capture);	
},

});

// WARN polyfill Event#preventDefault
if (!('defaultPrevented' in Event.prototype)) { // NOTE ensure defaultPrevented works
	Event.prototype.defaultPrevented = false;
	Event.prototype._preventDefault = Event.prototype.preventDefault;
	Event.prototype.preventDefault = function() { this.defaultPrevented = true; this._preventDefault(); }
}

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
		break;
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
	return;
}


/*
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
	let xblEvents = EventModules.AllEvents;
	let xblMouseEvents = EventModules.MouseEvents;
	let xblKeyboardEvents = EventModules.KeyboardEvents;
	let xblUIEvents = EventModules.UIEvents;

	if (event.type != handler.type) return false;

	// phase
	if (!ignorePhase && !phaseMatchesEvent(handler.eventPhase, event)) return false;
	
	let evType = event.type;

	// MouseEvents
	if (evType in xblMouseEvents) { // FIXME needs testing. Bound to be cross-platform issues still
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

	if (evType in xblKeyboardEvents) {
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
	if (evType in xblUIEvents) { } // TODO
	
	// user-defined events
	if (!(evType in xblEvents)) { } // TODO should these be optionally allowed / prevented??

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

let isPrototypeOf = {}.isPrototypeOf ?
function(prototype, object) { return prototype.isPrototypeOf(object); } :
function(prototype, object) {
	for (let current=object.__proto__; current; current=current.__proto__) if (current === prototype) return true;
	return false;
};

/* CSS Rules */

function BindingDefinition(desc) {
	_.assign(this, desc);
	if (!this.prototype) {
		if (desc.prototype) this.prototype = desc.prototype;
		else this.prototype = null;
	}
	if (!this.handlers) this.handlers = [];
}

function BindingRule(selector, bindingDefn) {
	this.selector = selector;
	this.definition = bindingDefn;
}


let bindingRules = sprockets.rules = [];

function findAllBindees(root, bExcludeRoot) {
	let selector = _.map(bindingRules, function(rule) { return rule.selector; })
		.join(', ');
	let result = DOM.findAll(selector, root);
	if (!bExcludeRoot && DOM.matches(root, selector)) result.unshift(root);
	return result;
}

let started = false;
let manualDOM = false;

_.assign(sprockets, {

registerElement: function(tagName, defn) { // FIXME test tagName
	if (started) throw Error('sprockets management already started');
	if (defn.rules) console.warn('registerElement() does not support rules. Try registerComposite()');
	let bindingDefn = new BindingDefinition(defn);
	let selector = tagName + ', [is=' + tagName + ']'; // TODO why should @is be supported??
	let rule = new BindingRule(selector, bindingDefn);
	bindingRules.push(rule);
	return rule;
},

start: function(options) {
	if (started) throw Error('sprockets management has already started');
	started = true;
	if (options && options.manual) manualDOM = true;
	nodeInserted(document.body);
	if (!manualDOM) observe(nodeInserted, nodeRemoved);
},

insertNode: function(conf, refNode, node) {
	if (!started) throw Error('sprockets management has not started yet');
	if (!manualDOM) throw Error('Must not use sprockets.insertNode: auto DOM monitoring');
	let doc = refNode.ownerDocument;
	if (doc !== document || !DOM.contains(document, refNode)) throw Error('sprockets.insertNode must insert into `document`');
	if (doc.adoptNode) node = doc.adoptNode(node); // Safari 5 was throwing because imported nodes had been added to a document node

	let nodes = [ node ];
	if (node.nodeType === 11) nodes = _.map(node.childNodes);

	switch(conf) {
	case 'beforebegin': refNode.parentNode.insertBefore(node, refNode); break;
	case 'afterend': refNode.parentNode.insertBefore(node, refNode.nextSibling); break;
	case 'afterbegin': refNode.insertBefore(node, refNode.firstChild); break;
	case 'beforeend': refNode.appendChild(node); break;

	case 'replace': 
		let parent = refNode.parentNode;
		let next = refNode.nextSibling;
		parent.removeChild(refNode); // TODO refactor?? these two lines ...
		nodeRemoved(refNode); // ... are equivalent to removeNode()
		if (next) parent.insertBefore(node, next);
		else parent.appendChild(node);
		break;

	default: throw Error('Unsupported configuration in sprockets.insertNode: ' + conf);
	// TODO maybe case 'replace' which will call sprockets.removeNode() first
	}
	
	_.forEach(nodes, nodeInserted);
	return node;
},

removeNode: function(node) {
	if (!started) throw Error('sprockets management has not started yet');
	if (!manualDOM) throw Error('Must not use sprockets.insertNode: auto DOM monitoring');
	let doc = node.ownerDocument;
	if (doc !== document || !DOM.contains(document, node)) throw Error('sprockets.removeNode must remove from `document`');
	node.parentNode.removeChild(node);
	nodeRemoved(node);
	return node;
}


});

let nodeInserted = function(node) { // NOTE called AFTER node inserted into document
	if (!started) throw Error('sprockets management has not started yet');
	if (node.nodeType !== 1) return;

	let bindees = findAllBindees(node);
	let composites = [];
	_.forEach(bindees, function(el) {
		_.some(bindingRules, function(rule) {
			if (!DOM.matches(el, rule.selector)) return false;
			let binding = attachBinding(rule.definition, el);
			if (binding && binding.rules) composites.push(el);
			return true;
		});
	});

	_.forEach(bindees, function(el) {
		enableBinding(el);
	});


	let composite = sprockets.getComposite(node);
	if (composite) applyCompositedRules(node, composite);

	while (composite = composites.shift()) applyCompositedRules(composite);
	
	return;
		
	function applyCompositedRules(node, composite) {
		if (!composite) composite = node;
		let rules = getRules(composite);
		if (rules.length <= 0) return;

		let walker = createCompositeWalker(node, false); // don't skipRoot
		let el;
		while (el = walker.nextNode()) {
			_.forEach(rules, function(rule) {
				let selector = rule.selector; // FIXME absolutizeSelector??
				if (!DOM.matches(el, selector)) return;
				let binding = attachBinding(rule.definition, el);
				rule.callback.call(binding.object, el);
			});
		}
	}
	
	function getRules(composite) { // buffer uses unshift so LIFO
		let rules = [];
		let binding = DOM.getData(composite);
		_.forEach(binding.rules, function(rule) {
			if (!rule.callback) return;
			let clonedRule = _.assign({}, rule);
			clonedRule.composite = composite;
			rules.unshift(clonedRule);
		});
		return rules;
	}
	
}

let nodeRemoved = function(node) { // NOTE called AFTER node removed document
	if (!started) throw Error('sprockets management has not started yet');
	if (node.nodeType !== 1) return;

	// TODO leftComponentCallback. Might be hard to implement *after* node is removed
	// FIXME the following logic maybe completely wrong
	let nodes = DOM.findAll('*', node);
	nodes.unshift(node);
	_.forEach(nodes, Binding.leftDocumentCallback);
}

// FIXME this auto DOM Monitoring could have horrible performance for DOM sorting operations
// It would be nice to have a list of moved nodes that could potentially be ignored
let observe = (window.MutationObserver) ?
function(onInserted, onRemoved) {
	let observer = new MutationObserver(function(mutations, observer) {
		if (!started) return;
		_.forEach(mutations, function(record) {
			if (record.type !== 'childList') return;
			_.forEach(record.addedNodes, onInserted, sprockets);
			_.forEach(record.removedNodes, onRemoved, sprockets);
		});
	});
	observer.observe(document.body, { childList: true, subtree: true });
	
	// FIXME when to call observer.disconnect() ??
} :
function(onInserted, onRemoved) { // otherwise assume MutationEvents. TODO is this assumption safe?
	document.body.addEventListener('DOMNodeInserted', function(e) {
		e.stopPropagation();
		if (!started) return;
 		// NOTE IE sends event for every descendant of the inserted node
		if (e.target.parentNode !== e.relatedNode) return;
		Task.asap(function() { onInserted(e.target); });
	}, true);
	document.body.addEventListener('DOMNodeRemoved', function(e) {
		e.stopPropagation();
		if (!started) return;
 		// NOTE IE sends event for every descendant of the inserted node
		if (e.target.parentNode !== e.relatedNode) return;
		Task.asap(function() { onRemoved(e.target); });
		// FIXME
	}, true);
};


let SprocketDefinition = function(prototype) {
	let constructor = function(element) {
		return sprockets.cast(element, constructor);
	}
	constructor.prototype = prototype;
	return constructor;
}


_.assign(sprockets, {

registerSprocket: function(selector, definition, callback) { // WARN this can promote any element into a composite
	let rule = {};
	let composite;
	if (typeof selector === 'string') {
		_.assign(rule, {
			selector: selector
		});
		composite = document;
	}
	else {
		_.assign(rule, selector);
		composite = selector.composite;
		delete rule.composite;
	}
	let nodeData = DOM.getData(composite); // NOTE nodeData should always be a binding
	if (!nodeData) {
		nodeData = {};
		DOM.setData(composite, nodeData);
	}
	let nodeRules = nodeData.rules;
	if (!nodeRules) nodeRules = nodeData.rules = [];
	rule.definition = definition;
	rule.callback = callback;
	nodeRules.unshift(rule); // WARN last registered means highest priority. Is this appropriate??
},

register: function(options, sprocket) {
	return sprockets.registerSprocket(options, sprocket);
},

registerComposite: function(tagName, definition) {
	let defn = _.assign({}, definition);
	let rules = defn.rules;
	delete defn.rules;
	if (!rules) console.warn('registerComposite() called without any sprocket rules. Try registerElement()');
	let onattached = defn.attached;
	defn.attached = function() {
		let object = this;
		if (rules) _.forEach(rules, function(rule) {
			let selector = {
				composite: object.element
			}
			let definition = {};
			let callback;
			if (Array.isArray(rule)) {
				selector.selector = rule[0];
				definition = rule[1];
				callback = rule[2];
			}
			else {
				selector.selector = rule.selector;
				definition = rule.definition;
				callback = rule.callback;
			}
			sprockets.registerSprocket(selector, definition, callback);
		});
		if (onattached) return onattached.call(this);
	};
	return sprockets.registerElement(tagName, defn);
},

registerComponent: function(tagName, sprocket, extras) {
	let defn = { prototype: sprocket.prototype };
	if (extras) {
		defn.handlers = extras.handlers;
		if (extras.sprockets) _.forEach(extras.sprockets, function(oldRule) {
			if (!defn.rules) defn.rules = [];
			let rule = {
				selector: oldRule.matches,
				definition: oldRule.sprocket,
				callback: oldRule.enteredComponent
			}
			defn.rules.push(rule);
		});
		if (extras.callbacks) _.defaults(defn, extras.callbacks);
	}
	if (defn.rules) return sprockets.registerComposite(tagName, defn);
	else return sprockets.registerElement(tagName, defn);
},

evolve: function(base, properties) {
	let prototype = Object.create(base.prototype);
	let sub = new SprocketDefinition(prototype);
	let baseProperties = base.prototype.__properties__ || {};
	let subProperties = prototype.__properties__ = {};
	_.forOwn(baseProperties, function(desc, name) {
		subProperties[name] = Object.create(desc);
	});
	if (properties) sprockets.defineProperties(sub, properties);
	return sub;
},

defineProperties: function(sprocket, properties) {
	let prototype = sprocket.prototype;
	let definition = prototype.__properties__ || (prototype.__properties__ = {});
	_.forOwn(properties, function(desc, name) {
		switch (typeof desc) {
		case 'object':
			let propDesc = definition[name] || (definition[name] = {});
			_.assign(propDesc, desc);
			Object.defineProperty(prototype, name, {
				get: function() { throw Error('Attempt to get an ARIA property'); },
				set: function() { throw Error('Attempt to set an ARIA property'); }
			});
			break;
		default:
			prototype[name] = desc;
			break;
		}
	});
},

getPropertyDescriptor: function(sprocket, prop) {
	return sprocket.prototype.__properties__[prop];
},

_matches: function(element, sprocket, rule) { // internal utility method which is passed a "cached" rule
	let binding = Binding.getInterface(element);
	if (binding) return prototypeMatchesSprocket(binding.object, sprocket);
	if (rule && DOM.matches(element, rule.selector)) return true; // TODO should make rules scoped by rule.composite
	return false;
},

matches: function(element, sprocket, inComposite) {
	let composite;
	if (inComposite) {
		composite = sprockets.getComposite(element);
		if (!composite) return false;
	}
	let rule = getMatchingSprocketRule(element.parentNode, sprocket, inComposite);
	return sprockets._matches(element, sprocket, rule);
},

closest: function(element, sprocket, inComposite) {
	let composite;
	if (inComposite) {
		composite = sprockets.getComposite(element);
		if (!composite) return;
	}
	let rule = getMatchingSprocketRule(element.parentNode, sprocket, inComposite);
	for (let node=element; node && node.nodeType === 1; node=node.parentNode) {
		if (sprockets._matches(node, sprocket, rule)) return node;
		if (node === composite) return;
	}
},

findAll: function(element, sprocket) { // FIXME this search is blocked by descendant composites (scopes). Is this appropriate?
	let nodeList = [];
	let rule = getMatchingSprocketRule(element, sprocket);
	if (!rule) return nodeList;
	let walker = createCompositeWalker(element, true); // skipRoot
	
	let node;
	while (node = walker.nextNode()) {
		if (DOM.matches(node, rule.selector)) nodeList.push(node);
	}
	return nodeList;
},

find: function(element, sprocket) { // FIXME this search is blocked by descendant composites (scopes). Is this appropriate?
	let rule = getMatchingSprocketRule(element, sprocket);
	if (!rule) return null;
	let walker = createCompositeWalker(element, true); // skipRoot
	
	let node;
	while (node = walker.nextNode()) {
		if (DOM.matches(node, rule.selector)) return node;
	}
	return null;
},

cast: function(element, sprocket) {
	let object = sprockets.getInterface(element);
	if (prototypeMatchesSprocket(object, sprocket)) return object;
	throw Error('Attached sprocket is not compatible');
},

getInterface: function(element) {
	let binding = Binding.getInterface(element);
	if (binding) return binding.object;
	let rule = getSprocketRule(element);
	if (!rule) 	throw Error('No sprocket declared'); // WARN should never happen - should be a universal fallback
	binding = attachBinding(rule.definition, element);
	return binding.object;
},

isComposite: function(node) {
	if (!DOM.hasData(node)) return false;
	let nodeData = DOM.getData(node);
	if (!nodeData.rules) return false;
	return true;
},

getComposite: function(element) { // WARN this can return `document`. Not sure if that should count
	for (let node=element; node; node=node.parentNode) {
		if (sprockets.isComposite(node)) return node;
	}
}

});

function getSprocketRule(element) {
	let sprocketRule;
	let composite = sprockets.getComposite(element);
	sprocketRule = getRuleFromComposite(composite, element);
	if (sprocketRule) return sprocketRule;
	return getRuleFromComposite(document, element);
}

function getRuleFromComposite(composite, element) {
	let sprocketRule;
	let nodeData = DOM.getData(composite);
	_.some(nodeData.rules, function(rule) {
		if (!DOM.matches(element, rule.selector)) return false; // TODO should be using relative selector
		sprocketRule = { composite: composite };
		_.defaults(sprocketRule, rule);
		return true;
	});
	if (sprocketRule) return sprocketRule;
}

function getMatchingSprocketRule(element, sprocket, inComposite) {
	let sprocketRule;
	let composite = sprockets.getComposite(element);
	sprocketRule = getMatchingRuleFromComposite(composite, sprocket);
	if (inComposite || sprocketRule) return sprocketRule;
	return getMatchingRuleFromComposite(document, sprocket);
}

function getMatchingRuleFromComposite(composite, sprocket) {
	let sprocketRule;
	let nodeData = DOM.getData(composite);
	_.some(nodeData.rules, function(rule) {
		if (typeof sprocket === 'string') {
			if (rule.definition.prototype.role !== sprocket) return false;
		}
		else {
			if (sprocket.prototype !== rule.definition.prototype && !isPrototypeOf(sprocket.prototype, rule.definition.prototype)) return false;
		}
		sprocketRule = { composite: composite };
		_.defaults(sprocketRule, rule);
		return true;
	});
	return sprocketRule;
}

function prototypeMatchesSprocket(prototype, sprocket) {
	if (typeof sprocket === 'string') return (prototype.role === sprocket);
	else return (sprocket.prototype === prototype || isPrototypeOf(sprocket.prototype, prototype));
}

function createCompositeWalker(root, skipRoot) {
	return document.createNodeIterator(
			root,
			1,
			acceptNode,
			null // IE9 throws if this irrelavent argument isn't passed
		);
	
	function acceptNode(el) {
		 return (skipRoot && el === root) ? NodeFilter.FILTER_SKIP : sprockets.isComposite(el) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; 
	}
}

let basePrototype = {};
sprockets.Base = new SprocketDefinition(basePrototype); // NOTE now we can extend basePrototype

return sprockets;

})(); // END sprockets


/* Extend BaseSprocket.prototype */
(function() {

let Base = sprockets.Base;

_.assign(Base.prototype, {

find: function(selector, scope) { return DOM.find(selector, this.element, scope); },
findAll: function(selector, scope) { return DOM.findAll(selector, this.element, scope); },
matches: function(selector, scope) { return DOM.matches(this.element, selector, scope); },
closest: function(selector, scope) { return DOM.closest(this.element, selector, scope); },

contains: function(otherNode) { return DOM.contains(this.element, otherNode); },

attr: function(name, value) {
	let element = this.element;
	if (typeof value === 'undefined') return element.getAttribute(name);
	if (value == null) element.removeAttribute(name);
	else element.setAttribute(name, value);
},
hasClass: function(token) {
	let element = this.element;
	let text = element.getAttribute('class');
	if (!text) return false;
	return _.includes(_.words(text), token);
},
addClass: function(token) {
	let element = this.element;
	let text = element.getAttribute('class');
	if (!text) {
		element.setAttribute('class', token);
		return;
	}
	if (_.includes(_.words(text), token)) return;
	let n = text.length,
		space = (n && text.charAt(n-1) !== ' ') ? ' ' : '';
	text += space + token;
	element.setAttribute('class', text);
},
removeClass: function(token) {
	let element = this.element;
	let text = element.getAttribute('class');
	if (!text) return;
	let prev = _.words(text);
	let next = [];
	_.forEach(prev, function(str) { if (str !== token) next.push(str); });
	if (prev.length === next.length) return;
	element.setAttribute('class', next.join(' '));
},
toggleClass: function(token, force) {
	let found = this.hasClass(token);
	if (found) {
		if (force) return true;
		this.removeClass(token);
		return false;
	}
	else {
		if (force === false) return false;
		this.addClass(token);
		return true;
	}
},
css: function(name, value) {
	let element = this.element;
	let isKebabCase = (name.indexOf('-') >= 0);
	if (typeof value === 'undefined') return isKebabCase ? element.style.getPropertyValue(name) : element.style[name];
	if (value == null || value === '') {
		if (isKebabCase) element.style.removeProperty(name);
		else element.style[name] = '';
	}
	else {
		if (isKebabCase) element.style.setProperty(name, value);
		else element.style[name] = value;
	}
},

trigger: function(type, params) {
	return DOM.dispatchEvent(this.element, type, params);
}


});

// Element.prototype.hidden and visibilitychange event
let Element = window.Element || window.HTMLElement;

Object.defineProperty(Element.prototype, '$', {
	get: function() { return sprockets.getInterface(this); }
});

})();

(function() {

let ariaProperties = { // TODO this lookup is only for default values
	hidden: false,
	selected: false,
	expanded: true
}

let Base = sprockets.Base;

let ARIA = sprockets.evolve(Base, {

role: 'roletype',

aria: function(name, value) {
	let element = this.element;
	let defn = ariaProperties[name];
	if (defn == null) throw Error('No such aria property: ' + name);

	if (name === 'hidden') {
		if (typeof value === 'undefined') return element.hasAttribute('hidden');
		if (!value) element.removeAttribute('hidden');
		else element.setAttribute('hidden', '');
		return;
	}
	
	let ariaName = 'aria-' + name;
	let type = typeof defn;
	if (typeof value === 'undefined') {
		let result = element.getAttribute(ariaName);
		switch(type) {
		case 'string': default: return result;
		case 'boolean': return result === 'false' ? false : result == null ? undefined : true;
		}
	}
	if (value == null) element.removeAttribute(ariaName);
	else switch(type) {
		case 'string': default:
			element.setAttribute(ariaName, value);
			break;
		case 'boolean':
			let bool = value === 'false' ? 'false' : value === false ? 'false' : 'true';
			element.setAttribute(ariaName, bool);
			break;
	}
},

ariaCan: function(name, value) {
	let desc = this.__properties__[name];
	if (!desc) throw Error('Property not defined: ' + name);
	if (desc.type !== 'boolean' || desc.can && !desc.can.call(this)) return false;
	return true;
},

ariaToggle: function(name, value) {
	let desc = this.__properties__[name];
	if (!desc) throw Error('Property not defined: ' + name);
	if (desc.type !== 'boolean' || desc.can && !desc.can.call(this)) throw Error('Property can not toggle: ' + name);
	let oldValue = desc.get.call(this);
	
	if (typeof value === 'undefined') desc.set.call(this, !oldValue);
	else desc.set.call(this, !!value);
	return oldValue;
},

ariaGet: function(name) {
	let desc = this.__properties__[name];
	if (!desc) throw Error('Property not defined: ' + name);
	return desc.get.call(this); // TODO type and error handling
},

ariaSet: function(name, value) {
	let desc = this.__properties__[name];
	if (!desc) throw Error('Property not defined: ' + name);
	return desc.set.call(this, value); // TODO type and error handling
}

});

let RoleType = sprockets.evolve(ARIA, {

hidden: {
	type: 'boolean',
	can: function() { return true; },
	get: function() { return this.aria('hidden'); },
	set: function(value) { this.aria('hidden', !!value); }
}

});

sprockets.ARIA = ARIA;
sprockets.RoleType = RoleType;
sprockets.register('*', RoleType);

let Element = window.Element || window.HTMLElement;

_.defaults(Element.prototype, { // NOTE this assumes that the declared sprocket for every element is derived from ARIA

aria: function(prop, value) {
	return this.$.aria(prop, value);
},

ariaCan: function(prop) {
	return this.$.ariaCan(prop);
},

ariaToggle: function(prop, value) {
	return this.$.ariaToggle(prop, value);
},

ariaGet: function(prop) {
	return this.$.ariaGet(prop);
},

ariaSet: function(prop, value) {
	return this.$.ariaSet(prop, value);
},

ariaFind: function(role) {
	return sprockets.find(this, role);
},

ariaFindAll: function(role) {
	return sprockets.findAll(this, role);	
},

ariaClosest: function(role) {
	return sprockets.closest(this, role);
},

ariaMatches: function(role) {
	return sprockets.matches(this, role);
}
	
});


})();

export default sprockets;