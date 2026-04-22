/*
 ### Thenfu
 Frame-aware asynchronous utilities for non-blocking operations.
 Provides static methods for creating and managing promises that respect animation frame budgets.
 */

import * as _ from './stuff.mjs';
import Task from './Task.mjs';

/**
 * Check if a value has a .then method.
 * @param {*} value
 * @returns {boolean}
 */
function isThenable(value) {
	return value !== null &&
		(typeof value === 'object' || typeof value === 'function') &&
		typeof value.then === 'function';
}

/**
 * Execute a function and return a thenable for its result.
 * @param {Function} fn - Function to execute
 * @param {...*} params - Parameters to pass to the function (can include promises)
 * @returns {Promise} A thenable that resolves with the function's result or rejects with any thrown error
 */
function tryFn(fn, ...params) {
	return Promise.all(params).then(resolvedParams => 
		asap(() => fn(...resolvedParams))
	);
}

/**
 * Poll a test function until it returns true.
 * @param {Function} fn - Test function
 * @returns {Promise}
 */
let wait = (function() {
	
let tests = [];

function wait(fn) {
	let test = { fn: fn };
	let resolver = Promise.withResolvers();
	test.resolve = resolver.resolve;
	test.reject = resolver.reject;
	asapTest(test);
	return resolver.promise;
}

function asapTest(test) {
	asap(test.fn)
	.then(function(done) {
		if (done) test.resolve();
		else deferTest(test);
	},
	function(error) {
		test.reject(error);
	});
}

function deferTest(test) {
	let started = tests.length > 0;
	tests.push(test);
	if (!started) Task.defer(poller);
}

function poller() {
	let currentTests = tests;
	tests = [];
	_.forEach(currentTests, asapTest);
}

return wait;

})();

/**
 * Return a thenable that executes immediately if frame time is available, defers otherwise.
 * @param {*} value - A function, thenable, or value
 * @returns {Promise}
 */
function asap(value) {
	let resolver = Promise.withResolvers();
	if (Task.getTime(true) > 0) {
		// Frame time available - execute immediately
		settle(resolver, value);
	}
	else {
		// No frame time - defer everything
		Task.asap(() => settle(resolver, value));
	}
	return resolver.promise;
}

/**
 * Always defer execution to the next frame.
 * @param {*} value - A function, thenable, or value
 * @returns {Promise}
 */
function defer(value) {
	let resolver = Promise.withResolvers();
	Task.defer(() => settle(resolver, value));
	return resolver.promise;
}

/**
 * Settle a promise resolver with a value, handling different value types appropriately.
 * @param {{resolve: Function, reject: Function}} resolver - Promise resolver object from withResolvers()
 * @param {*} value - Value to settle with: thenable (resolved), Error (rejected), function (executed), or other (resolved)
 */
function settle({ resolve, reject }, value) {
	if (isThenable(value)) {
		resolve(value);
	}
	else if (value instanceof Error) {
		reject(value);
	}
	else if (typeof value === 'function') {
		try { resolve(value()); }
		catch (ex) { reject(ex); }
	}
	else {
		resolve(value);
	}
}

/**
 * Return a thenable that fulfils after a minimum timeout.
 * @param {number} timeout - Minimum delay in milliseconds
 * @returns {Promise}
 */
function delay(timeout) {
	let { promise, resolve, reject } = Promise.withResolvers();
	if (timeout <= 0 || timeout == null) Task.defer(resolve);
	else Task.delay(resolve, timeout);
	return promise;
}

/**
 * Chain functions sequentially, passing each result to the next.
 * @param {*} startValue - Initial value
 * @param {Function[]} fnList - Functions to chain
 * @returns {Promise}
 */
function pipe(startValue, fnList) {
	let promise = asap(startValue);
	for (let n=fnList.length, i=0; i<n; i++) {
		let fn = fnList[i];
		promise = promise.then(fn);
	}
	return promise;
}

/**
 * Async reduce that yields to the browser when frame time runs out.
 * @param {*} accumulator - Initial accumulator value
 * @param {Array} a - Array to reduce
 * @param {Function} fn - Reducer function(acc, val, i, arr)
 * @param {*} [context] - `this` context for fn
 * @returns {Promise}
 */
function reduce(accumulator, a, fn, context) {
return new Promise(function(resolve, reject) {
	let length = a.length;
	let i = 0;

	Task.asap(() => process(accumulator));
	return;

	function process(acc) {
		while (i < length) {
			if (isThenable(acc)) {
					acc.then(process, reject);
					return;
			}
			try {
				acc = fn.call(context, acc, a[i], i, a);
				i++;
			}
			catch (error) {
				reject(error);
				return;
			}
			if (i >= length) break;

			let currTime = Task.getTime(true); // NOTE *remaining* time
			if (currTime <= 0) {
				Task.asap(function() { process(acc); });
				return;
			}
		}
		resolve(acc);
	}
});
}

export default {
	isThenable,
	try: tryFn,
	asap,
	defer, 
	delay,
	wait,
	pipe,
	reduce,
	settle
};
