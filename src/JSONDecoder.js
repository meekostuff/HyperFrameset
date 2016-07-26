(function(classnamespace) {

var global = this;

var Meeko = global.Meeko;
var _ = Meeko.stuff;
var DOM = Meeko.DOM;
var decoders = Meeko.decoders;

// FIXME not really a JSON decoder since expects JSON input and 
// doesn't use JSON paths

function JSONDecoder(options, namespaces) {}

_.defaults(JSONDecoder.prototype, {

init: function(object) {
	if (typeof object !== 'object' || object === null) throw 'JSONDecoder cannot handle non-object';
	this.object = object;
},

evaluate: function(query, context, variables, wantArray) {
	if (!context) context = this.object;

	var query = query.trim();
	var pathParts;

	if (query === '.') return (wantArray) ? [ context ] : context;

	var m = query.match(/^\^/);
	if (m && m.length) {
		query = query.substr(m[0].length);
		context = this.object;
	}
	pathParts = query.split('.');
	
	var resultList = [ context ];
	_.forEach(pathParts, function(relPath, i) {
		var parents = resultList;
		resultList = [];
		_.forEach(parents, function(item) {
			var child = item[relPath];
			if (child != null) {
				if (Array.isArray(child)) [].push.apply(resultList, child);
				else resultList.push(child);
			}
		});
	});

	if (wantArray) return resultList;

	var value = resultList[0];
	return value;
}

});


_.assign(classnamespace, {

JSONDecoder: JSONDecoder

});


}).call(this, this.Meeko);
