
(function(classnamespace) {

var global = this;
var Meeko = global.Meeko;
var _ = Meeko.stuff;


var items = {};

var filters = {

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

classnamespace.filters = filters;

}).call(this, this.Meeko);



