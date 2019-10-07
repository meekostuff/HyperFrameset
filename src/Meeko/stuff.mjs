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
	for (var n=a.length, i=0; i<n; i++) if (a[i] === item) return true;
	return false;
}

function forEach(a, fn, context) { for (var n=a.length, i=0; i<n; i++) fn.call(context, a[i], i, a); }

function some(a, fn, context) { for (var n=a.length, i=0; i<n; i++) { if (fn.call(context, a[i], i, a)) return true; } return false; }

function every(a, fn, context) { for (var n=a.length, i=0; i<n; i++) { if (!fn.call(context, a[i], i, a)) return false; } return true; }

function map(a, fn, context) {
	var output = [];
	for (var n=a.length, i=0; i<n; i++) {
		var value = a[i];
		output[i] = fn ? 
			fn.call(context, value, i, a) :
			value;
	}
	return output;
}

function filter(a, fn, context) {
	var output = [];
	for (var n=a.length, i=0; i<n; i++) {
		var success = fn.call(context, a[i], i, a);
		if (success) output.push(a[i]);
	}
	return output;
}

function _find(a, fn, context, byIndex) {
	for (var n=a.length, i=0; i<n; i++) {
		var item = a[i];
		var success = fn.call(context, item, i, a);
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
	var result = [];
	forEach(a1, function(item) {
		if (includes(a2, item) || includes(result, item)) return;
		result.push(item);
	});
	return result;
}

function difference(a1, a2) {
	var result = [].concat(
		without(a1, a2),
		without(a2, a1)
	);
	return result;
}

function words(text) { return text.split(/\s+/); }

function forIn(object, fn, context) {
	for (var key in object) {
		fn.call(context, object[key], key, object);
	}
}

function forOwn(object, fn, context) {
	var keys = Object.keys(object);
	for (var i=0, n=keys.length; i<n; i++) {
		var key = keys[i];
		fn.call(context, object[key], key, object);
	}
}

function isEmpty(o) { // NOTE lodash supports arrays and strings too
	if (o) for (var p in o) if (o.hasOwnProperty(p)) return false;
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


export {
	uc, lc, ucFirst, camelCase, kebabCase, words,
	includes, forEach, some, every, map, filter, find, findIndex, // array
	without, difference,
	forIn, forOwn, isEmpty, defaults, assign // object
};
