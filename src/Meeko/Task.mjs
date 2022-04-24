/*
 ### Task queuing and isolation
	TODO Only intended for use by Promise. Should this be externally available?
 */

// NOTE Task.asap could use window.setImmediate, except for
// IE10 CPU contention bugs http://codeforhire.com/2013/09/21/setimmediate-and-messagechannel-broken-on-internet-explorer-10/

import * as _ from './stuff.mjs';

// FIXME record Task statistics

const frameRate = 60; // FIXME make this a boot-option??
const frameInterval = 1000 / frameRate;
const frameExecutionRatio = 0.75; // FIXME another boot-option??
const frameExecutionTimeout = frameInterval * frameExecutionRatio;

let performance = window.performance && window.performance.now ? window.performance :
	Date.now ? Date :
	{
		now: function() { return (new Date).getTime(); }
	};

let schedule = window.requestAnimationFrame;

let asapQueue = [];
let deferQueue = [];
let scheduled = false;
let processing = false;

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
		catch (error) { reportError(error); }
		processTasks();
	}, timeout);
}

let execStats = {};
let frameStats = {};

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
	let exec = _.assign({}, execStats);
	let frame = _.assign({}, frameStats);
	exec.avgTime = exec.totalTime / exec.count;
	frame.avgTime = frame.totalTime / frame.count;
	return {
		exec: exec,
		frame: frame
	}
}

let lastStartTime = performance.now();
function getTime(bRemaining) {
	let delta = performance.now() - lastStartTime;
	if (!bRemaining) return delta;
	return frameExecutionTimeout - delta;
}

let idle = true;
function processTasks() {
	let startTime = performance.now();
	if (!idle) updateStats(frameStats, startTime - lastStartTime);
	lastStartTime = startTime;
	processing = true;
	let fn;
	let currTime;
	while (asapQueue.length) {
		fn = asapQueue.shift();
		if (typeof fn !== 'function') continue;
		try { fn(); }
		catch (error) { reportError(error); }
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
}

export default {
	asap,
	defer,
	delay,
	getTime,
	getStats,
	resetStats
};
