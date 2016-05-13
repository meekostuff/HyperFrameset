
(function() {

var window = this;
var _ = window._ || Meeko.stuff; // WARN this could potentially use underscore.js / lodash.js but HAS NOT BEEN TESTED!!!


/*
 ### Task queuing and isolation
	TODO Only intended for use by Promise. Should this be externally available?
 */

var Task = Meeko.Task = (function() {

// NOTE Task.asap could use window.setImmediate, except for
// IE10 CPU contention bugs http://codeforhire.com/2013/09/21/setimmediate-and-messagechannel-broken-on-internet-explorer-10/

// FIXME record Task statistics

var frameRate = 60; // FIXME make this a boot-option??
var frameInterval = 1000 / frameRate;
var frameExecutionRatio = 0.75; // FIXME another boot-option??
var frameExecutionTimeout = frameInterval * frameExecutionRatio;

var performance = window.performance && window.performance.now ? window.performance :
	Date.now ? Date :
	{
		now: function() { return (new Date).getTime(); }
	};

var schedule = (function() { 
	// See http://creativejs.com/resources/requestanimationframe/
	var fn = window.requestAnimationFrame;
	if (fn) return fn;

	_.some(_.words('moz ms o webkit'), function(vendor) {
		var name = vendor + 'RequestAnimationFrame';
		if (!window[name]) return false;
		fn = window[name];
		return true;
	});
	if (fn) return fn;

	var lastTime = 0;
	var callback;
	fn = function(cb, element) {
		if (callback) throw 'schedule() only allows one callback at a time';
		callback = cb;
		var currTime = performance.now();
		var timeToCall = Math.max(0, frameInterval - (currTime - lastTime));
		var id = window.setTimeout(function() { 
			lastTime = performance.now();
			var cb = callback;
			callback = undefined;
			cb(lastTime, element); 
		}, timeToCall);
		return id;
	};
	
	return fn;
})();


var asapQueue = [];
var deferQueue = [];
var errorQueue = [];
var scheduled = false;
var processing = false;

function asap(fn) {
	asapQueue.push(fn);
	if (processing) return;
	if (scheduled) return;
	schedule(processTasks);
	scheduled = true;
}

function defer(fn) {
	if (processing) {
		deferQueue.push(fn);
		return;
	}
	asap(fn);
}

function delay(fn, timeout) {
	if (timeout <= 0 || timeout == null) {
		defer(fn);
		return;
	}

	setTimeout(function() {
		try { fn(); }
		catch (error) { postError(error); }
		processTasks();
	}, timeout);
}

var execStats = {};
var frameStats = {};

function resetStats() {
	_.forEach([execStats, frameStats], function(stats) {
		_.assign(stats, {
			count: 0,
			totalTime: 0,
			minTime: Infinity,
			maxTime: 0,
			avgTime: 0
		});
	});
}
resetStats();

function updateStats(stats, currTime) {
	stats.count++;
	stats.totalTime += currTime;
	if (currTime < stats.minTime) stats.minTime = currTime;
	if (currTime > stats.maxTime) stats.maxTime = currTime;
}

function getStats() {
	var exec = _.assign({}, execStats);
	var frame = _.assign({}, frameStats);
	exec.avgTime = exec.totalTime / exec.count;
	frame.avgTime = frame.totalTime / frame.count;
	return {
		exec: exec,
		frame: frame
	}
}

var lastStartTime = performance.now();
function getTime(bRemaining) {
	var delta = performance.now() - lastStartTime;
	if (!bRemaining) return delta;
	return frameExecutionTimeout - delta;
}

var idle = true;
function processTasks() {
	var startTime = performance.now();
	if (!idle) updateStats(frameStats, startTime - lastStartTime);
	lastStartTime = startTime;
	processing = true;
	var fn;
	var currTime;
	while (asapQueue.length) {
		fn = asapQueue.shift();
		if (typeof fn !== 'function') continue;
		try { fn(); }
		catch (error) { postError(error); }
		currTime = getTime();
		if (currTime >= frameExecutionTimeout) break;
	}
	scheduled = false;
	processing = false;
	if (currTime) updateStats(execStats, currTime);
	
	asapQueue = asapQueue.concat(deferQueue);
	deferQueue = [];
	if (asapQueue.length) {
		schedule(processTasks);
		scheduled = true;
		idle = false;
	}
	else idle = true;
	
	throwErrors();
	
}

function postError(error) {
	errorQueue.push(error);
}

var throwErrors = (function() {

var evType = vendorPrefix + '-error';
function throwErrors() {
	var handlers = createThrowers(errorQueue);
	_.forEach(handlers, function(handler) {
		window.addEventListener(evType, handler, false);
	});
	var e = document.createEvent('Event');
	e.initEvent(evType, true, true);
	window.dispatchEvent(e);
	_.forEach(handlers, function(handler) {
		window.removeEventListener(evType, handler, false);
	});
	errorQueue = [];
}

function createThrowers(list) {
	return _.map(list, function(error) {
		return function() {
			if (console.logLevel === 'debug') {
				if (error && error.stack) console.debug(error.stack);
				else console.debug('Untraceable error: ' + error); // FIXME why are these occuring??
			}
			throw error;
		};
	});
}

return throwErrors;
})();

return {
	asap: asap,
	defer: defer,
	delay: delay,
	getTime: getTime,
	getStats: getStats,
	resetStats: resetStats,
	postError: postError
};

})(); // END Task


}).call(this);
