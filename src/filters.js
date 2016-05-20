
(function() {

var global = this;
var Meeko = global.Meeko;
var _ = Meeko.stuff;


var filters = Meeko.filters = (function() {

var items = {};

return {

register: function(name, fn) {
	if (!/^[_a-zA-Z][_a-zA-Z0-9]*$/.test(name)) { // TODO should be in filters.register()
		console.error('registerFilter called with invalid name: ' + name);
		return; // TODO throw??
	}
	if (this.has(name)) {
		console.warn('A filter by that name already exists: ' + name);
		return; // TODO throw??
	}
	items[name] = fn;
},

has: function(name) {
	return (name in items);
},

get: function(name) { 
	if (!this.has(name)) throw name + ' is not a registered filter';
	return items[name];
},

evaluate: function(name, value, params) {
	var fn = this.get(name);
	// NOTE filter functions should only accept string_or_number_or_boolean
	// FIXME Need to wrap fn() to assert / cast supplied value and accept params
	var args = params.slice(0);
	args.unshift(value);
	return fn.apply(undefined, args);
}


};

})();


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
		var patterns = _.filter(dict, function(item, i) { return !(i % 2); });
		var results = _.filter(dict, function(item, i) { return !!(i % 2); });
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
	var bMatch = pattern.test(value);
	if (yep != null && bMatch) return yep;
	if (nope != null && !bMatch) return nope;
	return bMatch;
});

filters.register('replace', function(value, pattern, text) {
	return value.replace(pattern, text); // TODO sanity check before returning
});

if (_.dateFormat) filters.register('date', function(value, format, utc) {
	return _.dateFormat(value, format, utc);
});


}).call(this);



