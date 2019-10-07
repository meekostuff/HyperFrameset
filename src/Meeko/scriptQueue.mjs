/*!
 * scriptQueue
 * Copyright 2009-2016 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

import * as _ from './stuff.mjs';
import Promise from './Promise.mjs';
import * as DOM from './DOM.mjs';

let document = window.document;

/*
 WARN: This description comment was from the former scriptQueue implementation.
 It is still a correct description of behavior,
 but doesn't give a great insight into the current Promises-based implementation.
 
 We want <script>s to execute in document order (unless @async present)
 but also want <script src>s to download in parallel.
 The script queue inserts scripts until it is paused on a blocking script.
 The onload (or equivalent) or onerror handlers of the blocking script restart the queue.
 Inline <script> and <script src="..." async> are never blocking.
 Sync <script src> are blocking, but if `script.async=false` is supported by the browser
 then only the last <script src> (in a series of sync scripts) needs to pause the queue. See
	http://wiki.whatwg.org/wiki/Dynamic_Script_Execution_Order#My_Solution
 Script preloading is always initiated, even if the browser doesn't support it. See
	http://wiki.whatwg.org/wiki/Dynamic_Script_Execution_Order#readyState_.22preloading.22
	
 FIXME scriptQueue.push should also accept functions
*/
let queue = [],
	emptying = false;

let testScript = document.createElement('script'),
	supportsSync = (testScript.async === true);

let scriptQueue = {

push: function(node) {
return new Promise(function(resolve, reject) {
	if (emptying) throw Error('Attempt to append script to scriptQueue while emptying');
	
	// TODO assert node is in document

	// TODO this filtering may need reworking now we don't support older browsers
	if (!node.type || /^text\/javascript$/i.test(node.type)) {
		console.info('Attempt to queue already executed script ' + node.src);
		resolve(); // TODO should this be reject() ??
		return;
	}

	if (!/^text\/javascript\?disabled$/i.test(node.type)) {
		console.info('Unsupported script-type ' + node.type);
		resolve(); // TODO should this be reject() ??
		return;
	}

	let script = document.createElement('script');

	if (node.src) addListeners(); // WARN must use `node.src` because attrs not copied to `script` yet
	
	DOM.copyAttributes(script, node); 
	script.text = node.text;

	if (script.getAttribute('defer')) { // @defer is not appropriate. Implement as @async
		script.removeAttribute('defer');
		script.setAttribute('async', '');
		console.warn('@defer not supported on scripts');
	}
	if (supportsSync && script.src && !script.hasAttribute('async')) script.async = false;
	script.type = 'text/javascript';
	
	// enabledFu resolves after script is inserted
	let enabledFu = Promise.applyTo();
	
	let prev = queue[queue.length - 1], prevScript = prev && prev.script;

	let triggerFu; // triggerFu allows this script to be enabled, i.e. inserted
	if (prev) {
		if (prevScript.hasAttribute('async') || script.src && supportsSync && !script.hasAttribute('async')) triggerFu = prev.enabled;
		else triggerFu = prev.complete; 
	}
	else triggerFu = Promise.resolve();
	
	triggerFu.then(enable, enable);

	let completeFu = Promise.applyTo();
	completeFu.then(resolve, reject);

	let current = { script: script, complete: completeFu, enabled: enabledFu };
	queue.push(current);
	return;

	// The following are hoisted
	function enable() {
		DOM.insertNode('replace', node, script);
		enabledFu.resolve(); 
		if (!script.src) {
			spliceItem(queue, current);
			completeFu.resolve();
		}
	}
	
	function onLoad(e) {
		removeListeners();
		spliceItem(queue, current);
		completeFu.resolve();
	}

	function onError(e) {
		removeListeners();
		spliceItem(queue, current);
		completeFu.reject(function() { throw Error('Script loading failed'); }); // FIXME throw NetworkError()
	}

	function addListeners() {
		script.addEventListener('load', onLoad, false);
		script.addEventListener('error', onError, false);
	}
	
	function removeListeners() {
		script.removeEventListener('load', onLoad, false);
		script.removeEventListener('error', onError, false);
	}
	
	function spliceItem(a, item) {
		for (let n=a.length, i=0; i<n; i++) {
			if (a[i] !== item) continue;
			a.splice(i, 1);
			return;
		}
	}

});
},

empty: function() {
return new Promise(function(resolve, reject) {
	
	emptying = true;
	if (queue.length <= 0) {
		emptying = false;
		resolve();
		return;
	}
	_.forEach(queue, function(value, i) {
		let acceptCallback = function() {
			if (queue.length <= 0) {
				emptying = false;
				resolve();
			}
		}
		value.complete.then(acceptCallback, acceptCallback);
	});

});
}

} // end scriptQueue

export default scriptQueue;

