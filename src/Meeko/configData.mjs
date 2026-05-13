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
