/*!
 * ScriptProcessor
 * Copyright 2014-2016 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

import * as _ from './stuff.mjs';

/**
 * @implements {Processor}
 */
class ScriptProcessor {

constructor(options) {
	this.processor = options;
}

loadTemplate(template) {
	// Try behavior first — set by <script for> during preprocessing
	if (template.behavior && template.behavior.transform) {
		this.processor = template.behavior;
		return;
	}

	// Fallback: find a <script> child and eval it
	let script;
	_.forEach(Array.from(template.childNodes), (node) => {
		switch (node.nodeType) {
		case 1: // Element
			switch (node.localName) {
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
		if (this.processor) return; // already set via constructor options
		console.warn('No <script> or behavior found in "script" transform template');
		return;
	}
	try { this.processor = (Function(`return (${script.text}\n)`))(); }
	catch(err) { console.warn(`Error evaluating script transform: ${err.message}`); }
	
	if (!this.processor || !this.processor.transform) {
		console.warn('"script" transform template did not produce valid transform object');
		return;
	}
}

transform(provider, details) {
	let srcNode = provider.source;
	if (!this.processor || !this.processor.transform) {
		console.warn('"script" transform template did not produce valid transform object');
		return;
	}
	return this.processor.transform(srcNode, details);
}
	
}

export default ScriptProcessor;
