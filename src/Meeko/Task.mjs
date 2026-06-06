/*!
 * Task
 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */
/*
 ### Task queuing and isolation
	TODO Only intended for use by Promise. Should this be externally available?
 */

// NOTE Task.asap could use window.setImmediate, except for
// IE10 CPU contention bugs http://codeforhire.com/2013/09/21/setimmediate-and-messagechannel-broken-on-internet-explorer-10/

import * as _ from './stuff.mjs';

const frameRate = 60; // FIXME make this a boot-option??
const frameInterval = 1000 / frameRate; // FIXME another boot-option??
const safetyMargin = 1;

let asapQueue = [];
let deferQueue = [];
let scheduled = false;
let processing = false;

let deadline = null; // IdleDeadline object from requestIdleCallback or emulated.
let channel = new MessageChannel();
channel.port1.onmessage = processTasks;

function requestProcessing() {
	if (processing) return;
	if (scheduled) return;
	scheduled = true;
	if (getTime() > safetyMargin) {
		channel.port2.postMessage(null);
		return;
	}
	let ricId, rafId;
	if (window.requestIdleCallback) ricId = window.requestIdleCallback(onIdle);
	rafId = window.requestAnimationFrame(onFrame);

	function onIdle(idleDeadline) {
		window.cancelAnimationFrame(rafId);
		deadline = idleDeadline;
		channel.port2.postMessage(null);
	}
	function onFrame(timestamp) {
		if (ricId) window.cancelIdleCallback(ricId);
		deadline = {
			didTimeout: false,
			timeRemaining() {
				return Math.max(0, frameInterval - (performance.now() - timestamp));
			}
		};
		channel.port2.postMessage(null);
	}
}

/**
 * Get estimated time available in the current frame.
 * @returns {number} Time in milliseconds
 */
function getTime() {
	return (deadline) ? deadline.timeRemaining() : 0;
}

/**
 * Schedule a task to run as soon as possible within the current frame interval.
 * @param {Function} fn - Function to execute
 */
function asap(fn) {
	asapQueue.push(fn);
	requestProcessing();
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

	setTimeout(() => asap(fn), timeout);
}

let execStats = {};
let frameStats = {};

/**
 * Reset task execution statistics.
 */
function resetStats() {
	_.forEach([execStats, frameStats], (stats) => {
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

let idle = true;
function processTasks() {
	if (processing) return;
	processing = true;
	if (!idle) updateStats(frameStats, getTime());
	let fn;
	let currTime;
	while (asapQueue.length) {
		fn = asapQueue.shift();
		if (typeof fn !== 'function') continue;
		try { fn(); }
		catch (error) { window.reportError(error); }
		currTime = getTime();
		if (currTime <= safetyMargin) break;
	}
	processing = false;
	scheduled = false;
	if (currTime) updateStats(execStats, currTime);
	
	asapQueue = asapQueue.concat(deferQueue);
	deferQueue = [];
	if (asapQueue.length) {
		idle = false;
		requestProcessing();
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
