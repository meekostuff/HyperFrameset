/*!
 * ScriptProcessor
 * Copyright 2014-2016 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

import * as _ from './stuff.mjs';
import * as DOM from './DOM.mjs';

function ScriptProcessor(options) {
	this.processor = options;
}

_.defaults(ScriptProcessor.prototype, {

loadTemplate: function(template) {
	let script;
	_.forEach(_.map(template.childNodes), function(node) {
		switch (node.nodeType) {
		case 1: // Element
			switch (DOM.getTagName(node)) {
			case 'script':
				if (script) console.warn('Ignoring secondary <script> in "script" transform template');
				else script = node;
				return;
			default:
				console.warn('Ignoring unexpected non-<script> element in "script" transform template');
				return;
			}
			break; // should never reach here
		case 3: // Text
			if (/\S+/.test(node.nodeValue)) console.warn('"script" transforms should not have non-empty text-nodes');
			return;
		case 8: // Comment
			return;
		default:
			console.warn('Unexpected node in "script" transform template');
			return;
		}
	});
	if (!script) {
		// no problem if already a processor defined in new ScriptProcessor(options)
		if (this.processor) return;
		console.warn('No <script> found in "script" transform template');
		return;
	}
	try { this.processor = (Function('return (' + script.text + ')'))(); }
	catch(err) { reportError(err); }
	
	if (!this.processor || !this.processor.transform) {
		console.warn('"script" transform template did not produce valid transform object');
		return;
	}
},

transform: function(provider, details) {
	let srcNode = provider.srcNode;
	if (!this.processor || !this.processor.transform) {
		console.warn('"script" transform template did not produce valid transform object');
		return;
	}
	return this.processor.transform(srcNode, details);
}
	
});

export default ScriptProcessor;
