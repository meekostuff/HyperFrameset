/*!
 * ScriptProcessor
 * Copyright 2014-2016 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

(function(classnamespace) {

var global = this;

var Meeko = global.Meeko;
var _ = Meeko.stuff;
var DOM = Meeko.DOM;
var Task = Meeko.Task;
var processors = Meeko.processors;

function ScriptProcessor(options) {
	this.processor = options;
}

_.defaults(ScriptProcessor.prototype, {

loadTemplate: function(template) {
	var script;
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
	catch(err) { Task.postError(err); }
	
	if (!this.processor || !this.processor.transform) {
		console.warn('"script" transform template did not produce valid transform object');
		return;
	}
},

transform: function(provider, details) {
	var srcNode = provider.srcNode;
	if (!this.processor || !this.processor.transform) {
		console.warn('"script" transform template did not produce valid transform object');
		return;
	}
	return this.processor.transform(srcNode, details);
}
	
});


_.assign(classnamespace, {

ScriptProcessor: ScriptProcessor

});


}).call(this, this.Meeko);
