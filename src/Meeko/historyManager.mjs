import * as _ from './stuff.mjs';
import Promise from './Promise.mjs';

// wrapper for `history` mostly to provide locking around state-updates and throttling of popstate events
let historyManager = (function() {

let historyManager = {};

const STATE_TAG = 'HyperFrameset';
let currentState;
let popStateHandler;
let started = false;

_.defaults(historyManager, {

getState: function() {
	return currentState;
},

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

replaceState: function(data, title, url, callback) {
	return this.newState(data, title, url, true, callback);
},

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
	return Promise.resolve(function() {
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
	let promise = Promise.defer(task.fn);
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
return new Promise(function(resolve, reject) {

	if (max == null) max = maxSize;
	if (queue.length > max || (queue.length === max && processing)) {
		if (fail) Promise.defer(fail).then(resolve, reject);
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