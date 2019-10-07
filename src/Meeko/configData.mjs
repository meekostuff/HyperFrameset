import Registry from './Registry.mjs';

let configData = new Registry({
	writeOnce: true,
	testKey: function(key) {
		return typeof key === 'string';
	},
	testValue: function(o) {
		return o != null && typeof o === 'object';
	}
});

export default configData;