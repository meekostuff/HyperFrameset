(function(classnamespace) {

var global = this;

var Meeko = global.Meeko;
var decoders = Meeko.decoders;

var CSSDecoder = Meeko.CSSDecoder;
decoders.register('css', CSSDecoder);

var MicrodataDecoder = Meeko.MicrodataDecoder;
decoders.register('microdata', MicrodataDecoder);

var JSONDecoder = Meeko.JSONDecoder;
decoders.register('json', JSONDecoder);

}).call(this, this.Meeko);
