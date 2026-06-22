/*!
 * Copyright 2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

import * as DOM from './DOM.mjs';

class BaseBehavior {

constructor(element) {
	if (element) this.element = element;
}

/** WARN scope must be an element (or empty), not a behavior **/
find(selector, scope) { return DOM.find(selector, this.element, scope); }
findAll(selector, scope) { return DOM.findAll(selector, this.element, scope); }
matches(selector, scope) { return DOM.matches(this.element, selector, scope); }
closest(selector, scope) { return DOM.closest(this.element, selector, scope); }

/** WARN otherNode must be an element, not a behavior **/
contains(otherNode) { return DOM.contains(this.element, otherNode); }

attr(name, value) {
	let element = this.element;
	if (typeof value === 'undefined') return element.getAttribute(name);
	if (value == null) element.removeAttribute(name);
	else element.setAttribute(name, value);
}
hasClass(token) { return this.element.classList.contains(token); }
addClass(...tokens) { this.element.classList.add(...tokens); }
removeClass(...tokens) { this.element.classList.remove(...tokens); }
toggleClass(token, force) { return this.element.classList.toggle(token, force); }
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

export { BaseBehavior };
