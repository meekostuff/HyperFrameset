/*!
 * configData
 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */
import Registry from './Registry.mjs';

let configData = new Registry({
	writeOnce: true,
	keyValidator: (key) => {
		return typeof key === 'string';
	},
	valueValidator: (o) => {
		return o != null && typeof o === 'object';
	}
});

export default configData;
