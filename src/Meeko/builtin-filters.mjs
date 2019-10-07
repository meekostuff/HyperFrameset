
import * as _ from './stuff.mjs';
import dateFormat from './dateFormat.mjs';
import filters from './filters.mjs';

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
		let patterns = _.filter(dict, function(item, i) { return !(i % 2); });
		let results = _.filter(dict, function(item, i) { return !!(i % 2); });
		_.some(patterns, function(pattern, i) {
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
