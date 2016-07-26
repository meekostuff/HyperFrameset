/*!
 * Builtin Processors
 * Copyright 2016 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

(function(classnamespace) {

var global = this;

var Meeko = global.Meeko;
var processors = Meeko.processors;

var MainProcessor = Meeko.MainProcessor;
processors.register('main', MainProcessor);

var ScriptProcessor = Meeko.ScriptProcessor;
processors.register('script', ScriptProcessor);

var HazardProcessor = Meeko.HazardProcessor;
processors.register('hazard', HazardProcessor);

}).call(this, this.Meeko);
