/*
 ### Thenfu
 This is an enhanced Promise implementation but it defers to allow animation.
 WARN: This was based on early DOM Futures specification. This has been evolved towards ES6 Promises.
 */

import * as _ from './stuff.mjs';
import Task from './Task.mjs';

let Thenfu = function(init) { // `init` is called as init(resolve, reject)
	if (!(this instanceof Thenfu)) return new Thenfu(init);
	
	let promise = this;
	promise._initialize();

	try { init(resolve, reject); }
	catch(error) { reject(error); }

	// NOTE promise is returned by `new` invocation but anyway
	return promise;

	// The following are hoisted
	function resolve(result) {
		if (typeof result !== 'function') {
			promise._resolve(result);
			return;
		}
		try { promise._resolve(result()); }
		catch (err) { promise._reject(err); }
	}
	function reject(error) {
		if (typeof error !== 'function') {
			promise._reject(error);
			return;
		}
		try { promise._reject(error()); }
		catch (err) { promise._reject(err); }
	}
}

_.defaults(Thenfu, {

/**
 * Create a new Thenfu from an executor function.
 * @param {Function} init - Called as init(resolve, reject)
 * @returns {Thenfu}
 */
create: function(init) {
	return new Thenfu(init);
},

/**
 * Attach resolve/reject methods to an object and return a thenable.
 * @param {Object} [object] - Object to attach resolve/reject to
 * @returns {Thenfu} A pending thenable
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
 * @returns {{promise: Thenfu, resolve: Function, reject: Function}}
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
 * @returns {Thenfu} A thenable that resolves with the function's result or rejects with any thrown error
 */
try: function(fn) {
	let { promise, resolve, reject } = Thenfu.withResolvers();
	Task.asap(() => {
		try { resolve(fn()); }
		catch (ex) { reject(ex); }
	});
	return promise;
}

});

_.defaults(Thenfu.prototype, {

_initialize: function() {
	let promise = this;
	_.defaults(promise, {
		/* 
			use lazy creation for callback lists - 
			with synchronous inspection they may never be called
		// _fulfilCallbacks: [],
		// _rejectCallbacks: [],
		*/
		isPending: true,
		isFulfilled: false,
		isRejected: false,
		value: undefined,
		reason: undefined,
		_willCatch: false,
		_processing: false
	});
},

/*
See https://github.com/promises-aplus/synchronous-inspection-spec/issues/6 and
https://github.com/petkaantonov/bluebird/blob/master/API.md#synchronous-inspection
*/
inspectState: function() { 
	return this;
},

_fulfil: function(result, sync) { // NOTE equivalent to 'fulfil algorithm'. External calls MUST NOT use sync
	let promise = this;
	if (!promise.isPending) return;
	promise.isPending = false;
	promise.isRejected = false;
	promise.isFulfilled = true;
	promise.value = result;
	promise._requestProcessing(sync);
},

_resolve: function(value, sync) { // NOTE equivalent to 'resolve algorithm'. External calls MUST NOT use sync
	let promise = this;
	if (!promise.isPending) return;
	if (value instanceof Thenfu && !value.isPending) {
		if (value.isFulfilled) promise._fulfil(value.value, sync);
		else /* if (value.isRejected) */ promise._reject(value.reason, sync);
		return;
	}
	/* else */ if (Thenfu.isThenable(value)) {
		try {
			value.then(
				function(result) { promise._resolve(result, true); },
				function(error) { promise._reject(error, true); }
			);
		}
		catch(error) {
			promise._reject(error, sync);
		}
		return;
	}
	/* else */ promise._fulfil(value, sync);
},

_reject: function(error, sync) { // NOTE equivalent to 'reject algorithm'. External calls MUST NOT use sync
	let promise = this;
	if (!promise.isPending) return;
	promise.isPending = false;
	promise.isFulfilled = false;
	promise.isRejected = true;
	promise.reason = error;
	if (!promise._willCatch) {
		reportUnhandledRejection(error, promise);
	}
	else promise._requestProcessing(sync);
},

_requestProcessing: function(sync) { // NOTE schedule callback processing. TODO may want to disable sync option
	let promise = this;
	if (promise.isPending) return;
	if (!promise._willCatch) return;
	if (promise._processing) return;
	if (sync) {
		promise._processing = true;
		promise._process();
		promise._processing = false;
	}
	else {
		Task.asap(function() {
			promise._processing = true;
			promise._process();
			promise._processing = false;
		});
	}
},

_process: function() { // NOTE process a promises callbacks
	let promise = this;
	let result;
	let callbacks, cb;
	if (promise.isFulfilled) {
		result = promise.value;
		callbacks = promise._fulfilCallbacks;
	}
	else {
		result = promise.reason;
		callbacks = promise._rejectCallbacks;
	}

	// NOTE callbacks may not exist
	delete promise._fulfilCallbacks;
	delete promise._rejectCallbacks;
	if (callbacks) while (callbacks.length) {
		cb = callbacks.shift();
		if (typeof cb === 'function') cb(result);
	}
},

then: function(fulfilCallback, rejectCallback) {
	let promise = this;
	return new Thenfu(function(resolve, reject) {
		let fulfilWrapper = fulfilCallback ?
			wrapResolve(fulfilCallback, resolve, reject) :
			function(value) { resolve(value); }
	
		let rejectWrapper = rejectCallback ?
			wrapResolve(rejectCallback, resolve, reject) :
			function(error) { reject(error); }
	
		if (!promise._fulfilCallbacks) promise._fulfilCallbacks = [];
		if (!promise._rejectCallbacks) promise._rejectCallbacks = [];
		
		promise._fulfilCallbacks.push(fulfilWrapper);
		promise._rejectCallbacks.push(rejectWrapper);
	
		promise._willCatch = true;
	
		promise._requestProcessing();
		
	});
},

'catch': function(rejectCallback) { // WARN 'catch' is unexpected identifier in IE8-
	let promise = this;
	return promise.then(undefined, rejectCallback);
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


_.defaults(Thenfu, {

/**
 * Wrap a value in a fulfilled thenable.
 * @param {*} value
 * @returns {Thenfu}
 */
resolve: function(value) {
	if (value instanceof Thenfu) return value;
	let promise = Object.create(Thenfu.prototype);
	promise._initialize();
	promise._resolve(value);
	return promise;
}

});


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
 * @returns {Thenfu}
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
 * @returns {Thenfu}
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
 * @returns {Thenfu}
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
 * @returns {Thenfu}
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
 * @returns {Thenfu}
 */
function pipe(startValue, fnList) {
	let promise = Thenfu.resolve(startValue);
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
 * @returns {Thenfu}
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




