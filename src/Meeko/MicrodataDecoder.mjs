/*!
 * MicrodataDecoder
 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */
import * as _ from './stuff.mjs';
import * as Microdata from './Microdata.mjs';

/**
 * @implements {Decoder}
 * @fixme evaluate() ignores variables — $variable references won't resolve
 * @fixme matches() is not implemented
 */
class MicrodataDecoder {

constructor(options, namespaces) {}

init(node) {
	Microdata.getItems(node);
	this.rootNode = node;
}

evaluate(query, context, variables, wantArray) {
	// FIXME variables are ignored — $variable references won't resolve
	if (!context) context = this.rootNode;

	query = query.trim();
	let startAtRoot = false;
	let baseSchema;
	let pathParts;

	if (query === '.') return (wantArray) ? [ context ] : context;

	// Step 1: Parse optional schema prefix, e.g. "^[Person].name" or "[Product].price"
	let m = query.match(/^(?:(\^)?\[([^\]]*)\]\.)/);
	if (m && m.length) {
		query = query.substr(m[0].length);
		startAtRoot = !!m[1];
		baseSchema = _.words(m[2].trim());
	}
	pathParts = _.words(query.trim());
	
	// Step 2: Find starting items (by schema type or use context directly)
	let nodes;
	if (baseSchema) {
		if (startAtRoot) context = this.view;
		nodes = Microdata.getItems(context, baseSchema);	
	}
	else nodes = [ context ];

	// Step 3: Walk the property path, resolving named properties at each level
	let resultList = nodes;
	_.forEach(pathParts, (relPath, i) => {
		let parents = resultList;
		resultList = [];
		_.forEach(parents, (el) => {
			let props = Microdata.getProperties(el);
			if (!props) return;
			let nodeList = props.namedItem(relPath);
			if (!nodeList) return;
			[].push.apply(resultList, nodeList);
		});
	});

	// Step 4: Convert leaf elements to their microdata values (text, URL, etc.)
	resultList = Array.from(resultList, (el) => {
		let props = Microdata.getProperties(el);
		if (props) return el;
		return Microdata.getValue(el);
	});

	if (wantArray) return resultList;

	return resultList[0];
}

matches(context, query) {
	console.warn('MicrodataDecoder.matches() is not implemented');
	return false;
}

}

export {
	Microdata,
	MicrodataDecoder
};

export default MicrodataDecoder;
