/*!
 * HyperFrameset Processors
 * Copyright 2014-2015 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

import * as _ from './stuff.mjs';
import Registry from './Registry.mjs';

let processors = new Registry({
	writeOnce: true,
	testKey: function(key) {
		return typeof key === 'string' && /^[_a-zA-Z][_a-zA-Z0-9]*/.test(key);
	},
	testValue: function(constructor) {
		return typeof constructor === 'function';
	}
});

_.assign(processors, {

create: function(type, options, namespaces) {
	let constructor = this.get(type);
	return new constructor(options, namespaces);
}

});

export default processors;
