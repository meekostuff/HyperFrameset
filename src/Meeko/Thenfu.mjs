/*
 ### Thenfu
 Frame-aware asynchronous utilities for non-blocking operations.
 Provides static methods for creating and managing promises that respect animation frame budgets.
 */

import * as _ from './stuff.mjs';
import Task from './Task.mjs';

let Thenfu = {}
_.defaults(Thenfu, {

/**
 * Create a new Promise from an executor function.
 * @param {Function} init - Called as init(resolve, reject)
 * @returns {Promise}
 */
create: function(init) {
	return new Promise(init);
},

/**
 * Attach resolve/reject methods to an object and return a thenable.
 * @param {Object} [object] - Object to attach resolve/reject to
 * @returns {Promise} A pending thenable
 */
applyTo: function(object) {
	let resolver = {}
	let promise = Thenfu.create(function(resolve, reject) {
		resolver.resolve = resolve;
		resolver.reject = reject;
	});
	if (!object) object = promise;
	_.assign(object, resolver);
	return promise;
},

/**
 * Create a thenable with exposed resolve and reject functions.
 * @returns {{promise: Promise, resolve: Function, reject: Function}}
 */
withResolvers: function() {
	let resolve, reject;
	let promise = Thenfu.create((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
},

/**
 * Check if a value has a .then method.
 * @param {*} value
 * @returns {boolean}
 */
isThenable: function(value) {
	return value !== null &&
		(typeof value === 'object' || typeof value === 'function') &&
		typeof value.then === 'function';
},

/**
 * Execute a function and return a thenable for its result.
 * @param {Function} fn - Function to execute
 * @param {...*} params - Parameters to pass to the function (can include promises)
 * @returns {Promise} A thenable that resolves with the function's result or rejects with any thrown error
 */
try: function(fn, ...params) {
	return Promise.all(params).then(resolvedParams => 
		Thenfu.asap(() => fn(...resolvedParams))
	);
}

});

/* Functional composition wrapper for `then` */
function wrapResolve(callback, resolve, reject) {
	return function() {
		try {
			let value = callback.apply(undefined, arguments);
			resolve(value);
		} catch (error) {
			reject(error);
		}
	}
}

/*
 ### Async functions
   wait(test) waits until test() returns true
   asap(fn) returns a promise which is fulfilled / rejected by fn which is run asap after the current micro-task
   delay(timeout) returns a promise which fulfils after timeout ms
   pipe(startValue, [fn1, fn2, ...]) will call functions sequentially
 */
/**
 * Poll a test function until it returns true.
 * @param {Function} fn - Test function
 * @returns {Promise}
 */
let wait = (function() {
	
let tests = [];

function wait(fn) {
	let test = { fn: fn };
	let promise = Thenfu.applyTo(test);
	asapTest(test);
	return promise;
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
	let resolver = Thenfu.withResolvers();
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
	let resolver = Thenfu.withResolvers();
	Task.defer(() => settle(resolver, value));
	return resolver.promise;
}

/**
 * Settle a promise resolver with a value, handling different value types appropriately.
 * @param {{resolve: Function, reject: Function}} resolver - Promise resolver object from withResolvers()
 * @param {*} value - Value to settle with: thenable (resolved), Error (rejected), function (executed), or other (resolved)
 */
function settle({ resolve, reject }, value) {
	if (Thenfu.isThenable(value)) {
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
	let { promise, resolve, reject } = Thenfu.withResolvers();
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
	let promise = Thenfu.asap(startValue);
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
return Thenfu.create(function(resolve, reject) {
	let length = a.length;
	let i = 0;

	Task.asap(() => process(accumulator));
	return;

	function process(acc) {
		while (i < length) {
			if (Thenfu.isThenable(acc)) {
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

function reportUnhandledRejection(error, thenable) {
	let event = new Event("unhandledrejection", { cancelable: true });
	event.reason = error;
	event.promise = thenable;
	let performDefault = window.dispatchEvent(event);
	if (performDefault) window.reportError(error);
}

_.defaults(Thenfu, {
	asap: asap, defer: defer, delay: delay, wait: wait, pipe: pipe, reduce: reduce, settle: settle
});

export default Thenfu;




