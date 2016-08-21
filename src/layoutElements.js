/*!
 * HyperFrameset Layout Elements
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
var _ = Meeko.stuff;
var DOM = Meeko.DOM;
var configData = Meeko.configData;
var sprockets = Meeko.sprockets;
var controllers = Meeko.controllers;
var namespace; // will be set by external call to registerFramesetElements()

/*
 * HyperFrameset sprockets
 */

// All HyperFrameset sprockets will inherit from HBase
var HBase = (function() {

var HBase = sprockets.evolve(sprockets.RoleType, {

});

_.assign(HBase, {

attached: function(handlers) {
	HBase.connectOptions.call(this);
},

enteredDocument: function() { // WARN void method: don't remove
},

leftDocument: function() { // WARN void method: don't remove
},

connectOptions: function() {
	var object = this;
	object.options = {};
	var element = object.element;
	if (!element.hasAttribute('config')) return;
	var configID = _.words(element.getAttribute('config'))[0];	
	var options = configData.get(configID);
	object.options = options;
}
});

return HBase;
})();


var Layer = (function() {

var Layer = sprockets.evolve(HBase, {

role: 'layer',

isLayer: true

});

var zIndex = 1;

_.assign(Layer, {

attached: function(handlers) {
	HBase.attached.call(this, handlers);

	this.css('z-index', zIndex++);
},

enteredDocument: function() {
	HBase.enteredDocument.call(this);
},

leftDocument: function() {
	HBase.leftDocument.call(this);
},

isLayer: function(element) {
	return !!element.$.isLayer;
}

});

return Layer;
})();

var Popup = (function() {

var Popup = sprockets.evolve(HBase, {

role: 'popup',

});

_.assign(Popup, {

attached: function(handlers) {
	HBase.attached.call(this, handlers);
},

enteredDocument: function() {
	HBase.enteredDocument.call(this);

	Popup.connectController.call(this);
},

leftDocument: function() {
	HBase.leftDocument.call(this);
},

connectController: function() {
	var panel = this;
	var name = panel.attr('name'); 
	var value = panel.attr('value'); 
	if (!name && !value) return;
	panel.ariaToggle('hidden', true);
	if (!name) return; // being controlled by an ancestor
	controllers.listen(name, function(values) {
		panel.ariaToggle('hidden', !(_.includes(values, value)));
	});
}

});

return Popup;
})();

var Panel = (function() {

var Panel = sprockets.evolve(HBase, {

role: 'panel',

isPanel: true

});

_.assign(Panel, {

attached: function(handlers) {
	HBase.attached.call(this, handlers);

	Panel.adjustBox.call(this);
},

enteredDocument: function() {
	HBase.enteredDocument.call(this);

	Panel.connectController.call(this);
},

leftDocument: function() {
	HBase.leftDocument.call(this);

	// TODO disconnectController
},

adjustBox: function() {
	var overflow = this.attr('overflow');
	if (overflow) this.css('overflow', overflow); // FIXME sanity check
	var height = this.attr('height');
	if (height) this.css('height', height); // FIXME units
	var width = this.attr('width');
	if (width) this.css('width', width); // FIXME units
	var minWidth = this.attr('minwidth');
	if (minWidth) this.css('min-width', minWidth); // FIXME units
}, 

connectController: function() {
	var panel = this;
	var name = panel.attr('name'); 
	var value = panel.attr('value'); 
	if (!name && !value) return;
	panel.ariaToggle('hidden', true);
	if (!name) return; // being controlled by an ancestor
	controllers.listen(name, function(values) {
		panel.ariaToggle('hidden', !(_.includes(values, value)));
	});
},

isPanel: function(element) {
	return !!element.$.isPanel;
}

});

return Panel;
})();

