/*!
 * HistoryState
 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */
class HistoryState {
    static #STATE_TAG = 'HyperFrameset';

    constructor(settings) {
        if (!HistoryState.isValid(settings)) throw Error('Invalid settings for new HistoryState');
        this.settings = settings;
    }

    static isValid(settings) {
        return settings != null && settings[HistoryState.#STATE_TAG] === true;
    }

    static create(data, title, url) {
        let settings = {
            title: title,
            url: url,
            timeStamp: Date.now(),
            data: data
        };
        settings[HistoryState.#STATE_TAG] = true;
        return new HistoryState(settings);
    }

    getData() {
        return this.settings.data;
    }
}

export default HistoryState;
