/*
 ### Promise
 WARN: This was based on early DOM Futures specification. This has been evolved towards ES6 Promises.
 */

(function() {

var window = this;
var _ = window._ || Meeko.stuff; // WARN this could potentially use underscore.js / lodash.js but HAS NOT BEEN TESTED!!!
var Task = Meeko.Task;

var Promise = Meeko.Promise = (function() {

var Promise = function(init) { // `init` is called as init(resolve, reject)
	if (!(this instanceof Promise)) return new Promise(init);
	
	var promise = this;
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

_.defaults(Promise, {

applyTo: function(object) {
	var resolver = {}
	var promise = new Promise(function(resolve, reject) {
		resolver.resolve = resolve;
		resolver.reject = reject;
	});
	if (!object) object = promise;
	_.assign(object, resolver);
	return promise;
},

isPromise: function(value) {
	return value instanceof Promise;
},

isThenable: function(value) {
	return value != null && typeof value.then === 'function';
}

});

_.defaults(Promise.prototype, {

_initialize: function() {
	var promise = this;
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
	var promise = this;
	if (!promise.isPending) return;
	promise.isPending = false;
	promise.isRejected = false;
	promise.isFulfilled = true;
	promise.value = result;
	promise._requestProcessing(sync);
},

_resolve: function(value, sync) { // NOTE equivalent to 'resolve algorithm'. External calls MUST NOT use sync
	var promise = this;
	if (!promise.isPending) return;
	if (Promise.isPromise(value) && !value.isPending) {
		if (value.isFulfilled) promise._fulfil(value.value, sync);
		else /* if (value.isRejected) */ promise._reject(value.reason, sync);
		return;
	}
	/* else */ if (Promise.isThenable(value)) {
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
	var promise = this;
	if (!promise.isPending) return;
	promise.isPending = false;
	promise.isFulfilled = false;
	promise.isRejected = true;
	promise.reason = error;
	if (!promise._willCatch) {
		Task.postError(error);
	}
	else promise._requestProcessing(sync);
},

_requestProcessing: function(sync) { // NOTE schedule callback processing. TODO may want to disable sync option
	var promise = this;
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
	var promise = this;
	var result;
	var callbacks, cb;
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
	var promise = this;
	return new Promise(function(resolve, reject) {
		var fulfilWrapper = fulfilCallback ?
			wrapResolve(fulfilCallback, resolve, reject) :
			function(value) { resolve(value); }
	
		var rejectWrapper = rejectCallback ? 
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
	var promise = this;
	return promise.then(undefined, rejectCallback);
}

});


/* Functional composition wrapper for `then` */
function wrapResolve(callback, resolve, reject) {
	return function() {
		try {
			var value = callback.apply(undefined, arguments); 
			resolve(value);
		} catch (error) {
			reject(error);
		}
	}
}


_.defaults(Promise, {

resolve: function(value) {
	if (Promise.isPromise(value)) return value;
	var promise = Object.create(Promise.prototype);
	promise._initialize();
	promise._resolve(value);
	return promise;
},

reject: function(error) { // FIXME should never be used
return new Promise(function(resolve, reject) {
	reject(error);
});
}

});


/*
 ### Async functions
   wait(test) waits until test() returns true
   asap(fn) returns a promise which is fulfilled / rejected by fn which is run asap after the current micro-task
   delay(timeout) returns a promise which fulfils after timeout ms
   pipe(startValue, [fn1, fn2, ...]) will call functions sequentially
 */
var wait = (function() { // TODO wait() isn't used much. Can it be simpler?
	
var tests = [];

function wait(fn) {
	var test = { fn: fn };
	var promise = Promise.applyTo(test);
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
	var started = tests.length > 0;
	tests.push(test);
	if (!started) Task.defer(poller);
}

function poller() {
	var currentTests = tests;
	tests = [];
	_.forEach(currentTests, asapTest);
}

return wait;

})();

var asap = function(value) { // FIXME asap(fn) should execute immediately
	if (Promise.isPromise(value)) {
		if (value.isPending) return value; // already deferred
		if (Task.getTime(true) <= 0) return value.then(); // will defer
		return value; // not-deferred
	}
	if (Promise.isThenable(value)) return Promise.resolve(value); // will defer
	if (typeof value === 'function') {
		if (Task.getTime(true) <= 0) return Promise.resolve().then(value);
		return new Promise(function(resolve) { resolve(value); }); // WARN relies on Meeko.Promise behavior
	}
	// NOTE otherwise we have a non-thenable, non-function something
	if (Task.getTime(true) <= 0) return Promise.resolve(value).then(); // will defer
	return Promise.resolve(value); // not-deferred
}

var defer = function(value) {
	if (Promise.isPromise(value)) {
		if (value.isPending) return value; // already deferred
		return value.then();
	}
	if (Promise.isThenable(value)) return Promise.resolve(value);
	if (typeof value === 'function') return Promise.resolve().then(value);
	return Promise.resolve(value).then();
}

function delay(timeout) { // FIXME delay(timeout, value_or_fn_or_promise)
	return new Promise(function(resolve, reject) {
		if (timeout <= 0 || timeout == null) Task.defer(resolve);
		else Task.delay(resolve, timeout);
	});
}

function pipe(startValue, fnList) { // TODO make more efficient with sync introspection
	var promise = Promise.resolve(startValue);
	for (var n=fnList.length, i=0; i<n; i++) {
		var fn = fnList[i];
		promise = promise.then(fn);
	}
	return promise;
}

function reduce(accumulator, a, fn, context) {
return new Promise(function(resolve, reject) {
	var length = a.length;
	var i = 0;

	var predictor = new TimeoutPredictor(256, 2);
	process(accumulator);
	return;

	function process(acc) {
		var prevTime;
		var j = 0;
		var timeoutCount = 1;

		while (i < length) {
			if (Promise.isThenable(acc)) {
				if (!Promise.isPromise(acc) || !acc.isFulfilled) { 
					acc.then(process, reject);
					if (j <= 0 || !prevTime || i >= length) return;
					var currTime = Task.getTime(true);
					predictor.update(j, prevTime - currTime);
					return;
				}
				/* else */ acc = acc.value;
			}
			try {
				acc = fn.call(context, acc, a[i], i, a);
				i++; j++;
			}
			catch (error) {
				reject(error);
				return;
			}
			if (i >= length) break;
			if (j < timeoutCount) continue;

			// update timeout counter data
			var currTime = Task.getTime(true); // NOTE *remaining* time
			if (prevTime) predictor.update(j, prevTime - currTime); // NOTE based on *remaining* time
			if (currTime <= 0) {
				// Could use Promise.resolve(acc).then(process, reject)
				// ... but this is considerably quicker
				// FIXME ... although with TimeoutPredictor maybe it doesn't matter
				Task.asap(function() { process(acc); });
				return;
			}
			j = 0;
			timeoutCount = predictor.getTimeoutCount(currTime);
			prevTime = currTime;
		}
		resolve(acc);
	}
});
}

function TimeoutPredictor(max, mult) { // FIXME test args are valid
	if (!(this instanceof TimeoutPredictor)) return new TimeoutPredictor(max, mult);
	var predictor = this;
	_.assign(predictor, {
		count: 0,
		totalTime: 0,
		currLimit: 1,
		absLimit: !max ? 256 : max < 1 ? 1 : max,
		multiplier: !mult ? 2 : mult < 1 ? 1 : mult
	});
}

_.assign(TimeoutPredictor.prototype, {

update: function(count, delta) {
	var predictor = this;
	predictor.count += count;
	predictor.totalTime += delta;
},

getTimeoutCount: function(remainingTime) {
	var predictor = this;
	if (predictor.count <= 0) return 1;
	var avgTime = predictor.totalTime / predictor.count;
	var n = Math.floor( remainingTime / avgTime );
	if (n <= 0) return 1;
	if (n < predictor.currLimit) return n;
	n = predictor.currLimit;
	if (predictor.currLimit >= predictor.absLimit) return n;
	predictor.currLimit = predictor.multiplier * predictor.currLimit;
	if (predictor.currLimit < predictor.absLimit) return n;
	predictor.currLimit = predictor.absLimit;
	// FIXME do methods other than reduce() use TimeoutPredictor??
	console.debug('Promise.reduce() hit absLimit: ', predictor.absLimit);
	return n;
}


});

_.defaults(Promise, {
	asap: asap, defer: defer, delay: delay, wait: wait, pipe: pipe, reduce: reduce
});

return Promise;

})();


}).call(this);