var Layout = (function() { // a Layout is a list of Panel (or other Layout) and perhaps separators for hlayout, vlayout

var Layout = sprockets.evolve(HBase, {

role: 'group',

isLayout: true,

owns: {
	get: function() { 
		return _.filter(this.element.children, function(el) { 
			return DOM.matches(el, function(el) { return Panel.isPanel(el) || Layout.isLayout(el); });
		}); 
	}
}

});

_.assign(Layout, {

attached: function(handlers) {
	Panel.attached.call(this, handlers);
},

enteredDocument: function() {
	Panel.enteredDocument.call(this);

	Layout.adjustBox.call(this);
	Layout.normalizeChildren.call(this);
	return;
},

leftDocument: function() {
	Panel.leftDocument.call(this);
},

adjustBox: function() {
	var element = this.element;
	var parent = element.parentNode;

	// FIXME dimension setting should occur before becoming visible
	if (!DOM.matches(parent, Layer.isLayer)) return;
	// TODO vh, vw not tested on various platforms
	var height = this.attr('height'); // TODO css unit parsing / validation
	if (!height) height = '100vh';
	else height = height.replace('%', 'vh');
	this.css('height', height); // FIXME units
	var width = this.attr('width'); // TODO css unit parsing / validation
	if (!width) width = '100vw';
	else width = width.replace('%', 'vw');
	if (width) this.css('width', width); // FIXME units
},

normalizeChildren: function() {
	var element = this.element;
	_.forEach(_.map(element.childNodes), normalizeChild, element);
},

isLayout: function(element) {
	return !!element.$.isLayout;
}

});

function normalizeChild(node) {
	var element = this;
	switch (node.nodeType) {
	case 1: // hide non-layout elements
		if (DOM.matches(node, function(el) { return Panel.isPanel(el) || Layout.isLayout(el); })) return;
		node.hidden = true;
		return;
	case 3: // hide text nodes by wrapping in <wbr hidden>
		if (/^\s*$/.test(node.nodeValue )) {
			element.removeChild(node);
			return;
		}
		var wbr = element.ownerDocument.createElement('wbr');
		wbr.hidden = true;
		element.replaceChild(wbr, node); // NOTE no adoption
		wbr.appendChild(node); // NOTE no adoption
		return;
	default:
		return;
	}
}

return Layout;
})();


var VLayout = (function() {

var VLayout = sprockets.evolve(Layout, {
});

_.assign(VLayout, {

attached: function(handlers) {
	Layout.attached.call(this, handlers);

	var hAlign = this.attr('align'); // FIXME assert left/center/right/justify - also start/end (stretch?)
	if (hAlign) this.css('text-align', hAlign); // NOTE defaults defined in <style> above
},

enteredDocument: function() {
	Layout.enteredDocument.call(this);
},

leftDocument: function() {
	Layout.leftDocument.call(this);
}

});

return VLayout;
})();

var HLayout = (function() {

var HLayout = sprockets.evolve(Layout, {
});

_.assign(HLayout, {

attached: function(handlers) {
	Layout.attached.call(this, handlers);
},

enteredDocument: function() {
	Layout.enteredDocument.call(this);

	var vAlign = this.attr('align'); // FIXME assert top/middle/bottom/baseline - also start/end (stretch?)
	_.forEach(this.ariaGet('owns'), function(panel) {
		if (vAlign) panel.$.css('vertical-align', vAlign);
	});
},

leftDocument: function() {
	Layout.leftDocument.call(this);
}


});

return HLayout;
})();

var Deck = (function() {

var Deck = sprockets.evolve(Layout, {

activedescendant: {
	set: function(item) { // if !item then hide all children
		
		var element = this.element;
		var panels = this.ariaGet('owns');
		if (item && !_.includes(panels, item)) throw Error('set activedescendant failed: item is not child of deck');
		_.forEach(panels, function(child) {
			if (child === item) child.ariaToggle('hidden', false);
			else child.ariaToggle('hidden', true);
		});
	
	}
}

	
});

_.assign(Deck, {

attached: function(handlers) {
	Layout.attached.call(this, handlers);
},

enteredDocument: function() {
	// WARN don't want Panel.connectController() so implement this long-hand
	HBase.enteredDocument.call(this);

	Layout.adjustBox.call(this);
	Layout.normalizeChildren.call(this);

	Deck.connectController.call(this);
},

leftDocument: function() {
	Layout.leftDocument.call(this);
},

connectController: function() {
	var deck = this;
	var name = deck.attr('name'); 
	if (!name) {
		deck.ariaSet('activedescendant', deck.ariaGet('owns')[0]);
		return;
	}
	controllers.listen(name, function(values) {
		var panels = deck.ariaGet('owns');
		var activePanel = _.find(panels, function(child) { 
			var value = child.getAttribute('value');
			if (!_.includes(values, value)) return false;
			return true;
		});
		if (activePanel) deck.ariaSet('activedescendant', activePanel);
	});

}

});

return Deck;
})();

