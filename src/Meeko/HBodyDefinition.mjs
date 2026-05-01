import * as _ from './stuff.mjs';
import Thenfu from './Thenfu.mjs';
import * as DOM from './DOM.mjs';
import { HYPERFRAMESET_URN } from './CustomNamespace.mjs';
import HTransformDefinition from './HTransformDefinition.mjs';

/** Valid HBody readiness states. */
const conditions = _.words('uninitialized loading loaded error');

/** Maps alternative condition names to their canonical form. */
const conditionAliases = {
	'blank': 'uninitialized',
	'waiting': 'loading',
	'interactive': 'loaded',
	'complete': 'loaded'
}

function normalizeCondition(condition) {
	condition = _.lc(condition);
	if (_.includes(conditions, condition)) return condition;
	return conditionAliases[condition];
}

class HBodyDefinition {

static conditions = conditions;
static conditionAliases = conditionAliases;

constructor(el, framesetDef) {
	if (!el) return; // in case of inheritance
	this.framesetDefinition = framesetDef;
	this.init(el);
}

init(el) {
	let bodyDef = this;
	let framesetDef = bodyDef.framesetDefinition;
	let condition = el.getAttribute('condition');
	let finalCondition;
	if (condition) {
		finalCondition = normalizeCondition(condition);
		if (!finalCondition) {
			finalCondition = condition;
			console.warn(`Frame body defined with unknown condition: ${condition}`);
		}
	}
	else finalCondition = 'loaded';
		
	_.defaults(bodyDef, {
		element: el,
		condition: finalCondition,
		transforms: []
	});
	_.forEach(Array.from(el.childNodes), function(node) {
		if (DOM.getTagName(node) === framesetDef.namespaces.lookupTagNameNS('transform', HYPERFRAMESET_URN)) {
			el.removeChild(node);
			bodyDef.transforms.push(new HTransformDefinition(node, framesetDef));
		}	
	});
	if (!bodyDef.transforms.length && bodyDef.condition === 'loaded') {
		console.warn('HBody definition for loaded content contains no HTransform definitions');
	}
}

render(resource, details) {
	let bodyDef = this;
	let framesetDef = bodyDef.framesetDefinition;
	if (bodyDef.transforms.length <= 0) {
		return bodyDef.element.cloneNode(true);
	}
	if (!resource) return null;
	let doc = resource.document; // FIXME what if resource is a Request?
	if (!doc) return null;
	let frag0 = doc;
	if (details.mainSelector) frag0 = DOM.find(details.mainSelector, doc);

	return Thenfu.reduce(frag0, bodyDef.transforms, function(fragment, transform) {
		return transform.process(fragment, details);
	})
	.then(function(fragment) {
		let el = bodyDef.element.cloneNode(false);
		// crop to <body> if it exists
		let htmlBody = DOM.find('body', fragment);
		if (htmlBody) fragment = DOM.adoptContents(htmlBody, el.ownerDocument);
		// remove all stylesheets
		_.forEach(DOM.findAll('link[rel~=stylesheet], style', fragment), function(node) {
			node.parentNode.removeChild(node);
		});
		DOM.insertNode('beforeend', el, fragment);
		return el;
	});
}

}

export default HBodyDefinition;
