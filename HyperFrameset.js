(function () {
	'use strict';

	/*
	 * Date Format 1.2.3
	 * (c) 2007-2009 Steven Levithan <stevenlevithan.com>
	 * MIT license
	 *
	 * Includes enhancements by Scott Trenda <scott.trenda.net>
	 * and Kris Kowal <cixar.com/~kris.kowal/>
	 *
	 * Accepts a date, a mask, or a date and a mask.
	 * Returns a formatted version of the given date.
	 * The date defaults to the current date/time.
	 * The mask defaults to dateFormat.masks.default.
	 */

	let dateFormat = function () {
		let	token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
			timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
			timezoneClip = /[^-+\dA-Z]/g,
			pad = function (val, len) {
				val = String(val);
				len = len || 2;
				while (val.length < len) val = "0" + val;
				return val;
			};

		// Regexes and supporting functions are cached through closure
		return function (date, mask, utc) {
			let dF = dateFormat;

			// You can't provide utc if you skip other args (use the "UTC:" mask prefix)
			if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
				mask = date;
				date = undefined;
			}

			// Passing date through Date applies Date.parse, if necessary
			date = date ? new Date(date) : new Date;
			if (isNaN(date)) throw SyntaxError("invalid date");

			mask = String(dF.masks[mask] || mask || dF.masks["default"]);

			// Allow setting the utc argument via the mask
			if (mask.slice(0, 4) == "UTC:") {
				mask = mask.slice(4);
				utc = true;
			}

			let	_ = utc ? "getUTC" : "get",
				d = date[_ + "Date"](),
				D = date[_ + "Day"](),
				m = date[_ + "Month"](),
				y = date[_ + "FullYear"](),
				H = date[_ + "Hours"](),
				M = date[_ + "Minutes"](),
				s = date[_ + "Seconds"](),
				L = date[_ + "Milliseconds"](),
				o = utc ? 0 : date.getTimezoneOffset(),
				flags = {
					d:    d,
					dd:   pad(d),
					ddd:  dF.i18n.dayNames[D],
					dddd: dF.i18n.dayNames[D + 7],
					m:    m + 1,
					mm:   pad(m + 1),
					mmm:  dF.i18n.monthNames[m],
					mmmm: dF.i18n.monthNames[m + 12],
					yy:   String(y).slice(2),
					yyyy: y,
					h:    H % 12 || 12,
					hh:   pad(H % 12 || 12),
					H:    H,
					HH:   pad(H),
					M:    M,
					MM:   pad(M),
					s:    s,
					ss:   pad(s),
					l:    pad(L, 3),
					L:    pad(L > 99 ? Math.round(L / 10) : L),
					t:    H < 12 ? "a"  : "p",
					tt:   H < 12 ? "am" : "pm",
					T:    H < 12 ? "A"  : "P",
					TT:   H < 12 ? "AM" : "PM",
					Z:    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
					o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
					S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
				};

			return mask.replace(token, function ($0) {
				return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
			});
		};
	}();

	// Some common format strings
	dateFormat.masks = {
		"default":      "ddd mmm dd yyyy HH:MM:ss",
		shortDate:      "m/d/yy",
		mediumDate:     "mmm d, yyyy",
		longDate:       "mmmm d, yyyy",
		fullDate:       "dddd, mmmm d, yyyy",
		shortTime:      "h:MM TT",
		mediumTime:     "h:MM:ss TT",
		longTime:       "h:MM:ss TT Z",
		isoDate:        "yyyy-mm-dd",
		isoTime:        "HH:MM:ss",
		isoDateTime:    "yyyy-mm-dd'T'HH:MM:ss",
		isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
	};

	// Internationalization strings
	dateFormat.i18n = {
		dayNames: [
			"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
			"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
		],
		monthNames: [
			"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
			"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
		]
	};

	/*!
	 JS utils
	 (c) Sean Hogan, 2008,2012,2013,2014,2015
	 Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	*/

	/*
	 ### Utility functions
	 These might (or might not) be lodash equivalents
	 */

	// TODO do string utils needs to sanity check args?
	function uc(str) { return str ? str.toUpperCase() : ''; }
	function lc(str) { return str ? str.toLowerCase() : ''; }

	function ucFirst(str) {
		return str ? str.charAt(0).toUpperCase() + str.substr(1) : '';
	}
	function camelCase(str) {
		return str ?
			map(str.split('-'), function(part, i) { return i === 0 ? part :
			ucFirst(part); }).join('') : ''; 
	}
	function kebabCase(str) {
		return str ?
		map(str.split(/(?=[A-Z])/), function(part, i) { return i === 0 ? part :
		lc(part); }).join('-') : '';
	}

	function includes(a, item) {
		for (let n=a.length, i=0; i<n; i++) if (a[i] === item) return true;
		return false;
	}

	function forEach(a, fn, context) { for (let n=a.length, i=0; i<n; i++) fn.call(context, a[i], i, a); }

	function some(a, fn, context) { for (let n=a.length, i=0; i<n; i++) { if (fn.call(context, a[i], i, a)) return true; } return false; }

	function every(a, fn, context) { for (let n=a.length, i=0; i<n; i++) { if (!fn.call(context, a[i], i, a)) return false; } return true; }

	function map(a, fn, context) {
		let output = [];
		for (let n=a.length, i=0; i<n; i++) {
			let value = a[i];
			output[i] = fn ? 
				fn.call(context, value, i, a) :
				value;
		}
		return output;
	}

	function filter(a, fn, context) {
		let output = [];
		for (let n=a.length, i=0; i<n; i++) {
			let success = fn.call(context, a[i], i, a);
			if (success) output.push(a[i]);
		}
		return output;
	}

	function _find(a, fn, context, byIndex) {
		for (let n=a.length, i=0; i<n; i++) {
			let item = a[i];
			let success = fn.call(context, item, i, a);
			if (success) return byIndex ? i : item;
		}
		return byIndex ? -1 : undefined;
	}

	function findIndex(a, fn, context) {
		return _find(a, fn, context, true);
	}

	function find(a, fn, context) {
		return _find(a, fn, context, false);
	}

	function without(a1, a2) {
		let result = [];
		forEach(a1, function(item) {
			if (includes(a2, item) || includes(result, item)) return;
			result.push(item);
		});
		return result;
	}

	function difference(a1, a2) {
		let result = [].concat(
			without(a1, a2),
			without(a2, a1)
		);
		return result;
	}

	function words(text) { return text.split(/\s+/); }

	function forIn(object, fn, context) {
		for (let key in object) {
			fn.call(context, object[key], key, object);
		}
	}

	function forOwn(object, fn, context) {
		let keys = Object.keys(object);
		for (let i=0, n=keys.length; i<n; i++) {
			let key = keys[i];
			fn.call(context, object[key], key, object);
		}
	}

	function isEmpty(o) { // NOTE lodash supports arrays and strings too
		if (o) for (let p in o) if (o.hasOwnProperty(p)) return false;
		return true;
	}


	function defaults(dest, src) {
		forOwn(src, function(val, key, object) {
			if (typeof this[key] !== 'undefined') return;
			this[key] = object[key];
		}, dest);
		return dest;
	}

	function assign(dest, src) {
		forOwn(src, function(val, key, object) {
			this[key] = object[key];
		}, dest);
		return dest;
	}

	var _ = /*#__PURE__*/Object.freeze({
		__proto__: null,
		uc: uc,
		lc: lc,
		ucFirst: ucFirst,
		camelCase: camelCase,
		kebabCase: kebabCase,
		words: words,
		includes: includes,
		forEach: forEach,
		some: some,
		every: every,
		map: map,
		filter: filter,
		find: find,
		findIndex: findIndex,
		without: without,
		difference: difference,
		forIn: forIn,
		forOwn: forOwn,
		isEmpty: isEmpty,
		defaults: defaults,
		assign: assign
	});

	let Registry = function(options) {
		if (!options || typeof options !== 'object') options = {};
		this.options = options;
		this.items = {};
	};

	assign(Registry.prototype, {

	clear: function() {
		if (this.options.writeOnce) throw Error('Attempted to clear write-once storage');
		this.items = Object.create(null);
	},

	has: function(key) {
		return key in this.items;
	},

	get: function(key) {
		return this.items[key];
	},

	set: function(key, value) {
		if (this.options.writeOnce && this.has(key)) {
			throw Error('Attempted to rewrite key ' + key + ' in write-once storage');
		}
		if (this.options.keyTest) {
			let ok = this.options.keyTest(key);
			if (!ok) throw Error('Invalid key ' + key + ' for storage');
		}
		if (this.options.valueTest) {
			let ok = this.options.valueTest(value);
			if (!ok) throw Error('Invalid value ' + value + ' for storage');
		}
		this.items[key] = value;
	},

	'delete': function(key) {
		if (this.options.writeOnce && this.has(key)) {
			throw Error('Attempted to delete key ' + key + ' in write-once storage');
		}
		delete this.items[key];
	}

	});

	Registry.prototype.register = Registry.prototype.set;

	/*
	 ### Task queuing and isolation
		TODO Only intended for use by Promise. Should this be externally available?
	 */

	const vendorPrefix = 'meeko'; // FIXME DRY with other instances of `vendorPrefix`

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

	let schedule = (function() {
		// See http://creativejs.com/resources/requestanimationframe/
		let fn = window.requestAnimationFrame;
		if (fn) return fn;

		some(words('moz ms o webkit'), function(vendor) {
			let name = vendor + 'RequestAnimationFrame';
			if (!window[name]) return false;
			fn = window[name];
			return true;
		});
		if (fn) return fn;

		let lastTime = 0;
		let callback;
		fn = function(cb, element) {
			if (callback) throw 'schedule() only allows one callback at a time';
			callback = cb;
			let currTime = performance.now();
			let timeToCall = Math.max(0, frameInterval - (currTime - lastTime));
			let id = window.setTimeout(function() {
				lastTime = performance.now();
				let cb = callback;
				callback = undefined;
				cb(lastTime, element); 
			}, timeToCall);
			return id;
		};
		
		return fn;
	})();


	let asapQueue = [];
	let deferQueue = [];
	let errorQueue = [];
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
			catch (error) { postError(error); }
			processTasks();
		}, timeout);
	}

	let execStats = {};
	let frameStats = {};

	function resetStats() {
		forEach([execStats, frameStats], function(stats) {
			assign(stats, {
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
		let exec = assign({}, execStats);
		let frame = assign({}, frameStats);
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

	let throwErrors = (function() {

	let evType = vendorPrefix + '-error';
	function throwErrors() {
		let handlers = createThrowers(errorQueue);
		forEach(handlers, function(handler) {
			window.addEventListener(evType, handler, false);
		});
		let e = document.createEvent('Event');
		e.initEvent(evType, true, true);
		window.dispatchEvent(e);
		forEach(handlers, function(handler) {
			window.removeEventListener(evType, handler, false);
		});
		errorQueue = [];
	}

	function createThrowers(list) {
		return map(list, function(error) {
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

	var Task = {
		asap,
		defer,
		delay,
		getTime,
		getStats,
		resetStats,
		postError
	};

	/*
	 ### Promise
	 WARN: This was based on early DOM Futures specification. This has been evolved towards ES6 Promises.
	 */

	let Promise = function(init) { // `init` is called as init(resolve, reject)
		if (!(this instanceof Promise)) return new Promise(init);
		
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
	};

	defaults(Promise, {

	applyTo: function(object) {
		let resolver = {};
		let promise = new Promise(function(resolve, reject) {
			resolver.resolve = resolve;
			resolver.reject = reject;
		});
		if (!object) object = promise;
		assign(object, resolver);
		return promise;
	},

	isPromise: function(value) {
		return value instanceof Promise;
	},

	isThenable: function(value) {
		return value != null && typeof value.then === 'function';
	}

	});

	defaults(Promise.prototype, {

	_initialize: function() {
		let promise = this;
		defaults(promise, {
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
		let promise = this;
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
		return new Promise(function(resolve, reject) {
			let fulfilWrapper = fulfilCallback ?
				wrapResolve(fulfilCallback, resolve, reject) :
				function(value) { resolve(value); };
		
			let rejectWrapper = rejectCallback ?
				wrapResolve(rejectCallback, resolve, reject) :
				function(error) { reject(error); };
		
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


	defaults(Promise, {

	resolve: function(value) {
		if (Promise.isPromise(value)) return value;
		let promise = Object.create(Promise.prototype);
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
	let wait = (function() { // TODO wait() isn't used much. Can it be simpler?
		
	let tests = [];

	function wait(fn) {
		let test = { fn: fn };
		let promise = Promise.applyTo(test);
		asapTest(test);
		return promise;
	}

	function asapTest(test) {
		asap$1(test.fn)
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
		forEach(currentTests, asapTest);
	}

	return wait;

	})();

	function asap$1(value) { // FIXME asap(fn) should execute immediately
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

	function defer$1(value) {
		if (Promise.isPromise(value)) {
			if (value.isPending) return value; // already deferred
			return value.then();
		}
		if (Promise.isThenable(value)) return Promise.resolve(value);
		if (typeof value === 'function') return Promise.resolve().then(value);
		return Promise.resolve(value).then();
	}

	function delay$1(timeout) { // FIXME delay(timeout, value_or_fn_or_promise)
		return new Promise(function(resolve, reject) {
			if (timeout <= 0 || timeout == null) Task.defer(resolve);
			else Task.delay(resolve, timeout);
		});
	}

	function pipe(startValue, fnList) { // TODO make more efficient with sync introspection
		let promise = Promise.resolve(startValue);
		for (let n=fnList.length, i=0; i<n; i++) {
			let fn = fnList[i];
			promise = promise.then(fn);
		}
		return promise;
	}

	function reduce(accumulator, a, fn, context) {
	return new Promise(function(resolve, reject) {
		let length = a.length;
		let i = 0;

		let predictor = new TimeoutPredictor(256, 2);
		process(accumulator);
		return;

		function process(acc) {
			let prevTime;
			let j = 0;
			let timeoutCount = 1;

			while (i < length) {
				if (Promise.isThenable(acc)) {
					if (!Promise.isPromise(acc) || !acc.isFulfilled) {
						acc.then(process, reject);
						if (j <= 0 || !prevTime || i >= length) return;
						let currTime = Task.getTime(true);
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
				let currTime = Task.getTime(true); // NOTE *remaining* time
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
		let predictor = this;
		assign(predictor, {
			count: 0,
			totalTime: 0,
			currLimit: 1,
			absLimit: !max ? 256 : max < 1 ? 1 : max,
			multiplier: !mult ? 2 : mult < 1 ? 1 : mult
		});
	}

	assign(TimeoutPredictor.prototype, {

	update: function(count, delta) {
		let predictor = this;
		predictor.count += count;
		predictor.totalTime += delta;
	},

	getTimeoutCount: function(remainingTime) {
		let predictor = this;
		if (predictor.count <= 0) return 1;
		let avgTime = predictor.totalTime / predictor.count;
		let n = Math.floor( remainingTime / avgTime );
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

	defaults(Promise, {
		asap: asap$1, defer: defer$1, delay: delay$1, wait: wait, pipe: pipe, reduce: reduce
	});

	let document$1 = window.document;

	/*
	 ### URL utility functions
	 */

	// TODO Ideally this URL is read-only compatible with DOM4 URL
	// NOTE This could use `document.createElement('a').href = url` except DOM is too slow

	let URL = function(href, base) {
		if (!(this instanceof URL)) return new URL(href, base);
		let baseURL;
		if (base) baseURL = typeof base === 'string' ? new URL(base) : base;
		init.call(this, href, baseURL);
	};

	function init(href, baseURL) {
		if (baseURL) {
			href = baseURL.resolve(href);
			assign(this, new URL(href));
		}
		else {
			let url = parse(href);
			for (let key in url) this[key] = url[key]; // _.assign(this, url);
			enhance(this);
		}
	}

	let keys = ['source','protocol','hostname','port','pathname','search','hash'];
	let parser = /^([^:\/?#]+:)?(?:\/\/([^:\/?#]*)(?::(\d*))?)?([^?#]*)?(\?[^#]*)?(#.*)?$/;

	function parse(href) {
		href = href.trim();
		let m = parser.exec(href);
		let url = {};
		for (let n=keys.length, i=0; i<n; i++) url[keys[i]] = m[i] || '';
		return url;
	}

	function enhance(url) {
		url.protocol = lc(url.protocol);
		url.supportsResolve = /^(http|https|ftp|file):$/i.test(url.protocol);
		if (!url.supportsResolve) return;
		if (url.hostname) url.hostname = lc(url.hostname);
		if (!url.host) {
			url.host = url.hostname;
			if (url.port) url.host += ':' + url.port;
		}
		if (!url.origin || url.origin === 'null') url.origin = url.protocol + '//' + url.host;
		if (!url.pathname) url.pathname = '/';
		let pathParts = url.pathname.split('/'); // creates an array of at least 2 strings with the first string empty: ['', ...]
		pathParts.shift(); // leaves an array of at least 1 string [...]
		url.filename = pathParts.pop(); // filename could be ''
		url.basepath = pathParts.length ? '/' + pathParts.join('/') + '/' : '/'; // either '/rel-path-prepended-by-slash/' or '/'
		url.base = url.origin + url.basepath;
		url.nosearch = url.origin + url.pathname;
		url.nohash = url.nosearch + url.search;
		url.href = url.nohash + url.hash;
		url.toString = function() { return url.href; };
	}
	URL.prototype.resolve = function resolve(relHref) {
		relHref = relHref.trim();
		if (!this.supportsResolve) return relHref;
		let substr1 = relHref.charAt(0), substr2 = relHref.substr(0,2);
		let absHref =
			/^[a-zA-Z0-9-]+:/.test(relHref) ? relHref :
			substr2 == '//' ? this.protocol + relHref :
			substr1 == '/' ? this.origin + relHref :
			substr1 == '?' ? this.nosearch + relHref :
			substr1 == '#' ? this.nohash + relHref :
			substr1 != '.' ? this.base + relHref :
			substr2 == './' ? this.base + relHref.replace('./', '') :
			(function() {
				let myRel = relHref;
				let myDir = this.basepath;
				while (myRel.substr(0,3) == '../') {
					myRel = myRel.replace('../', '');
					myDir = myDir.replace(/[^\/]+\/$/, '');
				}
				return this.origin + myDir + myRel;
			}).call(this);
		return absHref;
	};

	let urlAttributes = URL.attributes = (function() {
		
	function AttributeDescriptor(tagName, attrName, loads, compound) {
		let testEl = document$1.createElement(tagName);
		let supported = attrName in testEl;
		let lcAttr = lc(attrName); // NOTE for longDesc, etc
		defaults(this, { // attrDesc
			tagName: tagName,
			attrName: attrName,
			loads: loads,
			compound: compound,
			supported: supported
		});
	}

	defaults(AttributeDescriptor.prototype, {

	resolve: function(el, baseURL) {
		let attrName = this.attrName;
		let url = el.getAttribute(attrName);
		if (url == null) return;
		let finalURL = this.resolveURL(url, baseURL);
		if (finalURL !== url) el.setAttribute(attrName, finalURL);
	},

	resolveURL: function(url, baseURL) {
		let relURL = url.trim();
		let finalURL = relURL;
		switch (relURL.charAt(0)) {
			case '': // empty, but not null. TODO should this be a warning??
				break;
			
			default:
				finalURL = baseURL.resolve(relURL);
				break;
		}
		return finalURL;
	}

	});

	let urlAttributes = {};
	forEach(words('link@<href script@<src img@<longDesc,<src,+srcset iframe@<longDesc,<src object@<data embed@<src video@<poster,<src audio@<src source@<src,+srcset input@formAction,<src button@formAction,<src a@+ping,href area@href q@cite blockquote@cite ins@cite del@cite form@action'), function(text) {
		let m = text.split('@'), tagName = m[0], attrs = m[1];
		let attrList = urlAttributes[tagName] = {};
		forEach(attrs.split(','), function(attrName) {
			let downloads = false;
			let compound = false;
			let modifier = attrName.charAt(0);
			switch (modifier) {
			case '<':
				downloads = true;
				attrName = attrName.substr(1);
				break;
			case '+':
				compound = true;
				attrName = attrName.substr(1);
				break;
			}
			attrList[attrName] = new AttributeDescriptor(tagName, attrName, downloads, compound);
		});
	});

	function resolveSrcset(urlSet, baseURL) {
		let urlList = urlSet.split(/\s*,\s*/); // FIXME this assumes URLs don't contain ','
		forEach(urlList, function(urlDesc, i) {
			urlList[i] = urlDesc.replace(/^\s*(\S+)(?=\s|$)/, function(all, url) { return baseURL.resolve(url); });
		});
		return urlList.join(', ');
	}

	urlAttributes['img']['srcset'].resolveURL = resolveSrcset;
	urlAttributes['source']['srcset'].resolveURL = resolveSrcset;

	urlAttributes['a']['ping'].resolveURL = function(urlSet, baseURL) {
		let urlList = urlSet.split(/\s+/);
		forEach(urlList, function(url, i) {
			urlList[i] = baseURL.resolve(url);
		});
		return urlList.join(' ');
	};

	return urlAttributes;

	})();

	/*!
	 DOM utils
	 (c) Sean Hogan, 2008,2012,2013,2014
	 Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	*/

	const vendorPrefix$1 = 'meeko'; // FIXME DRY with other instances of `vendorPrefix`

	let document$2 = window.document;

	/*
	 ### DOM utility functions
	 */

	// TODO all this node manager stuff assumes that nodes are only released on unload
	// This might need revising

	// TODO A node-manager API would be useful elsewhere

	const nodeIdSuffix = Math.round(Math.random() * 1000000);
	const nodeIdProperty = '__' + vendorPrefix$1 + nodeIdSuffix;
	let nodeCount = 0; // used to generated node IDs
	let nodeTable = []; // list of tagged nodes
	let nodeStorage = {}; // hash of storage for nodes, keyed off `nodeIdProperty`

	function uniqueId(node) {
		let nodeId = node[nodeIdProperty];
		if (nodeId) return nodeId;
		nodeId = '__' + nodeCount++;
		node[nodeIdProperty] = nodeId; // WARN would need `new String(nodeId)` in IE<=8
				// so that node cloning doesn't copy the node ID property
		nodeTable.push(node);
		return nodeId;
	}

	function setData(node, data) { // FIXME assert node is element
		let nodeId = uniqueId(node);
		nodeStorage[nodeId] = data;
	}

	function hasData(node) {
		let nodeId = node[nodeIdProperty];
		return !nodeId ? false : nodeId in nodeStorage;
	}

	function getData(node) { // TODO should this throw if no data?
		let nodeId = node[nodeIdProperty];
		if (!nodeId) return;
		return nodeStorage[nodeId];
	}

	function releaseNodes(callback, context) { // FIXME this is never called
		for (let i=nodeTable.length-1; i>=0; i--) {
			let node = nodeTable[i];
			delete nodeTable[i];
			if (callback) callback.call(context, node);
			let nodeId = node[nodeIdProperty];
			delete nodeStorage[nodeId];
		}
		nodeTable.length = 0;
	}

	function getTagName(el) {
		return el && el.nodeType === 1 ? lc(el.tagName) : '';
	}

	let matchesSelector;

	if (document$2.documentElement.matches) matchesSelector = function(element, selector) {
		return (element && element.nodeType === 1) ? element.matches(selector) : false; 
	};
	else some(words('moz webkit ms o'), function(prefix) {
		let method = prefix + 'MatchesSelector';
		if (document$2.documentElement[method]) {
			matchesSelector = function(element, selector) { return (element && element.nodeType === 1) ? element[method](selector) : false; };
			return true;
		}
		return false;
	});


	let matches = matchesSelector ?
	function(element, selector, scope) {
		if (!(element && element.nodeType === 1)) return false;
		if (typeof selector === 'function') return selector(element, scope);
		return scopeify(function(absSelector) {
			return matchesSelector(element, absSelector);
		}, selector, scope);
	} :
	function() { throw Error('matches not supported'); }; // NOTE fallback

	let closest = matchesSelector ?
	function(element, selector, scope) {
		if (typeof selector === 'function') {
			for (let el=element; el && el!==scope; el=el.parentNode) {
				if (el.nodeType !== 1) continue;
				if (selector(el, scope)) return el;
			}
			return null;
		}
		return scopeify(function(absSelector) {

			for (let el=element; el && el!==scope; el=el.parentNode) {
				if (el.nodeType !== 1) continue;
				if (matchesSelector(el, absSelector)) return el;
			}

		}, selector, scope);
	} :
	function() { throw Error('closest not supported'); }; // NOTE fallback

	function scopeify(fn, selector, scope) {
		let absSelector = selector;
		if (scope) {
			let uid = uniqueId(scope);
			scope.setAttribute(nodeIdProperty, uid);
			absSelector = absolutizeSelector(selector, scope);
		}

		let result = fn(absSelector);

		if (scope) {
			scope.removeAttribute(nodeIdProperty);
		}

		return result;
	}

	function absolutizeSelector(selectorGroup, scope) { // WARN does not handle relative selectors that start with sibling selectors
		switch (scope.nodeType) {
		case 1:
			break;
		case 9: case 11:
			// TODO what to do with document / fragment
			return selectorGroup;
		default:
			// TODO should other node types throw??
			return selectorGroup;
		}
		
		let nodeId = uniqueId(scope);
		let scopeSelector = '[' + nodeIdProperty + '=' + nodeId + ']';

		// split on COMMA (,) that is not inside BRACKETS. Technically: not followed by a RHB ')' or ']' unless first followed by LHB '(' or '[' 
		let selectors = selectorGroup.split(/,(?![^\(]*\)|[^\[]*\])/);
		selectors = map(selectors, function(s) {
			if (/^:scope\b/.test(s)) return s.replace(/^:scope\b/, scopeSelector);
			else return scopeSelector + ' ' + s;
		});
			
		return selectors.join(', ');
	}

	function findId(id, doc) {
		if (!id) return;
		if (!doc) doc = document$2;
		if (!doc.getElementById) throw Error('Context for findId() must be a Document node');
		return doc.getElementById(id);
		// WARN would need a work around for broken getElementById in IE <= 7
	}

	let findAll = document$2.querySelectorAll ?
	function(selector, node, scope, inclusive) {
		if (!node) node = document$2;
		if (!node.querySelectorAll) return [];
		if (scope && !scope.nodeType) scope = node; // `true` but not the scope element
		return scopeify(function(absSelector) {
			let result = map(node.querySelectorAll(absSelector));
			if (inclusive && matchesSelector(node, absSelector)) result.unshift(node);
			return result;
		}, selector, scope);
	} :
	function() { throw Error('findAll() not supported'); };

	let find$1 = document$2.querySelector ?
	function(selector, node, scope, inclusive) {
		if (!node) node = document$2;
		if (!node.querySelector) return null;
		if (scope && !scope.nodeType) scope = node; // `true` but not the scope element
		return scopeify(function(absSelector) {
			if (inclusive && matchesSelector(node, absSelector)) return node;
			return node.querySelector(absSelector);
		}, selector, scope);
	} :
	function() { throw Error('find() not supported'); };

	function siblings(conf, refNode, conf2, refNode2) {
		
		conf = lc(conf);
		if (conf2) {
			conf2 = lc(conf2);
			if (conf === 'ending' || conf === 'before') throw Error('siblings() startNode looks like stopNode');
			if (conf2 === 'starting' || conf2 === 'after') throw Error('siblings() stopNode looks like startNode');
			if (!refNode2 || refNode2.parentNode !== refNode.parentNode) throw Error('siblings() startNode and stopNode are not siblings');
		}
		
		let nodeList = [];
		if (!refNode || !refNode.parentNode) return nodeList;
		let node, stopNode, first = refNode.parentNode.firstChild;

		switch (conf) {
		case 'starting': node = refNode; break;
		case 'after': node = refNode.nextSibling; break;
		case 'ending': node = first; stopNode = refNode.nextSibling; break;
		case 'before': node = first; stopNode = refNode; break;
		default: throw Error(conf + ' is not a valid configuration in siblings()');
		}
		if (conf2) switch (conf2) {
		case 'ending': stopNode = refNode2.nextSibling; break;
		case 'before': stopNode = refNode2; break;
		}
		
		if (!node) return nodeList; // FIXME is this an error??
		for (;node && node!==stopNode; node=node.nextSibling) nodeList.push(node);
		return nodeList;
	}

	let contains = // WARN `contains()` means contains-or-isSameNode
	document$2.documentElement.contains && function(node, otherNode) {
		if (node === otherNode) return true;
		if (node.contains) return node.contains(otherNode);
		if (node.documentElement) return node.documentElement.contains(otherNode); // FIXME won't be valid on pseudo-docs
		return false;
	} ||
	document$2.documentElement.compareDocumentPosition && function(node, otherNode) { return (node === otherNode) || !!(node.compareDocumentPosition(otherNode) & 16); } ||
	function(node, otherNode) { throw Error('contains not supported'); };

	function dispatchEvent(target, type, params) { // NOTE every JS initiated event is a custom-event
		if (typeof type === 'object') {
			params = type;
			type = params.type;
		}
		let bubbles = params && 'bubbles' in params ? !!params.bubbles : true;
		let cancelable = params && 'cancelable' in params ? !!params.cancelable : true;
		if (typeof type !== 'string') throw Error('trigger() called with invalid event type');
		let detail = params && params.detail;
		let event = document$2.createEvent('CustomEvent');
		event.initCustomEvent(type, bubbles, cancelable, detail);
		if (params) defaults(event, params);
		return target.dispatchEvent(event);
	}

	let managedEvents = [];

	function manageEvent(type) {
		if (includes(managedEvents, type)) return;
		managedEvents.push(type);
		window.addEventListener(type, function(event) {
			// NOTE stopPropagation() prevents custom default-handlers from running. DOMSprockets nullifies it.
			event.stopPropagation = function() { console.warn('event.stopPropagation() is a no-op'); };
			event.stopImmediatePropagation = function() { console.warn('event.stopImmediatePropagation() is a no-op'); };
		}, true);
	}

	const SUPPORTS_ATTRMODIFIED = (function() {
		let supported = false;
		let div = document$2.createElement('div');
		div.addEventListener('DOMAttrModified', function(e) { supported = true; }, false);
		div.setAttribute('hidden', '');
		return supported;
	})();

	// DOM node visibilitychange implementation and monitoring
	if (!('hidden' in document$2.documentElement)) { // implement 'hidden' for older browsers

		let head = document$2.head;
		// NOTE on <=IE8 this needs a styleSheet work-around
		let style = document$2.createElement('style');

		let cssText = '*[hidden] { display: none; }\n';
		style.textContent = cssText;

		head.insertBefore(style, head.firstChild);

		Object.defineProperty(Element.prototype, 'hidden', {
			get: function() { return this.hasAttribute('hidden'); },
			set: function(value) {
				if (!!value) this.setAttribute('hidden', '');
				else this.removeAttribute('hidden');

				// IE9 has a reflow bug. The following forces a reflow. FIXME can we stop suporting IE9
				let elementDisplayStyle = this.style.display;
				let computedDisplayStyle = window.getComputedStyle(this, null);
				this.style.display = computedDisplayStyle;
				this.style.display = elementDisplayStyle;
			}
		});
	}

	if (window.MutationObserver) {

		let observer = new MutationObserver(function(mutations, observer) {
			forEach(mutations, function(entry) {
				triggerVisibilityChangeEvent(entry.target);
			});
		});
		observer.observe(document$2, { attributes: true, attributeFilter: ['hidden'], subtree: true });

	}
	else if (SUPPORTS_ATTRMODIFIED) {

		document$2.addEventListener('DOMAttrModified', function(e) {
			if (e.attrName !== 'hidden') return;
			triggerVisibilityChangeEvent(e.target);
		}, true);

	}
	else console.warn('element.visibilitychange event will not be supported');

	// FIXME this should use observers, not events
	function triggerVisibilityChangeEvent(target) {
		let visibilityState = target.hidden ? 'hidden' : 'visible';
		dispatchEvent(target, 'visibilitychange', { bubbles: false, cancelable: false, detail: visibilityState }); // NOTE doesn't bubble to avoid clash with same event on document (and also performance)
	}

	function isVisible(element) {
		let closestHidden = closest(element, '[hidden]');
		return (!closestHidden);
	}


	function whenVisible(element) { // FIXME this quite possibly causes leaks if closestHidden is removed from document before removeEventListener
		return new Promise(function(resolve, reject) {
			let closestHidden = closest(element, '[hidden]');
			if (!closestHidden) {
				resolve();
				return;
			}
			let listener = function(e) {
				if (e.target.hidden) return;
				closestHidden.removeEventListener('visibilitychange', listener, false);
				whenVisible(element).then(resolve);
			};
			closestHidden.addEventListener('visibilitychange', listener, false);
		});
	}


	function insertNode(conf, refNode, node) { // like imsertAdjacentHTML but with a node and auto-adoption
		let doc = refNode.ownerDocument;
		if (doc.adoptNode) node = doc.adoptNode(node); // Safari 5 was throwing because imported nodes had been added to a document node
		switch(conf) {

		case 'before':
		case 'beforebegin': refNode.parentNode.insertBefore(node, refNode); break;

		case 'after':
		case 'afterend': refNode.parentNode.insertBefore(node, refNode.nextSibling); break;

		case 'start':
		case 'afterbegin': refNode.insertBefore(node, refNode.firstChild); break;

		case 'end':
		case 'beforeend': refNode.appendChild(node); break;

		case 'replace': refNode.parentNode.replaceChild(node, refNode); break;

		case 'empty':
		case 'contents': 
			// TODO empty(refNode);
			let child;
			while (child = refNode.firstChild) refNode.removeChild(child);
			refNode.appendChild(node);
			break;
		}
		return refNode;
	}

	function adoptContents(parentNode, doc) {
		if (!doc) doc = document$2;
		let frag = doc.createDocumentFragment();
		let node;
		while (node = parentNode.firstChild) frag.appendChild(doc.adoptNode(node));
		return frag;
	}
		
	/* 
	NOTE:  for more details on how checkStyleSheets() works cross-browser see 
	http://aaronheckmann.blogspot.com/2010/01/writing-jquery-plugin-manager-part-1.html
	TODO: does this still work when there are errors loading stylesheets??
	*/
	// TODO would be nice if this didn't need to be polled
	// TODO should be able to use <link>.onload, see
	// http://stackoverflow.com/a/13610128/108354
	// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link
	function checkStyleSheets() {
		// check that every <link rel="stylesheet" type="text/css" /> 
		// has loaded
		return every(findAll('link'), function(node) {
			if (!node.rel || !/^stylesheet$/i.test(node.rel)) return true;
			if (node.type && !/^text\/css$/i.test(node.type)) return true;
			if (node.disabled) return true;
			
			// handle IE
			if (node.readyState) return readyStateLookup[node.readyState];

			let sheet = node.sheet;

			// handle webkit
			if (!sheet) return false;

			try {
				// Firefox should throw if not loaded or cross-domain
				let rules = sheet.rules || sheet.cssRules;
				return true;
			} 
			catch (error) {
				// handle Firefox cross-domain
				switch(error.name) {
				case 'NS_ERROR_DOM_SECURITY_ERR': case 'SecurityError':
					return true;
				case 'NS_ERROR_DOM_INVALID_ACCESS_ERR': case 'InvalidAccessError':
					return false;
				default:
					return true;
				}
			} 
		});
	}

	// WARN IE <= 8 would need styleText() to get/set <style> contents
	// WARN old non-IE would need scriptText() to get/set <script> contents

	function copyAttributes(node, srcNode) {
		forEach(map(srcNode.attributes), function(attr) {
			node.setAttribute(attr.name, attr.value); // WARN needs to be more complex for IE <= 7
		});
		return node;
	}

	function removeAttributes(node) {
		forEach(map(node.attributes), function(attr) {
			node.removeAttribute(attr.name);
		});
		return node;
	}

	const CREATE_DOCUMENT_COPIES_URL = (function() {
		let doc = document$2.implementation.createHTMLDocument('');
		return doc.URL === document$2.URL;
	})();

	const CLONE_DOCUMENT_COPIES_URL = (function() {
		try {
			let doc = document$2.cloneNode(false);
			if (doc.URL === document$2.URL) return true;
		}
		catch (err) { }
		return false;
	})();
			
	// NOTE we want create*Document() to have a URL
	const CREATE_DOCUMENT_WITH_CLONE = !CREATE_DOCUMENT_COPIES_URL && CLONE_DOCUMENT_COPIES_URL;

	function createDocument(srcDoc) { // modern browsers. IE >= 9
		if (!srcDoc) srcDoc = document$2;
		// TODO find doctype element??
		let doc;
		if (CREATE_DOCUMENT_WITH_CLONE) { 
			doc = srcDoc.cloneNode(false);
		}
		else {
			doc = srcDoc.implementation.createHTMLDocument('');
			doc.removeChild(doc.documentElement);
		}
		return doc;
	}

	function createHTMLDocument(title, srcDoc) { // modern browsers. IE >= 9
		if (!srcDoc) srcDoc = document$2;
		// TODO find doctype element??
		let doc;
		if (CREATE_DOCUMENT_WITH_CLONE) { 
			doc = srcDoc.cloneNode(false);
			let docEl = doc.createElement('html');
			docEl.innerHTML = '<head><title>' + title + '</title></head><body></body>';
			doc.appendChild(docEl);
		}
		else {
			doc = srcDoc.implementation.createHTMLDocument(title);
		}
		return doc;
	}

	function cloneDocument(srcDoc) {
		let doc = createDocument(srcDoc);
		let docEl = doc.importNode(srcDoc.documentElement, true);
		doc.appendChild(docEl); // NOTE already adopted

		// WARN sometimes IE9/IE10/IE11 doesn't read the content of inserted <style>
		// NOTE this doesn't seem to matter on IE10+. The following is precautionary
		forEach(findAll('style', doc), function(node) {
			let sheet = node.sheet;
			if (!sheet || sheet.cssText == null) return;
			if (sheet.cssText != '') return;
			node.textContent = node.textContent;
		});
		
		return doc;
	}

	function scrollToId(id) { // FIXME this isn't being used
		if (id) {
			let el = findId(id);
			if (el) el.scrollIntoView(true);
		}
		else window.scroll(0, 0);
	}

	let readyStateLookup = { // used in domReady() and checkStyleSheets()
		'uninitialized': false,
		'loading': false,
		'interactive': false,
		'loaded': true,
		'complete': true
	};

	let domReady = (function() { // WARN this assumes that document.readyState is valid or that content is ready...

	let readyState = document$2.readyState;
	let loaded = readyState ? readyStateLookup[readyState] : true;
	let queue = [];

	function domReady(fn) {
		if (typeof fn !== 'function') return;
		queue.push(fn);
		if (loaded) processQueue();
	}

	function processQueue() {
		forEach(queue, function(fn) { setTimeout(fn); });
		queue.length = 0;
	}

	let events = {
		'DOMContentLoaded': document$2,
		'load': window
	};

	if (!loaded) forOwn(events, function(node, type) { node.addEventListener(type, onLoaded, false); });

	return domReady;

	// NOTE the following functions are hoisted
	function onLoaded(e) {
		loaded = true;
		forOwn(events, function(node, type) { node.removeEventListener(type, onLoaded, false); });
		processQueue();
	}

	})();

	var DOM = /*#__PURE__*/Object.freeze({
		__proto__: null,
		uniqueIdAttr: nodeIdProperty,
		uniqueId: uniqueId,
		setData: setData,
		getData: getData,
		hasData: hasData,
		releaseNodes: releaseNodes,
		getTagName: getTagName,
		contains: contains,
		matches: matches,
		findId: findId,
		find: find$1,
		findAll: findAll,
		closest: closest,
		siblings: siblings,
		dispatchEvent: dispatchEvent,
		manageEvent: manageEvent,
		adoptContents: adoptContents,
		SUPPORTS_ATTRMODIFIED: SUPPORTS_ATTRMODIFIED,
		isVisible: isVisible,
		whenVisible: whenVisible,
		insertNode: insertNode,
		checkStyleSheets: checkStyleSheets,
		copyAttributes: copyAttributes,
		removeAttributes: removeAttributes,
		ready: domReady,
		createDocument: createDocument,
		createHTMLDocument: createHTMLDocument,
		cloneDocument: cloneDocument,
		scrollToId: scrollToId
	});

	/*!
	 * scriptQueue
	 * Copyright 2009-2016 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */

	let document$3 = window.document;

	/*
	 WARN: This description comment was from the former scriptQueue implementation.
	 It is still a correct description of behavior,
	 but doesn't give a great insight into the current Promises-based implementation.
	 
	 We want <script>s to execute in document order (unless @async present)
	 but also want <script src>s to download in parallel.
	 The script queue inserts scripts until it is paused on a blocking script.
	 The onload (or equivalent) or onerror handlers of the blocking script restart the queue.
	 Inline <script> and <script src="..." async> are never blocking.
	 Sync <script src> are blocking, but if `script.async=false` is supported by the browser
	 then only the last <script src> (in a series of sync scripts) needs to pause the queue. See
		http://wiki.whatwg.org/wiki/Dynamic_Script_Execution_Order#My_Solution
	 Script preloading is always initiated, even if the browser doesn't support it. See
		http://wiki.whatwg.org/wiki/Dynamic_Script_Execution_Order#readyState_.22preloading.22
		
	 FIXME scriptQueue.push should also accept functions
	*/
	let queue = [],
		emptying = false;

	let testScript = document$3.createElement('script'),
		supportsSync = (testScript.async === true);

	let scriptQueue = {

	push: function(node) {
	return new Promise(function(resolve, reject) {
		if (emptying) throw Error('Attempt to append script to scriptQueue while emptying');
		
		// TODO assert node is in document

		// TODO this filtering may need reworking now we don't support older browsers
		if (!node.type || /^text\/javascript$/i.test(node.type)) {
			console.info('Attempt to queue already executed script ' + node.src);
			resolve(); // TODO should this be reject() ??
			return;
		}

		if (!/^text\/javascript\?disabled$/i.test(node.type)) {
			console.info('Unsupported script-type ' + node.type);
			resolve(); // TODO should this be reject() ??
			return;
		}

		let script = document$3.createElement('script');

		if (node.src) addListeners(); // WARN must use `node.src` because attrs not copied to `script` yet
		
		copyAttributes(script, node); 
		script.text = node.text;

		if (script.getAttribute('defer')) { // @defer is not appropriate. Implement as @async
			script.removeAttribute('defer');
			script.setAttribute('async', '');
			console.warn('@defer not supported on scripts');
		}
		if (supportsSync && script.src && !script.hasAttribute('async')) script.async = false;
		script.type = 'text/javascript';
		
		// enabledFu resolves after script is inserted
		let enabledFu = Promise.applyTo();
		
		let prev = queue[queue.length - 1], prevScript = prev && prev.script;

		let triggerFu; // triggerFu allows this script to be enabled, i.e. inserted
		if (prev) {
			if (prevScript.hasAttribute('async') || script.src && supportsSync && !script.hasAttribute('async')) triggerFu = prev.enabled;
			else triggerFu = prev.complete; 
		}
		else triggerFu = Promise.resolve();
		
		triggerFu.then(enable, enable);

		let completeFu = Promise.applyTo();
		completeFu.then(resolve, reject);

		let current = { script: script, complete: completeFu, enabled: enabledFu };
		queue.push(current);
		return;

		// The following are hoisted
		function enable() {
			insertNode('replace', node, script);
			enabledFu.resolve(); 
			if (!script.src) {
				spliceItem(queue, current);
				completeFu.resolve();
			}
		}
		
		function onLoad(e) {
			removeListeners();
			spliceItem(queue, current);
			completeFu.resolve();
		}

		function onError(e) {
			removeListeners();
			spliceItem(queue, current);
			completeFu.reject(function() { throw Error('Script loading failed'); }); // FIXME throw NetworkError()
		}

		function addListeners() {
			script.addEventListener('load', onLoad, false);
			script.addEventListener('error', onError, false);
		}
		
		function removeListeners() {
			script.removeEventListener('load', onLoad, false);
			script.removeEventListener('error', onError, false);
		}
		
		function spliceItem(a, item) {
			for (let n=a.length, i=0; i<n; i++) {
				if (a[i] !== item) continue;
				a.splice(i, 1);
				return;
			}
		}

	});
	},

	empty: function() {
	return new Promise(function(resolve, reject) {
		
		emptying = true;
		if (queue.length <= 0) {
			emptying = false;
			resolve();
			return;
		}
		forEach(queue, function(value, i) {
			let acceptCallback = function() {
				if (queue.length <= 0) {
					emptying = false;
					resolve();
				}
			};
			value.complete.then(acceptCallback, acceptCallback);
		});

	});
	}

	}; // end scriptQueue

	/*!
	 Sprocket
	 (c) Sean Hogan, 2008,2012,2013,2014,2016
	 Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	*/

	let document$4 = window.document;

	let sprockets = (function() {
	/* FIXME
		- auto DOM monitoring for node insertion / removal should be a start() option
		- manual control must allow attached, enteredView, leftView lifecycle management
		- binding registration must be blocked after sprockets.start()
	*/

	let sprockets = {};

	function attachBinding(definition, element) {
		let binding;
		if (hasData(element)) {
			binding = getData(element);
			if (binding.definition !== rule.definition) throw Error('Mismatch between definition and binding already present');
			console.warn('Binding definition applied when binding already present');
			return binding;
		}
		binding = new Binding(definition);
		setData(element, binding);
		binding.attach(element);
		return binding;
	}

	function enableBinding(element) {
		if (!hasData(element)) throw Error('No binding attached to element');
		let binding = getData(element);
		if (!binding.inDocument) binding.enteredDocumentCallback();
	}


	let Binding = function(definition) {
		let binding = this;
		binding.definition = definition;
		binding.object = Object.create(definition.prototype);
		binding.handlers = definition.handlers ? map(definition.handlers) : [];
		binding.listeners = [];
		binding.inDocument = null; // TODO state assertions in attach/onenter/leftDocumentCallback/detach
	};

	assign(Binding, {

	getInterface: function(element) {
		let nodeData = getData(element);
		if (nodeData && nodeData.object) return nodeData;
	},

	enteredDocumentCallback: function(element) {
		let binding = Binding.getInterface(element);
		if (!binding) return;
		binding.enteredDocumentCallback();
	},

	leftDocumentCallback: function(element) {
		let binding = Binding.getInterface(element);
		if (!binding) return;
		binding.leftDocumentCallback();
	},

	managedEvents: [],

	manageEvent: function(type) {
		if (includes(this.managedEvents, type)) return;
		this.managedEvents.push(type);
		window.addEventListener(type, function(event) {
			// NOTE stopPropagation() prevents custom default-handlers from running. DOMSprockets nullifies it.
			event.stopPropagation = function() { console.debug('event.stopPropagation() is a no-op'); };
			event.stopImmediatePropagation = function() { console.debug('event.stopImmediatePropagation() is a no-op'); };
		}, true);
	}

	});

	assign(Binding.prototype, {

	attach: function(element) {
		let binding = this;
		let definition = binding.definition;
		let object = binding.object;

		object.element = element; 
		binding.attachedCallback();

		forEach(binding.handlers, function(handler) {
			let listener = binding.addHandler(handler); // handler might be ignored ...
			if (listener) binding.listeners.push(listener);// ... resulting in an undefined listener
		});
	},

	attachedCallback: function() {
		let binding = this;
		let definition = binding.definition;
		let object = binding.object;

		binding.inDocument = false;
		if (definition.attached) definition.attached.call(object, binding.handlers); // FIXME try/catch
	},

	enteredDocumentCallback: function() {
		let binding = this;
		let definition = binding.definition;
		let object = binding.object;

		binding.inDocument = true;
		if (definition.enteredDocument) definition.enteredDocument.call(object);	
	},

	leftDocumentCallback: function() {
		let binding = this;
		let definition = binding.definition;
		let object = binding.object;

		binding.inDocument = false;
		if (definition.leftDocument) definition.leftDocument.call(object);	
	},

	detach: function() {
		let binding = this;
		let definition = binding.definition;
		let object = binding.object;

		forEach(binding.listeners, binding.removeListener, binding);
		binding.listeners.length = 0;
		
		binding.detachedCallback();
	},

	detachedCallback: function() {
		let binding = this;
		let definition = binding.definition;
		let object = binding.object;
		
		binding.inDocument = null;
		if (definition.detached) definition.detached.call(object);	
	},

	addHandler: function(handler) {
		let binding = this;
		let object = binding.object;
		let element = object.element;
		let type = handler.type;
		let capture = (handler.eventPhase == 1); // Event.CAPTURING_PHASE
		if (capture) {
			console.warn('Capture phase for events not supported');
			return; // FIXME should this convert to bubbling instead??
		}

		Binding.manageEvent(type);
		let fn = function(event) {
			if (fn.normalize) event = fn.normalize(event);
			try {
				return handleEvent.call(object, event, handler);
			}
			catch (error) {
				Task.postError(error);
				throw error;
			}
		};
		fn.type = type;
		fn.capture = capture;
		element.addEventListener(type, fn, capture);
		return fn;
	},

	removeListener: function(fn) {
		let binding = this;
		let object = binding.object;
		let element = object.element;
		let type = fn.type;
		let capture = fn.capture;
		let target = (element === document$4.documentElement && includes(redirectedWindowEvents, type)) ? window : element;
		target.removeEventListener(type, fn, capture);	
	},

	});

	// WARN polyfill Event#preventDefault
	if (!('defaultPrevented' in Event.prototype)) { // NOTE ensure defaultPrevented works
		Event.prototype.defaultPrevented = false;
		Event.prototype._preventDefault = Event.prototype.preventDefault;
		Event.prototype.preventDefault = function() { this.defaultPrevented = true; this._preventDefault(); };
	}

	function handleEvent(event, handler) {
		let bindingImplementation = this;
		let target = event.target;
		let current = bindingImplementation.element;
		if (!hasData(current)) throw Error('Handler called on non-bound element');
		if (!matchesEvent(handler, event, true)) return; // NOTE the phase check is below
		let delegator = current;
		if (handler.delegator) {
			let el = closest(target, handler.delegator, current);
			if (!el) return;
			delegator = el;
		}
		switch (handler.eventPhase) { // FIXME DOMSprockets doesn't intend to support eventPhase
		case 1:
			throw Error('Capture phase for events not supported');
			break;
		case 2:
			if (delegator !== target) return;
			break;
		case 3:
			if (delegator === target) return;
			break;
		default:
			break;
		}

		if (handler.action) {
			let result = handler.action.call(bindingImplementation, event, delegator);
			if (result === false) event.preventDefault();
		}
		return;
	}

	let EventModules = {};
	EventModules.AllEvents = {};
	registerModule('FocusEvents', 'focus blur focusin focusout');
	registerModule('MouseEvents', 'click dblclick mousedown mouseup mouseover mouseout mousemove mousewheel');
	registerModule('KeyboardEvents', 'keydown keyup');
	registerModule('UIEvents', 'load unload abort error select change submit reset resize scroll');

	function registerModule(modName, evTypes) {
		let mod = {};
		EventModules[modName] = mod;
		forEach(words(evTypes), registerEvent, mod);
	}
	function registerEvent(evType) {
		EventModules.AllEvents[evType] = true;
		this[evType] = true;
	}

	let matchesEvent = function(handler, event, ignorePhase) {
		let xblMouseEvents = EventModules.MouseEvents;
		let xblKeyboardEvents = EventModules.KeyboardEvents;

		if (event.type != handler.type) return false;

		// phase
		if (!ignorePhase && !phaseMatchesEvent(handler.eventPhase, event)) return false;
		
		let evType = event.type;

		// MouseEvents
		if (evType in xblMouseEvents) { // FIXME needs testing. Bound to be cross-platform issues still
			if (handler.button && handler.button.length) {
				if (!includes(handler.button, event.button) == -1) return false;
			}
			if (handler.clickCount && handler.clickCount.length) { 
				let count = 1;
				// if ('dblclick' == event.type) count = 2;
				if ('click' == event.type) count = (event.detail) ? event.detail : 1;
				if (!includes(handler.clickCount, count)) return false;
			}
			if (handler.modifiers) {
				if (!modifiersMatchEvent(handler.modifiers, event)) return false;
			}
		}

		// KeyboardEvents
		// NOTE some of these are non-standard
		let ourKeyIdentifiers = {
			Backspace: 'U+0008', Delete: 'U+007F', Escape: 'U+001B', Space: 'U+0020', Tab: 'U+0009'
		};

		if (evType in xblKeyboardEvents) {
			if (handler.key) {
				let keyId = event.keyIdentifier;
				if (/^U\+00....$/.test(keyId)) { // TODO Needed for Safari-2. It would be great if this test could be done elsewhere
					keyId = keyId.replace(/^U\+00/, 'U+');
				}
				if (handler.key != keyId && ourKeyIdentifiers[handler.key] != keyId) return false;
			}

			// TODO key-location		
			if (handler.modifiers || handler.key) {
				if (!modifiersMatchEvent(handler.modifiers || [ 'none' ], event)) return false;
			}
		}

		return true;
	};

	let modifiersMatchEvent = function(modifiers, event) {
		// TODO comprehensive modifiers list
		// event.getModifierState() -> evMods
		// Need to account for any positives
		// Fields are set to -1 when accounted for
		let evMods = {
			control: event.ctrlKey,
			shift: event.shiftKey,
			alt: event.altKey,
			meta: event.metaKey
		};

		let evMods_any = event.ctrlKey || event.shiftKey || event.altKey || event.metaKey;

		let any = false;

		if (modifiers)	{
			for (let i=0, n=modifiers.length; i<n; i++) {
				let modifier = modifiers[i];
				switch (modifier.key) {
					case 'none':
						if (evMods_any) return false;
						break;
		
					case 'any':
						any = true;
						break;
		
					default:
						let active = evMods[modifier.key];
						switch (modifier.condition) {
							case -1:
								if (active) return false;
								break;
							case 0:
								if (active) evMods[modifier.key] = -1;
								break;
							case 1:
								if (!active) return false;
								evMods[modifier.key] = -1;
								break;
						}				
				}
			}
		}
		
		if (any) return true;
		
		// Fail if any positive modifiers not accounted for
		for (let key in evMods) {
			if (evMods[key] > 0) return false;
		}
		return true;
	};

	let isPrototypeOf = {}.isPrototypeOf ?
	function(prototype, object) { return prototype.isPrototypeOf(object); } :
	function(prototype, object) {
		for (let current=object.__proto__; current; current=current.__proto__) if (current === prototype) return true;
		return false;
	};

	/* CSS Rules */

	function BindingDefinition(desc) {
		assign(this, desc);
		if (!this.prototype) {
			if (desc.prototype) this.prototype = desc.prototype;
			else this.prototype = null;
		}
		if (!this.handlers) this.handlers = [];
	}

	function BindingRule(selector, bindingDefn) {
		this.selector = selector;
		this.definition = bindingDefn;
	}


	let bindingRules = sprockets.rules = [];

	function findAllBindees(root, bExcludeRoot) {
		let selector = map(bindingRules, function(rule) { return rule.selector; })
			.join(', ');
		let result = findAll(selector, root);
		if (!bExcludeRoot && matches(root, selector)) result.unshift(root);
		return result;
	}

	let started = false;
	let manualDOM = false;

	assign(sprockets, {

	registerElement: function(tagName, defn) { // FIXME test tagName
		if (started) throw Error('sprockets management already started');
		if (defn.rules) console.warn('registerElement() does not support rules. Try registerComposite()');
		let bindingDefn = new BindingDefinition(defn);
		let selector = tagName + ', [is=' + tagName + ']'; // TODO why should @is be supported??
		let rule = new BindingRule(selector, bindingDefn);
		bindingRules.push(rule);
		return rule;
	},

	start: function(options) {
		if (started) throw Error('sprockets management has already started');
		started = true;
		if (options && options.manual) manualDOM = true;
		nodeInserted(document$4.body);
		if (!manualDOM) observe(nodeInserted, nodeRemoved);
	},

	insertNode: function(conf, refNode, node) {
		if (!started) throw Error('sprockets management has not started yet');
		if (!manualDOM) throw Error('Must not use sprockets.insertNode: auto DOM monitoring');
		let doc = refNode.ownerDocument;
		if (doc !== document$4 || !contains(document$4, refNode)) throw Error('sprockets.insertNode must insert into `document`');
		if (doc.adoptNode) node = doc.adoptNode(node); // Safari 5 was throwing because imported nodes had been added to a document node

		let nodes = [ node ];
		if (node.nodeType === 11) nodes = map(node.childNodes);

		switch(conf) {
		case 'beforebegin': refNode.parentNode.insertBefore(node, refNode); break;
		case 'afterend': refNode.parentNode.insertBefore(node, refNode.nextSibling); break;
		case 'afterbegin': refNode.insertBefore(node, refNode.firstChild); break;
		case 'beforeend': refNode.appendChild(node); break;

		case 'replace': 
			let parent = refNode.parentNode;
			let next = refNode.nextSibling;
			parent.removeChild(refNode); // TODO refactor?? these two lines ...
			nodeRemoved(refNode); // ... are equivalent to removeNode()
			if (next) parent.insertBefore(node, next);
			else parent.appendChild(node);
			break;

		default: throw Error('Unsupported configuration in sprockets.insertNode: ' + conf);
		// TODO maybe case 'replace' which will call sprockets.removeNode() first
		}
		
		forEach(nodes, nodeInserted);
		return node;
	},

	removeNode: function(node) {
		if (!started) throw Error('sprockets management has not started yet');
		if (!manualDOM) throw Error('Must not use sprockets.insertNode: auto DOM monitoring');
		let doc = node.ownerDocument;
		if (doc !== document$4 || !contains(document$4, node)) throw Error('sprockets.removeNode must remove from `document`');
		node.parentNode.removeChild(node);
		nodeRemoved(node);
		return node;
	}


	});

	let nodeInserted = function(node) { // NOTE called AFTER node inserted into document
		if (!started) throw Error('sprockets management has not started yet');
		if (node.nodeType !== 1) return;

		let bindees = findAllBindees(node);
		let composites = [];
		forEach(bindees, function(el) {
			some(bindingRules, function(rule) {
				if (!matches(el, rule.selector)) return false;
				let binding = attachBinding(rule.definition, el);
				if (binding && binding.rules) composites.push(el);
				return true;
			});
		});

		forEach(bindees, function(el) {
			enableBinding(el);
		});


		let composite = sprockets.getComposite(node);
		if (composite) applyCompositedRules(node, composite);

		while (composite = composites.shift()) applyCompositedRules(composite);
		
		return;
			
		function applyCompositedRules(node, composite) {
			if (!composite) composite = node;
			let rules = getRules(composite);
			if (rules.length <= 0) return;

			let walker = createCompositeWalker(node, false); // don't skipRoot
			let el;
			while (el = walker.nextNode()) {
				forEach(rules, function(rule) {
					let selector = rule.selector; // FIXME absolutizeSelector??
					if (!matches(el, selector)) return;
					let binding = attachBinding(rule.definition, el);
					rule.callback.call(binding.object, el);
				});
			}
		}
		
		function getRules(composite) { // buffer uses unshift so LIFO
			let rules = [];
			let binding = getData(composite);
			forEach(binding.rules, function(rule) {
				if (!rule.callback) return;
				let clonedRule = assign({}, rule);
				clonedRule.composite = composite;
				rules.unshift(clonedRule);
			});
			return rules;
		}
		
	};

	let nodeRemoved = function(node) { // NOTE called AFTER node removed document
		if (!started) throw Error('sprockets management has not started yet');
		if (node.nodeType !== 1) return;

		// TODO leftComponentCallback. Might be hard to implement *after* node is removed
		// FIXME the following logic maybe completely wrong
		let nodes = findAll('*', node);
		nodes.unshift(node);
		forEach(nodes, Binding.leftDocumentCallback);
	};

	// FIXME this auto DOM Monitoring could have horrible performance for DOM sorting operations
	// It would be nice to have a list of moved nodes that could potentially be ignored
	let observe = (window.MutationObserver) ?
	function(onInserted, onRemoved) {
		let observer = new MutationObserver(function(mutations, observer) {
			if (!started) return;
			forEach(mutations, function(record) {
				if (record.type !== 'childList') return;
				forEach(record.addedNodes, onInserted, sprockets);
				forEach(record.removedNodes, onRemoved, sprockets);
			});
		});
		observer.observe(document$4.body, { childList: true, subtree: true });
		
		// FIXME when to call observer.disconnect() ??
	} :
	function(onInserted, onRemoved) { // otherwise assume MutationEvents. TODO is this assumption safe?
		document$4.body.addEventListener('DOMNodeInserted', function(e) {
			e.stopPropagation();
			if (!started) return;
	 		// NOTE IE sends event for every descendant of the inserted node
			if (e.target.parentNode !== e.relatedNode) return;
			Task.asap(function() { onInserted(e.target); });
		}, true);
		document$4.body.addEventListener('DOMNodeRemoved', function(e) {
			e.stopPropagation();
			if (!started) return;
	 		// NOTE IE sends event for every descendant of the inserted node
			if (e.target.parentNode !== e.relatedNode) return;
			Task.asap(function() { onRemoved(e.target); });
			// FIXME
		}, true);
	};


	let SprocketDefinition = function(prototype) {
		let constructor = function(element) {
			return sprockets.cast(element, constructor);
		};
		constructor.prototype = prototype;
		return constructor;
	};


	assign(sprockets, {

	registerSprocket: function(selector, definition, callback) { // WARN this can promote any element into a composite
		let rule = {};
		let composite;
		if (typeof selector === 'string') {
			assign(rule, {
				selector: selector
			});
			composite = document$4;
		}
		else {
			assign(rule, selector);
			composite = selector.composite;
			delete rule.composite;
		}
		let nodeData = getData(composite); // NOTE nodeData should always be a binding
		if (!nodeData) {
			nodeData = {};
			setData(composite, nodeData);
		}
		let nodeRules = nodeData.rules;
		if (!nodeRules) nodeRules = nodeData.rules = [];
		rule.definition = definition;
		rule.callback = callback;
		nodeRules.unshift(rule); // WARN last registered means highest priority. Is this appropriate??
	},

	register: function(options, sprocket) {
		return sprockets.registerSprocket(options, sprocket);
	},

	registerComposite: function(tagName, definition) {
		let defn = assign({}, definition);
		let rules = defn.rules;
		delete defn.rules;
		if (!rules) console.warn('registerComposite() called without any sprocket rules. Try registerElement()');
		let onattached = defn.attached;
		defn.attached = function() {
			let object = this;
			if (rules) forEach(rules, function(rule) {
				let selector = {
					composite: object.element
				};
				let definition = {};
				let callback;
				if (Array.isArray(rule)) {
					selector.selector = rule[0];
					definition = rule[1];
					callback = rule[2];
				}
				else {
					selector.selector = rule.selector;
					definition = rule.definition;
					callback = rule.callback;
				}
				sprockets.registerSprocket(selector, definition, callback);
			});
			if (onattached) return onattached.call(this);
		};
		return sprockets.registerElement(tagName, defn);
	},

	registerComponent: function(tagName, sprocket, extras) {
		let defn = { prototype: sprocket.prototype };
		if (extras) {
			defn.handlers = extras.handlers;
			if (extras.sprockets) forEach(extras.sprockets, function(oldRule) {
				if (!defn.rules) defn.rules = [];
				let rule = {
					selector: oldRule.matches,
					definition: oldRule.sprocket,
					callback: oldRule.enteredComponent
				};
				defn.rules.push(rule);
			});
			if (extras.callbacks) defaults(defn, extras.callbacks);
		}
		if (defn.rules) return sprockets.registerComposite(tagName, defn);
		else return sprockets.registerElement(tagName, defn);
	},

	evolve: function(base, properties) {
		let prototype = Object.create(base.prototype);
		let sub = new SprocketDefinition(prototype);
		let baseProperties = base.prototype.__properties__ || {};
		let subProperties = prototype.__properties__ = {};
		forOwn(baseProperties, function(desc, name) {
			subProperties[name] = Object.create(desc);
		});
		if (properties) sprockets.defineProperties(sub, properties);
		return sub;
	},

	defineProperties: function(sprocket, properties) {
		let prototype = sprocket.prototype;
		let definition = prototype.__properties__ || (prototype.__properties__ = {});
		forOwn(properties, function(desc, name) {
			switch (typeof desc) {
			case 'object':
				let propDesc = definition[name] || (definition[name] = {});
				assign(propDesc, desc);
				Object.defineProperty(prototype, name, {
					get: function() { throw Error('Attempt to get an ARIA property'); },
					set: function() { throw Error('Attempt to set an ARIA property'); }
				});
				break;
			default:
				prototype[name] = desc;
				break;
			}
		});
	},

	getPropertyDescriptor: function(sprocket, prop) {
		return sprocket.prototype.__properties__[prop];
	},

	_matches: function(element, sprocket, rule) { // internal utility method which is passed a "cached" rule
		let binding = Binding.getInterface(element);
		if (binding) return prototypeMatchesSprocket(binding.object, sprocket);
		if (rule && matches(element, rule.selector)) return true; // TODO should make rules scoped by rule.composite
		return false;
	},

	matches: function(element, sprocket, inComposite) {
		let composite;
		if (inComposite) {
			composite = sprockets.getComposite(element);
			if (!composite) return false;
		}
		let rule = getMatchingSprocketRule(element.parentNode, sprocket, inComposite);
		return sprockets._matches(element, sprocket, rule);
	},

	closest: function(element, sprocket, inComposite) {
		let composite;
		if (inComposite) {
			composite = sprockets.getComposite(element);
			if (!composite) return;
		}
		let rule = getMatchingSprocketRule(element.parentNode, sprocket, inComposite);
		for (let node=element; node && node.nodeType === 1; node=node.parentNode) {
			if (sprockets._matches(node, sprocket, rule)) return node;
			if (node === composite) return;
		}
	},

	findAll: function(element, sprocket) { // FIXME this search is blocked by descendant composites (scopes). Is this appropriate?
		let nodeList = [];
		let rule = getMatchingSprocketRule(element, sprocket);
		if (!rule) return nodeList;
		let walker = createCompositeWalker(element, true); // skipRoot
		
		let node;
		while (node = walker.nextNode()) {
			if (matches(node, rule.selector)) nodeList.push(node);
		}
		return nodeList;
	},

	find: function(element, sprocket) { // FIXME this search is blocked by descendant composites (scopes). Is this appropriate?
		let rule = getMatchingSprocketRule(element, sprocket);
		if (!rule) return null;
		let walker = createCompositeWalker(element, true); // skipRoot
		
		let node;
		while (node = walker.nextNode()) {
			if (matches(node, rule.selector)) return node;
		}
		return null;
	},

	cast: function(element, sprocket) {
		let object = sprockets.getInterface(element);
		if (prototypeMatchesSprocket(object, sprocket)) return object;
		throw Error('Attached sprocket is not compatible');
	},

	getInterface: function(element) {
		let binding = Binding.getInterface(element);
		if (binding) return binding.object;
		let rule = getSprocketRule(element);
		if (!rule) 	throw Error('No sprocket declared'); // WARN should never happen - should be a universal fallback
		binding = attachBinding(rule.definition, element);
		return binding.object;
	},

	isComposite: function(node) {
		if (!hasData(node)) return false;
		let nodeData = getData(node);
		if (!nodeData.rules) return false;
		return true;
	},

	getComposite: function(element) { // WARN this can return `document`. Not sure if that should count
		for (let node=element; node; node=node.parentNode) {
			if (sprockets.isComposite(node)) return node;
		}
	}

	});

	function getSprocketRule(element) {
		let sprocketRule;
		let composite = sprockets.getComposite(element);
		sprocketRule = getRuleFromComposite(composite, element);
		if (sprocketRule) return sprocketRule;
		return getRuleFromComposite(document$4, element);
	}

	function getRuleFromComposite(composite, element) {
		let sprocketRule;
		let nodeData = getData(composite);
		some(nodeData.rules, function(rule) {
			if (!matches(element, rule.selector)) return false; // TODO should be using relative selector
			sprocketRule = { composite: composite };
			defaults(sprocketRule, rule);
			return true;
		});
		if (sprocketRule) return sprocketRule;
	}

	function getMatchingSprocketRule(element, sprocket, inComposite) {
		let sprocketRule;
		let composite = sprockets.getComposite(element);
		sprocketRule = getMatchingRuleFromComposite(composite, sprocket);
		if (inComposite || sprocketRule) return sprocketRule;
		return getMatchingRuleFromComposite(document$4, sprocket);
	}

	function getMatchingRuleFromComposite(composite, sprocket) {
		let sprocketRule;
		let nodeData = getData(composite);
		some(nodeData.rules, function(rule) {
			if (typeof sprocket === 'string') {
				if (rule.definition.prototype.role !== sprocket) return false;
			}
			else {
				if (sprocket.prototype !== rule.definition.prototype && !isPrototypeOf(sprocket.prototype, rule.definition.prototype)) return false;
			}
			sprocketRule = { composite: composite };
			defaults(sprocketRule, rule);
			return true;
		});
		return sprocketRule;
	}

	function prototypeMatchesSprocket(prototype, sprocket) {
		if (typeof sprocket === 'string') return (prototype.role === sprocket);
		else return (sprocket.prototype === prototype || isPrototypeOf(sprocket.prototype, prototype));
	}

	function createCompositeWalker(root, skipRoot) {
		return document$4.createNodeIterator(
				root,
				1,
				acceptNode,
				null // IE9 throws if this irrelavent argument isn't passed
			);
		
		function acceptNode(el) {
			 return (skipRoot && el === root) ? NodeFilter.FILTER_SKIP : sprockets.isComposite(el) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; 
		}
	}

	let basePrototype = {};
	sprockets.Base = new SprocketDefinition(basePrototype); // NOTE now we can extend basePrototype

	return sprockets;

	})(); // END sprockets


	/* Extend BaseSprocket.prototype */
	(function() {

	let Base = sprockets.Base;

	assign(Base.prototype, {

	find: function(selector, scope) { return find$1(selector, this.element, scope); },
	findAll: function(selector, scope) { return findAll(selector, this.element, scope); },
	matches: function(selector, scope) { return matches(this.element, selector, scope); },
	closest: function(selector, scope) { return closest(this.element, selector, scope); },

	contains: function(otherNode) { return contains(this.element, otherNode); },

	attr: function(name, value) {
		let element = this.element;
		if (typeof value === 'undefined') return element.getAttribute(name);
		if (value == null) element.removeAttribute(name);
		else element.setAttribute(name, value);
	},
	hasClass: function(token) {
		let element = this.element;
		let text = element.getAttribute('class');
		if (!text) return false;
		return includes(words(text), token);
	},
	addClass: function(token) {
		let element = this.element;
		let text = element.getAttribute('class');
		if (!text) {
			element.setAttribute('class', token);
			return;
		}
		if (includes(words(text), token)) return;
		let n = text.length,
			space = (n && text.charAt(n-1) !== ' ') ? ' ' : '';
		text += space + token;
		element.setAttribute('class', text);
	},
	removeClass: function(token) {
		let element = this.element;
		let text = element.getAttribute('class');
		if (!text) return;
		let prev = words(text);
		let next = [];
		forEach(prev, function(str) { if (str !== token) next.push(str); });
		if (prev.length === next.length) return;
		element.setAttribute('class', next.join(' '));
	},
	toggleClass: function(token, force) {
		let found = this.hasClass(token);
		if (found) {
			if (force) return true;
			this.removeClass(token);
			return false;
		}
		else {
			if (force === false) return false;
			this.addClass(token);
			return true;
		}
	},
	css: function(name, value) {
		let element = this.element;
		let isKebabCase = (name.indexOf('-') >= 0);
		if (typeof value === 'undefined') return isKebabCase ? element.style.getPropertyValue(name) : element.style[name];
		if (value == null || value === '') {
			if (isKebabCase) element.style.removeProperty(name);
			else element.style[name] = '';
		}
		else {
			if (isKebabCase) element.style.setProperty(name, value);
			else element.style[name] = value;
		}
	},

	trigger: function(type, params) {
		return dispatchEvent(this.element, type, params);
	}


	});

	// Element.prototype.hidden and visibilitychange event
	let Element = window.Element || window.HTMLElement;

	Object.defineProperty(Element.prototype, '$', {
		get: function() { return sprockets.getInterface(this); }
	});

	})();

	(function() {

	let ariaProperties = { // TODO this lookup is only for default values
		hidden: false,
		selected: false,
		expanded: true
	};

	let Base = sprockets.Base;

	let ARIA = sprockets.evolve(Base, {

	role: 'roletype',

	aria: function(name, value) {
		let element = this.element;
		let defn = ariaProperties[name];
		if (defn == null) throw Error('No such aria property: ' + name);

		if (name === 'hidden') {
			if (typeof value === 'undefined') return element.hasAttribute('hidden');
			if (!value) element.removeAttribute('hidden');
			else element.setAttribute('hidden', '');
			return;
		}
		
		let ariaName = 'aria-' + name;
		let type = typeof defn;
		if (typeof value === 'undefined') {
			let result = element.getAttribute(ariaName);
			switch(type) {
			case 'string': default: return result;
			case 'boolean': return result === 'false' ? false : result == null ? undefined : true;
			}
		}
		if (value == null) element.removeAttribute(ariaName);
		else switch(type) {
			case 'string': default:
				element.setAttribute(ariaName, value);
				break;
			case 'boolean':
				let bool = value === 'false' ? 'false' : value === false ? 'false' : 'true';
				element.setAttribute(ariaName, bool);
				break;
		}
	},

	ariaCan: function(name, value) {
		let desc = this.__properties__[name];
		if (!desc) throw Error('Property not defined: ' + name);
		if (desc.type !== 'boolean' || desc.can && !desc.can.call(this)) return false;
		return true;
	},

	ariaToggle: function(name, value) {
		let desc = this.__properties__[name];
		if (!desc) throw Error('Property not defined: ' + name);
		if (desc.type !== 'boolean' || desc.can && !desc.can.call(this)) throw Error('Property can not toggle: ' + name);
		let oldValue = desc.get.call(this);
		
		if (typeof value === 'undefined') desc.set.call(this, !oldValue);
		else desc.set.call(this, !!value);
		return oldValue;
	},

	ariaGet: function(name) {
		let desc = this.__properties__[name];
		if (!desc) throw Error('Property not defined: ' + name);
		return desc.get.call(this); // TODO type and error handling
	},

	ariaSet: function(name, value) {
		let desc = this.__properties__[name];
		if (!desc) throw Error('Property not defined: ' + name);
		return desc.set.call(this, value); // TODO type and error handling
	}

	});

	let RoleType = sprockets.evolve(ARIA, {

	hidden: {
		type: 'boolean',
		can: function() { return true; },
		get: function() { return this.aria('hidden'); },
		set: function(value) { this.aria('hidden', !!value); }
	}

	});

	sprockets.ARIA = ARIA;
	sprockets.RoleType = RoleType;
	sprockets.register('*', RoleType);

	let Element = window.Element || window.HTMLElement;

	defaults(Element.prototype, { // NOTE this assumes that the declared sprocket for every element is derived from ARIA

	aria: function(prop, value) {
		return this.$.aria(prop, value);
	},

	ariaCan: function(prop) {
		return this.$.ariaCan(prop);
	},

	ariaToggle: function(prop, value) {
		return this.$.ariaToggle(prop, value);
	},

	ariaGet: function(prop) {
		return this.$.ariaGet(prop);
	},

	ariaSet: function(prop, value) {
		return this.$.ariaSet(prop, value);
	},

	ariaFind: function(role) {
		return sprockets.find(this, role);
	},

	ariaFindAll: function(role) {
		return sprockets.findAll(this, role);	
	},

	ariaClosest: function(role) {
		return sprockets.closest(this, role);
	},

	ariaMatches: function(role) {
		return sprockets.matches(this, role);
	}
		
	});


	})();

	// TODO should this be under Meeko.sprockets??

	let controllers = {

	values: {},

	listeners: {},

	create: function(name) {
	        this.values[name] = [];
	        this.listeners[name] = [];
	},

	has: function(name) {
	        return (name in this.values);
	},

	get: function(name) { 
	        if (!this.has(name)) throw name + ' is not a registered controller';
	        return this.values[name];
	},

	set: function(name, value) {
	        if (!this.has(name)) throw name + ' is not a registered controller';
	        if (value === false || value == null) value = [];
	        else if (typeof value === 'string' || !('length' in value)) value = [ value ];
	        let oldValue = this.values[name];
	        if (difference(value, oldValue).length <= 0) return;
	        this.values[name] = value;
	        forEach(this.listeners[name], function(listener) {
	                Task.asap(function() { listener(value); });
	        });     
	},

	listen: function(name, listener) {
	        if (!this.has(name)) throw name + ' is not a registered controller';
	        this.listeners[name].push(listener);
	        let value = this.values[name];
	        Task.asap(function() { listener(value); });
	}

	};

	/*
		HTML_IN_DOMPARSER indicates if DOMParser supports 'text/html' parsing. Historically only Firefox did.
		Cross-browser support coming? https://developer.mozilla.org/en-US/docs/Web/API/DOMParser#Browser_compatibility
	*/
	const HTML_IN_DOMPARSER = (function() {

		try {
			let doc = (new DOMParser).parseFromString('', 'text/html');
			return !!doc;
		}
		catch(err) { return false; }

	})();


	/*
		normalize() is called between html-parsing (internal) and document normalising (external function).
		It is called after using the native parser:
		- with DOMParser#parseFromString(), see htmlParser#nativeParser()
		- with XMLHttpRequest & xhr.responseType='document', see httpProxy's request()
		The innerHTMLParser also uses this call
	*/
	function normalize(doc, details) { 

		let baseURL = URL(details.url);

		forEach(findAll('style', doc.body), function(node) {
			if (node.hasAttribute('scoped')) return; // ignore
			doc.head.appendChild(node); // NOTE no adoption
		});
		
		forEach(findAll('style', doc), function(node) {
			// TODO the following rewrites url() property values but isn't robust
			let text = node.textContent;
			let replacements = 0;
			text = text.replace(/\burl\(\s*(['"]?)([^\r\n]*)\1\s*\)/ig, function(match, quote, url) {
					let absURL = baseURL.resolve(url);
					if (absURL === url) return match;
					replacements++;
					return "url(" + quote + absURL + quote + ")";
				});
			if (replacements) node.textContent = text;
		});

		return resolveAll(doc, baseURL);
	}

	/*
		resolveAll() resolves all URL attributes
	*/
	let urlAttributes$1 = URL.attributes;

	function resolveAll(doc, baseURL) {

		return Promise.pipe(null, [

		function () {
			let selector = Object.keys(urlAttributes$1).join(', ');
			return findAll(selector, doc);
		},

		function(nodeList) {
			return Promise.reduce(null, nodeList, function(dummy, el) {
				let tag = getTagName(el);
				let attrList = urlAttributes$1[tag];
				forOwn(attrList, function(attrDesc, attrName) {
					if (!el.hasAttribute(attrName)) return;
					attrDesc.resolve(el, baseURL);
				});
			});
		},

		function() {
			return doc;
		}

		]);

	}

	function nativeParser(html, details) {

		return Promise.pipe(null, [
			
		function() {
			let doc = (new DOMParser).parseFromString(html, 'text/html');
			return normalize(doc, details);
		}
		
		]);

	}

	function innerHTMLParser(html, details) {
		return Promise.pipe(null, [
			
		function() {
			let doc = createHTMLDocument('');
			let docElement = doc.documentElement;
			docElement.innerHTML = html;
			let m = html.match(/<html(?=\s|>)(?:[^>]*)>/i); // WARN this assumes there are no comments containing '<html' and no attributes containing '>'.
			let div = document.createElement('div');
			div.innerHTML = m[0].replace(/^<html/i, '<div');
			let htmlElement = div.firstChild;
			copyAttributes(docElement, htmlElement);
			return doc;
		},
		
		function(doc) {
			return normalize(doc, details);
		}
		
		]);
	}

	var htmlParser = {
		HTML_IN_DOMPARSER,
		parse: HTML_IN_DOMPARSER ? nativeParser : innerHTMLParser,
		normalize
	};

	/*
		HTML_IN_XHR indicates if XMLHttpRequest supports HTML parsing
	*/
	const HTML_IN_XHR = (function() { // FIXME more testing, especially Webkit
		if (!window.XMLHttpRequest) return false;
		let xhr = new XMLHttpRequest;
		if (!('responseType' in xhr)) return false;
		if (!('response' in xhr)) return false;
		xhr.open('get', document.URL, true);

		try { xhr.responseType = 'document'; } // not sure if any browser throws for this, but they should
		catch (err) { return false; }

		try { if (xhr.responseText == '') return false; } // Opera-12. Other browsers will throw
		catch(err) { }

		try { if (xhr.status) return false; } // this should be 0 but throws on Chrome and Safari-5.1
		catch(err) { // Chrome and Safari-5.1
			xhr.abort(); 
			try { xhr.responseType = 'document'; } // throws on Safari-5.1 which doesn't support HTML requests 
			catch(err2) { return false; }
		}

		return true;
	})();


	let httpProxy = (function() {

		let methods = words('get'); // TODO words('get post put delete');
		let responseTypes = words('document'); // TODO words('document json text');
		let defaultInfo = {
			method: 'get',
			responseType: 'document'
		};

	// NOTE cache, etc is currently used only for landing page
	// TODO test that cacheAdd/Lookup doesn't trigger new XHR when url already pending
	// TODO an API like ServiceWorker may be more appropriate
		let cache = [];

		function cacheAdd(request, response) {
			let rq = defaults({}, request);

			let entry = {
				invalid: false,
				request: rq
			};

			if (Promise.isPromise(response)) entry.response = response.then(
				cloneResponse,
				function (status) {
					entry.invalid = true;
					entry.response = null;
				}
			);
			else entry.response = cloneResponse(response);

			cache.push(entry);
		}

		function cacheLookup(request) {
			let entry = find(cache, function (entry) {
				if (!cacheMatch(request, entry)) return false;
				return true;
			});
			if (!(entry && entry.response)) return;
			let response = entry.response;
			if (Promise.isPromise(response)) return response.then(cloneResponse);
			else return cloneResponse(response);
		}

		function cacheMatch(request, entry) {
			if (entry.invalid || entry.response == null) return false;
			if (request.url !== entry.request.url) return false;
			// FIXME what testing is appropriate?? `method`, other headers??
			return true;
		}

		function cloneResponse(response) {
			let resp = defaults({}, response);
			resp.document = cloneDocument(response.document); // TODO handle other response types
			return resp;
		}


		let httpProxy = {

			HTML_IN_XHR: HTML_IN_XHR,

			add: function (response) { // NOTE this is only for the landing page
				let url = response.url;
				if (!url) throw Error('Invalid url in response object');
				if (!includes(responseTypes, response.type)) throw Error('Invalid type in response object');
				let request = {
					url: response.url
				};
				defaults(request, defaultInfo);
				return Promise.pipe(undefined, [

					function () {
						return htmlParser.normalize(response.document, request);
					},
					function (doc) {
						response.document = doc;
						cacheAdd(request, response);
					}

				]);
			},

			load: function (url, requestInfo) {
				let info = {
					url: url
				};
				if (requestInfo) defaults(info, requestInfo);
				defaults(info, defaultInfo);
				if (!includes(methods, info.method)) throw Error('method not supported: ' + info.method);
				if (!includes(responseTypes, info.responseType)) throw Error('responseType not supported: ' + info.responseType);
				return request(info);
			}

		};

		let request = function (info) {
			let method = lc(info.method);
			switch (method) {
				case 'post':
					throw Error('POST not supported'); // FIXME proper error handling
					info.body = serialize(info.body, info.type);
					return doRequest(info);
					break;
				case 'get':
					let response = cacheLookup(info);
					if (response) return Promise.resolve(response);
					return doRequest(info)
						.then(function (response) {
							cacheAdd(info, response);
							return response;
						});
					break;
				default:
					throw Error(uc(method) + ' not supported');
					break;
			}
		};

		let doRequest = function (info) {
			return new Promise(function (resolve, reject) {
				let method = info.method;
				let url = info.url;
				let sendText = info.body; // FIXME not-implemented
				let xhr = new XMLHttpRequest;
				xhr.onreadystatechange = onchange;
				xhr.open(method, url, true);
				if (HTML_IN_XHR) {
					xhr.responseType = info.responseType;
					// WARN overrideMimeType is needed for file:/// on Firefox
					// TODO test cross-browser
					// FIXME shouldn't be assuming text/html
					if (info.responseType === 'document' && xhr.overrideMimeType) xhr.overrideMimeType('text/html');
				}
				xhr.send(sendText);

				function onchange() { // FIXME rewrite this to use onload/onerror/onabort/ontimeout
					if (xhr.readyState != 4) return;
					let protocol = new URL(url).protocol;
					switch (protocol) {
						case 'http:':
						case 'https:':
							switch (xhr.status) {
								default:
									reject(function () {
										throw Error('Unexpected status ' + xhr.status + ' for ' + url);
									});
									return;

								// FIXME what about other status codes?
								case 200:
									break; // successful so just continue
							}
							break;

						default:
							if (HTML_IN_XHR ? !xhr.response : !xhr.responseText) {
								reject(function () {
									throw Error('No response for ' + url);
								});
								return;
							}
							break;
					}

					Promise.defer(onload); // Use delay to stop the readystatechange event interrupting other event handlers (on IE).
				}

				function onload() {
					let result = handleResponse(xhr, info);
					resolve(result);
				}
			});
		};

		function handleResponse(xhr, info) { // TODO handle info.responseType
			let response = {
				url: info.url,
				type: info.responseType,
				status: xhr.status,
				statusText: xhr.statusText
			};
			if (HTML_IN_XHR) {
				return htmlParser.normalize(xhr.response, info)
					.then(function (doc) {
						response.document = doc;
						return response;
					});
			} else {
				return htmlParser.parse(new String(xhr.responseText), info)
					.then(function (doc) {
						response.document = doc;
						return response;
					});
			}
		}

		return httpProxy;
	})();

	// wrapper for `history` mostly to provide locking around state-updates and throttling of popstate events
	let historyManager = (function() {

	let historyManager = {};

	const STATE_TAG = 'HyperFrameset';
	let currentState;
	let popStateHandler;
	let started = false;

	defaults(historyManager, {

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
	};

	defaults(State.prototype, {

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

	};

	return scheduler;

	})();

	let CustomNamespace = (function() {

	function CustomNamespace(options) {
		if (!(this instanceof CustomNamespace)) return new CustomNamespace(options);
		if (!options) return; // WARN for cloning / inheritance
		let style = options.style = lc(options.style);
		let styleInfo = find(CustomNamespace.namespaceStyles, function(styleInfo) {
			return styleInfo.style === style;
		});
		if (!styleInfo) throw Error('Unexpected namespace style: ' + style);
		let name = options.name = lc(options.name);
		if (!name) throw Error('Unexpected name: ' + name);
		
		let nsDef = this;
		assign(nsDef, options);
		let separator = styleInfo.separator;
		nsDef.prefix = nsDef.name + separator;
		nsDef.selectorPrefix = nsDef.name + (separator === ':' ? '\\:' : separator);
	}

	defaults(CustomNamespace.prototype, {

	clone: function() {
		let clone = new CustomNamespace();
		assign(clone, this);
		return clone;
	},

	lookupTagName: function(name) { return this.prefix + name; },
	lookupSelector: function(selector) {
		let prefix = this.selectorPrefix;
		let tags = selector.split(/\s*,\s*|\s+/);
		return map(tags, function(tag) { return prefix + tag; }).join(', ');
	}

	});

	CustomNamespace.namespaceStyles = [
		{
			style: 'vendor',
			configNamespace: 'custom',
			separator: '-'
		},
		{
			style: 'xml',
			configNamespace: 'xmlns',
			separator: ':'
		}
	];

	forOwn(CustomNamespace.namespaceStyles, function(styleInfo) {
		styleInfo.configPrefix = styleInfo.configNamespace + styleInfo.separator;
	});

	CustomNamespace.getNamespaces = function(doc) { // NOTE modelled on IE8, IE9 document.namespaces interface
		return new NamespaceCollection(doc);
	};

	return CustomNamespace;

	})();

	let NamespaceCollection = function(doc) {
		if (!(this instanceof NamespaceCollection)) return new NamespaceCollection(doc);
		this.items = [];
		if (!doc) return; // WARN for cloning / inheritance
		this.init(doc); 
	};

	assign(NamespaceCollection.prototype, {

	init: function(doc) {
		let coll = this;
		forEach(map(doc.documentElement.attributes), function(attr) {
			let fullName = lc(attr.name);
			let styleInfo = find(CustomNamespace.namespaceStyles, function(styleInfo) {
				return (fullName.indexOf(styleInfo.configPrefix) === 0);
			});
			if (!styleInfo) return;
			let name = fullName.substr(styleInfo.configPrefix.length);
			let nsDef = new CustomNamespace({
				urn: attr.value,
				name: name,
				style: styleInfo.style
			});
			coll.add(nsDef);
		});
	},

	clone: function() {
		let coll = new NamespaceCollection();
		forEach(this.items, function(nsDef) { 
			coll.items.push(nsDef.clone());
		});
		return coll;
	},

	add: function(nsDef) {
		let coll = this;
		let matchingNS = find(coll.items, function(def) {
			if (lc(def.urn) === lc(nsDef.urn)) {
				if (def.prefix !== nsDef.prefix) console.warn('Attempted to add namespace with same urn as one already present: ' + def.urn);
				return true;
			}
			if (def.prefix === nsDef.prefix) {
				if (lc(def.urn) !== lc(nsDef.urn)) console.warn('Attempted to add namespace with same prefix as one already present: ' + def.prefix);
				return true;
			}
		});
		if (matchingNS) return;
		coll.items.push(nsDef);
	},

	lookupNamespace: function(urn) {
		let coll = this;
		urn = lc(urn);
		let nsDef = find(coll.items, function(def) {
			return (lc(def.urn) === urn);
		});
		return nsDef;
	},


	lookupPrefix: function(urn) {
		let coll = this;
		let nsDef = coll.lookupNamespace(urn);
		return nsDef && nsDef.prefix;
	},

	lookupNamespaceURI: function(prefix) {
		let coll = this;
		prefix = lc(prefix);
		let nsDef = find(coll.items, function(def) {
			return (def.prefix === prefix);
		});
		return nsDef && nsDef.urn;
	},

	lookupTagNameNS: function(name, urn) {
		let coll = this;
		let nsDef = coll.lookupNamespace(urn);
		if (!nsDef) return name; // TODO is this correct?
		return nsDef.prefix + name; // TODO _.lc(name) ??
	},

	lookupSelector: function(selector, urn) {
		let nsDef = this.lookupNamespace(urn);
		if (!nsDef) return selector;
		return nsDef.lookupSelector(selector);
	}

	});

	let filters = new Registry({
		writeOnce: true,
		testKey: function(key) {
			return /^[_a-zA-Z][_a-zA-Z0-9]*$/.test(key);
		},
		testValue: function(fn) {
			return typeof fn === 'function';
		}
	});

	assign(filters, {

	evaluate: function(name, value, params) {
		let fn = this.get(name);
		// NOTE filter functions should only accept string_or_number_or_boolean
		// FIXME Need to wrap fn() to assert / cast supplied value and accept params
		let args = params.slice(0);
		args.unshift(value);
		return fn.apply(undefined, args);
	}

	});

	// FIXME filters need sanity checking
	filters.register('lowercase', function(value, text) {
		return value.toLowerCase();
	});

	filters.register('uppercase', function(value, text) {
		return value.toUpperCase();
	});

	filters.register('if', function(value, yep) {
		return (!!value) ? yep : value;
	});

	filters.register('unless', function(value, nope) {
		return (!value) ? nope : value;
	});

	filters.register('if_unless', function(value, yep, nope) {
		return (!!value) ? yep : nope;
	});

	filters.register('map', function(value, dict) { // dict can be {} or []

		if (Array.isArray(dict)) {
			let patterns = filter(dict, function(item, i) { return !(i % 2); });
			let results = filter(dict, function(item, i) { return !!(i % 2); });
			some(patterns, function(pattern, i) {
				// FIXME what if pattern not RegExp && not string??
				if (!(pattern instanceof RegExp)) pattern = new RegExp('^' + pattern + '$');
				if (!pattern.test(value)) return false;
				value = results[i];
				return true;
			});
			return value;
		}

		if (value in dict) return dict[value]; // TODO sanity check before returning
		return value;
	});

	filters.register('match', function(value, pattern, yep, nope) {
		// FIXME what if pattern not RegExp && not string??
		if (!(pattern instanceof RegExp)) pattern = new RegExp('^' + pattern + '$'); // FIXME sanity TODO case-insensitive??
		let bMatch = pattern.test(value);
		if (yep != null && bMatch) return yep;
		if (nope != null && !bMatch) return nope;
		return bMatch;
	});

	filters.register('replace', function(value, pattern, text) {
		return value.replace(pattern, text); // TODO sanity check before returning
	});

	filters.register('date', function(value, format, utc) {
		return dateFormat(value, format, utc);
	});

	let decoders = new Registry({
		writeOnce: true,
		testKey: function(key) {
			return typeof key === 'string' && /^[_a-zA-Z][_a-zA-Z0-9]*/.test(key);
		},
		testValue: function(constructor) {
			return typeof constructor === 'function';
		}
	});

	assign(decoders, {

	create: function(type, options, namespaces) {
		let constructor = this.get(type);
		return new constructor(options, namespaces);
	}

	});

	// FIXME textAttr & htmlAttr used in HazardProcessor & CSSDecoder
	const textAttr = '_text';
	const htmlAttr = '_html';
	// TODO what about tagnameAttr, namespaceAttr

	const CSS_CONTEXT_VARIABLE = '_';

	function CSSDecoder(options, namespaces) {}

	defaults(CSSDecoder.prototype, {

	init: function(node) {
		this.srcNode = node;
	},

	// TODO should matches() support Hazard variables
	matches: function(element, query) { // FIXME refactor common-code in matches / evaluate
		let queryParts = query.match(/^\s*([^{]*)\s*(?:\{\s*([^}]*)\s*\}\s*)?$/);
		let selector = queryParts[1];
		let attr = queryParts[2];
		if (!matches$1(element, selector)) return;
		let node = element;
		let result = node;

		if (attr) {
			attr = attr.trim();
			if (attr.charAt(0) === '@') attr = attr.substr(1);
			result = getAttr(node, attr);
		}

		return result;

		function getAttr(node, attr) {
			switch(attr) {
			case null: case undefined: case '': return node;
			case textAttr: 
				return node.textContent;
			case htmlAttr:
				let frag = doc.createDocumentFragment();
				forEach(node.childNodes, function(child) { 
					frag.appendChild(doc.importNode(child, true)); // TODO does `child` really need to be cloned??
				});
				return frag;
			default: 
				return node.getAttribute(attr);
			}
		}


	},

	evaluate: function(query, context, variables, wantArray) {
		if (!context) context = this.srcNode;
		let doc = context.nodeType === 9 ? context : context.ownerDocument; // FIXME which document??
		let queryParts = query.match(/^\s*([^{]*)\s*(?:\{\s*([^}]*)\s*\}\s*)?$/);
		let selector = queryParts[1];
		let attr = queryParts[2];
		let result = find$2(selector, context, variables, wantArray);

		if (attr) {
			attr = attr.trim();
			if (attr.charAt(0) === '@') attr = attr.substr(1);

			if (!wantArray) result = [ result ];
			result = map(result, function(node) {
				return getAttr(node, attr);
			});
			if (!wantArray) result = result[0];
		}

		return result;

		function getAttr(node, attr) {
			switch(attr) {
			case null: case undefined: case '': return node;
			case textAttr: 
				return node.textContent;
			case htmlAttr:
				let frag = doc.createDocumentFragment();
				forEach(node.childNodes, function(child) { 
					frag.appendChild(doc.importNode(child, true)); // TODO does `child` really need to be cloned??
				});
				return frag;
			default: 
				return node.getAttribute(attr);
			}
		}

	}

	});

	function matches$1(element, selectorGroup) {
		if (selectorGroup.trim() === '') return;
		return matches(element, selectorGroup);
	}

	function find$2(selectorGroup, context, variables, wantArray) { // FIXME currently only implements `context` expansion
		selectorGroup = selectorGroup.trim();
		if (selectorGroup === '') return wantArray ? [ context ] : context;
		let nullResult = wantArray ? [] : null;
		let selectors = selectorGroup.split(/,(?![^\(]*\)|[^\[]*\])/);
		selectors = map(selectors, function(s) { return s.trim(); });

		let invalidVarUse = false;
		let contextVar;
		forEach(selectors, function(s, i) {
			let m = s.match(/\\?\$[_a-zA-Z][_a-zA-Z0-9]*\b/g);
			if (!m) {
				if (i > 0 && contextVar) {
					invalidVarUse = true;
					console.warn('All individual selectors in a selector-group must share same context: ' + selectorGroup);
				}
				return; // if no matches then m will be null not []
			}
			forEach(m, function(varRef, j) {
				if (varRef.charAt(0) === '\\') return; // Ignore "\$"
				let varName = varRef.substr(1);
				let varPos = s.indexOf(varRef);
				if (j > 0 || varPos > 0) {
					invalidVarUse = true;
					console.warn('Invalid use of ' + varRef + ' in ' + selectorGroup);
					return;
				}
				if (i > 0) {
					if (varName !== contextVar) {
						invalidVarUse = true;
						console.warn('All individual selectors in a selector-group must share same context: ' + selectorGroup);
					}
					return;
				}
				contextVar = varName;
			});
		});

		if (invalidVarUse) {
			console.error('Invalid use of variables in CSS selector. Assuming no match.');
			return nullResult;
		}

		if (contextVar && contextVar !== CSS_CONTEXT_VARIABLE) {
			if (!variables.has(contextVar)) {
				console.debug('Context variable $' + contextVar + ' not defined for ' + selectorGroup);
				return nullResult;
			}
			if (contextVar !== CSS_CONTEXT_VARIABLE) context = variables.get(contextVar);

			// NOTE if the selector is just '$variable' then 
			// context doesn't even need to be a node
			if (selectorGroup === '$' + contextVar) return context;

			if (!(context && context.nodeType === 1)) {
				console.debug('Context variable $' + contextVar + ' not an element in ' + selectorGroup);
				return nullResult;
			}
		}

		let isRoot = false;
		if (context.nodeType === 9 || context.nodeType === 11) isRoot = true;

		selectors = filter(selectors, function(s) {
				switch(s.charAt(0)) {
				case '+': case '~': 
					console.warn('Siblings of context-node cannot be selected in ' + selectorGroup);
					return false;
				case '>': return (isRoot) ? false : true; // FIXME probably should be allowed even if isRoot
				default: return true;
				}
			});

		if (selectors.length <= 0) return nullResult;

		selectors = map(selectors, function(s) {
				if (isRoot) return s;
				let prefix = ':scope';
				return (contextVar) ? 
					s.replace('$' + contextVar, prefix) : 
					prefix + ' ' + s;
			});
		
		let finalSelector = selectors.join(', ');

		if (wantArray) {
			return findAll(finalSelector, context, !isRoot, !isRoot);
		}
		else {
			return find$1(finalSelector, context, !isRoot, !isRoot);
		}
	}

	let document$5 = window.document;

	let Microdata = (function() {

	function intersects(a1, a2) { // TODO add to Meeko.stuff
		return some(a1, function(i1) {
			return some(a2, function(i2) { 
				return i2 === i1; 
			});
		});
	}

	function walkTree(root, skipRoot, callback) { // callback(el) must return NodeFilter code
		let walker = document$5.createNodeIterator(
				root,
				1,
				acceptNode,
				null // IE9 throws if this irrelavent argument isn't passed
			);
		
		let el;
		while (el = walker.nextNode());

		function acceptNode(el) {
			if (skipRoot && el === root) return NodeFilter.FILTER_SKIP;
			return callback(el);
		}
	}

	// TODO copied from DOMSprockets. Could be a generic "class"

	let nodeIdProperty = '__microdata__';
	let nodeCount = 0; // used to generated node IDs
	let nodeStorage = {}; // hash of storage for nodes, keyed off `nodeIdProperty`

	let uniqueId = function(node) {
		let nodeId = node[nodeIdProperty];
		if (nodeId) return nodeId;
		nodeId = nodeCount++; // TODO stringify??
		node[nodeIdProperty] = new String(nodeId); // NOTE so that node cloning in old IE doesn't copy the node ID property
		return nodeId;
	};

	let setData = function(node, data) { // FIXME assert node is element
		let nodeId = uniqueId(node);
		nodeStorage[nodeId] = data;
	};

	let hasData = function(node) {
		let nodeId = node[nodeIdProperty];
		return !nodeId ? false : nodeId in nodeStorage;
	};

	let getData = function(node) { // TODO should this throw if no data?
		let nodeId = node[nodeIdProperty];
		if (!nodeId) return;
		return nodeStorage[nodeId];
	};


	function getItems(rootNode, type) {
		if (!hasData(rootNode)) parse(rootNode);

		let scope = getData(rootNode);
		let typeList =
			(typeof type === 'string') ? words(type.trim()) :
			type && type.length ? type :
			[];
				
		let resultList = [];

		forEach(scope.properties.names, function(propName) {
			let propList = scope.properties.namedItem(propName);
			forEach(propList, function(prop) {
				if (prop.isScope) [].push.apply(resultList, getItems(prop.element, typeList));
			});
		});

		forEach(scope.childScopes, function(scope) {
			if (!typeList.length || intersects(scope.type, typeList)) resultList.push(scope);
			[].push.apply(resultList, getItems(scope.element, typeList));
		});

		// now convert descriptors back to nodes
		forEach(resultList, function(desc, i) {
			resultList[i] = desc.element;
		});
		return resultList;
	}

	function getProperties(el) {
		if (!hasData(el)) return;
		let desc = getData(el);
		if (!desc.isScope) return;
		return desc.properties;
	}

	function parse(rootNode) {
		if (!rootNode) rootNode = document$5;
		let desc = getScopeDesc(rootNode);
	}

	function getScopeDesc(scopeEl) {
		if (hasData(scopeEl)) return getData(scopeEl);
		
		let scopeDesc = {
			element: scopeEl,
			isScope: true,
			type: scopeEl.nodeType === 1 || words(scopeEl.getAttribute('itemtype')),
			properties: createHTMLPropertiesCollection(),
			childScopes: []
		};

		walkTree(scopeEl, true, function(el) {
			let isScope = el.hasAttribute('itemscope');
			let propName = el.getAttribute('itemprop');
			if (!(isScope || propName)) return NodeFilter.FILTER_SKIP;
			
			let item = isScope ? getScopeDesc(el) : getPropDesc(el);
			if (propName) scopeDesc.properties.addNamedItem(propName, el);
			else scopeDesc.childScopes.push(el);

			return isScope ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
		});

		setData(scopeEl, scopeDesc);
		return scopeDesc;
	}
		
	function getValue(el) {
		if (hasData(el)) return getData(el).value;
		let desc = getPropDesc(el);
		setData(el, desc);
		return desc.value;
	}

	function getPropDesc(el) {
		if (hasData(el)) return getData(el);

		let name = el.getAttribute('itemprop');
		
		let prop = {
			name: name,
			value: evaluate(el)
		};
		
		setData(el, prop);
		return prop;
	}

	function evaluate(el) {
		let tagName = el.tagName.toLowerCase();
		let attrName = valueAttr[tagName];
		if (attrName) return el[attrName] || el.getAttribute(attrName);

		return el;
	}

	function createHTMLPropertiesCollection() {
		let list = [];
		list.names = [];
		list.nodeLists = {};
		assign(list, HTMLPropertiesCollection.prototype);
		return list;
	}

	let HTMLPropertiesCollection = function() {};
	assign(HTMLPropertiesCollection.prototype, {

	namedItem: function(name) {
		return this.nodeLists[name];
	},

	addNamedItem: function(name, el) {
		this.push(el);
		if (!this.nodeLists[name]) {
			this.nodeLists[name] = [];
			this.names.push(name);
		}
		this.nodeLists[name].push(el);
	}

	});


	let valueAttr = {};
	forEach(words("meta@content link@href a@href area@href img@src video@src audio@src source@src track@src iframe@src embed@src object@data time@datetime data@value meter@value"), function(text) {
		let m = text.split("@"), tagName = m[0], attrName = m[1];
		valueAttr[tagName] = attrName;
	});


	return {

	getItems: getItems,
	getProperties: getProperties,
	getValue: getValue

	}

	})();


	function MicrodataDecoder(options, namespaces) {}

	defaults(MicrodataDecoder.prototype, {

	init: function(node) {
		Microdata.getItems(node);
		this.rootNode = node;
	},

	evaluate: function(query, context, variables, wantArray) {
		if (!context) context = this.rootNode;

		query = query.trim();
		let startAtRoot = false;
		let baseSchema;
		let pathParts;

		if (query === '.') return (wantArray) ? [ context ] : context;

		let m = query.match(/^(?:(\^)?\[([^\]]*)\]\.)/);
		if (m && m.length) {
			query = query.substr(m[0].length);
			startAtRoot = !!m[1];
			baseSchema = words(m[2].trim());
		}
		pathParts = words(query.trim());
		
		let nodes;
		if (baseSchema) {
			if (startAtRoot) context = this.view;
			nodes = Microdata.getItems(context, baseSchema);	
		}
		else nodes = [ context ];

		let resultList = nodes;
		forEach(pathParts, function(relPath, i) {
			let parents = resultList;
			resultList = [];
			forEach(parents, function(el) {
				let props = Microdata.getProperties(el);
				if (!props) return;
				let nodeList = props.namedItem(relPath);
				if (!nodeList) return;
				[].push.apply(resultList, nodeList);
			});
		});

		// now convert elements to values
		resultList = map(resultList, function(el) {
			let props = Microdata.getProperties(el);
			if (props) return el;
			return Microdata.getValue(el);
		});

		if (wantArray) return resultList;

		return resultList[0];
	}

	});

	// FIXME not really a JSON decoder since expects JSON input and 
	// doesn't use JSON paths

	function JSONDecoder(options, namespaces) {}

	defaults(JSONDecoder.prototype, {

	init: function(object) {
		if (typeof object !== 'object' || object === null) throw 'JSONDecoder cannot handle non-object';
		this.object = object;
	},

	evaluate: function(query, context, variables, wantArray) {
		if (!context) context = this.object;

		query = query.trim();
		let pathParts;

		if (query === '.') return (wantArray) ? [ context ] : context;

		let m = query.match(/^\^/);
		if (m && m.length) {
			query = query.substr(m[0].length);
			context = this.object;
		}
		pathParts = query.split('.');
		
		let resultList = [ context ];
		forEach(pathParts, function(relPath, i) {
			let parents = resultList;
			resultList = [];
			forEach(parents, function(item) {
				let child = item[relPath];
				if (child != null) {
					if (Array.isArray(child)) [].push.apply(resultList, child);
					else resultList.push(child);
				}
			});
		});

		if (wantArray) return resultList;

		let value = resultList[0];
		return value;
	}

	});

	decoders.register('css', CSSDecoder);

	decoders.register('microdata', MicrodataDecoder);

	decoders.register('json', JSONDecoder);

	/*!
	 * HyperFrameset Processors
	 * Copyright 2014-2015 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */

	let processors = new Registry({
		writeOnce: true,
		testKey: function(key) {
			return typeof key === 'string' && /^[_a-zA-Z][_a-zA-Z0-9]*/.test(key);
		},
		testValue: function(constructor) {
			return typeof constructor === 'function';
		}
	});

	assign(processors, {

	create: function(type, options, namespaces) {
		let constructor = this.get(type);
		return new constructor(options, namespaces);
	}

	});

	/*!
	 * MainProcessor
	 * Copyright 2014-2016 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */

	function MainProcessor(options) {}

	defaults(MainProcessor.prototype, {

	loadTemplate: function(template) {
		if (/\S+/.test(template.textContent)) console.warn('"main" transforms do not use templates');
	},

	transform: function(provider, details) { // TODO how to use details?
		let srcNode = provider.srcNode;
		let srcDoc = srcNode.nodeType === 9 ? srcNode : srcNode.ownerDocument;
		let main;
		if (!main) main = find$1('main, [role=main]', srcNode);
		if (!main && srcNode === srcDoc) main = srcDoc.body;
		if (!main) main = srcNode;

		let frag = srcDoc.createDocumentFragment();
		let node;
		while (node = main.firstChild) frag.appendChild(node); // NOTE no adoption
		return frag;
	}
		
	});

	/*!
	 * ScriptProcessor
	 * Copyright 2014-2016 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */

	function ScriptProcessor(options) {
		this.processor = options;
	}

	defaults(ScriptProcessor.prototype, {

	loadTemplate: function(template) {
		let script;
		forEach(map(template.childNodes), function(node) {
			switch (node.nodeType) {
			case 1: // Element
				switch (getTagName(node)) {
				case 'script':
					if (script) console.warn('Ignoring secondary <script> in "script" transform template');
					else script = node;
					return;
				default:
					console.warn('Ignoring unexpected non-<script> element in "script" transform template');
					return;
				}
				break; // should never reach here
			case 3: // Text
				if (/\S+/.test(node.nodeValue)) console.warn('"script" transforms should not have non-empty text-nodes');
				return;
			case 8: // Comment
				return;
			default:
				console.warn('Unexpected node in "script" transform template');
				return;
			}
		});
		if (!script) {
			// no problem if already a processor defined in new ScriptProcessor(options)
			if (this.processor) return;
			console.warn('No <script> found in "script" transform template');
			return;
		}
		try { this.processor = (Function('return (' + script.text + ')'))(); }
		catch(err) { Task.postError(err); }
		
		if (!this.processor || !this.processor.transform) {
			console.warn('"script" transform template did not produce valid transform object');
			return;
		}
	},

	transform: function(provider, details) {
		let srcNode = provider.srcNode;
		if (!this.processor || !this.processor.transform) {
			console.warn('"script" transform template did not produce valid transform object');
			return;
		}
		return this.processor.transform(srcNode, details);
	}
		
	});

	/*!
	 * HazardProcessor
	 * Copyright 2014-2016 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */

	let document$6 = window.document;

	// NOTE textAttr & htmlAttr used in HazardProcessor & CSSDecoder
	const textAttr$1 = '_text';
	const htmlAttr$1 = '_html';

	const PIPE_OPERATOR = '//>';

	const HYPERFRAMESET_URN = 'hyperframeset'; // FIXME DRY with libHyperFrameset.js

	/* WARN 
		on IE11 and Edge, certain elements (or attrs) *not* attached to a document 
		can trash the layout engine. Examples:
			- <custom-element>
			- <element style="...">
			- <li value="NaN">
	*/
	const FRAGMENTS_ARE_INERT = !(window.HTMLUnknownElement &&
		'runtimeStyle' in window.HTMLUnknownElement.prototype);
	// NOTE actually IE10 is okay, but no reasonable feature detection has been determined

	const HAZARD_TRANSFORM_URN = 'HazardTransform';
	const hazDefaultNS = new CustomNamespace({
		urn: HAZARD_TRANSFORM_URN,
		name: 'haz',
		style: 'xml'
	});
	const HAZARD_EXPRESSION_URN = 'HazardExpression';
	const exprDefaultNS = new CustomNamespace({
		urn: HAZARD_EXPRESSION_URN,
		name: 'expr',
		style: 'xml'
	});
	const HAZARD_MEXPRESSION_URN = 'HazardMExpression';
	const mexprDefaultNS = new CustomNamespace({
		urn: HAZARD_MEXPRESSION_URN,
		name: 'mexpr',
		style: 'xml'
	});

	/* 
	 NOTE IE11 / Edge has a bad performance regression with DOM fragments 
	 containing certain elements / attrs, see
	     https://connect.microsoft.com/IE/feedback/details/1776195/ie11-edge-performance-regression-with-dom-fragments
	*/
	let PERFORMANCE_UNFRIENDLY_CONDITIONS = [
		{
			tag: '*', // must be present for checkElementPerformance()
			attr: 'style',
			description: 'an element with @style'
		},
		{
			tag: 'li',
			attr: 'value',
			description: 'a <li> element with @value'
		},
		{
			tag: undefined,
			description: 'an unknown or custom element'
		}
	];

	function checkElementPerformance(el, namespaces) {
		let exprPrefix = namespaces.lookupPrefix(HAZARD_EXPRESSION_URN);
		let mexprPrefix = namespaces.lookupPrefix(HAZARD_MEXPRESSION_URN);

		let outerHTML;
		forEach(PERFORMANCE_UNFRIENDLY_CONDITIONS, function(cond) {
			switch (cond.tag) {
			case undefined: case null:
				if (el.toString() !== '[object HTMLUnknownElement]') return;
				break;
			default:
				if (getTagName(el) !== cond.tag) return;
				// fall-thru
			case '*': case '':
				if (every(
					['', exprPrefix, mexprPrefix], function(prefix) {
						let attr = prefix + cond.attr;
						return !el.hasAttribute(attr);
					})
				) return;
				break;
			}
			if (!outerHTML) outerHTML = el.cloneNode(false).outerHTML; // FIXME caniuse outerHTML??
			console.debug('Found ' + cond.description + ':\n\t\t' + outerHTML + '\n\t' +
				'This can cause poor performance on IE / Edge.');
		});
	}

	/*
	 - items in hazLangDefinition are element@list-of-attrs
	 - if element is prefixed with '<' or '>' then it can be defined 
	    as an attribute on a normal HTML element. 
	 - in preprocessing the attr is promoted to an element
	    either above or below the HTML element. 
	 - the attr value is used as the "default" attr of the created element. 
	    The "default" attr is the first attr-name in the list-of-attrs.  
	 - the order of items in hazLangDefinition is the order of promoting 
	    attrs to elements.
	*/
	let hazLangDefinition =
		'<otherwise <when@test <each@select <one@select +let@name,select <if@test <unless@test ' +
		'>choose <template@name,match >eval@select >mtext@select >text@select ' +
		'call@name apply param@name,select clone deepclone element@name attr@name';

	let hazLang = map(words(hazLangDefinition), function(def) {
		def = def.split('@');
		let tag = def[0];
		let attrToElement = tag.charAt(0);
		switch (attrToElement) {
		default: 
			attrToElement = false; 
			break;
		case '<': case '>': case '+':
			break;
		}
		if (attrToElement) tag = tag.substr(1);
		let attrs = def[1];
		attrs = (attrs && attrs !== '') ? attrs.split(',') : [];
		return {
			tag: tag,
			attrToElement: attrToElement,
			attrs: attrs
		}
	});

	let hazLangLookup = {};

	forEach(hazLang, function(directive) {
		let tag = directive.tag;
		hazLangLookup[tag] = directive;
	});

	function walkTree(root, skipRoot, callback) { // always "accept" element nodes
		let walker = document$6.createNodeIterator(
				root,
				1,
				acceptNode,
				null // IE9 throws if this irrelavent argument isn't passed
			);
		
		let el;
		while (el = walker.nextNode()) callback(el);

		function acceptNode(el) {
			if (skipRoot && el === root) return NodeFilter.FILTER_SKIP;
			return NodeFilter.FILTER_ACCEPT;
		}
	}

	function childNodesToFragment(el) {
		let doc = el.ownerDocument;
		let frag = doc.createDocumentFragment();
		forEach(map(el.childNodes), function(child) { frag.appendChild(child); });
		return frag;
	}

	function htmlToFragment(html, doc) {
		if (!doc) doc = document$6;
		let div = doc.createElement('div');
		div.innerHTML = html;
		let result = childNodesToFragment(div);
		return result;
	}

	function HazardProcessor(options, namespaces) {
		this.templates = [];
		this.namespaces = namespaces = namespaces.clone();
		if (!namespaces.lookupNamespace(HAZARD_TRANSFORM_URN))
			namespaces.add(hazDefaultNS);
		if (!namespaces.lookupNamespace(HAZARD_EXPRESSION_URN))
			namespaces.add(exprDefaultNS);
		if (!namespaces.lookupNamespace(HAZARD_MEXPRESSION_URN))
			namespaces.add(mexprDefaultNS);
	}

	defaults(HazardProcessor.prototype, {
		
	loadTemplate: function(template) {
		let processor = this;
		processor.root = template; // FIXME assert template is Fragment
		processor.templates = [];

		let namespaces = processor.namespaces;
		let hazPrefix = namespaces.lookupPrefix(HAZARD_TRANSFORM_URN);
		let exprPrefix = namespaces.lookupPrefix(HAZARD_EXPRESSION_URN);
		let mexprPrefix = namespaces.lookupPrefix(HAZARD_MEXPRESSION_URN);

		let exprHtmlAttr = exprPrefix + htmlAttr$1; // NOTE this is mapped to haz:eval
		let hazEvalTag = hazPrefix + 'eval';
		let mexprHtmlAttr = mexprPrefix + htmlAttr$1; // NOTE this is invalid

		let mexprTextAttr = mexprPrefix + textAttr$1; // NOTE this is mapped to haz:mtext
		let hazMTextTag = hazPrefix + 'mtext';
		let exprTextAttr = exprPrefix + textAttr$1; // NOTE this is mapped to haz:text
		let hazTextTag = hazPrefix + 'text';

		// FIXME extract exprToHazPriority from hazLang
		let exprToHazPriority = [ exprHtmlAttr, mexprTextAttr, exprTextAttr ];
		let exprToHazMap = {};
		exprToHazMap[exprHtmlAttr] = hazEvalTag;
		exprToHazMap[mexprTextAttr] = hazMTextTag;
		exprToHazMap[exprTextAttr] = hazTextTag;

		let doc = template.ownerDocument;

		// rewrite the template if necessary
		walkTree(template, true, function(el) {
			let tag = getTagName(el);
			if (tag.indexOf(hazPrefix) === 0) return;

			// pre-process @expr:_html -> @haz:eval, etc
			forEach(exprToHazPriority, function(attr) {
				if (!el.hasAttribute(attr)) return;
				let tag = exprToHazMap[attr];
				let val = el.getAttribute(attr);
				el.removeAttribute(attr);
				el.setAttribute(tag, val);
			});

			if (el.hasAttribute(mexprHtmlAttr)) {
				console.warn('Removing unsupported @' + mexprHtmlAttr);
				el.removeAttribute(mexprHtmlAttr);
			}

			// promote applicable hazard attrs to elements
			forEach(hazLang, function(def) {
				if (!def.attrToElement) return;
				let nsTag = hazPrefix + def.tag;
				if (!el.hasAttribute(nsTag)) return;

				// create <haz:element> ...
				let directiveEl = doc.createElement(nsTag);
				// with default attr set from @haz:attr on original element
				let defaultAttr = def.attrs[0];
				let value = el.getAttribute(nsTag);
				el.removeAttribute(nsTag);
				if (defaultAttr) directiveEl.setAttribute(defaultAttr, value);

				// copy non-default hazard attrs
				forEach(def.attrs, function(attr, i) {
					if (i === 0) return; // the defaultAttr
					let nsAttr = hazPrefix + attr;
					if (!el.hasAttribute(nsAttr)) return;
					let value = el.getAttribute(nsAttr);
					el.removeAttribute(nsAttr);
					directiveEl.setAttribute(attr, value);
				});
				// insert the hazard element goes below or above the current element
				switch (def.attrToElement) {
				case '>':
					let frag = childNodesToFragment(el);
					directiveEl.appendChild(frag);
					el.appendChild(directiveEl);
					break;
				case '<':
					el.parentNode.replaceChild(directiveEl, el);
					directiveEl.appendChild(el);
					break;
				case '+':
					el.parentNode.insertBefore(directiveEl, el);
					break;
				default:
					break;
				}
			});
		});
		
		walkTree(template, true, function(el) {
			let tag = getTagName(el);
			if (tag === hazPrefix + 'template') markTemplate(el);
			if (tag === hazPrefix + 'choose') implyOtherwise(el);
		});

		implyEntryTemplate(template);

		// finally, preprocess all elements to extract hazardDetails
		walkTree(template, true, function(el) {
			el.hazardDetails = getHazardDetails(el, processor.namespaces);
		});
		
		if (console.logLevel !== 'debug') return;

		// if debugging then warn about PERFORMANCE_UNFRIENDLY_CONDITIONS (IE11 / Edge)
		let hfNS = processor.namespaces.lookupNamespace(HYPERFRAMESET_URN);
		walkTree(template, true, function(el) {
			let tag = getTagName(el);
			if (tag.indexOf(hazPrefix) === 0) return;
			if (tag.indexOf(hfNS.prefix) === 0) return; // HyperFrameset element
			checkElementPerformance(el, namespaces);
		});


		function implyOtherwise(el) { // NOTE this slurps *any* non-<haz:when>, including <haz:otherwise>
			let otherwise = el.ownerDocument.createElement(hazPrefix + 'otherwise');
			forEach(map(el.childNodes), function(node) {
				let tag = getTagName(node);
				if (tag === hazPrefix + 'when') return;
				otherwise.appendChild(node);
			});
			el.appendChild(otherwise);
		}

		function markTemplate(el) {
			processor.templates.push(el);
		}

		function implyEntryTemplate(el) { // NOTE this slurps *any* non-<haz:template>
			let firstExplicitTemplate;
			let contentNodes = filter(el.childNodes, function(node) {
				let tag = getTagName(node);
				if (tag === hazPrefix + 'template') {
					if (!firstExplicitTemplate) firstExplicitTemplate = node;
					return false;
				}
				if (tag === hazPrefix + 'let') return false;
				if (tag === hazPrefix + 'param') return false;
				if (node.nodeType === 3 && !(/\S/).test(node.nodeValue)) return false;
				if (node.nodeType !== 1) return false;
				return true;
			});

			if (contentNodes.length <= 0) {
				if (firstExplicitTemplate) return;
				console.warn('This Hazard Template cannot generate any content.');
			}
			let entryTemplate = el.ownerDocument.createElement(hazPrefix + 'template');
			forEach(contentNodes, function(node) {
				entryTemplate.appendChild(node);
			}); 
			// NOTE in IE10 el.insertBefore(node, refNode) throws if refNode is undefined
			if (firstExplicitTemplate) el.insertBefore(entryTemplate, firstExplicitTemplate);
			else el.appendChild(entryTemplate);
			processor.templates.unshift(entryTemplate);
		}

	},

	getEntryTemplate: function() {
		return this.templates[0];
	},

	getNamedTemplate: function(name) {
		let processor = this;
		name = lc(name);
		return find(processor.templates, function(template) {
			return lc(template.getAttribute('name')) === name;
		});
	},

	getMatchingTemplate: function(element) {
		let processor = this;
		return find(processor.templates, function(template) {
			if (!template.hasAttribute('match')) return false;
			let expression = template.getAttribute('match');
			return processor.provider.matches(element, expression);
		});	
	},

	transform: FRAGMENTS_ARE_INERT ?
	function(provider, details) { // TODO how to use details
		let processor = this;
		let root = processor.root;
		let doc = root.ownerDocument;
		let frag = doc.createDocumentFragment();
		return processor._transform(provider, details, frag)
		.then(function() {
			return frag;
		});
	} :

	// NOTE IE11, Edge needs a different transform() because fragments are not inert
	function(provider, details) {
		let processor = this;
		let root = processor.root;
		let doc = createHTMLDocument('', root.ownerDocument);
		let frag = doc.body; // WARN don't know why `doc.body` is inert but fragments aren't
		return processor._transform(provider, details, frag)
		.then(function() {
			frag = childNodesToFragment(frag);
			return frag;
		});
	},

	_transform: function(provider, details, frag) {
		let processor = this;
		processor.provider = provider;

		processor.globalParams = assign({}, details);
		processor.globalVars = {};
		processor.localParams = processor.globalParams;
		processor.localVars = processor.globalVars;
		processor.localParamsStack = [];
		processor.localVarsStack = [];

		processor.variables = {
			has: function(key) {
				let result =
					key in processor.localVars ||
					key in processor.localParams ||
					key in processor.globalVars ||
					key in processor.globalParams ||
					false;
				return result;
			},
			get: function(key) {
				let result =
					key in processor.localVars && processor.localVars[key] ||
					key in processor.localParams && processor.localParams[key] ||
					key in processor.globalVars && processor.globalVars[key] ||
					key in processor.globalParams && processor.globalParams[key] ||
					undefined;
				return result;
			},
			set: function(key, value, inParams, isGlobal) {
				let mapName = isGlobal ?
					( inParams ? 'globalParams' : 'globalVars' ) :
					( inParams ? 'localParams' : 'localVars' );
				// NOTE params are write-once
				if (mapName === 'localParams' && key in processor.localParams) return;
				if (mapName === 'globalParams' && key in processor.globalParams) return;
				processor[mapName][key] = value;
			},
			push: function(params) {
				processor.localParamsStack.push(processor.localParams);
				processor.localVarsStack.push(processor.localVars);

				if (typeof params !== 'object' || params == null) params = {};
				processor.localParams = params;
				processor.localVars = {};
			},
			pop: function() {
				processor.localParams = processor.localParamsStack.pop();		
				processor.localVars = processor.localVarsStack.pop();		
			}
		};

		return processor.transformChildNodes(processor.root, null, frag)
		.then(function() {
			let template = processor.getEntryTemplate();
			return processor.transformTemplate(template, null, null, frag);
		});
	},

	transformTemplate: function(template, context, params, frag) {
		let processor = this;
		processor.variables.push(params);

		return processor.transformChildNodes(template, context, frag)
		.then(function() { 
			processor.variables.pop(); 
			return frag;
		});
	},

	transformChildNodes: function(srcNode, context, frag) {
		let processor = this;

		return Promise.reduce(null, srcNode.childNodes, function(dummy, current) {
			return processor.transformNode(current, context, frag);
		});
	},

	transformNode: function(srcNode, context, frag) {
		let processor = this;

		switch (srcNode.nodeType) {
		default: 
			let node = srcNode.cloneNode(true);
			frag.appendChild(node);
			return;
		case 3: // NOTE text-nodes are special-cased for perf testing
			let textNode = srcNode.cloneNode(true);
			frag.appendChild(textNode);
			return;
		case 1:
			let details = srcNode.hazardDetails;
			if (details.definition) return processor.transformHazardTree(srcNode, context, frag);
			else return processor.transformTree(srcNode, context, frag);
		}
	},

	transformHazardTree: function(el, context, frag) {
		let processor = this;
		let doc = el.ownerDocument;

		let details = el.hazardDetails;
		let def = details.definition;

		let invertTest = false; // for haz:if haz:unless

		let name, selector, value, type, template, node, expr, mexpr;

		switch (def.tag) { // TODO refactor these cases into individual methods, e.g transformHazardLetTree()
		default: // for unknown (or unhandled) haz: elements just process the children
			return processor.transformChildNodes(el, context, frag); 
			
		case 'template':
			return frag;

		case 'let':
			name = el.getAttribute('name');
			selector = el.getAttribute('select');
			value = context;
			if (selector) {
				try {
					value = processor.provider.evaluate(selector, context, processor.variables, false);
				}
				catch (err) {
					Task.postError(err);
					console.warn('Error evaluating <haz:let name="' + name + '" select="' + selector + '">. Assumed empty.');
					value = undefined;
				}
			}

			processor.variables.set(name, value);
			return frag;

		case 'param':
			name = el.getAttribute('name');
			selector = el.getAttribute('select');
			value = context;
			if (selector) {
				try {
					value = processor.provider.evaluate(selector, context, processor.variables, false);
				}
				catch (err) {
					Task.postError(err);
					console.warn('Error evaluating <haz:param name="' + name + '" select="' + selector + '">. Assumed empty.');
					value = undefined;
				}
			}

			processor.variables.set(name, value, true);
			return frag;


		case 'call':
			// FIXME attributes should already be in hazardDetails
			name = el.getAttribute('name');
			template = processor.getNamedTemplate(name);
			if (!template) {
				console.warn('Hazard could not find template name=' + name);
				return frag;
			}
		
			return processor.transformTemplate(template, context, null, frag); 

		case 'apply': // WARN only applies to DOM-based provider
			template = processor.getMatchingTemplate(context);
			let promise = Promise.resolve(el);
			if (template) {
				return processor.transformTemplate(template, context, null, frag);
			}
			node = context.cloneNode(false);
			frag.appendChild(node);
			return Promise.reduce(null, context.childNodes, function(dummy, child) {
				return processor.transformHazardTree(el, child, node);
			});

		case 'clone': // WARN only applies to DOM-based providers
			node = context.cloneNode(false);
			frag.appendChild(node);
			return processor.transformChildNodes(el, context, node);

		case 'deepclone': // WARN only applies to DOM-based providers
			node = context.cloneNode(true);
			frag.appendChild(node);
			// TODO WARN if el has child-nodes
			return frag;

		case 'element':
			// FIXME attributes should already be in hazardDetails
			// FIXME log a warning if this directive has children
			mexpr = el.getAttribute('name');
			name = evalMExpression(mexpr, processor.provider, context, processor.variables);
			type = typeof value;
			if (type !== 'string') return frag;

			node = doc.createElement(name);
			frag.appendChild(node);
			return processor.transformChildNodes(el, context, node);

		case 'attr':
			// FIXME attributes should already be in hazardDetails
			// FIXME log a warning if this directive has children
			mexpr = el.getAttribute('name');
			name = evalMExpression(mexpr, processor.provider, context, processor.variables);
			type = typeof value;
			if (type !== 'string') return frag;

			node = doc.createDocumentFragment();
			return processor.transformChildNodes(el, context, node)
			.then(function() {
				value = node.textContent;
				frag.setAttribute(name, value);
				return frag;
			});

		case 'eval':
			// FIXME attributes should already be in hazardDetails
			// FIXME log a warning if this directive has children
			selector = el.getAttribute('select');
			value = evalExpression(selector, processor.provider, context, processor.variables, 'node');
			type = typeof value;
			if (type === 'undefined' || type === 'boolean' || value == null) return frag;
			if (!value.nodeType) { // TODO test performance
				value = htmlToFragment(value, doc);
			}
			frag.appendChild(value);
			return frag;

		case 'mtext':
			// FIXME attributes should already be in hazardDetails
			// FIXME log a warning if this directive has children
			mexpr = el.getAttribute('select');
			value = evalMExpression(mexpr, processor.provider, context, processor.variables);
			// FIXME `value` should always already be "text"
			if (type === 'undefined' || type === 'boolean' || value == null) return frag;
			if (!value.nodeType) {
				value = doc.createTextNode(value);
			}
			frag.appendChild(value);
			return frag;

		case 'text':
			// FIXME attributes should already be in hazardDetails
			// FIXME log a warning if this directive has children
			expr = el.getAttribute('select');
			value = evalExpression(expr, processor.provider, context, processor.variables, 'text');
			// FIXME `value` should always already be "text"
			type = typeof value;
			if (type === 'undefined' || type === 'boolean' || value == null) return frag;
			if (!value.nodeType) {
				value = doc.createTextNode(value);
			}
			frag.appendChild(value);
			return frag;

		case 'unless':
			invertTest = true;
		case 'if':
			// FIXME attributes should already be in hazardDetails
			let testVal = el.getAttribute('test');
			let pass = false;
			try {
				pass = evalExpression(testVal, processor.provider, context, processor.variables, 'boolean');
			}
			catch (err) {
				Task.postError(err);
				console.warn('Error evaluating <haz:if test="' + testVal + '">. Assumed false.');
				pass = false;
			}
			if (invertTest) pass = !pass;
			if (!pass) return frag;
			return processor.transformChildNodes(el, context, frag); 

		case 'choose':
			// FIXME attributes should already be in hazardDetails
	 		// NOTE if no successful `when` then chooses *first* `otherwise` 		
			let otherwise;
			let when;
			let found = some(el.childNodes, function(child) { // TODO .children??
				if (child.nodeType !== 1) return false;
				let childDef = child.hazardDetails.definition;
				if (!childDef) return false;
				if (childDef.tag === 'otherwise') {
					if (!otherwise) otherwise = child;
					return false;
				}
				if (childDef.tag !== 'when') return false;
				let testVal = child.getAttribute('test');
				let pass = evalExpression(testVal, processor.provider, context, processor.variables, 'boolean');
				if (!pass) return false;
				when = child;
				return true;
			});
			if (!found) when = otherwise;
			if (!when) return frag;
			return processor.transformChildNodes(when, context, frag); 

		case 'one': // FIXME refactor common parts with `case 'each':`
			// FIXME attributes should already be in hazardDetails
			selector = el.getAttribute('select');
			let subContext;
			try {
				subContext = processor.provider.evaluate(selector, context, processor.variables, false);
			}
			catch (err) {
				Task.postError(err);
				console.warn('Error evaluating <haz:one select="' + selector + '">. Assumed empty.');
				return frag;
			}

			if (!subContext) return frag;
			return processor.transformChildNodes(el, subContext, frag);


		case 'each':
			// FIXME attributes should already be in hazardDetails
			selector = el.getAttribute('select');
			let subContexts;
			try {
				subContexts = processor.provider.evaluate(selector, context, processor.variables, true);
			}
			catch (err) {
				Task.postError(err);
				console.warn('Error evaluating <haz:each select="' + selector + '">. Assumed empty.');
				return frag;
			}

			return Promise.reduce(null, subContexts, function(dummy, subContext) {
				return processor.transformChildNodes(el, subContext, frag);
			});

		}
				
	},

	transformTree: function(srcNode, context, frag) { // srcNode is Element
		let processor = this;
		
		let nodeType = srcNode.nodeType;
		if (nodeType !== 1) throw Error('transformTree() expects Element');
		let node = processor.transformSingleElement(srcNode, context);
		let nodeAsFrag = frag.appendChild(node); // WARN use returned value not `node` ...
		// ... this allows frag to be a custom object, which in turn 
		// ... allows a different type of output construction

		return processor.transformChildNodes(srcNode, context, nodeAsFrag);
	},

	transformSingleElement: function(srcNode, context) {
		let processor = this;
		let details = srcNode.hazardDetails;

		let el = srcNode.cloneNode(false);

		forEach(details.exprAttributes, function(desc) {
			let value;
			try {
				value = (desc.namespaceURI === HAZARD_MEXPRESSION_URN) ?
					processMExpression(desc.mexpression, processor.provider, context, processor.variables) :
					processExpression(desc.expression, processor.provider, context, processor.variables, desc.type);
			}
			catch (err) {
				Task.postError(err);
				console.warn('Error evaluating @' + desc.attrName + '="' + desc.expression + '". Assumed false.');
				value = false;
			}
			setAttribute(el, desc.attrName, value);
		});

		return el;
	}

	});

	function getHazardDetails(el, namespaces) {
		let details = {};
		let tag = getTagName(el);
		let hazPrefix = namespaces.lookupPrefix(HAZARD_TRANSFORM_URN);
		let isHazElement = tag.indexOf(hazPrefix) === 0;

		if (isHazElement) { // FIXME preprocess attrs of <haz:*>
			tag = tag.substr(hazPrefix.length);
			let def = hazLangLookup[tag];
			details.definition = def || { tag: '' };
		}

		details.exprAttributes = getExprAttributes(el, namespaces);
		return details;
	}

	function getExprAttributes(el, namespaces) {
		let attrs = [];
		
		let exprNS = namespaces.lookupNamespace(HAZARD_EXPRESSION_URN);
		let mexprNS = namespaces.lookupNamespace(HAZARD_MEXPRESSION_URN);
		forEach(map(el.attributes), function(attr) {
			let ns = find([ exprNS, mexprNS ], function(ns) {
				return (attr.name.indexOf(ns.prefix) === 0);
			});
			if (!ns) return;
			let prefix = ns.prefix;
			let namespaceURI = ns.urn;
			let attrName = attr.name.substr(prefix.length);
			el.removeAttribute(attr.name);
			let desc = {
				namespaceURI: namespaceURI,
				prefix: prefix,
				attrName: attrName,
				type: 'text'
			};
			switch (namespaceURI) {
			case HAZARD_EXPRESSION_URN:
				desc.expression = interpretExpression(attr.value);
				break;
			case HAZARD_MEXPRESSION_URN:
				desc.mexpression = interpretMExpression(attr.value);
				break;
			default: // TODO an error?
				break;
			}
			attrs.push(desc);
		});
		return attrs;
	}


	function setAttribute(el, attrName, value) {
		let type = typeof value;
		if (type === 'undefined' || type === 'boolean' || value == null) {
			if (!value) el.removeAttribute(attrName);
			else el.setAttribute(attrName, '');
		}
		else {
			el.setAttribute(attrName, value.toString());
		}
	}

	function evalMExpression(mexprText, provider, context, variables) {
		let mexpr = interpretMExpression(mexprText);
		let result = processMExpression(mexpr, provider, context, variables);
		return result;
	}

	function evalExpression(exprText, provider, context, variables, type) {
		let expr = interpretExpression(exprText);
		let result = processExpression(expr, provider, context, variables, type);
		return result;
	}
		
	function interpretMExpression(mexprText) {
		let expressions = [];
		let mexpr = mexprText.replace(/\{\{((?:[^}]|\}(?=\}\})|\}(?!\}))*)\}\}/g, function(all, expr) {
			expressions.push(expr);
			return '{{}}';
		});

		expressions = expressions.map(function(expr) { return interpretExpression(expr); });
		return {
			template: mexpr,
			expressions: expressions
		};
	}

	function interpretExpression(exprText) { // FIXME robustness
		let expression = {};
		expression.text = exprText;
		let exprParts = exprText.split(PIPE_OPERATOR);
		expression.selector = exprParts.shift();
		expression.filters = [];

		forEach(exprParts, function(filterSpec) {
			filterSpec = filterSpec.trim();
			let text = filterSpec;
			let m = text.match(/^([_a-zA-Z][_a-zA-Z0-9]*)\s*(:?)/);
			if (!m) {
				console.warn('Syntax Error in filter call: ' + filterSpec);
				return false;
			}
			let filterName = m[1];
			let hasParams = m[2];
			text = text.substr(m[0].length);
			if (!hasParams && /\S+/.test(text)) {
				console.warn('Syntax Error in filter call: ' + filterSpec);
				return false;
			}

			try {
				let filterParams = (Function('return [' + text + '];'))();
			}
			catch (err) {
				console.warn('Syntax Error in filter call: ' + filterSpec);
				return false;
			}

			expression.filters.push({
				text: filterSpec,
				name: filterName,
				params: filterParams
			});
			return true;
		});

		return expression;
	}


	function processMExpression(mexpr, provider, context, variables) {
		let i = 0;
		return mexpr.template.replace(/\{\{\}\}/g, function(all) {
			return processExpression(mexpr.expressions[i++], provider, context, variables, 'text');
		});
	}

	function processExpression(expr, provider, context, variables, type) { // FIXME robustness
		let doc = (context && context.nodeType) ? // TODO which document
			(context.nodeType === 9 ? context : context.ownerDocument) : 
			document$6; 
		let value = provider.evaluate(expr.selector, context, variables);

		every(expr.filters, function(filter) {
			if (value == null) value = '';
			if (value.nodeType) {
				if (value.nodeType === 1) value = value.textContent;
				else value = '';
			}
			try {
				value = filters.evaluate(filter.name, value, filter.params);
				return true;
			}
			catch (err) {
				Task.postError(err);
				console.warn('Failure processing filter call: "' + filter.text + '" with input: "' + value + '"');
				value = '';
				return false;
			}
		});

		let result = cast(value, type);
		return result;

		function cast(value, type) {
			switch (type) {
			case 'text':
				if (value && value.nodeType) value = value.textContent;
				break;
			case 'node':
				let frag = doc.createDocumentFragment();
				if (value && value.nodeType) frag.appendChild(doc.importNode(value, true)); // NOTE no adoption
				else {
					let div = doc.createElement('div');
					div.innerHTML = value;
					let node;
					while (node = div.firstChild) frag.appendChild(node); // NOTE no adoption
				}
				value = frag;
				break;
			case 'boolean':
				if (value == null || value === false) value = false;
				else value = true;
				break;
			default: // FIXME should never occur. console.warn !?
				if (value && value.nodeType) value = value.textContent;
				break;
			}
			return value;
		}


	}

	/*!
	 * Builtin Processors
	 * Copyright 2016 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */

	processors.register('main', MainProcessor);

	processors.register('script', ScriptProcessor);

	processors.register('hazard', HazardProcessor);

	let configData = new Registry({
		writeOnce: true,
		testKey: function(key) {
			return typeof key === 'string';
		},
		testValue: function(o) {
			return o != null && typeof o === 'object';
		}
	});

	/*!
	 * HyperFrameset
	 * Copyright 2009-2016 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */

	let document$7 = window.document;

	const eventConfig = 'form@submit,reset,input,change,invalid input,textarea@input,change,invalid,focus,blur select,fieldset@change,invalid,focus,blur button@click';

	let eventTable = (function(config) {

	let table = {};
	forEach(config.split(/\s+/), function(combo) {
		let m = combo.split('@');
		let tags = m[0].split(',');
		let events = m[1].split(',');
		forEach(tags, function(tag) {
			table[tag] = map(events);
		});
	});

	return table;

	})(eventConfig);


	let elements = {};
	let interfaces = {};

	function registerFormElements() {
		forOwn(elements, function(ClassName, tag) {
			let Interface = interfaces[ClassName];
			sprockets.registerElement(tag, Interface);
		});
	}

	forOwn(eventTable, function(events, tag) {

	let ClassName = 'Configurable' + ucFirst(tag);

	let Interface = sprockets.evolve(sprockets.RoleType, {});
	assign(Interface, {

	attached: function(handlers) {
		let object = this;
		let element = object.element;
		if (!element.hasAttribute('config')) return;
		let configID = words(element.getAttribute('config'))[0];
		let options = configData.get(configID);
		if (!options) return;
		forEach(events, function(type) {
			let ontype = 'on' + type;
			let callback = options[ontype];
			if (!callback) return;

			let fn = function() { callback.apply(object, arguments); };
			object[ontype] = fn;
			handlers.push({
				type: type,
				action: fn
			});
		});
	}

	});

	interfaces[ClassName] = Interface;
	elements[tag] = ClassName;

	});

	// NOTE handlers are registered for "body@submit,reset,input,change" in HFrameset
	let ConfigurableBody = sprockets.evolve(sprockets.RoleType, {});
	assign(ConfigurableBody, {

	attached: function(handlers) {
		let object = this;
		let element = object.element;
		if (!element.hasAttribute('config')) return;
		let configID = words(element.getAttribute('config'))[0];
		let options = configData.get(configID);
		if (!options) return;

		let events = words('submit reset change input');
		let needClickWatcher = false;

		forEach(events, function(type) {
			let ontype = 'on' + type;
			let callback = options[ontype];
			if (!callback) return;

			let fn = function(e) {
				if (closest(e.target, 'form')) return;
				callback.apply(object, arguments); 
			};
			object[ontype] = fn;
			handlers.push({
				type: type,
				action: fn
			});
			
			switch (type) {
			default: break;
			case 'submit': case 'reset': needClickWatcher = true;
			}
		});

		if (needClickWatcher) {
			document$7.addEventListener('click', function(e) { 
				if (closest(e.target, 'form')) return;
				let type = e.target.type;
				if (!(type === 'submit' || type === 'reset')) return;
				Task.asap(function() {
					let pseudoEvent = document$7.createEvent('CustomEvent');
					// NOTE pseudoEvent.detail = e.target
					pseudoEvent.initCustomEvent(type, true, true, e.target);
					pseudoEvent.preventDefault();
					element.dispatchEvent(pseudoEvent);
				});
			}, false);
		}
	}

	});

	elements['body'] = 'ConfigurableBody';
	interfaces['ConfigurableBody'] = ConfigurableBody;

	let formElements = {

		register: registerFormElements

	};

	let {
		// FIXME can we export these interfaces programmatically?
		ConfigurableForm,
		ConfigurableInput,
		ConfigurableTextarea,
		ConfigurableFieldset,
		ConfigurableSelect,
		ConfigurableButton
	} = interfaces;

	var formElements$1 = /*#__PURE__*/Object.freeze({
		__proto__: null,
		ConfigurableBody: ConfigurableBody,
		ConfigurableForm: ConfigurableForm,
		ConfigurableInput: ConfigurableInput,
		ConfigurableTextarea: ConfigurableTextarea,
		ConfigurableFieldset: ConfigurableFieldset,
		ConfigurableSelect: ConfigurableSelect,
		ConfigurableButton: ConfigurableButton,
		'default': formElements
	});

	/*!
	 * HyperFrameset Layout Elements
	 * Copyright 2009-2016 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */

	let document$8 = window.document;

	let namespace; // will be set by external call to registerFramesetElements()

	/*
	 * HyperFrameset sprockets
	 */

	// All HyperFrameset sprockets will inherit from HBase
	let HBase = (function() {

	let HBase = sprockets.evolve(sprockets.RoleType, {

	});

	assign(HBase, {

	attached: function(handlers) {
		HBase.connectOptions.call(this);
	},

	enteredDocument: function() { // WARN void method: don't remove
	},

	leftDocument: function() { // WARN void method: don't remove
	},

	connectOptions: function() {
		let object = this;
		object.options = {};
		let element = object.element;
		if (!element.hasAttribute('config')) return;
		let configID = words(element.getAttribute('config'))[0];
		let options = configData.get(configID);
		object.options = options;
	}
	});

	return HBase;
	})();


	let Layer = (function() {

	let Layer = sprockets.evolve(HBase, {

	role: 'layer',

	isLayer: true

	});

	let zIndex = 1;

	assign(Layer, {

	attached: function(handlers) {
		HBase.attached.call(this, handlers);

		this.css('z-index', zIndex++);
	},

	enteredDocument: function() {
		HBase.enteredDocument.call(this);
	},

	leftDocument: function() {
		HBase.leftDocument.call(this);
	},

	isLayer: function(element) {
		return !!element.$.isLayer;
	}

	});

	return Layer;
	})();

	let Popup = (function() {

	let Popup = sprockets.evolve(HBase, {

	role: 'popup',

	});

	assign(Popup, {

	attached: function(handlers) {
		HBase.attached.call(this, handlers);
	},

	enteredDocument: function() {
		HBase.enteredDocument.call(this);

		Popup.connectController.call(this);
	},

	leftDocument: function() {
		HBase.leftDocument.call(this);
	},

	connectController: function() {
		let panel = this;
		let name = panel.attr('name');
		let value = panel.attr('value');
		if (!name && !value) return;
		panel.ariaToggle('hidden', true);
		if (!name) return; // being controlled by an ancestor
		controllers.listen(name, function(values) {
			panel.ariaToggle('hidden', !(includes(values, value)));
		});
	}

	});

	return Popup;
	})();

	let Panel = (function() {

	let Panel = sprockets.evolve(HBase, {

	role: 'panel',

	isPanel: true

	});

	assign(Panel, {

	attached: function(handlers) {
		HBase.attached.call(this, handlers);

		Panel.adjustBox.call(this);
	},

	enteredDocument: function() {
		HBase.enteredDocument.call(this);

		Panel.connectController.call(this);
	},

	leftDocument: function() {
		HBase.leftDocument.call(this);

		// TODO disconnectController
	},

	adjustBox: function() {
		let overflow = this.attr('overflow');
		if (overflow) this.css('overflow', overflow); // FIXME sanity check
		let height = this.attr('height');
		if (height) this.css('height', height); // FIXME units
		let width = this.attr('width');
		if (width) this.css('width', width); // FIXME units
		let minWidth = this.attr('minwidth');
		if (minWidth) this.css('min-width', minWidth); // FIXME units
	}, 

	connectController: function() {
		let panel = this;
		let name = panel.attr('name');
		let value = panel.attr('value');
		if (!name && !value) return;
		panel.ariaToggle('hidden', true);
		if (!name) return; // being controlled by an ancestor
		controllers.listen(name, function(values) {
			panel.ariaToggle('hidden', !(includes(values, value)));
		});
	},

	isPanel: function(element) {
		return !!element.$.isPanel;
	}

	});

	return Panel;
	})();

	let Layout = (function() { // a Layout is a list of Panel (or other Layout) and perhaps separators for hlayout, vlayout

	let Layout = sprockets.evolve(HBase, {

	role: 'group',

	isLayout: true,

	owns: {
		get: function() { 
			return filter(this.element.children, function(el) { 
				return matches(el, function(el) { return Panel.isPanel(el) || Layout.isLayout(el); });
			}); 
		}
	}

	});

	assign(Layout, {

	attached: function(handlers) {
		Panel.attached.call(this, handlers);
	},

	enteredDocument: function() {
		Panel.enteredDocument.call(this);

		Layout.adjustBox.call(this);
		Layout.normalizeChildren.call(this);
		return;
	},

	leftDocument: function() {
		Panel.leftDocument.call(this);
	},

	adjustBox: function() {
		let element = this.element;
		let parent = element.parentNode;

		// FIXME dimension setting should occur before becoming visible
		if (!matches(parent, Layer.isLayer)) return;
		// TODO vh, vw not tested on various platforms
		let height = this.attr('height'); // TODO css unit parsing / validation
		if (!height) height = '100vh';
		else height = height.replace('%', 'vh');
		this.css('height', height); // FIXME units
		let width = this.attr('width'); // TODO css unit parsing / validation
		if (!width) width = '100vw';
		else width = width.replace('%', 'vw');
		if (width) this.css('width', width); // FIXME units
	},

	normalizeChildren: function() {
		let element = this.element;
		forEach(map(element.childNodes), normalizeChild, element);
	},

	isLayout: function(element) {
		return !!element.$.isLayout;
	}

	});

	function normalizeChild(node) {
		let element = this;
		switch (node.nodeType) {
		case 1: // hide non-layout elements
			if (matches(node, function(el) { return Panel.isPanel(el) || Layout.isLayout(el); })) return;
			node.hidden = true;
			return;
		case 3: // hide text nodes by wrapping in <wbr hidden>
			if (/^\s*$/.test(node.nodeValue )) {
				element.removeChild(node);
				return;
			}
			let wbr = element.ownerDocument.createElement('wbr');
			wbr.hidden = true;
			element.replaceChild(wbr, node); // NOTE no adoption
			wbr.appendChild(node); // NOTE no adoption
			return;
		default:
			return;
		}
	}

	return Layout;
	})();


	let VLayout = (function() {

	let VLayout = sprockets.evolve(Layout, {
	});

	assign(VLayout, {

	attached: function(handlers) {
		Layout.attached.call(this, handlers);

		let hAlign = this.attr('align'); // FIXME assert left/center/right/justify - also start/end (stretch?)
		if (hAlign) this.css('text-align', hAlign); // NOTE defaults defined in <style> above
	},

	enteredDocument: function() {
		Layout.enteredDocument.call(this);
	},

	leftDocument: function() {
		Layout.leftDocument.call(this);
	}

	});

	return VLayout;
	})();

	let HLayout = (function() {

	let HLayout = sprockets.evolve(Layout, {
	});

	assign(HLayout, {

	attached: function(handlers) {
		Layout.attached.call(this, handlers);
	},

	enteredDocument: function() {
		Layout.enteredDocument.call(this);

		let vAlign = this.attr('align'); // FIXME assert top/middle/bottom/baseline - also start/end (stretch?)
		forEach(this.ariaGet('owns'), function(panel) {
			if (vAlign) panel.$.css('vertical-align', vAlign);
		});
	},

	leftDocument: function() {
		Layout.leftDocument.call(this);
	}


	});

	return HLayout;
	})();

	let Deck = (function() {

	let Deck = sprockets.evolve(Layout, {

	activedescendant: {
		set: function(item) { // if !item then hide all children
			
			let element = this.element;
			let panels = this.ariaGet('owns');
			if (item && !includes(panels, item)) throw Error('set activedescendant failed: item is not child of deck');
			forEach(panels, function(child) {
				if (child === item) child.ariaToggle('hidden', false);
				else child.ariaToggle('hidden', true);
			});
		
		}
	}

		
	});

	assign(Deck, {

	attached: function(handlers) {
		Layout.attached.call(this, handlers);
	},

	enteredDocument: function() {
		// WARN don't want Panel.connectController() so implement this long-hand
		HBase.enteredDocument.call(this);

		Layout.adjustBox.call(this);
		Layout.normalizeChildren.call(this);

		Deck.connectController.call(this);
	},

	leftDocument: function() {
		Layout.leftDocument.call(this);
	},

	connectController: function() {
		let deck = this;
		let name = deck.attr('name');
		if (!name) {
			deck.ariaSet('activedescendant', deck.ariaGet('owns')[0]);
			return;
		}
		controllers.listen(name, function(values) {
			let panels = deck.ariaGet('owns');
			let activePanel = find(panels, function(child) {
				let value = child.getAttribute('value');
				if (!includes(values, value)) return false;
				return true;
			});
			if (activePanel) deck.ariaSet('activedescendant', activePanel);
		});

	}

	});

	return Deck;
	})();

	let ResponsiveDeck = (function() {

	let ResponsiveDeck = sprockets.evolve(Deck, {
		
	});

	assign(ResponsiveDeck, {

	attached: function(handlers) {
		Deck.attached.call(this, handlers);
	},

	enteredDocument: function() {
		Deck.enteredDocument.call(this);

		ResponsiveDeck.refresh.call(this);
	},

	leftDocument: function() {
		Deck.leftDocument.call(this);
	},

	refresh: function() { // TODO should this be static method?
		let width = parseFloat(window.getComputedStyle(this.element, null).width);
		let panels = this.ariaGet('owns');
		let activePanel = find(panels, function(panel) {
			let minWidth = window.getComputedStyle(panel, null).minWidth;
			if (minWidth == null || minWidth === '' || minWidth === '0px') return true;
			minWidth = parseFloat(minWidth); // FIXME minWidth should be "NNNpx" but need to test
			if (minWidth > width) return false;
			return true;
		});
		if (activePanel) {
			activePanel.$.css('height', '100%');
			activePanel.$.css('width', '100%');
			this.ariaSet('activedescendant', activePanel);
		}
	}

	});

	return ResponsiveDeck;
	})();


	function registerLayoutElements(ns) {

	namespace = ns; // TODO assert ns instanceof CustomNamespace

	sprockets.registerElement(namespace.lookupSelector('layer'), Layer);
	sprockets.registerElement(namespace.lookupSelector('popup'), Popup);
	sprockets.registerElement(namespace.lookupSelector('panel'), Panel);
	sprockets.registerElement(namespace.lookupSelector('vlayout'), VLayout);
	sprockets.registerElement(namespace.lookupSelector('hlayout'), HLayout);
	sprockets.registerElement(namespace.lookupSelector('deck'), Deck);
	sprockets.registerElement(namespace.lookupSelector('rdeck'), ResponsiveDeck);

	let cssText = [
	'*[hidden] { display: none !important; }', // TODO maybe not !important
	namespace.lookupSelector('layer, popup, hlayout, vlayout, deck, rdeck, panel, body') + ' { box-sizing: border-box; }', // TODO http://css-tricks.com/inheriting-box-sizing-probably-slightly-better-best-practice/
	namespace.lookupSelector('layer') + ' { display: block; position: fixed; top: 0; left: 0; width: 0; height: 0; }',
	namespace.lookupSelector('hlayout, vlayout, deck, rdeck') + ' { display: block; width: 0; height: 0; text-align: left; margin: 0; padding: 0; }', // FIXME text-align: start
	namespace.lookupSelector('hlayout, vlayout, deck, rdeck') + ' { width: 100%; height: 100%; }', // FIXME should be 0,0 before manual calculations
	namespace.lookupSelector('panel') + ' { display: block; width: auto; height: auto; text-align: left; margin: 0; padding: 0; }', // FIXME text-align: start
	namespace.lookupSelector('body') + ' { display: block; width: auto; height: auto; margin: 0; }',
	namespace.lookupSelector('popup') + ' { display: block; position: relative; width: 0; height: 0; }',
	namespace.lookupSelector('popup') + ' > * { position: absolute; top: 0; left: 0; }', // TODO or change 'body' styling above
	namespace.lookupSelector('vlayout') + ' { height: 100%; }',
	namespace.lookupSelector('hlayout') + ' { width: 100%; overflow-y: hidden; }',
	namespace.lookupSelector('vlayout') + ' > * { display: block; float: left; width: 100%; height: auto; text-align: left; }',
	namespace.lookupSelector('vlayout') + ' > *::after { clear: both; }',
	namespace.lookupSelector('hlayout') + ' > * { display: block; float: left; width: auto; height: 100%; vertical-align: top; overflow-y: auto; }',
	namespace.lookupSelector('hlayout') + '::after { clear: both; }',
	namespace.lookupSelector('deck') + ' > * { width: 100%; height: 100%; }',
	namespace.lookupSelector('rdeck') + ' > * { width: 0; height: 0; }',
	].join('\n');

	let style = document$8.createElement('style');
	style.textContent = cssText;
	document$8.head.insertBefore(style, document$8.head.firstChild);

	} // END registerLayoutElements()

	let layoutElements = {

	register: registerLayoutElements

	};

	var layoutElements$1 = /*#__PURE__*/Object.freeze({
		__proto__: null,
		HBase: HBase,
		Layer: Layer,
		Popup: Popup,
		Panel: Panel,
		HLayout: HLayout,
		VLayout: VLayout,
		Deck: Deck,
		ResponsiveDeck: ResponsiveDeck,
		'default': layoutElements
	});

	/*!
	 * HyperFrameset Elements
	 * Copyright 2009-2016 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */

	let document$9 = window.document;

	let namespace$1; // will be set by external call to registerFrameElements()

	let frameDefinitions = new Registry({
		writeOnce: true,
		testKey: function(key) {
			return typeof key === 'string';
		},
		testValue: function(o) {
			return o != null && typeof o === 'object';
		}
	});

	let HFrame = (function() {

	let HFrame = sprockets.evolve(Panel, {

	role: 'frame',

	isFrame: true,

	preload: function(request) {
		let frame = this;
		return Promise.pipe(request, [
			
		function(request) { return frame.definition.render(request, 'loading'); },
		function(result) {
			if (!result) return;
			return frame.insert(result);
		}
		
		]);
	},

	load: function(response) { // FIXME need a teardown method that releases child-frames	
		let frame = this;
		if (response) frame.src = response.url;
		// else a no-src frame
		return Promise.pipe(response, [
		
		function(response) { 
			return frame.definition.render(response, 'loaded', {
				mainSelector: frame.mainSelector
				}); 
		},
		function(result) {
			if (!result) return;
			return frame.insert(result, frame.element.hasAttribute('replace'));
		}

		]);
	},

	insert: function(bodyElement, replace) { // FIXME need a teardown method that releases child-frames	
		let frame = this;
		let element = frame.element;
		
		let options = frame.options;

		// FIXME .bodyElement will probably become .bodies[] for transition animations.
		if (frame.bodyElement) {
			if (options && options.bodyLeft) {
				try { options.bodyLeft(frame, frame.bodyElement); } 
				catch (err) { Task.postError(err); }
			}
			sprockets.removeNode(frame.bodyElement);
		}

		if (replace) {
			let frag = adoptContents(bodyElement, element.ownerDocument);
			sprockets.insertNode('replace', element, frag);
			return;
		}

		sprockets.insertNode('beforeend', frame.element, bodyElement);
		frame.bodyElement = bodyElement;

		if (options && options.bodyEntered) {
			try { options.bodyEntered(frame, frame.bodyElement); } 
			catch (err) { Task.postError(err); }
		}
	},

	refresh: function() {
		let frame = this;
		let element = this.element;
		let src = frame.attr('src');

		return Promise.resolve().then(function() {

			if (src == null) { // a non-src frame
				return frame.load(null, { condition: 'loaded' });
			}

			if (src === '') {
				return; // FIXME frame.load(null, { condition: 'uninitialized' })
			}

			let fullURL = URL(src);
			let nohash = fullURL.nohash;
			let hash = fullURL.hash;

			let request = { method: 'get', url: nohash, responseType: 'document'};
			let response;

			return Promise.pipe(null, [ // FIXME how to handle `hash` if present??

				function() { return frame.preload(request); },
				function() { return httpProxy.load(nohash, request); },
				function(resp) { response = resp; },
				function() { return whenVisible(element); },
				function() { 
					// TODO there are probably better ways to monitor @src
					if (frame.attr('src') !== src) return; // WARN abort since src has changed
					return frame.load(response); 
				}

			]);

		});
	}

	});

	assign(HFrame, {

	attached: function(handlers) {
		Panel.attached.call(this, handlers);

		let frame = this;
		let def = frame.attr('def');
		frame.definition = frameDefinitions.get(def); // FIXME assert frameDefinitions.has(def)
		defaults(frame, {
			bodyElement: null,
			targetname: frame.attr('targetname'),
			src: frame.attr('src'),
			mainSelector: frame.attr('main') // TODO consider using a hash in `@src`
	    });

		HFrame.observeAttributes.call(this, 'src');
	},

	enteredDocument: function() {
		Panel.enteredDocument.call(this);
		this.refresh();
	},

	leftDocument: function() {
		Panel.leftDocument.call(this);
		
		this.attributeObserver.disconnect();
	},

	attributeChanged: function(attrName) {
		if (attrName === 'src') this.refresh();
	},

	observeAttributes: function() {
		let attrList = [].splice.call(arguments, 0);
		let frame = this;
		let element = frame.element;
		let observer = observeAttributes(element, function(attrName) {
			HFrame.attributeChanged.call(frame, attrName);
		}, attrList);
		frame.attributeObserver = observer;
	},
		
	isFrame: function(element) {
		return !!element.$.isFrame;
	}

	});

	let observeAttributes = (window.MutationObserver) ?
	function(element, callback, attrList) {
		let observer = new MutationObserver(function(mutations, observer) {
			forEach(mutations, function(record) {
				if (record.type !== 'attributes') return;
				callback.call(record.target, record.attributeName);
			});
		});
		observer.observe(element, { attributes: true, attributeFilter: attrList, subtree: false });
		
		return observer;
	} :
	function(element, callback, attrList) { // otherwise assume MutationEvents (IE10). 
		function handleEvent(e) {
			if (e.target !== e.currentTarget) return;
			e.stopPropagation();
			if (attrList && attrList.length > 0 && attrList.indexOf(e.attrName) < 0) return;
			Task.asap(function() { callback.call(e.target, e.attrName); });
		}

		element.addEventListener('DOMAttrModified', handleEvent, true);
		return { 
			disconnect: function() {
				element.removeEventListener('DOMAttrModified', handleEvent, true);	
			}
		};

	};


	return HFrame;	
	})();

	function registerFrameElements(ns) {

	namespace$1 = ns; // TODO assert ns instanceof CustomNamespace

	sprockets.registerElement(namespace$1.lookupSelector('frame'), HFrame);

	let cssText = [
	namespace$1.lookupSelector('frame') + ' { box-sizing: border-box; }', // TODO http://css-tricks.com/inheriting-box-sizing-probably-slightly-better-best-practice/
	namespace$1.lookupSelector('frame') + ' { display: block; width: auto; height: auto; text-align: left; margin: 0; padding: 0; }' // FIXME text-align: start
	].join('\n');

	let style = document$9.createElement('style');
	style.textContent = cssText;
	document$9.head.insertBefore(style, document$9.head.firstChild);

	} // END registerFrameElements()

	let frameElements = {

	register: registerFrameElements

	};

	/*!
	 * HyperFrameset definitions
	 * Copyright 2009-2016 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */

	/* BEGIN HFrameset code */

	const HYPERFRAMESET_URN$1 = 'hyperframeset';
	const hfDefaultNamespace = new CustomNamespace({
		name: 'hf',
		style: 'vendor',
		urn: HYPERFRAMESET_URN$1
	});


	const hfHeadTags = words('title meta link style script');

	let HFrameDefinition = (function() {

	function HFrameDefinition(el, framesetDef) {
		if (!el) return; // in case of inheritance
		this.framesetDefinition = framesetDef;
		this.init(el);
	}

	defaults(HFrameDefinition.prototype, {

	init: function(el) {
	    let frameDef = this;
		let framesetDef = frameDef.framesetDefinition;
		defaults(frameDef, {
			element: el,
			mainSelector: el.getAttribute('main') // TODO consider using a hash in `@src`
	    });
		frameDef.bodies = [];
		forEach(map(el.childNodes), function(node) {
			let tag = getTagName(node);
			if (!tag) return;
			if (includes(hfHeadTags, tag)) return; // ignore typical <head> elements
			if (tag === framesetDef.namespaces.lookupTagNameNS('body', HYPERFRAMESET_URN$1)) {
				el.removeChild(node);
				frameDef.bodies.push(new HBodyDefinition(node, framesetDef));
				return;
			}
			console.warn('Unexpected element in HFrame: ' + tag);
			return;
		});

		// FIXME create fallback bodies
	},

	render: function(resource, condition, details) {
		let frameDef = this;
		let framesetDef = frameDef.framesetDefinition;
		if (!details) details = {};
		defaults(details, { // TODO more details??
			scope: framesetDef.scope,
			url: resource && resource.url,
			mainSelector: frameDef.mainSelector,
		});
		let bodyDef = find(frameDef.bodies, function(body) { return body.condition === condition;});
		if (!bodyDef) return; // FIXME what to do here??
		return bodyDef.render(resource, details);
	}

		
	});

	return HFrameDefinition;
	})();


	let HBodyDefinition = (function() {
		
	function HBodyDefinition(el, framesetDef) {
		if (!el) return; // in case of inheritance
		this.framesetDefinition = framesetDef;
		this.init(el);
	}

	let conditions = words('uninitialized loading loaded error');

	let conditionAliases = {
		'blank': 'uninitialized',
		'waiting': 'loading',
		'interactive': 'loaded',
		'complete': 'loaded'
	};

	function normalizeCondition(condition) {
		condition = lc(condition);
		if (includes(conditions, condition)) return condition;
		return conditionAliases[condition];
	}

	defaults(HBodyDefinition, {
		
	conditions: conditions,
	conditionAliases: conditionAliases

	});

	defaults(HBodyDefinition.prototype, {

	init: function(el) {
		let bodyDef = this;
		let framesetDef = bodyDef.framesetDefinition;
		let condition = el.getAttribute('condition');
		let finalCondition;
		if (condition) {
			finalCondition = normalizeCondition(condition);
			if (!finalCondition) {
				finalCondition = condition;
				console.warn('Frame body defined with unknown condition: ' + condition);
			}
		}
		else finalCondition = 'loaded';
			
		defaults(bodyDef, {
			element: el,
			condition: finalCondition,
			transforms: []
		});
		forEach(map(el.childNodes), function(node) {
			if (getTagName(node) === framesetDef.namespaces.lookupTagNameNS('transform', HYPERFRAMESET_URN$1)) {
				el.removeChild(node);
				bodyDef.transforms.push(new HTransformDefinition(node, framesetDef));
			}	
		});
		if (!bodyDef.transforms.length && bodyDef.condition === 'loaded') {
			console.warn('HBody definition for loaded content contains no HTransform definitions');
		}
	},

	render: function(resource, details) {
		let bodyDef = this;
		let framesetDef = bodyDef.framesetDefinition;
		if (bodyDef.transforms.length <= 0) {
			return bodyDef.element.cloneNode(true);
		}
		if (!resource) return null;
		let doc = resource.document; // FIXME what if resource is a Request?
		if (!doc) return null;
		let frag0 = doc;
		if (details.mainSelector) frag0 = find$1(details.mainSelector, doc);

		return Promise.reduce(frag0, bodyDef.transforms, function(fragment, transform) {
			return transform.process(fragment, details);
		})
		.then(function(fragment) {
			let el = bodyDef.element.cloneNode(false);
			// crop to <body> if it exists
			let htmlBody = find$1('body', fragment);
			if (htmlBody) fragment = adoptContents(htmlBody, el.ownerDocument);
			// remove all stylesheets
			forEach(findAll('link[rel~=stylesheet], style', fragment), function(node) {
				node.parentNode.removeChild(node);
			});
			insertNode('beforeend', el, fragment);
			return el;
		});
	}

	});

	return HBodyDefinition;
	})();


	let HTransformDefinition = (function() {
		
	function HTransformDefinition(el, framesetDef) {
		if (!el) return; // in case of inheritance
		this.framesetDefinition = framesetDef;
		this.init(el);
	}

	defaults(HTransformDefinition.prototype, {

	init: function(el) {
		let transform = this;
		let framesetDef = transform.framesetDefinition;
		defaults(transform, {
			element: el,
			type: el.getAttribute('type') || 'main',
			format: el.getAttribute('format')
	    });
		if (transform.type === 'main') transform.format = '';
		let doc = framesetDef.document; // or el.ownerDocument
		let frag = doc.createDocumentFragment();
		let node;
		while (node = el.firstChild) frag.appendChild(node); // NOTE no adoption

		let options;
		if (el.hasAttribute('config')) {
			let configID = words(el.getAttribute('config'))[0];
			options = configData.get(configID);
		}
		let processor = transform.processor = processors.create(transform.type, options, framesetDef.namespaces);
		processor.loadTemplate(frag);
	},

	process: function(srcNode, details) {
		let transform = this;
		let framesetDef = transform.framesetDefinition;
		let decoder;
		if (transform.format) {
			decoder = decoders.create(transform.format, {}, framesetDef.namespaces);
			decoder.init(srcNode);
		}
		else decoder = {
			srcNode: srcNode
		};
		let processor = transform.processor;
		let output = processor.transform(decoder, details);
		return output;
	}

	});

	return HTransformDefinition;
	})();


	let HFramesetDefinition = (function() {

	function HFramesetDefinition(doc, settings) {
		if (!doc) return; // in case of inheritance
		this.namespaces = null;
		this.init(doc, settings);
	}

	defaults(HFramesetDefinition.prototype, {

	init: function(doc, settings) {
		let framesetDef = this;
		defaults(framesetDef, {
			url: settings.framesetURL,
			scope: settings.scope
		});

		let namespaces = framesetDef.namespaces = CustomNamespace.getNamespaces(doc);
		if (!namespaces.lookupNamespace(HYPERFRAMESET_URN$1)) {
			namespaces.add(hfDefaultNamespace);
		}

		// NOTE first rebase scope: urls
		let scopeURL = URL(settings.scope);
		rebase(doc, scopeURL);
		let frameElts = findAll(
			framesetDef.namespaces.lookupSelector('frame', HYPERFRAMESET_URN$1), 
			doc.body);
		forEach(frameElts, function(el, index) { // FIXME hyperframes can't be outside of <body> OR descendants of repetition blocks
			// NOTE first rebase @src with scope: urls
			let src = el.getAttribute('src');
			if (src) {
				let newSrc = rebaseURL(src, scopeURL);
				if (newSrc != src) el.setAttribute('src', newSrc);
			}
		});

		// warn about not using @id
		let idElements = findAll('*[id]:not(script)', doc.body);
		if (idElements.length) {
			console.warn('@id is strongly discouraged in frameset-documents (except on <script>).\n' +
				'Found ' + idElements.length + ', ' + 
				'first @id is ' + idElements[0].getAttribute('id')
			);
		}

		// Add @id and @sourceurl to inline <script type="text/javascript">
		let scripts = findAll('script', doc);
		forEach(scripts, function(script, i) {
			// ignore non-javascript scripts
			if (script.type && !/^text\/javascript/.test(script.type)) return;
			// ignore external scripts
			if (script.hasAttribute('src')) return;
			let id = script.id;
			// TODO generating ID always has a chance of duplicating IDs
			if (!id) id = script.id = 'script[' + i + ']'; // FIXME doc that i is zero-indexed
			let sourceURL;
			if (script.hasAttribute('sourceurl')) sourceURL = script.getAttribute('sourceurl');
			else {
				sourceURL = framesetDef.url + '__' + id; // FIXME this should be configurable
				script.setAttribute('sourceurl', sourceURL);
			}
			script.text += '\n//# sourceURL=' + sourceURL;
		});

		// Move all <script for> in <head> to <body>
		let firstChild = doc.body.firstChild;
		forEach(findAll('script[for]', doc.head), function(script) {
			doc.body.insertBefore(script, firstChild);
			script.setAttribute('for', '');
			console.info('Moved <script for> in frameset <head> to <body>');
		});

		// Move all non-@for, javascript <script> in <body> to <head>
		forEach(findAll('script', doc.body), function(script) {
			// ignore non-javascript scripts
			if (script.type && !/^text\/javascript/.test(script.type)) return;
			// ignore @for scripts
			if (script.hasAttribute('for')) return;
			doc.head.appendChild(script);
			console.info('Moved <script> in frameset <body> to <head>');
		});

		let allowedScope = 'panel, frame';
		let allowedScopeSelector = framesetDef.namespaces.lookupSelector(allowedScope, HYPERFRAMESET_URN$1);
		normalizeScopedStyles(doc, allowedScopeSelector);

		let body = doc.body;
		body.parentNode.removeChild(body);
		framesetDef.document = doc;
		framesetDef.element = body;
	},

	preprocess: function() {
		let framesetDef = this;
		let body = framesetDef.element;
		defaults(framesetDef, {
			frames: {} // all hyperframe definitions. Indexed by @defid (which may be auto-generated)
		});

		let scripts = findAll('script', body);
		forEach(scripts, function(script, i) {
			// Ignore non-javascript scripts
			if (script.type && !/^text\/javascript/.test(script.type)) return;

			// TODO probably don't need this as handled by init()
			if (script.hasAttribute('src')) { // external javascript in <body> is invalid
				console.warn('Frameset <body> may not contain external scripts: \n' +
					script.cloneNode(false).outerHTML);
				script.parentNode.removeChild(script);
				return;
			}

			let sourceURL = script.getAttribute('sourceurl');

			// TODO probably don't need this as handled by init()
			if (!script.hasAttribute('for')) {
				console.warn('Frameset <body> may not contain non-@for scripts:\n' +
						framesetDef.url + '#' + script.id);
				script.parentNode.removeChild(script); 
				return;
			}

			// TODO should this be handled by init() ??
			if (script.getAttribute('for') !== '') {
				console.warn('<script> may only contain EMPTY @for: \n' +
					script.cloneNode(false).outerHTML);
				script.parentNode.removeChild(script);
				return;
			}

			let scriptFor = script;
			while (scriptFor = scriptFor.previousSibling) {
				if (scriptFor.nodeType !== 1) continue;
				let tag = getTagName(scriptFor);
				if (tag !== 'script' && tag !== 'style') break;
			}
			if (!scriptFor) scriptFor = script.parentNode;
			
			// FIXME @config shouldn't be hard-wired here
			let configID = scriptFor.hasAttribute('config') ?
				scriptFor.getAttribute('config') :
				'';
			// TODO we can add more than one @config to an element but only first is used
			configID = configID ?
				configID.replace(/\s*$/, ' ' + sourceURL) :
				sourceURL;
			scriptFor.setAttribute('config', configID);

			let fnText = 'return (' + script.text + '\n);';

			try {
				let fn = Function(fnText);
				let object = fn();
				configData.set(sourceURL, object);
			}
			catch(err) { 
				console.warn('Error evaluating inline script in frameset:\n' +
					framesetDef.url + '#' + script.id);
				Task.postError(err);
			}

			script.parentNode.removeChild(script); // physical <script> no longer needed
		});

		let frameElts = findAll(
			framesetDef.namespaces.lookupSelector('frame', HYPERFRAMESET_URN$1), 
			body);
		let frameDefElts = [];
		let frameRefElts = [];
		forEach(frameElts, function(el, index) { // FIXME hyperframes can't be outside of <body> OR descendants of repetition blocks

			// NOTE even if the frame is only a declaration (@def && @def !== @defid) it still has its content removed
			let placeholder = el.cloneNode(false);
			el.parentNode.replaceChild(placeholder, el); // NOTE no adoption

			let defId = el.getAttribute('defid');
			let def = el.getAttribute('def');
			if (def && def !== defId) {
				frameRefElts.push(el);
				return;
			}
			if (!defId) {
				defId = '__frame_' + index + '__'; // FIXME not guaranteed to be unique. Should be a function at top of module
				el.setAttribute('defid', defId);
			}
			if (!def) {
				def = defId;
				placeholder.setAttribute('def', def);
			}
			frameDefElts.push(el);
		});
		forEach(frameDefElts, function(el) {
			let defId = el.getAttribute('defid');
			framesetDef.frames[defId] = new HFrameDefinition(el, framesetDef);
		});
		forEach(frameRefElts, function(el) {
			let def = el.getAttribute('def');
			let ref = framesetDef.frames[def];
			if (!ref) {
				console.warn('Frame declaration references non-existant frame definition: ' + def);
				return;
			}
			let refEl = ref.element;
			if (!refEl.hasAttribute('scopeid')) return;
			let id = el.getAttribute('id');
			if (id) {
				console.warn('Frame declaration references a frame definition with scoped-styles but these cannot be applied because the frame declaration has its own @id: ' + id);
				return;
			}
			id = refEl.getAttribute('id');
			let scopeId = refEl.getAttribute('scopeid');
			if (id !== scopeId) {
				console.warn('Frame declaration references a frame definition with scoped-styles but these cannot be applied because the frame definition has its own @id: ' + id);
				return;
			}
			el.setAttribute('id', scopeId);
		});

	},

	render: function() {
		let framesetDef = this;
		return framesetDef.element.cloneNode(true);
	}

	});

	/*
	 Rebase scope URLs:
		scope:{path}
	 is rewritten with `path` being relative to the current scope.
	 */

	let urlAttributes = URL.attributes;

	function rebase(doc, scopeURL) {
		forOwn(urlAttributes, function(attrList, tag) {
			forEach(findAll(tag, doc), function(el) {
				forOwn(attrList, function(attrDesc, attrName) {
					let relURL = el.getAttribute(attrName);
					if (relURL == null) return;
					let url = rebaseURL(relURL, scopeURL);
					if (url != relURL) el[attrName] = url;
				});
			});
		});
	}

	function rebaseURL(url, baseURL) {
		let relURL = url.replace(/^scope:/i, '');
		if (relURL == url) return url;
		return baseURL.resolve(relURL);
	}

	function normalizeScopedStyles(doc, allowedScopeSelector) {
		let scopedStyles = findAll('style[scoped]', doc.body);
		let dummyDoc = createHTMLDocument('', doc);
		forEach(scopedStyles, function(el, index) {
			let scope = el.parentNode;
			if (!matches(scope, allowedScopeSelector)) {
				console.warn('Removing <style scoped>. Must be child of ' + allowedScopeSelector);
				scope.removeChild(el);
				return;
			}
			
			let scopeId = '__scope_' + index + '__';
			scope.setAttribute('scopeid', scopeId);
			if (scope.hasAttribute('id')) scopeId = scope.getAttribute('id');
			else scope.setAttribute('id', scopeId);

			el.removeAttribute('scoped');
			let sheet = el.sheet || (function() {
				// Firefox doesn't seem to instatiate el.sheet in XHR documents
				let dummyEl = dummyDoc.createElement('style');
				dummyEl.textContent = el.textContent;
				insertNode('beforeend', dummyDoc.head, dummyEl);
				return dummyEl.sheet;
			})();
			forRules(sheet, processRule, scope);
			let cssText = map(sheet.cssRules, function(rule) {
					return rule.cssText; 
				}).join('\n');
			el.textContent = cssText;
			insertNode('beforeend', doc.head, el);
			return;
		});
	}

	function processRule(rule, id, parentRule) {
		let scope = this;
		switch (rule.type) {
		case 1: // CSSRule.STYLE_RULE
			// prefix each selector in selector-chain with scopePrefix
			// selector-chain is split on COMMA (,) that is not inside BRACKETS. Technically: not followed by a RHB ')' unless first followed by LHB '(' 
			let scopeId = scope.getAttribute('scopeid');
			let scopePrefix = '#' + scopeId + ' ';
			let selectorText = scopePrefix + rule.selectorText.replace(/,(?![^(]*\))/g, ', ' + scopePrefix);
			let cssText = rule.cssText.replace(rule.selectorText, '');
			cssText = selectorText + ' ' + cssText;
			parentRule.deleteRule(id);
			parentRule.insertRule(cssText, id);
			break;

		case 11: // CSSRule.COUNTER_STYLE_RULE
			break;

		case 4: // CSSRule.MEDIA_RULE
		case 12: // CSSRule.SUPPORTS_RULE
			forRules(rule, processRule, scope);
			break;
		
		default:
			console.warn('Deleting invalid rule for <style scoped>: \n' + rule.cssText);
			parentRule.deleteRule(id);
			break;
		}
	}

	function forRules(parentRule, callback, context) {
		let ruleList = parentRule.cssRules;
		for (let i=ruleList.length-1; i>=0; i--) callback.call(context, ruleList[i], i, parentRule);
	}
		

	return HFramesetDefinition;	
	})();


	defaults(HFramesetDefinition, {

	HYPERFRAMESET_URN: HYPERFRAMESET_URN$1

	});

	var framesetDefinitions = /*#__PURE__*/Object.freeze({
		__proto__: null,
		HFrameDefinition: HFrameDefinition,
		HFramesetDefinition: HFramesetDefinition,
		HBodyDefinition: HBodyDefinition,
		HTransformDefinition: HTransformDefinition
	});

	/*!
	 * HyperFrameset framer
	 * Copyright 2009-2016 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */

	const HYPERFRAMESET_URN$2 = HFramesetDefinition.HYPERFRAMESET_URN;

	// FIXME DRY these @rel values with boot.js
	const FRAMESET_REL = 'frameset'; // NOTE http://lists.w3.org/Archives/Public/www-html/1996Dec/0143.html
	const SELF_REL = 'self';

	let document$a = window.document;

	let framer = {};

	defaults(framer, {

	options: {
		/* The following options are available (unless otherwise indicated) *
		lookup: function(url) {},
		detect: function(document) {},
		entering: { before: noop, after: noop },
		leaving: { before: noop, after: noop }, // TODO not called at all
		ready: noop // TODO should this be entering:complete ??
		/**/
	},

	config: function(options) {
		let framer = this;
		if (!options) return;
		assign(framer.options, options);
	}

	});


	let framesetReady = Promise.applyTo();

	defaults(framer, {

	frameset: null,

	started: false,

	start: function(startOptions) {
		let framer = this;
		
		if (framer.started) throw Error('Already started');
		if (!startOptions || !startOptions.contentDocument) throw Error('No contentDocument passed to start()');

		framer.started = true;
		startOptions.contentDocument
		.then(function(doc) { // FIXME potential race condition between document finished loading and frameset rendering
			return httpProxy.add({
				url: document$a.URL,
				type: 'document',
				document: doc
			});
		});
		
		return Promise.pipe(null, [
			
		function() { // sanity check
			return Promise.wait(function() { return !!document$a.body; });
		},

		function() { // lookup or detect frameset.URL
			let framerConfig;
			framerConfig = framer.lookup(document$a.URL);
			if (framerConfig) return framerConfig;
			return startOptions.contentDocument
				.then(function(doc) {
					return framer.detect(doc);
				});
		},

		function(framerConfig) { // initiate fetch of frameset.URL
			if (!framerConfig) throw Error('No frameset could be determined for this page');
			framer.scope = framerConfig.scope; // FIXME shouldn't set this until loadFramesetDefinition() returns success
			let framesetURL = URL(framerConfig.framesetURL);
			if (framesetURL.hash) console.info('Ignoring hash component of frameset URL: ' + framesetURL.hash);
			framer.framesetURL = framerConfig.framesetURL = framesetURL.nohash;
			return httpProxy.load(framer.framesetURL, { responseType: 'document' })
			.then(function(response) {
				let framesetDoc = response.document;
				return new HFramesetDefinition(framesetDoc, framerConfig);
			});
		},

		function(definition) {
			return Promise.pipe(definition, [
			
			function() {
				framer.definition = definition;
				return prepareFrameset(document$a, definition)
			},

			function() { 
				return definition.preprocess();
			},

			function() {
				return prerenderFrameset(document$a, definition)
			}

			]);
		},
		
		function() {
			window.addEventListener('click', function(e) {
				if (e.defaultPrevented) return;
				let acceptDefault = framer.onClick(e);
				if (acceptDefault === false) e.preventDefault();
			}, false); // onClick generates requestnavigation event
			window.addEventListener('submit', function(e) {
				if (e.defaultPrevented) return;
				let acceptDefault = framer.onSubmit(e);
				if (acceptDefault === false) e.preventDefault();
			}, false);
			
			registerFrames(framer.definition);
			interceptFrameElements();
			retargetFramesetElements();
			let namespace = framer.definition.namespaces.lookupNamespace(HYPERFRAMESET_URN$2);
			layoutElements.register(namespace);
			frameElements.register(namespace);
			registerFramesetElement();
			formElements.register();

			return sprockets.start({ manual: true }); // FIXME should be a promise
		},

		function() { // TODO ideally frameset rendering wouldn't start until after this step
			return framesetReady
			.then(function() {

				let changeset = framer.currentChangeset;
				// FIXME what if no changeset is returned
				return historyManager.start(changeset, '', document$a.URL,
					function(state) { }, // FIXME need some sort of rendering status
					function(state) { return framer.onPopState(state.getData()); }
					);
			});
		},

		function() { // FIXME this should wait until at least the landing document has been rendered in one frame

			notify({ // NOTE this doesn't prevent start() from resolving
				module: 'frameset',
				type: 'enteredState',
				stage: 'after',
				url: document$a.URL
			});

		},

		// TODO it would be nice if <body> wasn't populated until stylesheets were loaded
		function() {
			return Promise.wait(function() { return checkStyleSheets(); })
		}	
		
		]);

		
	}

	});

	let prepareFrameset = function(dstDoc, definition) {

		if (getFramesetMarker(dstDoc)) throw Error('The HFrameset has already been applied');

		let srcDoc = cloneDocument(definition.document);

		let selfMarker;
		
		return Promise.pipe(null, [

		function() { // remove all <link rel=stylesheet /> just in case
			// FIXME maybe remove all <link>
			let dstHead = dstDoc.head;
			forEach(findAll('link[rel|=stylesheet]', dstHead), function(node) {
				dstHead.removeChild(node);
			});
		},

		function() { // empty the body
			let dstBody = dstDoc.body;
			let node;
			while (node = dstBody.firstChild) dstBody.removeChild(node);
		},

		function() {
			selfMarker = getSelfMarker(dstDoc);
			if (selfMarker) return;
			selfMarker = dstDoc.createElement('link');
			selfMarker.rel = SELF_REL;
			selfMarker.href = dstDoc.URL;
			dstDoc.head.insertBefore(selfMarker, dstDoc.head.firstChild); // NOTE no adoption
		},

		function() {
			let framesetMarker = dstDoc.createElement('link');
			framesetMarker.rel = FRAMESET_REL;
			framesetMarker.href = definition.src;
			dstDoc.head.insertBefore(framesetMarker, selfMarker); // NOTE no adoption
		},
		
		function() {
			mergeElement(dstDoc.documentElement, srcDoc.documentElement);
			mergeElement(dstDoc.head, srcDoc.head);
			mergeHead(dstDoc, srcDoc.head, true);
			// allow scripts to run. FIXME scripts should always be appended to document.head
			forEach(findAll('script', dstDoc.head), function(script) {
				scriptQueue.push(script);
			});
			return scriptQueue.empty();
		}
		
		]);

	};

	let prerenderFrameset = function(dstDoc, definition) { // FIXME where does this go
		let srcBody = definition.element;
		let dstBody = document$a.body;
		mergeElement(dstBody, srcBody);
	};

	// TODO separateHead and mergeHead are only called with isFrameset === true
	function separateHead(dstDoc, isFrameset) {
		let dstHead = dstDoc.head;
		let framesetMarker = getFramesetMarker(dstDoc);
		if (!framesetMarker) throw Error('No ' + FRAMESET_REL + ' marker found. ');

		let selfMarker = getSelfMarker(dstDoc);
		// remove frameset / page elements except for <script type=text/javascript>
		if (isFrameset) forEach(siblings('after', framesetMarker, 'before', selfMarker), remove);
		else forEach(siblings('after', selfMarker), remove);
		
		function remove(node) {
			if (getTagName(node) == 'script' && (!node.type || node.type.match(/^text\/javascript/i))) return;
			dstHead.removeChild(node);
		}
	}

	function mergeHead(dstDoc, srcHead, isFrameset) {
		let baseURL = URL(dstDoc.URL);
		let dstHead = dstDoc.head;
		let framesetMarker = getFramesetMarker();
		if (!framesetMarker) throw Error('No ' + FRAMESET_REL + ' marker found. ');
		let selfMarker = getSelfMarker();

		separateHead(dstDoc, isFrameset);

		forEach(map(srcHead.childNodes), function(srcNode) {
			if (srcNode.nodeType != 1) return;
			switch (getTagName(srcNode)) {
			default:
				break;
			case 'title':
				if (isFrameset) return; // ignore <title> in frameset. FIXME what if topic content has no <title>?
				if (!srcNode.innerHTML) return; // IE will add a title even if non-existant
				break;
			case 'link': // FIXME no duplicates @rel, @href pairs
				break;
			case 'meta': // FIXME no duplicates, warn on clash
				if (srcNode.httpEquiv) return;
				break;
			case 'style': 
				break;
			case 'script':  // FIXME no duplicate @src
				if (!isFrameset) return; // WARN even non-js script-type is rejected
				if (!srcNode.type || /^text\/javascript$/i.test(srcNode.type)) srcNode.type = 'text/javascript?disabled';
				break;
			}
			if (isFrameset) insertNode('beforebegin', selfMarker, srcNode);
			else insertNode('beforeend', dstHead, srcNode);
			if (getTagName(srcNode) == 'link') srcNode.href = srcNode.getAttribute('href'); // Otherwise <link title="..." /> stylesheets don't work on Chrome
		});
	}

	function mergeElement(dst, src) { // NOTE this removes all dst (= landing page) attrs and imports all src (= frameset) attrs.
		removeAttributes(dst);
		copyAttributes(dst, src);
		dst.removeAttribute('style'); // FIXME is this appropriate? There should at least be a warning
	}

	function getFramesetMarker(doc) {
		if (!doc) doc = document$a;
		let marker = find$1('link[rel~=' + FRAMESET_REL + ']', doc.head);
		return marker;
	}

	function getSelfMarker(doc) {
		if (!doc) doc = document$a;
		let marker = find$1('link[rel~=' + SELF_REL + ']', doc.head);
		return marker;
	}


	defaults(framer, {

	framesetEntered: function(frameset) {
		let framer = this;
		framer.frameset = frameset;
		let url = document$a.URL;
		framer.currentChangeset = frameset.lookup(url, {
			referrer: document$a.referrer
		});
		framesetReady.resolve();
	},

	framesetLeft: function(frameset) { // WARN this should never happen
		let framer = this;
		delete framer.frameset;
	},

	frameEntered: function(frame) {
		let namespaces = framer.definition.namespaces;
		let parentFrame;
		let parentElement = closest(frame.element.parentNode, HFrame.isFrame); // TODO frame.element.parentNode.ariaClosest('frame')
		if (parentElement) parentFrame = parentElement.$;
		else {
			parentElement = document$a.body; // TODO  frame.element.parentNode.ariaClosest('frameset'); 
			parentFrame = parentElement.$;
		}
		parentFrame.frameEntered(frame);
		frame.parentFrame = parentFrame;

		if (frame.targetname === framer.currentChangeset.target) { // FIXME should only be used at startup
			frame.attr('src', framer.currentChangeset.url);
		}
	},

	frameLeft: function(frame) {
		let parentFrame = frame.parentFrame;
		delete frame.parentFrame;
		parentFrame.frameLeft(frame);
	},

	onClick: function(e) { // return false means success
		let framer = this;

		if (e.button != 0) return; // FIXME what is the value for button in IE's W3C events model??
		if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return; // FIXME do these always trigger modified click behavior??

		// Find closest <a href> to e.target
		let linkElement = closest(e.target, 'a, [link]');
		if (!linkElement) return;
		let hyperlink;
		if (getTagName(linkElement) === 'a') hyperlink = linkElement;
		else {
			hyperlink = find$1('a, link', linkElement);
			if (!hyperlink) hyperlink = closest('a', linkElement);
			if (!hyperlink) return;
		}
		let href = hyperlink.getAttribute('href');
		if (!href) return; // not really a hyperlink

		let baseURL = URL(document$a.URL);
		let url = baseURL.resolve(href); // TODO probably don't need to resolve on browsers that support pushstate

		// NOTE The following creates a pseudo-event and dispatches to frames in a bubbling order.
		// FIXME May as well use a virtual event system, e.g. DOMSprockets
		let details = {
			url: url,
			element: hyperlink
		}; // TODO more details?? event??

		framer.triggerRequestNavigation(details.url, details);
		return false;
	},

	onSubmit: function(e) { // return false means success
		let framer = this;

		// test submit
		let form = e.target;
		if (form.target) return; // no iframe
		let baseURL = URL(document$a.URL);
		let action = baseURL.resolve(form.action); // TODO probably don't need to resolve on browsers that support pushstate
		
		let details = {
			element: form
		};
		let method = lc(form.method);
		switch(method) {
		case 'get':
			let oURL = URL(action);
			let query = encode(form);
			details.url = oURL.nosearch + (oURL.search || '?') + query + oURL.hash;
			break;
		default: return; // TODO handle POST
		}
		
		framer.triggerRequestNavigation(details.url, details);
		return false;
		
		function encode(form) {
			let data = [];
			forEach(form.elements, function(el) {
				if (!el.name) return;
				data.push(el.name + '=' + encodeURIComponent(el.value));
			});
			return data.join('&');
		}
	},

	triggerRequestNavigation: function(url, details) {
		Promise.defer(function() {
			let event = document$a.createEvent('CustomEvent');
			event.initCustomEvent('requestnavigation', true, true, details.url);
			let acceptDefault = details.element.dispatchEvent(event);
			if (acceptDefault !== false) {
				location.assign(details.url);
			}
		});
	},

	onRequestNavigation: function(e, frame) { // `return false` means success (so preventDefault)
		let framer = this;
		if (!frame) throw Error('Invalid frame / frameset in onRequestNavigation');
		// NOTE only pushState enabled browsers use this
		// We want panning to be the default behavior for clicks on hyperlinks - <a href>
		// Before panning to the next page, have to work out if that is appropriate
		// `return` means ignore the click

		let url = e.detail;
		let details = {
			url: url,
			element: e.target
		};
		
		if (!frame.isFrameset) {
			if (requestNavigation(frame, url, details)) return false;
			return;
		}
		
		// test hyperlinks
		let baseURL = URL(document$a.URL);
		let oURL = URL(url);
		if (oURL.origin != baseURL.origin) return; // no external urls

		// TODO perhaps should test same-site and same-page links
		let isPageLink = (oURL.nohash === baseURL.nohash); // TODO what about page-links that match the current hash?
		if (isPageLink) {
			framer.onPageLink(url, details);
			return false;
		}

		let frameset = frame;
		let framesetScope = framer.lookup(url);
		if (!framesetScope || !framer.compareFramesetScope(framesetScope)) { // allow normal browser navigation
			return;
		}
		
		if (requestNavigation(frameset, url, details)) return false;
		return;

		function requestNavigation(frame, url, details) { // `return true` means success
			let changeset = frame.lookup(url, details);
			if (changeset === '' || changeset === true) return true;
			if (changeset == null || changeset === false) return false;
			framer.load(url, changeset, frame.isFrameset);
			return true;
		}

	},

	onPageLink: function(url, details) {
		console.warn('Ignoring on-same-page links for now.'); // FIXME
	},

	navigate: function(url, changeset) { // FIXME doesn't support replaceState
		let framer = this;
		return framer.load(url, changeset, true);
	},

	load: function(url, changeset, changeState) { // FIXME doesn't support replaceState
		let framer = this;
		let frameset = framer.frameset;
		let mustNotify = changeState || changeState === 0;
		let target = changeset.target;
		let frames = [];
		recurseFrames(frameset, function(frame) {
			if (frame.targetname !== target) return;
			frames.push(frame);
			return true;
		});
		
		let fullURL = URL(url);
		let hash = fullURL.hash;
		let nohash = fullURL.nohash;
		let request = { method: 'get', url: nohash, responseType: 'document' }; // TODO one day may support different response-type

		return Promise.pipe(null, [

		function() {
			if (mustNotify) return notify({ // FIXME need a timeout on notify
				module: 'frameset',
				type: 'leftState',
				stage: 'before',
				url: document$a.URL
				// TODO details, resource, url, frames??
				});
		},
		function() {
			forEach(frames, function(frame) {
				frame.attr('src', fullURL);
			});
		},
		function() { // NOTE .load() is just to sync pushState
			return httpProxy.load(nohash, request)
			.then(function(resp) { });
		},
		function() { // FIXME how to handle `hash` if present??
			if (changeState) return historyManager.pushState(changeset, '', url, function(state) {});
		},
		function() { // FIXME need to wait for the DOM to stabilize before this notification
			if (mustNotify) return notify({ // FIXME need a timeout on notify
				module: 'frameset',
				type: 'enteredState',
				stage: 'after',
				url: url
				// TODO details, resource, url, frames??
				});
		}
			
		]);

		function recurseFrames(parentFrame, fn) {
			forEach(parentFrame.frames, function(frame) {
				let found = fn(frame);
				if (!found) recurseFrames(frame, fn);
			});			
		}
	},

	onPopState: function(changeset) {
		let framer = this;
		let frameset = framer.frameset;
		let url = changeset.url;
		if (url !== document$a.URL) {
			console.warn('Popped state URL does not match address-bar URL.');
			// FIXME needs an optional error recovery, perhaps reloading document.URL
		}
		framer.load(url, changeset, 0);
	}

	});

	defaults(framer, {

	lookup: function(docURL) {
		let framer = this;
		if (!framer.options.lookup) return;
		let result = framer.options.lookup(docURL);
		// FIXME if (result === '' || result === true) 
		if (result == null || result === false) return false;

		// FIXME error if `result` is a relative URL
		if (typeof result === 'string') result = implyFramesetScope(result, docURL);
		if (typeof result !== 'object' || !result.scope || !result.framesetURL) throw Error('Unexpected result from frameset lookup');
		return result;
	},

	detect: function(srcDoc) {
		let framer = this;
		if (!framer.options.detect) return;
		let result = framer.options.detect(srcDoc);
		// FIXME if (result === '' || result === true) 
		if (result == null || result === false) return false;

		// FIXME error if `result` is a relative URL
		if (typeof result === 'string') result = implyFramesetScope(result, document$a.URL);
		if (typeof result !== 'object' || !result.scope || !result.framesetURL) throw Error('Unexpected result from frameset detect');
		return result;
	},

	compareFramesetScope: function(settings) {
		let framer = this;
		if (framer.framesetURL !== settings.framesetURL) return false;
		if (framer.scope !== settings.scope) return false;
		return true;
	},

	inferChangeset: inferChangeset

	});

	function implyFramesetScope(framesetSrc, docSrc) {
		let docURL = URL(docSrc);
		let docSiteURL = URL(docURL.origin);
		framesetSrc = docSiteURL.resolve(framesetSrc);
		let scope = implyScope(framesetSrc, docSrc);
		return {
			scope: scope,
			framesetURL: framesetSrc
		}
	}

	function implyScope(framesetSrc, docSrc) {
		let docURL = URL(docSrc);
		let framesetURL = URL(framesetSrc);
		let scope = docURL.base;
		let framesetBase = framesetURL.base;
		if (scope.indexOf(framesetBase) >= 0) scope = framesetBase;
		return scope;
	}

	function inferChangeset(url, partial) {
		let inferred = {
			url: url
		};
		
		switch (typeof partial) {
		case 'string':
			inferred.target = partial;
			break;
		case 'object':
			/*
			if (partial instanceof Array) {
				inferred.target = partial[0];
				inferred.targets = partial.slice(0);
				break;
			}
			*/
		default:
			throw Error('Invalid changeset returned from lookup()');
			break;
		}
		
		return inferred;
	}


	let notify = function(msg) { // FIXME this isn't being used called everywhere it should
		let module;
		switch (msg.module) {
		case 'frameset': module = framer.frameset.options; break;
		default: return Promise.resolve();
		}
		let handler = module[msg.type];
		if (!handler) return Promise.resolve();
		let listener;

		if (handler[msg.stage]) listener = handler[msg.stage];
		else switch(msg.module) {
		case 'frame':
			listener =
				msg.type == 'bodyLeft' ? (msg.stage == 'before' ? handler : null) :
				msg.type == 'bodyEntered' ? (msg.stage == 'after' ? handler : null) :
				null;
			break;
		case 'frameset':
			listener =
				msg.type == 'leftState' ? (msg.stage == 'before' ? handler : null) :
				msg.type == 'enteredState' ? (msg.stage == 'after' ? handler : null) :
				null;
			break;
		default:
			throw Error(msg.module + ' is invalid module');
			break;
		}

		if (typeof listener == 'function') {
			let promise = Promise.defer(function() { listener(msg); }); // TODO isFunction(listener)
			promise['catch'](function(err) { throw Error(err); });
			return promise;
		}
		else return Promise.resolve();
	};

	function registerFrames(framesetDef) {
		forOwn(framesetDef.frames, function(o, key) {
			frameDefinitions.set(key, o);
		});
	}

	// FIXME Monkey-patch to allow creation of tree of frames
	function interceptFrameElements() {

	assign(HFrame.prototype, {

	frameEntered: function(frame) {
		this.frames.push(frame);
	},

	frameLeft: function(frame) {
		let index = this.frames.indexOf(frame);
		this.frames.splice(index);
	}

	});

	HFrame._attached = HFrame.attached;
	HFrame._enteredDocument = HFrame.enteredDocument;
	HFrame._leftDocument = HFrame.leftDocument;

	assign(HFrame, {

	attached: function(handlers) {
		this.frames = [];
		HFrame._attached.call(this, handlers);
	},

	enteredDocument: function() {
		framer.frameEntered(this);
		HFrame._enteredDocument.call(this);
	},

	leftDocument: function() {
		framer.frameLeft(this); 
		HFrame._leftDocument.call(this);
	}

	});

	} // end patch


	let HFrameset = (function() {

	let HFrameset = sprockets.evolve(HBase, {

	role: 'frameset',
	isFrameset: true,

	frameEntered: function(frame) {
		this.frames.push(frame);
	},

	frameLeft: function(frame) {
		let index = this.frames.indexOf(frame);
		this.frames.splice(index);
	},

	render: function() {

		let frameset = this;
		let definition = frameset.definition;
		let dstBody = this.element;

		let srcBody = definition.render();
		
		return Promise.pipe(null, [

		function() {
			forEach(map(srcBody.childNodes), function(node) {
				sprockets.insertNode('beforeend', dstBody, node);
			});
		}

		]);

	}

	});

	assign(HFrameset, {

	attached: function(handlers) {
		HBase.attached.call(this, handlers);

		let frameset = this;
		frameset.definition = framer.definition; // TODO remove `framer` dependency
		defaults(frameset, {
			frames: []
		});

		ConfigurableBody.attached.call(this, handlers); // FIXME
	}, 

	enteredDocument: function() {
		let frameset = this;
		framer.framesetEntered(frameset); // TODO remove `framer` dependency
		frameset.render();
	},

	leftDocument: function() { // FIXME should never be called??
		let frameset = this;
		framer.framesetLeft(frameset); // TODO remove `framer` dependency
	}

	});

	return HFrameset;
	})();

	// FIXME Monkey-patch to allow all HyperFrameset sprockets to retarget requestnavigation events
	function retargetFramesetElements() {

	assign(HBase.prototype, {

	lookup: function(url, details) {
		let link = this;
		let options = link.options;
		if (!options || !options.lookup) return false;
		let partial = options.lookup(url, details);
		if (partial === '' || partial === true) return true;
		if (partial == null || partial === false) return false;
		return framer.inferChangeset(url, partial);
	}

	});

	HBase._attached = HBase.attached;

	HBase.attached = function(handlers) {
		HBase._attached.call(this, handlers);
		let object = this;
		let options = object.options;
		if (!options.lookup) return;

		handlers.push({
			type: 'requestnavigation',
			action: function(e) {
				if (e.defaultPrevented) return;
				let acceptDefault = framer.onRequestNavigation(e, this);
				if (acceptDefault === false) e.preventDefault();
			}
		});
	};

	} // end retarget

	function registerFramesetElement() {

		sprockets.registerElement('body', HFrameset);
		let cssText = [
		'html, body { margin: 0; padding: 0; }',
		'html { width: 100%; height: 100%; }'
		];
		let style = document$a.createElement('style');
		style.textContent = cssText;
		document$a.head.insertBefore(style, document$a.head.firstChild);

	}

	(function() {

	    let stuff = assign({}, _);
	    stuff.dateFormat = dateFormat;

	    if (!this.Meeko) this.Meeko = {};
	    assign(this.Meeko, {
	        stuff, Registry, Task, Promise: Promise, URL, DOM, scriptQueue,
	        sprockets,
	        htmlParser, httpProxy, historyManager,
	        CustomNamespace,
	        filters, decoders, processors,
	        configData, controllers,
	        frameElements, frameDefinitions,
	        framer,
	        CSSDecoder, MicrodataDecoder, Microdata, JSONDecoder,
	        MainProcessor, ScriptProcessor, HazardProcessor,
	        HFrame, HFrameset
	    });

	    assign(this.Meeko, formElements$1);
	    assign(this.Meeko, layoutElements$1);
	    assign(this.Meeko, framesetDefinitions);

	}).call(window);

}());
