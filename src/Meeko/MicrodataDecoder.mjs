import * as _ from './stuff.mjs';
import * as Microdata from './Microdata.mjs';

let document = window.document;


/**
 * @implements {Decoder}
 */
class MicrodataDecoder {

constructor(options, namespaces) {}

init(node) {
	Microdata.getItems(node);
	this.rootNode = node;
}

evaluate(query, context, variables, wantArray) {
	if (!context) context = this.rootNode;

	query = query.trim();
	let startAtRoot = false;
	let baseSchema;
	let pathParts;

	if (query === '.') return (wantArray) ? [ context ] : context;

	let m = query.match(/^(?:(\^)?\[([^\]]*)\]\.)/);
	if (m && m.length) {
		query = query.substr(m[0].length);
		startAtRoot = !!m[1];
		baseSchema = _.words(m[2].trim());
	}
	pathParts = _.words(query.trim());
	
	let nodes;
	if (baseSchema) {
		if (startAtRoot) context = this.view;
		nodes = Microdata.getItems(context, baseSchema);	
	}
	else nodes = [ context ];

	let resultList = nodes;
	_.forEach(pathParts, function(relPath, i) {
		let parents = resultList;
		resultList = [];
		_.forEach(parents, function(el) {
			let props = Microdata.getProperties(el);
			if (!props) return;
			let nodeList = props.namedItem(relPath);
			if (!nodeList) return;
			[].push.apply(resultList, nodeList);
		});
	});

	// now convert elements to values
	resultList = Array.from(resultList, function(el) {
		let props = Microdata.getProperties(el);
		if (props) return el;
		return Microdata.getValue(el);
	});

	if (wantArray) return resultList;

	return resultList[0];
}

}

export {
	Microdata,
	MicrodataDecoder
};

export default MicrodataDecoder;