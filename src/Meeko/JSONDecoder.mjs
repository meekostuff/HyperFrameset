/*!
 * JSONDecoder
 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

import * as _ from './stuff.mjs';

// FIXME not really a JSON decoder since expects JSON input and doesn't use JSON paths

/**
 * @implements {Decoder}
 * @fixme evaluate() ignores variables — $variable references won't resolve
 * @fixme matches() is not implemented
 */
class JSONDecoder {

constructor(options, namespaces) {}

init(object) {
	if (typeof object !== 'object' || object === null) throw Error('JSONDecoder cannot handle non-object');
	this.object = object;
}

evaluate(query, context, variables, wantArray) {
	// FIXME variables are ignored — $variable references won't resolve
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
	_.forEach(pathParts, (relPath, i) => {
		let parents = resultList;
		resultList = [];
		_.forEach(parents, (item) => {
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

matches(context, query) {
	console.warn('JSONDecoder.matches() is not implemented');
	return false;
}

}

export default JSONDecoder;
