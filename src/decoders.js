(function(classnamespace) {

var global = this;

var Meeko = global.Meeko;
var _ = Meeko.stuff;
var Registry = Meeko.Registry;

var decoders = new Registry({
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
	var constructor = this.get(type);
	return new constructor(options, namespaces);
}

});

classnamespace.decoders = decoders;

}).call(this, this.Meeko);
