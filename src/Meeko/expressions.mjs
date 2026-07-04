/*!
 * Expressions
 * Copyright 2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

/**
 * Cache of compiled expression functions, keyed by expression text.
 * @type {Map<string, Function>}
 */
const _cache = new Map();

/**
 * Proxy handler that returns undefined for missing properties,
 * preventing ReferenceError in `with` blocks.
 */
const _scopeHandler = {
	has() { return true; },  // claim all names exist, so `with` never falls through
	get(target, key) {
		if (key === Symbol.unscopables) return undefined;
		return target[key];
	}
};

/**
 * Wrap a scope object in a Proxy that traps property lookups,
 * returning undefined for missing properties instead of throwing.
 * @param {Object} scope - The raw scope object.
 * @returns {Proxy} A proxied scope safe for use with `with`.
 */
function _wrapScope(scope) {
	return new Proxy(scope, _scopeHandler);
}

/**
 * Compile a JS expression string into a reusable function.
 * The function accepts a scope object whose properties are available
 * as local variables for the expression.
 *
 * @param {string} exprText - A JavaScript expression (e.g. 'user.name', '`Hello ${name}`', 'count > 0').
 * @returns {Function} A function of the form (scope) => value.
 */
function compile(exprText) {
	if (_cache.has(exprText)) return _cache.get(exprText);
	let fn;
	try {
		let body = new Function('__scope__', `with (__scope__) { return (${exprText}); }`);
		fn = (scope) => body(_wrapScope(scope));
	}
	catch (err) {
		console.warn(`Expression compilation failed: "${exprText}"`, err);
		fn = () => undefined;
	}
	_cache.set(exprText, fn);
	return fn;
}

/**
 * Compile and immediately evaluate an expression against a scope object.
 *
 * @param {string} exprText - A JavaScript expression.
 * @param {Object} scope - An object whose properties are available as local variables in the expression.
 * @returns {*} The result of evaluating the expression.
 */
function evaluate(exprText, scope) {
	let fn = compile(exprText);
	return fn(scope);
}

/**
 * A layered scope for expression evaluation.
 * Supports global and local params and vars with push/pop for template calls.
 * Lookup precedence: localVars > localParams > globalVars > globalParams.
 */
class Scope {

constructor(initial) {
	this.globalParams = initial ? { ...initial } : {};
	this.globalVars = {};
	this.localParams = {};
	this.localVars = {};
	this._localParamsStack = [];
	this._localVarsStack = [];
	this._proxy = new Proxy(this, _scopeLookupHandler);
}

/**
 * Set a variable in the current scope.
 * @param {string} name - Variable name.
 * @param {*} value - Value to set.
 * @param {Object} [options]
 * @param {boolean} [options.param=false] - If true, set as a param (write-once per scope level).
 * @param {boolean} [options.global=false] - If true, set in global scope rather than local.
 */
set(name, value, { param = false, global = false } = {}) {
	let target = global
		? (param ? this.globalParams : this.globalVars)
		: (param ? this.localParams : this.localVars);
	target[name] = value;
}

/**
 * Get a variable, searching layers in precedence order:
 * localVars > localParams > globalVars > globalParams.
 * @param {string} name - Variable name.
 * @returns {*} The value, or undefined if not found.
 */
get(name) {
	if (name in this.localVars) return this.localVars[name];
	if (name in this.localParams) return this.localParams[name];
	if (name in this.globalVars) return this.globalVars[name];
	if (name in this.globalParams) return this.globalParams[name];
	return undefined;
}

/**
 * Check if a variable exists in any scope layer.
 * @param {string} name - Variable name.
 * @returns {boolean}
 */
has(name) {
	return (name in this.localVars) ||
		(name in this.localParams) ||
		(name in this.globalVars) ||
		(name in this.globalParams);
}

/**
 * Push a new local scope (for entering a template call).
 * Current localParams/localVars are saved on a stack.
 * @param {Object} [params={}] - Initial params for the new scope level.
 */
push(params) {
	this._localParamsStack.push(this.localParams);
	this._localVarsStack.push(this.localVars);
	this.localParams = params || {};
	this.localVars = {};
}

/**
 * Pop the local scope (for leaving a template call).
 * Restores the previous localParams/localVars.
 */
pop() {
	this.localParams = this._localParamsStack.pop();
	this.localVars = this._localVarsStack.pop();
}

/**
 * Get the proxy object for use with evaluate().
 * The proxy resolves variable lookups through the scope layers.
 * @returns {Proxy}
 */
get values() {
	return this._proxy;
}

}

/**
 * Proxy handler for Scope that routes property lookups through the layered scope.
 */
const _scopeLookupHandler = {
	has() { return true; },
	get(scope, key) {
		if (key === Symbol.unscopables) return undefined;
		return scope.get(key);
	}
};

export { compile, evaluate, Scope };
