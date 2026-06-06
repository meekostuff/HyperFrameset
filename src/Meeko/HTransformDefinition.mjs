/*!
 * HTransformDefinition
 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */
import * as _ from './stuff.mjs';
import configData from './configData.mjs';
import decoders from './decoders.mjs';
import processors from './processors.mjs';

class HTransformDefinition {

constructor(el, framesetDef) {
	if (!el) return; // in case of inheritance
	this.framesetDefinition = framesetDef;
	this.init(el);
}

init(el) {
	let transform = this;
	let framesetDef = transform.framesetDefinition;
	_.defaults(transform, {
		element: el,
		type: el.getAttribute('type') || 'main',
		format: el.getAttribute('format')
    });
	if (transform.type === 'main') transform.format = '';
	let doc = framesetDef.document; // or el.ownerDocument
	let frag = doc.createDocumentFragment();
	let node;
	while (node = el.firstChild) frag.appendChild(node); // NOTE no adoption

	let options;
	if (el.hasAttribute('config')) {
		let configID = _.words(el.getAttribute('config'))[0];
		options = configData.get(configID);
	}
	let processor = transform.processor = processors.create(transform.type, options, framesetDef.namespaces);
	processor.loadTemplate(frag);
}

process(srcNode, details) {
	let transform = this;
	let framesetDef = transform.framesetDefinition;
	let decoder;
	if (transform.format) {
		decoder = decoders.create(transform.format, {}, framesetDef.namespaces);
		decoder.init(srcNode);
	}
	else decoder = {
		srcNode: srcNode
	}
	let processor = transform.processor;
	let output = processor.transform(decoder, details);
	return output;
}

}

export default HTransformDefinition;
