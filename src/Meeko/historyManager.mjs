import SimpleTaskQueue from './SimpleTaskQueue.mjs';
import HistoryState from './HistoryState.mjs';

/**
 * Wrapper around the browser History API providing locking around state updates
 * and throttling of popstate events via an internal task queue.
 * 
 * Must be started with start() before use. Cannot be restarted.
 * All state-changing methods are serialized through the task queue to prevent
 * concurrent history modifications.
 */
class HistoryManager {

#taskQueue = new SimpleTaskQueue();
#currentState;
#popStateHandler;
#started = false;

constructor() {
	if (history.replaceState) window.addEventListener('popstate', (e) => {
		if (e.stopImmediatePropagation) e.stopImmediatePropagation();
		else e.stopPropagation();

		let newSettings = e.state;
		if (!HistoryState.isValid(newSettings)) {
			console.warn('Ignoring invalid PopStateEvent');
			return;
		}
		this.#taskQueue.reset(() => {
			this.#currentState = new HistoryState(newSettings);
			if (!this.#popStateHandler) return;
			return this.#popStateHandler(this.#currentState);
		});
	}, true);
}

/**
 * Get the current history state.
 * @returns {HistoryState|undefined}
 */
getState() {
	return this.#currentState;
}

/**
 * Initialize the history manager. Can only be called once.
 * Replaces the current history entry and registers a popstate listener.
 * @param {*} data - Application data to store in state
 * @param {string} title - Page title
 * @param {string} url - URL for the history entry
 * @param {Function} onNewState - Called with the new HistoryState on initialization
 * @param {Function} onPopState - Called with the restored HistoryState on popstate events
 * @returns {Thenfu}
 */
start(data, title, url, onNewState, onPopState) { // FIXME this should call onPopState if history.state is defined
	return this.#taskQueue.now(() => {
		if (this.#started) throw Error('historyManager has already started');
		this.#started = true;
		this.#popStateHandler = onPopState;
		let newState = HistoryState.create(data, title, url);
		if (history.replaceState) {
			history.replaceState(newState.settings, title, url);
		}
		this.#currentState = newState;
		return onNewState(newState);
	});
}

/**
 * Create a new history entry or replace the current one.
 * @param {*} data - Application data to store in state
 * @param {string} title - Page title
 * @param {string} url - URL for the history entry
 * @param {boolean} useReplace - If true, replaces current entry instead of pushing
 * @param {Function} [callback] - Called with the new HistoryState
 * @returns {Thenfu}
 */
newState(data, title, url, useReplace, callback) {
	return this.#taskQueue.now(() => {
		let newState = HistoryState.create(data, title, url);
		if (history.replaceState) {
			if (useReplace) history.replaceState(newState.settings, title, url);
			else history.pushState(newState.settings, title, url);
		}
		this.#currentState = newState;
		if (callback) return callback(newState);
	});
}

/**
 * Replace the current history entry.
 * @param {*} data
 * @param {string} title
 * @param {string} url
 * @param {Function} [callback]
 * @returns {Thenfu}
 */
replaceState(data, title, url, callback) {
	return this.newState(data, title, url, true, callback);
}

/**
 * Push a new history entry.
 * @param {*} data
 * @param {string} title
 * @param {string} url
 * @param {Function} [callback]
 * @returns {Thenfu}
 */
pushState(data, title, url, callback) {
	return this.newState(data, title, url, false, callback);
}

}

export default new HistoryManager();
