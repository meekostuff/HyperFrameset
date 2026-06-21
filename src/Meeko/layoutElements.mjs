/*!
 * HyperFrameset Layout Custom Elements
 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

import * as _ from './stuff.mjs';
import * as DOM from './DOM.mjs';
import controllers from './controllers.mjs';

let zIndex = 1;

class HBase extends HTMLElement {
	get options() { return this.behavior || {}; }
}

class Layer extends HBase {
	connectedCallback() {
		this.style.zIndex = zIndex++;
	}
	static isLayer(element) { return element instanceof Layer; }
}

class Popup extends HBase {
	connectedCallback() {
		this.#connectController();
	}
	#connectController() {
		let name = this.getAttribute('name');
		let value = this.getAttribute('value');
		if (!name && !value) return;
		this.hidden = true;
		if (!name) return;
		controllers.listen(name, (values) => { this.hidden = !_.includes(values, value); });
	}
}

class Panel extends HBase {
	connectedCallback() {
		this.#adjustBox();
		this.#connectController();
	}
	#adjustBox() {
		let overflow = this.getAttribute('overflow');
		if (overflow) this.style.overflow = overflow;
		let height = this.getAttribute('height');
		if (height) this.style.height = height;
		let width = this.getAttribute('width');
		if (width) this.style.width = width;
		let minWidth = this.getAttribute('minwidth');
		if (minWidth) this.style.minWidth = minWidth;
	}
	#connectController() {
		let name = this.getAttribute('name');
		let value = this.getAttribute('value');
		if (!name && !value) return;
		this.hidden = true;
		if (!name) return;
		controllers.listen(name, (values) => { this.hidden = !_.includes(values, value); });
	}
	static isPanel(element) { return element instanceof Panel; }
}

class VLayout extends Panel {
	connectedCallback() {
		super.connectedCallback();
		this.#adjustLayout();
		this.#normalizeChildren();
	}
	#adjustLayout() {
		let parent = this.parentNode;
		if (parent instanceof Layer) {
			let height = this.getAttribute('height');
			if (!height) height = '100vh'; else height = height.replace('%', 'vh');
			this.style.height = height;
			let width = this.getAttribute('width');
			if (!width) width = '100vw'; else width = width.replace('%', 'vw');
			this.style.width = width;
		}
		let hAlign = this.getAttribute('align');
		if (hAlign) this.style.textAlign = hAlign;
	}
	#normalizeChildren() {
		_.forEach(Array.from(this.childNodes), normalizeChild, this);
	}
	static isLayout(element) { return element instanceof VLayout || element instanceof HLayout; }
}

class HLayout extends Panel {
	connectedCallback() {
		super.connectedCallback();
		this.#adjustLayout();
		this.#normalizeChildren();
	}
	#adjustLayout() {
		let parent = this.parentNode;
		if (parent instanceof Layer) {
			let height = this.getAttribute('height');
			if (!height) height = '100vh'; else height = height.replace('%', 'vh');
			this.style.height = height;
			let width = this.getAttribute('width');
			if (!width) width = '100vw'; else width = width.replace('%', 'vw');
			this.style.width = width;
		}
		let vAlign = this.getAttribute('align');
		if (vAlign) {
			for (let child of this.children) {
				if (Panel.isPanel(child) || VLayout.isLayout(child)) {
					child.style.verticalAlign = vAlign;
				}
			}
		}
	}
	#normalizeChildren() {
		_.forEach(Array.from(this.childNodes), normalizeChild, this);
	}
}

class Deck extends Panel {
	connectedCallback() {
		super.connectedCallback();
		this.#normalizeChildren();
		this.#connectDeckController();
	}
	get owns() {
		return _.filter(Array.from(this.children), (el) => {
			return Panel.isPanel(el) || VLayout.isLayout(el);
		});
	}
	set activedescendant(item) {
		let panels = this.owns;
		if (item && !_.includes(panels, item)) throw Error('set activedescendant failed: item is not child of deck');
		_.forEach(panels, (child) => { child.hidden = (child !== item); });
	}
	#normalizeChildren() {
		_.forEach(Array.from(this.childNodes), normalizeChild, this);
	}
	#connectDeckController() {
		let name = this.getAttribute('name');
		if (!name) { this.activedescendant = this.owns[0]; return; }
		controllers.listen(name, (values) => {
			let activePanel = _.find(this.owns, (child) => {
				let value = child.getAttribute('value');
				return _.includes(values, value);
			});
			if (activePanel) this.activedescendant = activePanel;
		});
	}
}

class ResponsiveDeck extends Deck {
	connectedCallback() {
		super.connectedCallback();
		this.#refresh();
	}
	#refresh() {
		let width = parseFloat(window.getComputedStyle(this).width);
		let panels = this.owns;
		let activePanel = _.find(panels, (panel) => {
			let minWidth = window.getComputedStyle(panel).minWidth;
			if (minWidth == null || minWidth === '' || minWidth === '0px') return true;
			minWidth = parseFloat(minWidth);
			if (minWidth > width) return false;
			return true;
		});
		if (activePanel) {
			activePanel.style.height = '100%';
			activePanel.style.width = '100%';
			this.activedescendant = activePanel;
		}
	}
}

function normalizeChild(node) {
	let element = this;
	switch (node.nodeType) {
	case 1:
		if (Panel.isPanel(node) || VLayout.isLayout(node)) return;
		node.hidden = true;
		return;
	case 3:
		if (/^\s*$/.test(node.nodeValue)) { element.removeChild(node); return; }
		let wbr = element.ownerDocument.createElement('wbr');
		wbr.hidden = true;
		element.replaceChild(wbr, node);
		wbr.appendChild(node);
		return;
	default: return;
	}
}

/**
 * Register all layout custom elements using the detected namespace prefix.
 * @param {CustomNamespace} ns - The namespace for resolving tag names.
 */
