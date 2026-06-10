/*!
 Sprocket
 (c) Sean Hogan, 2008,2012,2013,2014,2016,2019
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
	let selector = Array.from(bindingRules, function(rule) { return rule.selector; })
		.join(', ');
	let result = DOM.findAll(selector, root);
	if (!bExcludeRoot && DOM.matches(root, selector)) result.unshift(root);
	return result;
}

let started = false;
let manualDOM = false;

/**
 * Attach sprockets to elements within the document and conditionally watch element insertions and removal.
 * No more registrations are permitted.
 *
 * @param options {object} Options.
 *     If `options.manual === true` then the caller will manually call nodeInserted / nodeRemoved as appropriate.
 */
let start = function(options) {
	if (started) throw Error('sprockets management has already started');
	started = true;
	if (options && options.manual) manualDOM = true;
	nodeInserted(document.body);
	if (!manualDOM) observe(nodeInserted, nodeRemoved);
}

/**
 * Define ARIA property descriptors on a class (or sprocket constructor).
 * Each entry is stored in `prototype.__properties__[name]` and a trap
 * getter/setter is installed to enforce use of `ariaGet`/`ariaSet`/`ariaToggle`/`ariaCan`.
 * Inherited descriptors are resolved at runtime via prototype chain traversal.
 *
 * @param {Function} Class - The class or constructor whose prototype will be extended.
 * @param {Object<string, Object>} properties - A map of property names to descriptors.
 * @param {string} [properties.<name>.type] - The property type, e.g. `'boolean'` or `'node'`.
 * @param {Function} [properties.<name>.get] - Getter called with `this` bound to the instance.
 * @param {Function} [properties.<name>.set] - Setter called with `this` bound to the instance.
 * @param {Function} [properties.<name>.can] - Optional guard for toggling.
 */
let withAria = function(Class, properties) {
	let prototype = Class.prototype;
	let definition = null;
	_.forOwn(properties, function(desc, name) {
		if (typeof desc === 'object') {
			if (!definition) definition = prototype.__properties__ = {};
			definition[name] = desc;
			Object.defineProperty(prototype, name, {
				get: function() { throw Error('Attempt to get an ARIA property'); },
				set: function() { throw Error('Attempt to set an ARIA property'); }
			});
		} else {
			prototype[name] = desc;
		}
	});
}

let sharedStyleElement;

/**
 * Append a CSS rule to the shared document stylesheet.
 * Creates the shared `<style>` element on first call.
 *
 * @param {string} selector - The CSS selector.
 * @param {string} cssText - CSS declarations (without braces).
 */
let registerStyle = function(selector, cssText) {
	if (!sharedStyleElement) {
		sharedStyleElement = document.createElement('style');
		document.head.insertBefore(sharedStyleElement, document.head.firstChild);
	}
	sharedStyleElement.textContent += `${selector} { ${cssText} }\n`;
}

/**
 * Register a sprocket definition for elements which have the specified tag-name.
 *   TODO: Should this be a private method?
 *
 * @param {string} tagName - The custom element tag name.
 * @param {object} definition - The sprocket definition (class or descriptor).
 * @param {string} [cssText] - Optional CSS text to register via the shared stylesheet.
 * @returns {BindingRule}
 */
let registerElement = function(tagName, definition, cssText) { // FIXME test tagName
	if (cssText) registerStyle(tagName, cssText);
	if (started) throw Error('sprockets management already started');
	if (definition.rules) console.warn('registerElement() does not support rules. Try registerComposite()');
	let bindingDefn = new BindingDefinition(definition);
	let selector = `${tagName}, [is=${tagName}]`; // TODO why should @is be supported??
	let rule = new BindingRule(selector, bindingDefn);
	bindingRules.push(rule);
	return rule;
}

/**
 * Register a sprocket definition. Internally method only.
 *   WARN this can promote any element into a composite
 *
 * @param selectorDescriptor {string|object} A string is a CSS selector. An object is {selector, composite: rootElement}
 * @param definition
 * @param callback Function that is called when the sprocket
 */
let registerSprocket = function(selectorDescriptor, definition, callback) {
	let selector, composite;
	if (typeof selectorDescriptor === 'string') {
		selector = selectorDescriptor;
		composite = document;
	}
	else {
		selector = selectorDescriptor.selector;
		composite = selectorDescriptor.composite;
	}
	let nodeData = DOM.getData(composite); // NOTE nodeData should always be a binding
	if (!nodeData) {
		nodeData = {};
		DOM.setData(composite, nodeData);
	}
	let nodeRules = nodeData.rules;
	if (!nodeRules) nodeRules = nodeData.rules = [];
	let rule = new BindingRule(selector, definition);
	rule.callback = callback;
	nodeRules.unshift(rule); // WARN last registered means highest priority. Is this appropriate??
}

