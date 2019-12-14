
import * as _ from './stuff.mjs';

// FIXME not really a JSON decoder since expects JSON input and doesn't use JSON paths

function JSONDecoder(options, namespaces) {}

_.defaults(JSONDecoder.prototype, {

init: function(object) {
	if (typeof object !== 'object' || object === null) throw 'JSONDecoder cannot handle non-object';
	this.object = object;
},

evaluate: function(query, context, variables, wantArray) {
	if (!context) context = this.object;

	query = query.trim();
	let pathParts;

	if (query === '.') return (wantArray) ? [ context ] : context;

	let m = query.match(/^\^/);
	if (m && m.length) {
		query = query.substr(m[0].length);
		context = this.object;
	}
	pathParts = query.split('.');
	
	let resultList = [ context ];
	_.forEach(pathParts, function(relPath, i) {
		let parents = resultList;
		resultList = [];
		_.forEach(parents, function(item) {
			let child = item[relPath];
			if (child != null) {
				if (Array.isArray(child)) [].push.apply(resultList, child);
				else resultList.push(child);
			}
		});
	});

	if (wantArray) return resultList;

	let value = resultList[0];
	return value;
}

});

export default JSONDecoder;
