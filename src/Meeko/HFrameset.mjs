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

render() {
	let frameset = this;
	let definition = frameset.definition;
	let dstBody = this.element;

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
