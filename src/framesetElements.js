/*!
 * HyperFrameset Elements
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
var controllers = Meeko.controllers;
var framer = Meeko.framer; // TODO remove `framer` dependency

var namespace;

/*
 * HyperFrameset sprockets
 */

// All HyperFrameset sprockets inherit from Base
var Base = (function() {

var Base = sprockets.evolve(sprockets.RoleType, {

});

_.assign(Base, {

iAttached: function(handlers) {
	var object = this;
	object.options = {};
	var element = object.element;
	if (!element.hasAttribute('config')) return;
	var configID = _.words(element.getAttribute('config'))[0];	
	var options = configData.get(configID);
	object.options = options;
}

});

return Base;
})();

// Almost all HyperFrameset sprockets inherit from Link
var Link = (function() {

var Link = sprockets.evolve(Base, {

role: 'link', // FIXME probably doesn't match functionality of aria "link"

lookup: function(url, details) {
	var link = this;
	var options = link.options;
	if (!options || !options.lookup) return false;
	var partial = options.lookup(url, details);
	if (partial === '' || partial === true) return true;
	if (partial == null || partial === false) return false;
	return framer.inferChangeset(url, partial);
}

});

_.assign(Link, {

iAttached: function(handlers) {
	var object = this;
	var options = object.options;
	if (!options.lookup) return;

	handlers.push({
		type: 'requestnavigation',
		action: function(e) {
			if (e.defaultPrevented) return;
			var acceptDefault = framer.onRequestNavigation(e, this);
			if (acceptDefault === false) e.preventDefault();
		}
	});
}

});

return Link;
})();



var Layer = (function() {

var Layer = sprockets.evolve(Base, {

role: 'layer'

});

var zIndex = 1;

_.assign(Layer, {

iAttached: function(handlers) {
	this.css('z-index', zIndex++);
},

attached: function(handlers) {
	Base.iAttached.call(this, handlers);
	Layer.iAttached.call(this, handlers);
}

});

return Layer;
})();

