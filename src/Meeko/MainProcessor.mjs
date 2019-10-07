/*!
 * MainProcessor
 * Copyright 2014-2016 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */
import * as _ from './stuff.mjs';
import * as DOM from './DOM.mjs';

function MainProcessor(options) {}

_.defaults(MainProcessor.prototype, {

loadTemplate: function(template) {
	if (/\S+/.test(template.textContent)) console.warn('"main" transforms do not use templates');
},

transform: function(provider, details) { // TODO how to use details?
	let srcNode = provider.srcNode;
	let srcDoc = srcNode.nodeType === 9 ? srcNode : srcNode.ownerDocument;
	let main;
	if (!main) main = DOM.find('main, [role=main]', srcNode);
	if (!main && srcNode === srcDoc) main = srcDoc.body;
	if (!main) main = srcNode;

	let frag = srcDoc.createDocumentFragment();
	let node;
	while (node = main.firstChild) frag.appendChild(node); // NOTE no adoption
	return frag;
}
	
});

export default MainProcessor;
