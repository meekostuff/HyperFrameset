import Registry from './Registry.mjs';

let configData = new Registry({
	writeOnce: true,
	keyValidator: function(key) {
		return typeof key === 'string';
	},
	valueValidator: function(o) {
		return o != null && typeof o === 'object';
	}
});

export default configData;