var Popup = (function() {

var Popup = sprockets.evolve(Base, {

role: 'popup',

});

_.assign(Popup, {

attached: function(handlers) {
	Base.iAttached.call(this, handlers);
},

iEnteredDocument: function() {
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

enteredDocument: function() {
	Popup.iEnteredDocument.call(this);
}

});

return Popup;
})();

var Panel = (function() {

var Panel = sprockets.evolve(Link, {

role: 'panel',

});

_.assign(Panel, {

iAttached: function(handlers) {
	var overflow = this.attr('overflow');
	if (overflow) this.css('overflow', overflow); // FIXME sanity check
	var height = this.attr('height');
	if (height) this.css('height', height); // FIXME units
	var width = this.attr('width');
	if (width) this.css('width', width); // FIXME units
	var minWidth = this.attr('minwidth');
	if (minWidth) this.css('min-width', minWidth); // FIXME units
}, 

attached: function(handlers) {
	Base.iAttached.call(this, handlers);
	Link.iAttached.call(this, handlers);
	Panel.iAttached.call(this, handlers);
},

iEnteredDocument: function() {
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

enteredDocument: function() {
	Panel.iEnteredDocument.call(this);
}

});

return Panel;
})();

var Layout = (function() { // a Layout is a list of Panel (or other Layout) and perhaps separators for hlayout, vlayout

var Layout = sprockets.evolve(Link, {

role: 'group',

owns: {
	get: function() { 
		return _.filter(this.element.children, function(el) { 
			return DOM.matches(el, 
				namespace.lookupSelector('hlayout, vlayout, deck, rdeck, panel, frame')
			); 
		}); 
	}
}

});

_.assign(Layout, {

iEnteredDocument: function() {
	var element = this.element;
	var parent = element.parentNode;

	// FIXME dimension setting should occur before becoming visible
	if (DOM.matches(parent, namespace.lookupSelector('layer'))) { // TODO vh, vw not tested on various platforms
		var height = this.attr('height'); // TODO css unit parsing / validation
		if (!height) height = '100vh';
		else height = height.replace('%', 'vh');
		this.css('height', height); // FIXME units
		var width = this.attr('width'); // TODO css unit parsing / validation
		if (!width) width = '100vw';
		else width = width.replace('%', 'vw');
		if (width) this.css('width', width); // FIXME units
	}
	_.forEach(_.map(element.childNodes), normalizeChild, element);
	return;
	
	function normalizeChild(node) {
		var element = this;
		if (DOM.matches(node, namespace.lookupSelector('hlayout, vlayout, deck, rdeck, panel, frame'))) return; 
		switch (node.nodeType) {
		case 1: // hide non-layout elements
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
},

enteredDocument: function() {
	Panel.iEnteredDocument.call(this);
	Layout.iEnteredDocument.call(this);
}

});

return Layout;
})();

var VLayout = (function() {

var VLayout = sprockets.evolve(Layout, {
});

_.assign(VLayout, {

iAttached: function() {
	var hAlign = this.attr('align'); // FIXME assert left/center/right/justify - also start/end (stretch?)
	if (hAlign) this.css('text-align', hAlign); // NOTE defaults defined in <style> above
},

attached: function(handlers) {
	Base.iAttached.call(this, handlers);
	Link.iAttached.call(this, handlers);
	Panel.iAttached.call(this, handlers);
	VLayout.iAttached.call(this, handlers);
},

enteredDocument: function() {
	Panel.iEnteredDocument.call(this);
	Layout.iEnteredDocument.call(this);
}

});

return VLayout;
})();

var HLayout = (function() {

var HLayout = sprockets.evolve(Layout, {
});

_.assign(HLayout, {

attached: function(handlers) {
	Base.iAttached.call(this, handlers);
	Link.iAttached.call(this, handlers);
	Panel.iAttached.call(this, handlers);
},

iEnteredDocument: function() {
	var vAlign = this.attr('align'); // FIXME assert top/middle/bottom/baseline - also start/end (stretch?)
	_.forEach(this.ariaGet('owns'), function(panel) {
		if (vAlign) panel.$.css('vertical-align', vAlign);
	});
},

enteredDocument: function() {
	Panel.iEnteredDocument.call(this);
	Layout.iEnteredDocument.call(this);
	HLayout.iEnteredDocument.call(this);
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
	Base.iAttached.call(this, handlers);
	Link.iAttached.call(this, handlers);
	Panel.iAttached.call(this, handlers);
},

iEnteredDocument: function() {
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

},

enteredDocument: function() {
	Layout.iEnteredDocument.call(this);
	Deck.iEnteredDocument.call(this);
}

});

return Deck;
})();

var ResponsiveDeck = (function() {

var ResponsiveDeck = sprockets.evolve(Deck, {
	
});

_.assign(ResponsiveDeck, {

attached: function(handlers) {
	Base.iAttached.call(this, handlers);
	Link.iAttached.call(this, handlers);
	Panel.iAttached.call(this, handlers);
	Deck.iAttached.call(this, handlers);
},

iEnteredDocument: function() {
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
},

enteredDocument: function() {
	Layout.iEnteredDocument.call(this);
	Panel.iEnteredDocument.call(this);
	Deck.iEnteredDocument.call(this);
	ResponsiveDeck.iEnteredDocument.call(this);
}

});

return ResponsiveDeck;
})();


var HFrame = (function() {

var HFrame = sprockets.evolve(Panel, {

role: 'frame',

frameEntered: function(frame) {
	this.frames.push(frame);
},

frameLeft: function(frame) {
	var index = this.frames.indexOf(frame);
	this.frames.splice(index);
},

preload: function(request) {
	var frame = this;
	return Promise.pipe(request, [
		
	function(request) { return frame.definition.render(request, 'loading'); },
	function(result) {
		if (!result) return;
		return frame.insert(result);
	}
	
	]);
},

load: function(response) { // FIXME need a teardown method that releases child-frames	
	var frame = this;
	if (response) frame.src = response.url;
	// else a no-src frame
	return Promise.pipe(response, [
	
	function(response) { 
		return frame.definition.render(response, 'loaded', {
			mainSelector: frame.mainSelector
			}); 
	},
	function(result) {
		if (!result) return;
		return frame.insert(result);
	}

	]);
},

insert: function(bodyElement) { // FIXME need a teardown method that releases child-frames	
	var frame = this;
	
	var options = frame.options;

	// FIXME .bodyElement will probably become .bodies[] for transition animations.
	if (frame.bodyElement) {
		if (options && options.bodyLeft) {
			try { options.bodyLeft(frame, frame.bodyElement); } 
			catch (err) { Task.postError(err); }
		}
		sprockets.removeNode(frame.bodyElement);
	}

	sprockets.insertNode('beforeend', frame.element, bodyElement);
	frame.bodyElement = bodyElement;

	if (options && options.bodyEntered) {
		try { options.bodyEntered(frame, frame.bodyElement); } 
		catch (err) { Task.postError(err); }
	}
},

});

_.assign(HFrame, {

iAttached: function() {
	var frame = this;
	var def = frame.attr('def');
	frame.definition = framer.definition.frames[def];
	_.defaults(frame, {
		frames: [],
		bodyElement: null,
		targetname: frame.attr('targetname'),
		src: frame.attr('src'),
		mainSelector: frame.attr('main') // TODO consider using a hash in `@src`
    });
},
attached: function(handlers) {
	Base.iAttached.call(this, handlers);
	Link.iAttached.call(this, handlers);
	Panel.iAttached.call(this, handlers);
	HFrame.iAttached.call(this, handlers);
},
iEnteredDocument: function() {
	var frame = this;
	framer.frameEntered(frame);
},
enteredDocument: function() {
	Panel.iEnteredDocument.call(this);
	HFrame.iEnteredDocument.call(this);
},
iLeftDocument: function() {
	var frame = this;
	framer.frameLeft(frame);
},
leftDocument: function() {
	this.iLeftDocument();
}

});

return HFrame;	
})();


var HFrameset = (function() {
	
var HFrameset = sprockets.evolve(Link, {

role: 'frameset',
isFrameset: true,

frameEntered: function(frame) {
	this.frames.push(frame);
},

frameLeft: function(frame) {
	var index = this.frames.indexOf(frame);
	this.frames.splice(index);
},

render: function() {

	var frameset = this;
	var definition = frameset.definition;
	var dstBody = this.element;

	var srcBody = definition.render();
	
	return Promise.pipe(null, [

	function() {
		_.forEach(_.map(srcBody.childNodes), function(node) {
			sprockets.insertNode('beforeend', dstBody, node);
		});
	}

	]);

}

});

_.assign(HFrameset, {

iAttached: function() {
	var frameset = this;
	frameset.definition = framer.definition;
	_.defaults(frameset, {
		frames: []
	});
}, 
attached: function(handlers) {
	Base.iAttached.call(this, handlers);
	Link.iAttached.call(this, handlers);
	HFrameset.iAttached.call(this, handlers);
	Meeko.ConfigurableBody.attached.call(this, handlers); // FIXME
},
iEnteredDocument: function() {
	var frameset = this;
	framer.framesetEntered(frameset);
	frameset.render();
},
enteredDocument: function() {
	HFrameset.iEnteredDocument.call(this);
},
iLeftDocument: function() { // FIXME should never be called??
	var frameset = this;
	framer.framesetLeft(frameset);
},
leftDocument: function() {
	HFrameset.iLeftDocument.call(this);
}

});

return HFrameset;
})();


function registerFramesetElements(ns) {

namespace = ns; // TODO assert ns instanceof CustomNamespace

sprockets.registerElement('body', HFrameset);
sprockets.registerElement(namespace.lookupSelector('frame'), HFrame);

sprockets.registerElement(namespace.lookupSelector('layer'), Layer);
sprockets.registerElement(namespace.lookupSelector('popup'), Popup);
sprockets.registerElement(namespace.lookupSelector('panel'), Panel);
sprockets.registerElement(namespace.lookupSelector('vlayout'), VLayout);
sprockets.registerElement(namespace.lookupSelector('hlayout'), HLayout);
sprockets.registerElement(namespace.lookupSelector('deck'), Deck);
sprockets.registerElement(namespace.lookupSelector('rdeck'), ResponsiveDeck);

var cssText = [
'*[hidden] { display: none !important; }', // TODO maybe not !important
'html, body { margin: 0; padding: 0; }',
'html { width: 100%; height: 100%; }',
namespace.lookupSelector('layer, popup, hlayout, vlayout, deck, rdeck, panel, frame, body') + ' { box-sizing: border-box; }', // TODO http://css-tricks.com/inheriting-box-sizing-probably-slightly-better-best-practice/
namespace.lookupSelector('layer') + ' { display: block; position: fixed; top: 0; left: 0; width: 0; height: 0; }',
namespace.lookupSelector('hlayout, vlayout, deck, rdeck') + ' { display: block; width: 0; height: 0; text-align: left; margin: 0; padding: 0; }', // FIXME text-align: start
namespace.lookupSelector('hlayout, vlayout, deck, rdeck') + ' { width: 100%; height: 100%; }', // FIXME should be 0,0 before manual calculations
namespace.lookupSelector('frame, panel') + ' { display: block; width: auto; height: auto; text-align: left; margin: 0; padding: 0; }', // FIXME text-align: start
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

} // END registerHyperFramesetElements()

var framesetElements = {

register: registerFramesetElements

}

_.defaults(classnamespace, {

	HFrame: HFrame,
	HFrameset: HFrameset,
	Layer: Layer,
	HLayout: HLayout,
	VLayout: VLayout,
	Deck: Deck,
	ResponsiveDeck: ResponsiveDeck,
	framesetElements: framesetElements

});


}).call(this, this.Meeko);
