/*!
 * HTransformDefinition
 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */
import * as _ from './stuff.mjs';
import decoders from './decoders.mjs';
import processors from './processors.mjs';

class HTransformDefinition {

constructor(el, framesetDef) {
	if (!el) return; // in case of inheritance
	this.framesetDefinition = framesetDef;
	this.init(el);
}

init(el) {
	_.defaults(this, {
		element: el,
		type: el.getAttribute('type') || 'main',
		format: el.getAttribute('format')
    });
	if (this.type === 'main') this.format = '';
	let doc = this.framesetDefinition.document; // or el.ownerDocument
	// let frag = doc.createDocumentFragment();
	// frag.append(...el.childNodes); // NOTE no adoption

	let options = el.behavior;
	let processor = this.processor = processors.create(this.type, options, this.framesetDefinition.namespaces);
	processor.loadTemplate(el);
}

process(srcNode, details) {
	let decoder;
	if (this.format) {
		decoder = decoders.create(this.format, {}, this.framesetDefinition.namespaces);
		decoder.init(srcNode);
	}
	else decoder = {
		srcNode: srcNode
	}
	return this.processor.transform(decoder, details);
}

}

export default HTransformDefinition;
