/*!
 * HTransformDefinition
 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */
import * as _ from './stuff.mjs';
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
		type: el.getAttribute('type') || 'hazard'
	});

	let options = el.behavior;
	let processor = this.processor = processors.create(this.type, options, this.framesetDefinition.namespaces);
	processor.loadTemplate(el);
}

process(source, details) {
	return this.processor.transform({ source }, details);
}

}

export default HTransformDefinition;
