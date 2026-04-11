import * as _ from './stuff.mjs';
import Thenfu from './Thenfu.mjs';

/**
 * Wrapper around the browser History API providing locking around state updates
 * and throttling of popstate events via an internal scheduler.
 * 
 * Must be started with start() before use. Cannot be restarted.
 * All state-changing methods are serialized through the scheduler to prevent
 * concurrent history modifications.
 */
let historyManager = (function() {

let historyManager = {};

const STATE_TAG = 'HyperFrameset';
let currentState;
let popStateHandler;
let started = false;

_.defaults(historyManager, {

/**
 * Get the current history state.
 * @returns {State|undefined}
 */
getState: function() {
	return currentState;
},

/**
 * Initialize the history manager. Can only be called once.
 * Replaces the current history entry and registers a popstate listener.
 * @param {*} data - Application data to store in state
 * @param {string} title - Page title
 * @param {string} url - URL for the history entry
 * @param {Function} onNewState - Called with the new State on initialization
 * @param {Function} onPopState - Called with the restored State on popstate events
 * @returns {Thenfu}
 */
start: function(data, title, url, onNewState, onPopState) { // FIXME this should call onPopState if history.state is defined
return scheduler.now(function() {
	if (started) throw Error('historyManager has already started');
	started = true;
	popStateHandler = onPopState;
	let newState = State.create(data, title, url);
	if (history.replaceState) {
		history.replaceState(newState.settings, title, url);
	}
	currentState = newState;
	return onNewState(newState);
});
},

/**
 * Create a new history entry or replace the current one.
 * @param {*} data - Application data to store in state
 * @param {string} title - Page title
 * @param {string} url - URL for the history entry
 * @param {boolean} useReplace - If true, replaces current entry instead of pushing
 * @param {Function} [callback] - Called with the new State
 * @returns {Thenfu}
 */
newState: function(data, title, url, useReplace, callback) {
return scheduler.now(function() {
	let newState = State.create(data, title, url);
	if (history.replaceState) {
		if (useReplace) history.replaceState(newState.settings, title, url);
		else history.pushState(newState.settings, title, url);
	}
	currentState = newState;
	if (callback) return callback(newState);
});
},

/**
 * Replace the current history entry.
 * @param {*} data
 * @param {string} title
 * @param {string} url
 * @param {Function} [callback]
 * @returns {Thenfu}
 */
replaceState: function(data, title, url, callback) {
	return this.newState(data, title, url, true, callback);
},

/**
 * Push a new history entry.
 * @param {*} data
 * @param {string} title
 * @param {string} url
 * @param {Function} [callback]
 * @returns {Thenfu}
 */
pushState: function(data, title, url, callback) {
	return this.newState(data, title, url, false, callback);
}

});

if (history.replaceState) window.addEventListener('popstate', function(e) {
		if (e.stopImmediatePropagation) e.stopImmediatePropagation();
		else e.stopPropagation();
		
		let newSettings = e.state;
		if (!newSettings[STATE_TAG]) {
			console.warn('Ignoring invalid PopStateEvent');
			return;
		}
		scheduler.reset(function() {
			currentState = new State(newSettings);
			if (!popStateHandler) return;
			return popStateHandler(currentState);
		});
	}, true);

function State(settings) {
	if (!settings[STATE_TAG]) throw Error('Invalid settings for new State');
	this.settings = settings;
}

State.create = function(data, title, url) {
	let timeStamp = +(new Date);
	let settings = {
		title: title,
		url: url,
		timeStamp: timeStamp,
		data: data
	};
	settings[STATE_TAG] = true;
	return new State(settings);
}

_.defaults(State.prototype, {

getData: function() {
	return this.settings.data;
},

update: function(data, callback) { // FIXME not being used. Can it be reomved?
	let state = this;
	return Thenfu.resolve(function() {
		if (state !== currentState) throw Error('Cannot update state: not current');
		return scheduler.now(function() {
			if (history.replaceState) history.replaceState(state.settings, title, url);
			return callback(state);
		});
	});
}

});

return historyManager;

})();


let scheduler = (function() { // NOTE only used in historyManager

let queue = [];
let maxSize = 1;
let processing = false;

function bump() {
	if (processing) return;
	processing = true;
	process();
}

function process() {
	if (queue.length <= 0) {
		processing = false;
		return;
	}
	let task = queue.shift();
	let promise = Thenfu.defer(task.fn);
	promise.then(process, process);
	promise.then(task.resolve, task.reject);
}

let scheduler = {
	
now: function(fn, fail) {
	return this.whenever(fn, fail, 0);
},

reset: function(fn) {
	queue.length = 0;
	return this.whenever(fn, null, 1);
},

whenever: function(fn, fail, max) {
return new Thenfu(function(resolve, reject) {

	if (max == null) max = maxSize;
	if (queue.length > max || (queue.length === max && processing)) {
		if (fail) Thenfu.defer(fail).then(resolve, reject);
		else reject(function() { throw Error('No `fail` callback passed to whenever()'); });
		return;
	}
	queue.push({ fn: fn, resolve: resolve, reject: reject });

	bump();
});
}

}

return scheduler;

})();

export default historyManager;