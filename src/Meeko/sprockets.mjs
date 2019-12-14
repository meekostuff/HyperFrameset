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
import * as DOM from './DOM.mjs';
import BindingDefinition from './BindingDefinition.mjs';
import Binding from './Binding.mjs';

let document = window.document;

/* FIXME
	- auto DOM monitoring for node insertion / removal should be a start() option
	- manual control must allow attached, enteredView, leftView lifecycle management
	- binding registration must be blocked after sprockets.start()
*/

/* CSS Rules */

function BindingRule(selector, bindingDefn) {
	this.selector = selector;
	this.definition = bindingDefn;
}

let bindingRules = [];


function findAllBoundElements(root, bExcludeRoot) {
	let selector = _.map(bindingRules, function(rule) { return rule.selector; })
		.join(', ');
	let result = DOM.findAll(selector, root);
	if (!bExcludeRoot && DOM.matches(root, selector)) result.unshift(root);
	return result;
}

let started = false;
let manualDOM = false;

let registerElement = function(tagName, defn) { // FIXME test tagName
	if (started) throw Error('sprockets management already started');
	if (defn.rules) console.warn('registerElement() does not support rules. Try registerComposite()');
	let bindingDefn = new BindingDefinition(defn);
	let selector = tagName + ', [is=' + tagName + ']'; // TODO why should @is be supported??
	let rule = new BindingRule(selector, bindingDefn);
	bindingRules.push(rule);
	return rule;
}

let start = function(options) {
	if (started) throw Error('sprockets management has already started');
	started = true;
	if (options && options.manual) manualDOM = true;
	nodeInserted(document.body);
	if (!manualDOM) observe(nodeInserted, nodeRemoved);
}

let insertNode = function(conf, refNode, node) {
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
}

let removeNode = function(node) {
	if (!started) throw Error('sprockets management has not started yet');
	if (!manualDOM) throw Error('Must not use sprockets.insertNode: auto DOM monitoring');
	let doc = node.ownerDocument;
	if (doc !== document || !DOM.contains(document, node)) throw Error('sprockets.removeNode must remove from `document`');
	node.parentNode.removeChild(node);
	nodeRemoved(node);
	return node;
}


let nodeInserted = function(node) { // NOTE called AFTER node inserted into document
	if (!started) throw Error('sprockets management has not started yet');
	if (node.nodeType !== 1) return;

	let bindees = findAllBoundElements(node);
	let composites = [];
	_.forEach(bindees, function(el) {
		_.some(bindingRules, function(rule) {
			if (!DOM.matches(el, rule.selector)) return false;
			let binding = Binding.attachBinding(rule.definition, el);
			if (binding && binding.rules) composites.push(el);
			return true;
		});
	});

	_.forEach(bindees, function(el) {
		Binding.enableBinding(el);
	});


	let composite = getComposite(node);
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
				let binding = Binding.attachBinding(rule.definition, el);
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
let observe = function(onInserted, onRemoved) {
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
}

let registerSprocket = function(selector, definition, callback) { // WARN this can promote any element into a composite
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
}

let register = function(options, sprocket) {
	return registerSprocket(options, sprocket);
}

let registerComposite = function(tagName, definition) {
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
			registerSprocket(selector, definition, callback);
		});
		if (onattached) return onattached.call(this);
	};
	return registerElement(tagName, defn);
}

let registerComponent = function(tagName, sprocket, extras) {
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
	if (defn.rules) return registerComposite(tagName, defn);
	else return registerElement(tagName, defn);
}

let create = function(prototype) {
	let constructor = function(element) {
		return cast(element, constructor);
	};
	constructor.prototype = prototype;
	return constructor;
}

let evolve = function(base, properties) {
	let prototype = Object.create(base.prototype);
	let sub = create(prototype);
	let baseProperties = base.prototype.__properties__ || {};
	let subProperties = prototype.__properties__ = {};
	_.forOwn(baseProperties, function(desc, name) {
		subProperties[name] = Object.create(desc);
	});
	if (properties) defineProperties(sub, properties);
	return sub;
}

let defineProperties = function(sprocket, properties) {
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
}

let getPropertyDescriptor = function(sprocket, prop) {
	return sprocket.prototype.__properties__[prop];
}

let innerMatches = function(element, sprocket, rule) { // internal utility method which is passed a "cached" rule
	let binding = Binding.getInterface(element);
	if (binding) return prototypeMatchesSprocket(binding.object, sprocket);
	if (rule && DOM.matches(element, rule.selector)) return true; // TODO should make rules scoped by rule.composite
	return false;
}

