(function(classnamespace) {

var global = this;

var Meeko = global.Meeko;
var _ = Meeko.stuff;
var DOM = Meeko.DOM;
var decoders = Meeko.decoders;

// FIXME textAttr & htmlAttr used in HazardProcessor & CSSDecoder
var textAttr = '_text';
var htmlAttr = '_html';
// TODO what about tagnameAttr, namespaceAttr

CSS_CONTEXT_VARIABLE = '_';

function CSSDecoder(options, namespaces) {}

_.defaults(CSSDecoder.prototype, {

init: function(node) {
	this.srcNode = node;
},

// TODO should matches() support Hazard variables
matches: function(element, query) { // FIXME refactor common-code in matches / evaluate
	var queryParts = query.match(/^\s*([^{]*)\s*(?:\{\s*([^}]*)\s*\}\s*)?$/);
	var selector = queryParts[1];
	var attr = queryParts[2];
	var result;
	if (!matches(element, selector)) return;
	var node = element;
	var result = node;

	if (attr) {
		attr = attr.trim();
		if (attr.charAt(0) === '@') attr = attr.substr(1);
		result = getAttr(node, attr);
	}

	return result;

	function getAttr(node, attr) {
		switch(attr) {
		case null: case undefined: case '': return node;
		case textAttr: 
			return node.textContent;
		case htmlAttr:
			var frag = doc.createDocumentFragment();
			_.forEach(node.childNodes, function(child) { 
				frag.appendChild(doc.importNode(child, true)); // TODO does `child` really need to be cloned??
			});
			return frag;
		default: 
			return node.getAttribute(attr);
		}
	}


},

evaluate: function(query, context, variables, wantArray) {
	if (!context) context = this.srcNode;
	var doc = context.nodeType === 9 ? context : context.ownerDocument; // FIXME which document??
	var queryParts = query.match(/^\s*([^{]*)\s*(?:\{\s*([^}]*)\s*\}\s*)?$/);
	var selector = queryParts[1];
	var attr = queryParts[2];
	var result = find(selector, context, variables, wantArray);

	if (attr) {
		attr = attr.trim();
		if (attr.charAt(0) === '@') attr = attr.substr(1);

		if (!wantArray) result = [ result ];
		result = _.map(result, function(node) {
			return getAttr(node, attr);
		});
		if (!wantArray) result = result[0];
	}

	return result;

	function getAttr(node, attr) {
		switch(attr) {
		case null: case undefined: case '': return node;
		case textAttr: 
			return node.textContent;
		case htmlAttr:
			var frag = doc.createDocumentFragment();
			_.forEach(node.childNodes, function(child) { 
				frag.appendChild(doc.importNode(child, true)); // TODO does `child` really need to be cloned??
			});
			return frag;
		default: 
			return node.getAttribute(attr);
		}
	}

}

});

function matches(element, selectorGroup) {
	if (selectorGroup.trim() === '') return;
	return DOM.matches(element, selectorGroup);
}

function find(selectorGroup, context, variables, wantArray) { // FIXME currently only implements `context` expansion
	selectorGroup = selectorGroup.trim();
	if (selectorGroup === '') return wantArray ? [ context ] : context;
	var nullResult = wantArray ? [] : null;
	var selectors = selectorGroup.split(/,(?![^\(]*\)|[^\[]*\])/);
	selectors = _.map(selectors, function(s) { return s.trim(); });

	var invalidVarUse = false;
	var contextVar;
	_.forEach(selectors, function(s, i) {
		var m = s.match(/\\?\$[_a-zA-Z][_a-zA-Z0-9]*\b/g);
		if (!m) {
			if (i > 0 && contextVar) {
				invalidVarUse = true;
				console.warn('All individual selectors in a selector-group must share same context: ' + selectorGroup);
			}
			return; // if no matches then m will be null not []
		}
		_.forEach(m, function(varRef, j) {
			if (varRef.charAt(0) === '\\') return; // Ignore "\$"
			var varName = varRef.substr(1);
			var varPos = s.indexOf(varRef);
			if (j > 0 || varPos > 0) {
				invalidVarUse = true;
				console.warn('Invalid use of ' + varRef + ' in ' + selectorGroup);
				return;
			}
			if (i > 0) {
				if (varName !== contextVar) {
					invalidVarUse = true;
					console.warn('All individual selectors in a selector-group must share same context: ' + selectorGroup);
				}
				return;
			}
			contextVar = varName;
		});
	});

	if (invalidVarUse) {
		console.error('Invalid use of variables in CSS selector. Assuming no match.');
		return nullResult;
	}

	if (contextVar && contextVar !== CSS_CONTEXT_VARIABLE) {
		if (!variables.has(contextVar)) {
			console.debug('Context variable $' + contextVar + ' not defined for ' + selectorGroup);
			return nullResult;
		}
		if (contextVar !== CSS_CONTEXT_VARIABLE) context = variables.get(contextVar);

		// NOTE if the selector is just '$variable' then 
		// context doesn't even need to be a node
		if (selectorGroup === '$' + contextVar) return context;

		if (!(context && context.nodeType === 1)) {
			console.debug('Context variable $' + contextVar + ' not an element in ' + selectorGroup);
			return nullResult;
		}
	}

	var isRoot = false;
	if (context.nodeType === 9 || context.nodeType === 11) isRoot = true;

	selectors = _.filter(selectors, function(s) {
			switch(s.charAt(0)) {
			case '+': case '~': 
				console.warn('Siblings of context-node cannot be selected in ' + selectorGroup);
				return false;
			case '>': return (isRoot) ? false : true; // FIXME probably should be allowed even if isRoot
			default: return true;
			}
		});

	if (selectors.length <= 0) return nullResult;

	selectors = _.map(selectors, function(s) {
			if (isRoot) return s;
			var prefix = ':scope';
			return (contextVar) ? 
				s.replace('$' + contextVar, prefix) : 
				prefix + ' ' + s;
		});
	
	var finalSelector = selectors.join(', ');

	if (wantArray) {
		return DOM.findAll(finalSelector, context, !isRoot, !isRoot);
	}
	else {
		return DOM.find(finalSelector, context, !isRoot, !isRoot);
	}
}

function markElement(context) {
	if (context.hasAttribute(DOM.uniqueIdAttr)) return context.getAttribute(DOM.uniqueIdAttr);
	var uid = DOM.uniqueId(context);
	context.setAttribute(DOM.uniqueIdAttr, uid);
	return uid;
}


_.assign(classnamespace, {

CSSDecoder: CSSDecoder

});

}).call(this, this.Meeko);