/**
 * Mostly an alias for registerElement.
 *
 * @param options
 * @param definition
 * @param callback
 */
let register = function(options, definition, callback) {
	return registerSprocket(options, definition, callback);
}

/**
 * Register a sprocket-definition for elements which match the specified tag-name.
 *   The definition may contain a list of rules of sprocket-definition registrations for descendant elements.
 *
 * @param tagName
 * @param compositeDefn
 * @returns {BindingRule}
 */
let registerComposite = function(tagName, compositeDefn) {
	let defn = _.assign({}, compositeDefn);
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

/**
 * Almost the same as registerComposite. Provided for backwards compatibility.
 *
 * @param tagName
 * @param definition
 * @param extras
 * @returns {BindingRule}
 * @deprecated
 */
let registerComponent = function(tagName, definition, extras) {
	let compositeDefn = { prototype: definition.prototype };
	if (extras) {
		compositeDefn.handlers = extras.handlers;
		if (extras.sprockets) _.forEach(extras.sprockets, function(oldRule) {
			if (!compositeDefn.rules) compositeDefn.rules = [];
			let rule = {
				selector: oldRule.matches,
				definition: oldRule.sprocket,
				callback: oldRule.enteredComponent
			}
			compositeDefn.rules.push(rule);
		});
		if (extras.callback) _.defaults(compositeDefn, extras.callback);
	}
	if (compositeDefn.rules) return registerComposite(tagName, compositeDefn);
	else return registerElement(tagName, compositeDefn);
}

/**
 * Insert a node into the document at a specified location and attach / enable registered sprockets.
 *
 * @param conf {string} where to insert the node relative to `refNode`.
 * @param refNode {Node}
 * @param node {Node} the node to be inserted.
 * @returns {Node} The node (now inserted).
 */
let insertNode = function(conf, refNode, node) {
	if (!started) throw Error('sprockets management has not started yet');
	if (!manualDOM) throw Error('Must not use sprockets.insertNode: auto DOM monitoring');
	let doc = refNode.ownerDocument;
	if (doc !== document || !DOM.contains(document, refNode)) throw Error('sprockets.insertNode must insert into `document`');
	if (doc.adoptNode) node = doc.adoptNode(node); // Safari 5 was throwing because imported nodes had been added to a document node

	let nodes = [ node ];
	if (node.nodeType === 11) nodes = Array.from(node.childNodes);

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

	default: throw Error(`Unsupported configuration in sprockets.insertNode: ${conf}`);
	// TODO maybe case 'replace' which will call sprockets.removeNode() first
	}
	
	_.forEach(nodes, nodeInserted);
	return node;
}

/**
 * Remove a specified node from the document and disable / remove registered sprockets.
 *
 * @param node {Node} the node to be removed.
 * @returns {Node} the node (now removed).
 */
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
	registerStyle,
	registerElement,
	registerComponent,
	registerComposite,
	register,
	withAria,
	cast,
	find,
	findAll,
	matches,
	closest
};

/**
 * Walk the prototype chain to find an ARIA property descriptor by name.
 * Each prototype in the chain may have its own `__properties__` object.
 * @param {Object} obj - The sprocket instance to start from.
 * @param {string} name - The property name to look up.
 * @returns {Object} The property descriptor.
 * @throws {Error} If no descriptor is found in the chain.
 */
function lookupPropertyDescriptor(obj, name) {
	let proto = obj;
	while (proto) {
		let props = Object.prototype.hasOwnProperty.call(proto, '__properties__') ? proto.__properties__ : null;
		if (props && name in props) return props[name];
		proto = Object.getPrototypeOf(proto);
	}
	throw Error(`Property not defined: ${name}`);
}

let ariaProperties = { // TODO this lookup is only for default values
	hidden: false,
	selected: false,
	expanded: true
};