var ResponsiveDeck = (function() {

var ResponsiveDeck = sprockets.evolve(Deck, {
	
});

_.assign(ResponsiveDeck, {

attached: function(handlers) {
	Deck.attached.call(this, handlers);
},

enteredDocument: function() {
	Deck.enteredDocument.call(this);

	ResponsiveDeck.refresh.call(this);
},

leftDocument: function() {
	Deck.leftDocument.call(this);
},

refresh: function() { // TODO should this be static method?
	var width = parseFloat(window.getComputedStyle(this.element, null).width);
	var panels = this.ariaGet('owns');
	var activePanel = _.find(panels, function(panel) {
		var minWidth = window.getComputedStyle(panel, null).minWidth;
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

});

return ResponsiveDeck;
})();


function registerLayoutElements(ns) {

namespace = ns; // TODO assert ns instanceof CustomNamespace

sprockets.registerElement(namespace.lookupSelector('layer'), Layer);
sprockets.registerElement(namespace.lookupSelector('popup'), Popup);
sprockets.registerElement(namespace.lookupSelector('panel'), Panel);
sprockets.registerElement(namespace.lookupSelector('vlayout'), VLayout);
sprockets.registerElement(namespace.lookupSelector('hlayout'), HLayout);
sprockets.registerElement(namespace.lookupSelector('deck'), Deck);
sprockets.registerElement(namespace.lookupSelector('rdeck'), ResponsiveDeck);

var cssText = [
'*[hidden] { display: none !important; }', // TODO maybe not !important
namespace.lookupSelector('layer, popup, hlayout, vlayout, deck, rdeck, panel, body') + ' { box-sizing: border-box; }', // TODO http://css-tricks.com/inheriting-box-sizing-probably-slightly-better-best-practice/
namespace.lookupSelector('layer') + ' { display: block; position: fixed; top: 0; left: 0; width: 0; height: 0; }',
namespace.lookupSelector('hlayout, vlayout, deck, rdeck') + ' { display: block; width: 0; height: 0; text-align: left; margin: 0; padding: 0; }', // FIXME text-align: start
namespace.lookupSelector('hlayout, vlayout, deck, rdeck') + ' { width: 100%; height: 100%; }', // FIXME should be 0,0 before manual calculations
namespace.lookupSelector('panel') + ' { display: block; width: auto; height: auto; text-align: left; margin: 0; padding: 0; }', // FIXME text-align: start
namespace.lookupSelector('body') + ' { display: block; width: auto; height: auto; margin: 0; }',
namespace.lookupSelector('popup') + ' { display: block; position: relative; width: 0; height: 0; }',
namespace.lookupSelector('popup') + ' > * { position: absolute; top: 0; left: 0; }', // TODO or change 'body' styling above
namespace.lookupSelector('vlayout') + ' { height: 100%; }',
namespace.lookupSelector('hlayout') + ' { width: 100%; overflow-y: hidden; }',
namespace.lookupSelector('vlayout') + ' > * { display: block; float: left; width: 100%; height: auto; text-align: left; }',
namespace.lookupSelector('vlayout') + ' > *::after { clear: both; }',
namespace.lookupSelector('hlayout') + ' > * { display: block; float: left; width: auto; height: 100%; vertical-align: top; overflow-y: auto; }',
namespace.lookupSelector('hlayout') + '::after { clear: both; }',
namespace.lookupSelector('deck') + ' > * { width: 100%; height: 100%; }',
namespace.lookupSelector('rdeck') + ' > * { width: 0; height: 0; }',
].join('\n');

var style = document.createElement('style');
style.textContent = cssText;
document.head.insertBefore(style, document.head.firstChild);

} // END registerLayoutElements()

var layoutElements = {

register: registerLayoutElements

}

_.defaults(classnamespace, {

	HBase: HBase,
	Layer: Layer,
	Popup: Popup,
	Panel: Panel,
	HLayout: HLayout,
	VLayout: VLayout,
	Deck: Deck,
	ResponsiveDeck: ResponsiveDeck,
	layoutElements: layoutElements

});


}).call(this, this.Meeko);

