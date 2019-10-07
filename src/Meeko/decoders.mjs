
import * as _ from './stuff.mjs';
import Registry from './Registry.mjs';

let decoders = new Registry({
	writeOnce: true,
	testKey: function(key) {
		return typeof key === 'string' && /^[_a-zA-Z][_a-zA-Z0-9]*/.test(key);
	},
	testValue: function(constructor) {
		return typeof constructor === 'function';
	}
});

_.assign(decoders, {

create: function(type, options, namespaces) {
	let constructor = this.get(type);
	return new constructor(options, namespaces);
}

});

export default decoders;
