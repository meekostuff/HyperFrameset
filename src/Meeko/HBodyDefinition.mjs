/*!
 * HBodyDefinition
 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */
import * as _ from './stuff.mjs';
import Thenfu from './Thenfu.mjs';
import * as DOM from './DOM.mjs';
import {HYPERFRAMESET_URN} from './CustomNamespace.mjs';
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
		
	_.defaults(this, {
		element: el,
		condition: finalCondition,
		transforms: []
	});
	_.forEach(Array.from(el.children), (node) => {
		if (node.localName === this.framesetDefinition.namespaces.lookupTagNameNS('transform', HYPERFRAMESET_URN)) {
			//el.removeChild(node);
			this.transforms.push(new HTransformDefinition(node, this.framesetDefinition));
		}	
	});
	if (!this.transforms.length && this.condition === 'loaded') {
		console.warn('HBody definition for loaded content contains no HTransform definitions');
	}
}

render(resource, details) {
	if (this.transforms.length <= 0) {
		return this.element.cloneNode(true);
	}
	if (!resource) return null;
	let doc = resource.document; // FIXME what if resource is a Request?
	if (!doc) return null;
	let frag0 = doc;
	if (details.mainSelector) {
		frag0 = DOM.find(details.mainSelector, doc);
		if (frag0 == null) console.warn(`[HyperFrameset] Main selector "${details.mainSelector}" matched nothing in document. Content will be empty.`);
	}

	return Thenfu.reduce(frag0, this.transforms, (fragment, transform) => {
		return transform.process(fragment, details);
	})
	.then((fragment) => {
		let el = this.element.cloneNode(false);
		// crop to <body> if it exists
		let htmlBody = DOM.find('body', fragment);
		if (htmlBody) fragment = DOM.adoptContents(htmlBody, el.ownerDocument);
		// remove all stylesheets
		_.forEach(DOM.findAll('link[rel~=stylesheet], style', fragment), (node) => {
			node.parentNode.removeChild(node);
		});
		DOM.insertNode('beforeend', el, fragment);
		return el;
	});
}

}

export default HBodyDefinition;
