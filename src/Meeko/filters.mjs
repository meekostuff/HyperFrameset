import * as _ from './stuff.mjs';
import Registry from './Registry.mjs';

let filters = new Registry({
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
	let fn = this.get(name);
	// NOTE filter functions should only accept string_or_number_or_boolean
	// FIXME Need to wrap fn() to assert / cast supplied value and accept params
	let args = params.slice(0);
	args.unshift(value);
	return fn.apply(undefined, args);
}

});

export default filters;



