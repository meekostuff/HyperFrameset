/*!
 * HFrameDefinition
 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */
import * as _ from './stuff.mjs';
import {HYPERFRAMESET_URN} from './CustomNamespace.mjs';
import HBodyDefinition from './HBodyDefinition.mjs';

/** Tag names to ignore when scanning HFrame children (they belong in &lt;head>). */
const hfHeadTags = _.words('title meta link style script');

class HFrameDefinition {

constructor(el, framesetDef) {
	if (!el) return; // in case of inheritance
	this.framesetDefinition = framesetDef;
	this.init(el);
}

init(el) {
	_.defaults(this, {
		element: el,
		mainSelector: el.getAttribute('main') // TODO consider using a hash in `@src`
    });
	this.bodies = [];
	_.forEach(Array.from(el.children), (node) => {
		let tag = node.localName;
		if (!tag) return;
		if (_.includes(hfHeadTags, tag)) return; // ignore typical <head> elements
		if (tag === this.framesetDefinition.namespaces.lookupTagNameNS('body', HYPERFRAMESET_URN)) {
			//el.removeChild(node);
			this.bodies.push(new HBodyDefinition(node, this.framesetDefinition));
			return;
		}
		console.warn(`Unexpected element in HFrame: ${tag}`);
		return;
	});

	// FIXME create fallback bodies
}

render(resource, condition, details) {
	if (!details) details = {};
	_.defaults(details, { // TODO more details??
		scope: this.framesetDefinition.scope,
		url: resource && resource.url,
		mainSelector: this.mainSelector,
	});
	let bodyDef = _.find(this.bodies, (body) => { return body.condition === condition;});
	if (!bodyDef) return; // FIXME what to do here??
	return bodyDef.render(resource, details);
}

}

export default HFrameDefinition;
