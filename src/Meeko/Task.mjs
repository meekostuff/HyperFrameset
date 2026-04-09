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

/**
 * Schedule a task to run as soon as possible within the current frame interval.
 * Not a microtask - runs within ~16ms via requestAnimationFrame.
 * @param {Function} fn - Function to execute
 */
function asap(fn) {
	asapQueue.push(fn);
	if (processing) return;
	if (scheduled) return;
	schedule(processTasks);
	scheduled = true;
}

/**
 * Schedule a task to run after all asap tasks have completed.
 * @param {Function} fn - Function to execute
 */
function defer(fn) {
	if (processing) {
		deferQueue.push(fn);
		return;
	}
	asap(fn);
}

/**
 * Schedule a task to run after a minimum timeout, then after all asap tasks.
 * @param {Function} fn - Function to execute
 * @param {number} timeout - Minimum delay in milliseconds
 */
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

/**
 * Reset task execution statistics.
 */
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

/**
 * Get task execution statistics including timing data.
 * @returns {Object} Statistics object with exec and frame timing data
 */
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
/**
 * Get estimated time available in the current frame.
 * @param {boolean} [bRemaining] - If true, returns time remaining in frame
 * @returns {number} Time in milliseconds
 */
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