class Base {

find(selector, scope) { return DOM.find(selector, this.element, scope); }
findAll(selector, scope) { return DOM.findAll(selector, this.element, scope); }
matches(selector, scope) { return DOM.matches(this.element, selector, scope); }
closest(selector, scope) { return DOM.closest(this.element, selector, scope); }
contains(otherNode) { return DOM.contains(this.element, otherNode); }

attr(name, value) {
	let element = this.element;
	if (typeof value === 'undefined') return element.getAttribute(name);
	if (value == null) element.removeAttribute(name);
	else element.setAttribute(name, value);
}
hasClass(token) {
	let element = this.element;
	let text = element.getAttribute('class');
	if (!text) return false;
	return _.includes(_.words(text), token);
}
addClass(token) {
	let element = this.element;
	let text = element.getAttribute('class');
	if (!text) { element.setAttribute('class', token); return; }
	if (_.includes(_.words(text), token)) return;
	let n = text.length, space = (n && text.charAt(n-1) !== ' ') ? ' ' : '';
	text += space + token;
	element.setAttribute('class', text);
}
removeClass(token) {
	let element = this.element;
	let text = element.getAttribute('class');
	if (!text) return;
	let prev = _.words(text);
	let next = [];
	_.forEach(prev, function(str) { if (str !== token) next.push(str); });
	if (prev.length === next.length) return;
	element.setAttribute('class', next.join(' '));
}
toggleClass(token, force) {
	let found = this.hasClass(token);
	if (found) { if (force) return true; this.removeClass(token); return false; }
	else { if (force === false) return false; this.addClass(token); return true; }
}
css(name, value) {
	let element = this.element;
	let isKebabCase = (name.indexOf('-') >= 0);
	if (typeof value === 'undefined') return isKebabCase ? element.style.getPropertyValue(name) : element.style[name];
	if (value == null || value === '') {
		if (isKebabCase) element.style.removeProperty(name);
		else element.style[name] = '';
	} else {
		if (isKebabCase) element.style.setProperty(name, value);
		else element.style[name] = value;
	}
}
trigger(type, params) { return DOM.dispatchEvent(this.element, type, params); }

}

class ARIA extends Base {

role = 'roletype';

aria(name, value) {
	let element = this.element;
	let defn = ariaProperties[name];
	if (defn == null) throw Error(`No such aria property: ${name}`);
	if (name === 'hidden') {
		if (typeof value === 'undefined') return element.hasAttribute('hidden');
		if (!value) element.removeAttribute('hidden');
		else element.setAttribute('hidden', '');
		return;
	}
	let ariaName = `aria-${name}`;
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
		case 'string': default: element.setAttribute(ariaName, value); break;
		case 'boolean':
			let bool = value === 'false' ? 'false' : value === false ? 'false' : 'true';
			element.setAttribute(ariaName, bool);
			break;
	}
}
ariaCan(name) {
	let desc = lookupPropertyDescriptor(this, name);
	if (desc.type !== 'boolean' || desc.can && !desc.can.call(this)) return false;
	return true;
}
ariaToggle(name, value) {
	let desc = lookupPropertyDescriptor(this, name);
	if (desc.type !== 'boolean' || desc.can && !desc.can.call(this)) throw Error(`Property can not toggle: ${name}`);
	let oldValue = desc.get.call(this);
	if (typeof value === 'undefined') desc.set.call(this, !oldValue);
	else desc.set.call(this, !!value);
	return oldValue;
}
ariaGet(name) {
	let desc = lookupPropertyDescriptor(this, name);
	return desc.get.call(this);
}
ariaSet(name, value) {
	let desc = lookupPropertyDescriptor(this, name);
	return desc.set.call(this, value);
}
ariaFind(role) { return sprockets.find(this.element, role); }
ariaFindAll(role) { return sprockets.findAll(this.element, role); }
ariaMatches(role) { return sprockets.matches(this.element, role); }
ariaClosest(role) { return sprockets.closest(this.element, role); }

}

class RoleType extends ARIA {
	static {
		withAria(this, {
		hidden: {
			type: 'boolean',
			can: function() { return true; },
			get: function() { return this.aria('hidden'); },
			set: function(value) { this.aria('hidden', !!value); }
		}
		});
	}
}

sprockets.Base = Base;
sprockets.ARIA = ARIA;
sprockets.RoleType = RoleType;
sprockets.register('*', RoleType);

let Element = window.Element || window.HTMLElement;

Object.defineProperty(Element.prototype, '$', {
	get: function() { return sprockets.cast(this, sprockets.Base); }
});


/* Extend BaseSprocket.prototype */


_.defaults(Element.prototype, { // NOTE this assumes that the declared sprocket for every element is derived from ARIA

aria: function(prop, value) { return this.$.aria(prop, value); },
ariaCan: function(prop) { return this.$.ariaCan(prop); },
ariaToggle: function(prop, value) { return this.$.ariaToggle(prop, value); },
ariaGet: function(prop) { return this.$.ariaGet(prop); },
ariaSet: function(prop, value) { return this.$.ariaSet(prop, value); },
ariaFind: function(role) { return this.$.ariaFind(role); },
ariaFindAll: function(role) { return this.$.ariaFindAll(role); },
ariaMatches: function(role) { return this.$.ariaMatches(role); },
ariaClosest: function(role) { return this.$.ariaClosest(role); }

});

export default sprockets;
