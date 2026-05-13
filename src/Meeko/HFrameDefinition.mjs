import * as _ from './stuff.mjs';
import * as DOM from './DOM.mjs';
import { HYPERFRAMESET_URN } from './CustomNamespace.mjs';
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
    let frameDef = this;
	let framesetDef = frameDef.framesetDefinition;
	_.defaults(frameDef, {
		element: el,
		mainSelector: el.getAttribute('main') // TODO consider using a hash in `@src`
    });
	frameDef.bodies = [];
	_.forEach(Array.from(el.childNodes), (node) => {
		let tag = DOM.getTagName(node);
		if (!tag) return;
		if (_.includes(hfHeadTags, tag)) return; // ignore typical <head> elements
		if (tag === framesetDef.namespaces.lookupTagNameNS('body', HYPERFRAMESET_URN)) {
			el.removeChild(node);
			frameDef.bodies.push(new HBodyDefinition(node, framesetDef));
			return;
		}
		console.warn(`Unexpected element in HFrame: ${tag}`);
		return;
	});

	// FIXME create fallback bodies
}

render(resource, condition, details) {
	let frameDef = this;
	let framesetDef = frameDef.framesetDefinition;
	if (!details) details = {};
	_.defaults(details, { // TODO more details??
		scope: framesetDef.scope,
		url: resource && resource.url,
		mainSelector: frameDef.mainSelector,
	});
	let bodyDef = _.find(frameDef.bodies, (body) => { return body.condition === condition;});
	if (!bodyDef) return; // FIXME what to do here??
	return bodyDef.render(resource, details);
}

}

export default HFrameDefinition;
