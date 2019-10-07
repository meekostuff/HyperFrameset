import * as _ from './stuff.mjs';
import Registry from './Registry.mjs';

var filters = new Registry({
	writeOnce: true,
	testKey: function(key) {
		return /^[_a-zA-Z][_a-zA-Z0-9]*$/.test(key);
	},
	testValue: function(fn) {
		return typeof fn === 'function';
	}
});

_.assign(filters, {

evaluate: function(name, value, params) {
	var fn = this.get(name);
	// NOTE filter functions should only accept string_or_number_or_boolean
	// FIXME Need to wrap fn() to assert / cast supplied value and accept params
	var args = params.slice(0);
	args.unshift(value);
	return fn.apply(undefined, args);
}

});

export default filters;



