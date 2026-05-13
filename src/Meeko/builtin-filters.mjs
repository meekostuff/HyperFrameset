
/**
 * @interface Filter
 * @description Virtual interface for HyperFrameset filters
 * 
 * @function
 * @param {*} value - The input value to filter
 * @param {...*} args - Additional filter arguments
 * @returns {*} The filtered value
 * @description Transform input value using filter logic
 */

import * as _ from './stuff.mjs';
import dateFormat from './dateFormat.mjs';
import filters from './filters.mjs';

// FIXME filters need sanity checking
filters.register('lowercase', (value, text) => {
	return value.toLowerCase();
});

filters.register('uppercase', (value, text) => {
	return value.toUpperCase();
});

filters.register('if', (value, yep) => {
	return (!!value) ? yep : value;
});

filters.register('unless', (value, nope) => {
	return (!value) ? nope : value;
});

filters.register('if_unless', (value, yep, nope) => {
	return (!!value) ? yep : nope;
});

filters.register('map', (value, dict) => { // dict can be {} or []

	if (Array.isArray(dict)) {
		let patterns = _.filter(dict, (item, i) => { return !(i % 2); });
		let results = _.filter(dict, (item, i) => { return !!(i % 2); });
		_.some(patterns, (pattern, i) => {
			// FIXME what if pattern not RegExp && not string??
			if (!(pattern instanceof RegExp)) pattern = new RegExp(`^${pattern}$`);
			if (!pattern.test(value)) return false;
			value = results[i];
			return true;
		});
		return value;
	}

	if (value in dict) return dict[value]; // TODO sanity check before returning
	return value;
});

filters.register('match', (value, pattern, yep, nope) => {
	// FIXME what if pattern not RegExp && not string??
	if (!(pattern instanceof RegExp)) pattern = new RegExp(`^${pattern}$`); // FIXME sanity TODO case-insensitive??
	let bMatch = pattern.test(value);
	if (yep != null && bMatch) return yep;
	if (nope != null && !bMatch) return nope;
	return bMatch;
});

filters.register('replace', (value, pattern, text) => {
	return value.replace(pattern, text); // TODO sanity check before returning
});

filters.register('date', (value, format, utc) => {
	return dateFormat(value, format, utc);
});
