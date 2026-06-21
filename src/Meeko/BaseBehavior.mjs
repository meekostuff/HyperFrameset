/*!
 * Copyright 2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

import * as DOM from './DOM.mjs';

class BaseBehavior {

constructor(element) {
	if (element) this.element = element;
}

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
	return text.split(/\s+/).includes(token);
}
addClass(token) {
	let element = this.element;
	let text = element.getAttribute('class');
	if (!text) { element.setAttribute('class', token); return; }
	if (text.split(/\s+/).includes(token)) return;
	let n = text.length, space = (n && text.charAt(n-1) !== ' ') ? ' ' : '';
	text += space + token;
	element.setAttribute('class', text);
}
removeClass(token) {
	let element = this.element;
	let text = element.getAttribute('class');
	if (!text) return;
	let prev = text.split(/\s+/);
	let next = prev.filter(str => str !== token);
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

export { BaseBehavior };
