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
var _ = Meeko.stuff;
var Task = Meeko.Task;
var Promise = Meeko.Promise;
var URL = Meeko.URL;
var DOM = Meeko.DOM;

var sprockets = Meeko.sprockets;
var namespace; // will be set by external call to registerFrameElements()

var Registry = Meeko.Registry;

var frameDefinitions = new Registry({
	writeOnce: true,
	testKey: function(key) {
		return typeof key === 'string';
	},
	testValue: function(o) {
		return o != null && typeof o === 'object';
	}
});

var HBase = Meeko.HBase; // All HyperFrameset sprockets inherit from HBase
var Panel = Meeko.Panel;

var HFrame = (function() {

var HFrame = sprockets.evolve(Panel, {

role: 'frame',

isFrame: true,

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

attached: function(handlers) {
	Panel.attached.call(this, handlers);

	var frame = this;
	var def = frame.attr('def');
	frame.definition = frameDefinitions.get(def); // FIXME assert frameDefinitions.has(def)
	_.defaults(frame, {
		bodyElement: null,
		targetname: frame.attr('targetname'),
		src: frame.attr('src'),
		mainSelector: frame.attr('main') // TODO consider using a hash in `@src`
    });
},

enteredDocument: function() {
	Panel.enteredDocument.call(this);
},

leftDocument: function() {
	Panel.leftDocument.call(this);
},

isFrame: function(element) {
	return !!element.$.isFrame;
}

});

return HFrame;	
})();

function registerFrameElements(ns) {

namespace = ns; // TODO assert ns instanceof CustomNamespace

sprockets.registerElement(namespace.lookupSelector('frame'), HFrame);

var cssText = [
namespace.lookupSelector('frame') + ' { box-sizing: border-box; }', // TODO http://css-tricks.com/inheriting-box-sizing-probably-slightly-better-best-practice/
namespace.lookupSelector('frame') + ' { display: block; width: auto; height: auto; text-align: left; margin: 0; padding: 0; }' // FIXME text-align: start
].join('\n');

var style = document.createElement('style');
style.textContent = cssText;
document.head.insertBefore(style, document.head.firstChild);

} // END registerFrameElements()

var frameElements = {

register: registerFrameElements

}

_.defaults(classnamespace, {

	HFrame: HFrame,
	frameElements: frameElements,
	frameDefinitions: frameDefinitions

});


}).call(this, this.Meeko);