let matches = function(element, sprocket, inComposite) {
	let composite;
	if (inComposite) {
		composite = getComposite(element);
		if (!composite) return false;
	}
	let rule = getMatchingSprocketRule(element.parentNode, sprocket, inComposite);
	return innerMatches(element, sprocket, rule);
}

let closest = function(element, sprocket, inComposite) {
	let composite;
	if (inComposite) {
		composite = getComposite(element);
		if (!composite) return;
	}
	let rule = getMatchingSprocketRule(element.parentNode, sprocket, inComposite);
	for (let node=element; node && node.nodeType === 1; node=node.parentNode) {
		if (innerMatches(node, sprocket, rule)) return node;
		if (node === composite) return;
	}
}

let findAll = function(element, sprocket) { // FIXME this search is blocked by descendant composites (scopes). Is this appropriate?
	let nodeList = [];
	let rule = getMatchingSprocketRule(element, sprocket);
	if (!rule) return nodeList;
	let walker = createCompositeWalker(element, true); // skipRoot
	
	let node;
	while (node = walker.nextNode()) {
		if (DOM.matches(node, rule.selector)) nodeList.push(node);
	}
	return nodeList;
}

let find = function(element, sprocket) { // FIXME this search is blocked by descendant composites (scopes). Is this appropriate?
	let rule = getMatchingSprocketRule(element, sprocket);
	if (!rule) return null;
	let walker = createCompositeWalker(element, true); // skipRoot
	
	let node;
	while (node = walker.nextNode()) {
		if (DOM.matches(node, rule.selector)) return node;
	}
	return null;
}

let cast = function(element, sprocket) {
	let object = getInterface(element);
	if (prototypeMatchesSprocket(object, sprocket)) return object;
	throw Error('Attached sprocket is not compatible');
}

let getInterface = function(element) {
	let binding = Binding.getInterface(element);
	if (binding) return binding.object;
	let rule = getSprocketRule(element);
	if (!rule) 	throw Error('No sprocket declared'); // WARN should never happen - should be a universal fallback
	binding = Binding.attachBinding(rule.definition, element);
	return binding.object;
}

let isComposite = function(node) {
	if (!DOM.hasData(node)) return false;
	let nodeData = DOM.getData(node);
	if (!nodeData.rules) return false;
	return true;
}

let getComposite = function(element) { // WARN this can return `document`. Not sure if that should count
	for (let node=element; node; node=node.parentNode) {
		if (isComposite(node)) return node;
	}
}

function getSprocketRule(element) {
	let sprocketRule;
	let composite = getComposite(element);
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
	let composite = getComposite(element);
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
			if (sprocket.prototype !== rule.definition.prototype && !sprocket.prototype.isPrototypeOf(rule.definition.prototype)) return false;
		}
		sprocketRule = { composite: composite };
		_.defaults(sprocketRule, rule);
		return true;
	});
	return sprocketRule;
}

function prototypeMatchesSprocket(prototype, sprocket) {
	if (typeof sprocket === 'string') return (prototype.role === sprocket);
	else return (sprocket.prototype === prototype || sprocket.prototype.isPrototypeOf(prototype));
}

function createCompositeWalker(root, skipRoot) {
	return document.createNodeIterator(
			root,
			1,
			acceptNode,
			null // IE9 throws if this irrelavent argument isn't passed
		);
	
	function acceptNode(el) {
		 return (skipRoot && el === root) ? NodeFilter.FILTER_SKIP : isComposite(el) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
	}
}

let sprockets = {
	start,
	insertNode,
	removeNode,
	registerElement,
	registerComponent,
	registerComposite,
	register,
	create,
	evolve,
	cast,
	find,
	findAll,
	matches,
	closest
};

let basePrototype = {};
sprockets.Base = create(basePrototype); // NOTE now we can extend basePrototype


/* Extend BaseSprocket.prototype */
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

let Element = window.Element || window.HTMLElement;

Object.defineProperty(Element.prototype, '$', {
	get: function() { return sprockets.cast(this, sprockets.Base); }
});


(function() {

let ariaProperties = { // TODO this lookup is only for default values
	hidden: false,
	selected: false,
	expanded: true
};

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
},

ariaFind: function(role) {
	return sprockets.find(this.element, role);
},

ariaFindAll: function(role) {
	return sprockets.findAll(this.element, role);
},

ariaMatches: function(role) {
	return sprockets.matches(this.element, role);
},

ariaClosest: function(role) {
	return sprockets.closest(this.element, role);
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
	return this.$.ariaFind(role);
},

ariaFindAll: function(role) {
	return this.$.ariaFindALL(role);
},

ariaMatches: function(role) {
	return this.$.ariaMatches(role);
},

ariaClosest: function(role) {
	return this.$.ariaClosest(role);
}
});


})();

export default sprockets;