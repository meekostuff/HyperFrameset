/*!
 * HFrameset
 * Copyright 2009-2016 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

import * as _ from './stuff.mjs';
import Thenfu from './Thenfu.mjs';
import sprockets from './sprockets.mjs';
import { HBase } from './layoutElements.mjs';

class HFrameset extends HBase {

static {
	sprockets.withAria(this, { role: 'frameset', isFrameset: true });
}

frameEntered(frame) {
	this.frames.push(frame);
}

frameLeft(frame) {
	let index = this.frames.indexOf(frame);
	this.frames.splice(index, 1);
}

// TODO `this.definition` is injected by a monkey-patch in framer.mjs.
// It should be declared as a field and looked up from a registry in attached(),
// consistent with how HFrame resolves its definition.
render() {
	let frameset = this;
	let definition = frameset.definition;
	let dstBody = this.element;

	if (definition.element === dstBody) return;

	let srcBody = definition.render();

	return Thenfu.pipe(null, [

	function() {
		_.forEach(Array.from(srcBody.childNodes), function(node) {
			sprockets.insertNode('beforeend', dstBody, node);
		});
	}

	]);
}

}

export default HFrameset;