function registerLayoutElements(ns) {
	let boxSizingCSS = 'box-sizing: border-box;';
	let layoutResetCSS = 'display: block; width: 0; height: 0; text-align: left; margin: 0; padding: 0;';
	let layoutSizeCSS = 'width: 100%; height: 100%;';

	let defs = [
		['layer', Layer, `${boxSizingCSS} display: block; position: fixed; top: 0; left: 0; width: 0; height: 0;`],
		['popup', Popup, `${boxSizingCSS} display: block; position: relative; width: 0; height: 0;`, 'position: absolute; top: 0; left: 0;'],
		['panel', Panel, `${boxSizingCSS} display: block; width: auto; height: auto; text-align: left; margin: 0; padding: 0;`],
		['vlayout', VLayout, `${boxSizingCSS} ${layoutResetCSS} ${layoutSizeCSS} display: flex; flex-direction: column; justify-content: flex-start; align-items: stretch;`],
		['hlayout', HLayout, `${boxSizingCSS} ${layoutResetCSS} ${layoutSizeCSS} display: flex; flex-direction: row; justify-content: space-between; align-items: stretch;`],
		['deck', Deck, `${boxSizingCSS} ${layoutResetCSS} ${layoutSizeCSS}`, 'width: 100%; height: 100%;'],
		['rdeck', ResponsiveDeck, `${boxSizingCSS} ${layoutResetCSS} ${layoutSizeCSS}`, 'width: 0; height: 0;'],
	];

	let cssText = '*[hidden] { display: none !important; }\n';

	for (let [name, Cls, css, childCss] of defs) {
		let tagName = ns.lookupTagName(name);
		customElements.define(tagName, Cls);
		cssText += `${tagName} { ${css} }\n`;
		if (childCss) cssText += `${tagName} > * { ${childCss} }\n`;
	}

	cssText += `${ns.lookupTagName('body')} { ${boxSizingCSS} display: block; width: auto; height: auto; margin: 0; }\n`;

	let style = document.createElement('style');
	style.textContent = cssText;
	document.head.insertBefore(style, document.head.firstChild);
}

let layoutElements = {
	register: registerLayoutElements
};

export {
	HBase,
	Layer,
	Popup,
	Panel,
	HLayout,
	VLayout,
	Deck,
	ResponsiveDeck
}

export default layoutElements;
