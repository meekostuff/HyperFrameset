/*!
 * Builtin Processors
 * Copyright 2016 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

(function(classnamespace) {

var window = this;

var Meeko = window.Meeko;
var processors = Meeko.processors;
var MainProcessor = Meeko.MainProcessor;
var ScriptProcessor = Meeko.ScriptProcessor;
var HazardProcessor = Meeko.HazardProcessor;

processors.register('main', MainProcessor);
processors.register('script', ScriptProcessor);
processors.register('hazard', HazardProcessor);

}).call(this, this.Meeko);
