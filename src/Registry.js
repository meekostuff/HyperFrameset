(function(classnamespace) {

var global = this;
var Meeko = global.Meeko;
var _ = Meeko.stuff;

var Registry = function(options) {
	if (!options || typeof options !== 'object') options = {};
	this.options = options;
	this.items = {};
}

_.assign(Registry.prototype, {

clear: function() {
	if (this.options.writeOnce) throw Error('Attempted to clear write-once storage');
	this.items = Object.create(null);
},

has: function(key) {
	return key in this.items;
},

get: function(key) {
	return this.items[key];
},

set: function(key, value) {
	if (this.options.writeOnce && this.has(key)) {
		throw Error('Attempted to rewrite key ' + key + ' in write-once storage');
	}
	if (this.options.keyTest) {
		var ok = this.options.keyTest(key);
		if (!ok) throw Error('Invalid key ' + key + ' for storage');
	}
	if (this.options.valueTest) {
		var ok = this.options.valueTest(value);
		if (!ok) throw Error('Invalid value ' + value + ' for storage');
	}
	this.items[key] = value;
},

'delete': function(key) {
	if (this.options.writeOnce && this.has(key)) {
		throw Error('Attempted to delete key ' + key + ' in write-once storage');
	}
	delete this.items[key];
}

});

Registry.prototype.register = Registry.prototype.set;

classnamespace.Registry = Registry;

}).call(this, this.Meeko);
