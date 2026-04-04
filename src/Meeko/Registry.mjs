/**
 * @typedef {Object} RegistryOptions
 * @property {boolean} [writeOnce] - If true, keys cannot be overwritten, deleted, or cleared.
 * @property {(key: string) => boolean} [keyValidator] - Returns true if the key is valid.
 * @property {(value: *) => boolean} [valueValidator] - Returns true if the value is valid.
 */

/**
 * A validated key-value store extending Map.
 * Supports write-once semantics and key/value validation.
 * @extends {Map<string, *>}
 */
class Registry extends Map {

#writeOnce;
#keyValidator;
#valueValidator;

/**
 * @param {RegistryOptions} [options]
 */
constructor({ writeOnce, keyValidator, valueValidator } = {}) {
	super();
	this.#writeOnce = writeOnce;
	this.#keyValidator = keyValidator;
	this.#valueValidator = valueValidator;
}

/**
 * @param {string} key
 * @param {*} value
 * @returns {this}
 * @throws {Error} If key exists in write-once mode, or key/value fails validation.
 */
set(key, value) {
	if (this.#writeOnce && this.has(key)) {
		throw Error(`Attempted to rewrite key ${key} in write-once storage`);
	}
	if (this.#keyValidator && !this.#keyValidator(key)) {
		throw Error(`Invalid key ${key} for storage`);
	}
	if (this.#valueValidator && !this.#valueValidator(value)) {
		throw Error(`Invalid value ${value} for storage`);
	}
	return super.set(key, value);
}

/**
 * @throws {Error} If in write-once mode.
 */
clear() {
	if (this.#writeOnce) throw Error(`Attempted to clear write-once storage`);
	return super.clear();
}

/**
 * @param {string} key
 * @returns {boolean}
 * @throws {Error} If key exists in write-once mode.
 */
delete(key) {
	if (this.#writeOnce && this.has(key)) {
		throw Error(`Attempted to delete key ${key} in write-once storage`);
	}
	return super.delete(key);
}

/** Alias for {@link Registry#set}. */
register(key, value) { return this.set(key, value); }

}

export default Registry;
