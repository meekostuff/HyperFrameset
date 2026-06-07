/*!
 * historyManager
 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */
import HistoryState from './HistoryState.mjs';

/**
 * Lightweight wrapper around the Navigation API.
 * Maintains the same interface as the legacy history.pushState-based implementation.
 *
 * Must be started with start() before use. Cannot be restarted.
 */
class HistoryManager {

#currentState;
#popStateHandler;
#started = false;

/**
 * Get the current history state.
 * @returns {HistoryState|undefined}
 */
getState() {
	return this.#currentState;
}

/**
 * Initialize the history manager. Can only be called once.
 * Replaces the current navigation entry and registers a traverse listener.
 * @param {*} data - Application data to store in state
 * @param {string} title - Page title
 * @param {string} url - URL for the history entry
 * @param {Function} onNewState - Called with the new HistoryState on initialization
 * @param {Function} onPopState - Called with the restored HistoryState on traverse events
 * @returns {Promise}
 */
start(data, title, url, onNewState, onPopState) {
	if (this.#started) throw Error('historyManager has already started');
	this.#started = true;
	this.#popStateHandler = onPopState;

	navigation.addEventListener('navigate', (e) => {
		if (!e.canIntercept) return;
		if (e.navigationType === 'traverse') {
			e.intercept({
				handler: () => {
					let state = navigation.currentEntry.getState();
					if (!HistoryState.isValid(state)) return;
					this.#currentState = new HistoryState(state);
					if (this.#popStateHandler) this.#popStateHandler(this.#currentState);
				}
			});
		}
	});

	let newState = HistoryState.create(data, title, url);
	history.replaceState(null, '', url);
	navigation.updateCurrentEntry({ state: newState.settings });
	this.#currentState = newState;
	return Promise.resolve(onNewState(this.#currentState));
}

/**
 * Create a new history entry or replace the current one.
 * @param {*} data - Application data to store in state
 * @param {string} title - Page title
 * @param {string} url - URL for the history entry
 * @param {boolean} useReplace - If true, replaces current entry instead of pushing
 * @param {Function} [callback] - Called with the new HistoryState
 * @returns {Promise}
 */
newState(data, title, url, useReplace, callback) {
	let newState = HistoryState.create(data, title, url);
	if (useReplace) history.replaceState(null, '', url);
	else history.pushState(null, '', url);

	navigation.updateCurrentEntry({ state: newState.settings });
	this.#currentState = newState;
	if (callback) return Promise.resolve(callback(this.#currentState));
	return Promise.resolve();
}

/**
 * Replace the current history entry.
 * @param {*} data
 * @param {string} title
 * @param {string} url
 * @param {Function} [callback]
 * @returns {Promise}
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
 * @returns {Promise}
 */
pushState(data, title, url, callback) {
	return this.newState(data, title, url, false, callback);
}

}

export default new HistoryManager();
