/*!
 * HyperFrameset Processors
 * Copyright 2014-2015 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

(function(classnamespace) {

var window = this;
var Meeko = window.Meeko;
var filters = Meeko.filters;

var processors = {

items: {},

register: function(type, constructor) {
	this.items[type] = constructor;
},

create: function(type, options, namespaces) {
	return new this.items[type](options, namespaces, filters);
}

}

classnamespace.processors = processors;

}).call(this, this.Meeko);
