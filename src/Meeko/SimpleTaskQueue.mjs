import Thenfu from './Thenfu.mjs';

/**
 * A serial async task queue that executes tasks one at a time,
 * deferring each to allow the browser to remain responsive.
 */
class SimpleTaskQueue {

#queue = [];
#maxSize;
#processing = false;

/**
 * @param {number} [maxSize=1] - Maximum number of tasks allowed to be queued while processing.
 */
constructor(maxSize = 1) {
	this.#maxSize = maxSize;
}

#bump() {
	if (this.#processing) return;
	this.#processing = true;
	this.#process();
}

#process() {
	if (this.#queue.length <= 0) {
		this.#processing = false;
		return;
	}
	let task = this.#queue.shift();
	let promise = Thenfu.defer(task.fn);
	promise.then(() => this.#process(), () => this.#process());
	promise.then(task.resolve, task.reject);
}

/**
 * Queue a task to run as soon as possible. Fails if the queue is non-empty.
 * @param {Function} fn - Task function to execute
 * @param {Function} [fail] - Called if the queue is full
 * @returns {Promise} Resolves with fn's return value, or rejects if full and no fail callback
 */
now(fn, fail) {
	return this.whenever(fn, fail, 0);
}

/**
 * Clear the queue and schedule a task.
 * @param {Function} fn - Task function to execute
 * @returns {Promise} Resolves with fn's return value
 */
reset(fn) {
	this.#queue.length = 0;
	return this.whenever(fn, null, 1);
}

/**
 * Queue a task if the queue size is within the allowed limit.
 * @param {Function} fn - Task function to execute
 * @param {Function} [fail] - Called if the queue is full
 * @param {number} [max] - Override for maximum queue size (defaults to constructor maxSize)
 * @returns {Promise} Resolves with fn's return value, or rejects if full and no fail callback
 */
whenever(fn, fail, max) {
	if (max == null) max = this.#maxSize;
	return new Promise((resolve, reject) => {
		if (this.#queue.length > max || (this.#queue.length === max && this.#processing)) {
			if (fail) Thenfu.defer(fail).then(resolve, reject);
			else reject(function() { throw Error('No `fail` callback passed to whenever()'); });
			return;
		}
		this.#queue.push({fn, resolve, reject});
		this.#bump();
	});
}

}

export default SimpleTaskQueue;
