
(function(classnamespace) {

var global = this;
var Meeko = global.Meeko;
var _ = Meeko.stuff;
var Registry = Meeko.Registry;

var configData = new Registry({
	writeOnce: true,
	testKey: function(key) {
		return typeof key === 'string';
	},
	testValue: function(o) {
		return o != null && typeof o === 'object';
	}
});

classnamespace.configData = configData;

}).call(this, this.Meeko);

