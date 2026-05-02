/*!
 JS utils
 (c) Sean Hogan, 2008,2012,2013,2014,2015,2026
 Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
*/

/**
 * @fileoverview Utility functions for string manipulation, array operations, and DOM helpers
 * These might (or might not) be lodash equivalents
 * TODO: do string utils needs to sanity check args?
 */

/**
 * Convert string to uppercase
 * @param {string} str - Input string
 * @returns {string} Uppercase string or empty string if falsy
 */
function uc(str) { return str ? str.toUpperCase() : ''; }

/**
 * Convert string to lowercase
 * @param {string} str - Input string
 * @returns {string} Lowercase string or empty string if falsy
 */
function lc(str) { return str ? str.toLowerCase() : ''; }

/**
 * Capitalize first character of string
 * @param {string} str - Input string
 * @returns {string} String with first character uppercase
 */
function ucFirst(str) {
	return str ? str.charAt(0).toUpperCase() + str.substr(1) : '';
}

/**
 * Convert kebab-case to camelCase
 * @param {string} str - Kebab-case string
 * @returns {string} CamelCase string
 */
function camelCase(str) {
	return str ?
		Array.from(str.split('-'), function(part, i) { return i === 0 ? part :
		ucFirst(part); }).join('') : ''; 
}

/**
 * Convert camelCase to kebab-case
 * @param {string} str - CamelCase string
 * @returns {string} Kebab-case string
 */
function kebabCase(str) {
	return str ?
	Array.from(str.split(/(?=[A-Z])/), function(part, i) { return i === 0 ? part :
	lc(part); }).join('-') : '';
}

/**
 * Check if array includes an item
 * @param {Array} a - Array to search
 * @param {*} item - Item to find
 * @returns {boolean} True if item is found
 */
function includes(a, item) {
	return a.includes(item);
}

/**
 * Execute function for each array element
 * @param {Array} a - Array to iterate
 * @param {Function} fn - Function to execute
 * @param {*} context - Context for function execution
 */
function forEach(a, fn, context) { for (let n=a.length, i=0; i<n; i++) fn.call(context, a[i], i, a); }

/**
 * Test if some array elements pass the test
 * @param {Array} a - Array to test
 * @param {Function} fn - Test function
 * @param {*} context - Context for function execution
 * @returns {boolean} True if any element passes test
 */
function some(a, fn, context) { for (let n=a.length, i=0; i<n; i++) { if (fn.call(context, a[i], i, a)) return true; } return false; }

/**
 * Test if all array elements pass the test
 * @param {Array} a - Array to test
 * @param {Function} fn - Test function
 * @param {*} context - Context for function execution
 * @returns {boolean} True if all elements pass test
 */
function every(a, fn, context) { for (let n=a.length, i=0; i<n; i++) { if (!fn.call(context, a[i], i, a)) return false; } return true; }
/**
 * Filter array elements that pass the test
 * @param {Array} a - Array to filter
 * @param {Function} fn - Test function
 * @param {*} context - Context for function execution
 * @returns {Array} New array with elements that pass test
 */
function filter(a, fn, context) {
	let output = [];
	for (let n=a.length, i=0; i<n; i++) {
		let success = fn.call(context, a[i], i, a);
		if (success) output.push(a[i]);
	}
	return output;
}

/**
 * Internal helper for find/findIndex functions
 * @private
 */
function _find(a, fn, context, byIndex) {
	for (let n=a.length, i=0; i<n; i++) {
		let item = a[i];
		let success = fn.call(context, item, i, a);
		if (success) return byIndex ? i : item;
	}
	return byIndex ? -1 : undefined;
}

/**
 * Find index of first element that passes test
 * @param {Array} a - Array to search
 * @param {Function} fn - Test function
 * @param {*} context - Context for function execution
 * @returns {number} Index of found element or -1
 */
function findIndex(a, fn, context) {
	return _find(a, fn, context, true);
}

/**
 * Find first element that passes test
 * @param {Array} a - Array to search
 * @param {Function} fn - Test function
 * @param {*} context - Context for function execution
 * @returns {*} Found element or undefined
 */
function find(a, fn, context) {
	return _find(a, fn, context, false);
}

/**
 * Split text into array of words
 * @param {string} text - Text to split
 * @returns {Array<string>} Array of words
 */
function words(text) { return text.split(/\s+/); }

/**
 * Iterate over all enumerable properties of object (including inherited)
 * @param {Object} object - Object to iterate
 * @param {Function} fn - Function to execute for each property
 * @param {*} context - Context for function execution
 */
function forIn(object, fn, context) {
	for (let key in object) {
		fn.call(context, object[key], key, object);
	}
}

/**
 * Iterate over own enumerable properties of object
 * @param {Object} object - Object to iterate
 * @param {Function} fn - Function to execute for each property
 * @param {*} context - Context for function execution
 */
function forOwn(object, fn, context) {
	let keys = Object.keys(object);
	for (let i=0, n=keys.length; i<n; i++) {
		let key = keys[i];
		fn.call(context, object[key], key, object);
	}
}

/**
 * Check if object has no own enumerable properties
 * @param {Object} o - Object to check
 * @returns {boolean} True if object is empty
 */
function isEmpty(o) { // NOTE lodash supports arrays and strings too
	if (o) for (let p in o) if (o.hasOwnProperty(p)) return false;
	return true;
}

/**
 * Fill in undefined properties in dest with values from src
 * @param {Object} dest - Destination object
 * @param {Object} src - Source object
 * @returns {Object} The destination object
 */
function defaults(dest, src) {
	forOwn(src, function(val, key, object) {
		if (typeof this[key] !== 'undefined') return;
		this[key] = object[key];
	}, dest);
	return dest;
}

/**
 * Copy all properties from src to dest
 * @param {Object} dest - Destination object
 * @param {Object} src - Source object
 * @returns {Object} The destination object
 */
function assign(dest, src) {
	forOwn(src, function(val, key, object) {
		this[key] = object[key];
	}, dest);
	return dest;
}


export {
	uc, lc, ucFirst, camelCase, kebabCase, words,
	includes, forEach, some, every, filter, find, findIndex, // array
	forIn, forOwn, isEmpty, defaults, assign // object
};
