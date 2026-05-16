/*!
 * HyperFrameset Layout Elements
 * Copyright 2009-2016 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

import * as _ from './stuff.mjs';
import * as DOM from './DOM.mjs';
import configData from './configData.mjs';
import sprockets from './sprockets.mjs';
import controllers from './controllers.mjs';

let document = window.document;

let namespace; // will be set by external call to registerFramesetElements()

/*
 * HyperFrameset sprockets
 */

// All HyperFrameset sprockets will inherit from HBase
class HBase extends sprockets.RoleType {
	static attached(handlers) { HBase.connectOptions.call(this); }
	static enteredDocument() {} // WARN void method: don't remove
	static leftDocument() {} // WARN void method: don't remove
	static connectOptions() {
		let object = this;
		object.options = {};
		let element = object.element;
		if (!element.hasAttribute('config')) return;
		let configID = _.words(element.getAttribute('config'))[0];
		object.options = configData.get(configID);
	}
}


let zIndex = 1;

class Layer extends HBase {
	static { sprockets.withAria(this, { role: 'layer', isLayer: true }); }
	static attached(handlers) { HBase.attached.call(this, handlers); this.css('z-index', zIndex++); }
	static enteredDocument() { HBase.enteredDocument.call(this); }
	static leftDocument() { HBase.leftDocument.call(this); }
	static isLayer(element) { return !!element.$.isLayer; }
}


class Popup extends HBase {
	static { sprockets.withAria(this, { role: 'popup' }); }
	static attached(handlers) { HBase.attached.call(this, handlers); }
	static enteredDocument() { HBase.enteredDocument.call(this); Popup.connectController.call(this); }
	static leftDocument() { HBase.leftDocument.call(this); }
	static connectController() {
		let panel = this;
		let name = panel.attr('name');
		let value = panel.attr('value');
		if (!name && !value) return;
		panel.ariaToggle('hidden', true);
		if (!name) return;
		controllers.listen(name, (values) => { panel.ariaToggle('hidden', !(_.includes(values, value))); });
	}
}


class Panel extends HBase {
	static { sprockets.withAria(this, { role: 'panel', isPanel: true }); }
	static attached(handlers) { HBase.attached.call(this, handlers); Panel.adjustBox.call(this); }
	static enteredDocument() { HBase.enteredDocument.call(this); Panel.connectController.call(this); }
	static leftDocument() { HBase.leftDocument.call(this); } // TODO disconnectController
	static adjustBox() {
		let overflow = this.attr('overflow');
		if (overflow) this.css('overflow', overflow); // FIXME sanity check
		let height = this.attr('height');
		if (height) this.css('height', height); // FIXME units
		let width = this.attr('width');
		if (width) this.css('width', width); // FIXME units
		let minWidth = this.attr('minwidth');
		if (minWidth) this.css('min-width', minWidth); // FIXME units
	}
	static connectController() {
		let panel = this;
		let name = panel.attr('name');
		let value = panel.attr('value');
		if (!name && !value) return;
		panel.ariaToggle('hidden', true);
		if (!name) return;
		controllers.listen(name, (values) => { panel.ariaToggle('hidden', !(_.includes(values, value))); });
	}
	static isPanel(element) { return !!element.$.isPanel; }
}

class Layout extends HBase {
	static {
		sprockets.withAria(this, {
		role: 'group',
		isLayout: true,
		owns: {
			get: function() {
				return _.filter(this.element.children, (el) => {
					return DOM.matches(el, (el) => { return Panel.isPanel(el) || Layout.isLayout(el); });
				});
			}
		}
	});
	}
	static attached(handlers) { Panel.attached.call(this, handlers); }
	static enteredDocument() {
		Panel.enteredDocument.call(this);
		Layout.adjustBox.call(this);
		Layout.normalizeChildren.call(this);
	}
	static leftDocument() { Panel.leftDocument.call(this); }
	static adjustBox() {
		let element = this.element;
		let parent = element.parentNode;
		// FIXME dimension setting should occur before becoming visible
		if (!DOM.matches(parent, Layer.isLayer)) return;
		// TODO vh, vw not tested on various platforms
		let height = this.attr('height'); // TODO css unit parsing / validation
		if (!height) height = '100vh'; else height = height.replace('%', 'vh');
		this.css('height', height); // FIXME units
		let width = this.attr('width'); // TODO css unit parsing / validation
		if (!width) width = '100vw'; else width = width.replace('%', 'vw');
		if (width) this.css('width', width); // FIXME units
	}
	static normalizeChildren() {
		let element = this.element;
		_.forEach(Array.from(element.childNodes), normalizeChild, element);
	}
	static isLayout(element) { return !!element.$.isLayout; }
}

function normalizeChild(node) {
	let element = this;
	switch (node.nodeType) {
	case 1: // hide non-layout elements
		if (DOM.matches(node, (el) => { return Panel.isPanel(el) || Layout.isLayout(el); })) return;
		node.hidden = true;
		return;
	case 3: // hide text nodes by wrapping in <wbr hidden>
		if (/^\s*$/.test(node.nodeValue)) { element.removeChild(node); return; }
		let wbr = element.ownerDocument.createElement('wbr');
		wbr.hidden = true;
		element.replaceChild(wbr, node); // NOTE no adoption
		wbr.appendChild(node); // NOTE no adoption
		return;
	default: return;
	}
}


class VLayout extends Layout {
	static attached(handlers) {
		Layout.attached.call(this, handlers);
		let hAlign = this.attr('align'); // FIXME assert left/center/right/justify - also start/end (stretch?)
		if (hAlign) this.css('text-align', hAlign); // NOTE defaults defined in <style> above
	}
	static enteredDocument() { Layout.enteredDocument.call(this); }
	static leftDocument() { Layout.leftDocument.call(this); }
}


