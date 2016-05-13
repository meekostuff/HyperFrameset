/*!
 JS and Promise utils
 (c) Sean Hogan, 2008,2012,2013,2014,2015
 Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
*/

(function() {

/*
 ### Utility functions
 These might (or might not) be lodash equivalents
 */

var Meeko = this.Meeko;
var stuff = Meeko.stuff = {};

// TODO do string utils needs to sanity check args?
var uc = function(str) { return str ? str.toUpperCase() : ''; }
var lc = function(str) { return str ? str.toLowerCase() : ''; }

function ucFirst(str) {
	return str ? str.charAt(0).toUpperCase() + str.substr(1) : '';
}
function camelCase(str) {
	return str ?
		_.map(str.split('-'), function(part, i) { return i === 0 ? part :
		ucFirst(part); }).join('') : ''; 
}
function kebabCase(str) {
	return str ?
	_.map(str.split(/(?=[A-Z])/), function(part, i) { return i === 0 ? part :
	_.lc(part); }).join('-') : '';
}

var includes = function(a, item) {
	for (var n=a.length, i=0; i<n; i++) if (a[i] === item) return true;
	return false;
}

var forEach = function(a, fn, context) { for (var n=a.length, i=0; i<n; i++) fn.call(context, a[i], i, a); }

var some = function(a, fn, context) { for (var n=a.length, i=0; i<n; i++) { if (fn.call(context, a[i], i, a)) return true; } return false; }

var every = function(a, fn, context) { for (var n=a.length, i=0; i<n; i++) { if (!fn.call(context, a[i], i, a)) return false; } return true; }

var map = function(a, fn, context) {
	var output = [];
	for (var n=a.length, i=0; i<n; i++) {
		var value = a[i];
		output[i] = fn ? 
			fn.call(context, value, i, a) :
			value;
	}
	return output;
}

var filter = function(a, fn, context) {
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

var findIndex = function(a, fn, context) {
	return _find(a, fn, context, true);
}

var find = function(a, fn, context) {
	return _find(a, fn, context, false);
}

var without = function(a1, a2) {
	var result = [];
	forEach(a1, function(item) {
		if (includes(a2, item) || includes(result, item)) return;
		result.push(item);
	});
	return result;
}

var difference = function(a1, a2) {
	var result = [].concat(
		without(a1, a2),
		without(a2, a1)
	);
	return result;
}

var words = function(text) { return text.split(/\s+/); }

var forIn = function(object, fn, context) {
	for (var key in object) {
		fn.call(context, object[key], key, object);
	}
}

var forOwn = function(object, fn, context) {
	var keys = Object.keys(object);
	for (var i=0, n=keys.length; i<n; i++) {
		var key = keys[i];
		fn.call(context, object[key], key, object);
	}
}

var isEmpty = function(o) { // NOTE lodash supports arrays and strings too
	if (o) for (var p in o) if (o.hasOwnProperty(p)) return false;
	return true;
}


var defaults = function(dest, src) {
	forOwn(src, function(val, key, object) {
		if (typeof this[key] !== 'undefined') return;
		this[key] = object[key];
	}, dest);
	return dest;
}

var assign = function(dest, src) {
	forOwn(src, function(val, key, object) {
		this[key] = object[key];
	}, dest);
	return dest;
}


assign(stuff, {
	uc: uc, lc: lc, ucFirst: ucFirst, camelCase: camelCase, kebabCase: kebabCase, words: words, // string
	contains: includes, // FIXME deprecated
	includes: includes, forEach: forEach, some: some, every: every, map: map, filter: filter, find: find, findIndex: findIndex, // array
	without: without, difference: difference,
	forIn: forIn, forOwn: forOwn, isEmpty: isEmpty, defaults: defaults, assign: assign, extend: assign // object
});


}).call(this);