class HLayout extends Layout {
	static attached(handlers) { Layout.attached.call(this, handlers); }
	static enteredDocument() {
		Layout.enteredDocument.call(this);
		let vAlign = this.attr('align'); // FIXME assert top/middle/bottom/baseline - also start/end (stretch?)
		_.forEach(this.ariaGet('owns'), (panel) => { if (vAlign) panel.$.css('vertical-align', vAlign); });
	}
	static leftDocument() { Layout.leftDocument.call(this); }
}


class Deck extends Layout {
	static {
		sprockets.withAria(this, {
		activedescendant: {
			set: function(item) { // if !item then hide all children
				let panels = this.ariaGet('owns');
				if (item && !_.includes(panels, item)) throw Error('set activedescendant failed: item is not child of deck');
				_.forEach(panels, (child) => {
					if (child === item) child.ariaToggle('hidden', false);
					else child.ariaToggle('hidden', true);
				});
			}
		}
	});
	}
	static attached(handlers) { Layout.attached.call(this, handlers); }
	static enteredDocument() {
		// WARN don't want Panel.connectController() so implement this long-hand
		HBase.enteredDocument.call(this);
		Layout.adjustBox.call(this);
		Layout.normalizeChildren.call(this);
		Deck.connectController.call(this);
	}
	static leftDocument() { Layout.leftDocument.call(this); }
	static connectController() {
		let deck = this;
		let name = deck.attr('name');
		if (!name) { deck.ariaSet('activedescendant', deck.ariaGet('owns')[0]); return; }
		controllers.listen(name, (values) => {
			let panels = deck.ariaGet('owns');
			let activePanel = _.find(panels, (child) => {
				let value = child.getAttribute('value');
				return _.includes(values, value);
			});
			if (activePanel) deck.ariaSet('activedescendant', activePanel);
		});
	}
}


class ResponsiveDeck extends Deck {
	static attached(handlers) { Deck.attached.call(this, handlers); }
	static enteredDocument() { Deck.enteredDocument.call(this); ResponsiveDeck.refresh.call(this); }
	static leftDocument() { Deck.leftDocument.call(this); }
	static refresh() { // TODO should this be static method?
		let width = parseFloat(window.getComputedStyle(this.element, null).width);
		let panels = this.ariaGet('owns');
		let activePanel = _.find(panels, (panel) => {
			let minWidth = window.getComputedStyle(panel, null).minWidth;
			if (minWidth == null || minWidth === '' || minWidth === '0px') return true;
			minWidth = parseFloat(minWidth); // FIXME minWidth should be "NNNpx" but need to test
			if (minWidth > width) return false;
			return true;
		});
		if (activePanel) {
			activePanel.$.css('height', '100%');
			activePanel.$.css('width', '100%');
			this.ariaSet('activedescendant', activePanel);
		}
	}
}


function registerLayoutElements(ns) {

namespace = ns; // TODO assert ns instanceof CustomNamespace

sprockets.registerElement(namespace.lookupSelector('layer'), Layer);
sprockets.registerElement(namespace.lookupSelector('popup'), Popup);
sprockets.registerElement(namespace.lookupSelector('panel'), Panel);
sprockets.registerElement(namespace.lookupSelector('vlayout'), VLayout);
sprockets.registerElement(namespace.lookupSelector('hlayout'), HLayout);
sprockets.registerElement(namespace.lookupSelector('deck'), Deck);
sprockets.registerElement(namespace.lookupSelector('rdeck'), ResponsiveDeck);

let cssText = [
'*[hidden] { display: none !important; }', // TODO maybe not !important
namespace.lookupSelector('layer, popup, hlayout, vlayout, deck, rdeck, panel, body') + ' { box-sizing: border-box; }', // TODO http://css-tricks.com/inheriting-box-sizing-probably-slightly-better-best-practice/
namespace.lookupSelector('layer') + ' { display: block; position: fixed; top: 0; left: 0; width: 0; height: 0; }',
namespace.lookupSelector('hlayout, vlayout, deck, rdeck') + ' { display: block; width: 0; height: 0; text-align: left; margin: 0; padding: 0; }', // FIXME text-align: start
namespace.lookupSelector('hlayout, vlayout, deck, rdeck') + ' { width: 100%; height: 100%; }', // FIXME should be 0,0 before manual calculations
namespace.lookupSelector('panel') + ' { display: block; width: auto; height: auto; text-align: left; margin: 0; padding: 0; }', // FIXME text-align: start
namespace.lookupSelector('body') + ' { display: block; width: auto; height: auto; margin: 0; }',
namespace.lookupSelector('popup') + ' { display: block; position: relative; width: 0; height: 0; }',
namespace.lookupSelector('popup') + ' > * { position: absolute; top: 0; left: 0; }', // TODO or change 'body' styling above
namespace.lookupSelector('vlayout') + ' { display: flex; flex-direction: column; justify-content: flex-start; align-items: stretch; }',
namespace.lookupSelector('hlayout') + ' { display: flex; flex-direction: row; justify-content: space-between; align-items: stretch; }',
namespace.lookupSelector('deck') + ' > * { width: 100%; height: 100%; }',
namespace.lookupSelector('rdeck') + ' > * { width: 0; height: 0; }',
].join('\n');

let style = document.createElement('style');
style.textContent = cssText;
document.head.insertBefore(style, document.head.firstChild);

} // END registerLayoutElements()

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
