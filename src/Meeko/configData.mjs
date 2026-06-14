/*!
 * configData
 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */
import Registry from './Registry.mjs';
import {words} from './stuff.mjs';

let configData = new Registry({
	writeOnce: true,
	keyValidator: (key) => {
		return typeof key === 'string';
	},
	valueValidator: (o) => {
		return o != null && typeof o === 'object';
	}
});

/**
 * Get the config object associated with an element's @config attribute.
 * FIXME: @config can be a whitespace-separated list of IDs but only the first is used.
 * @param {Element} element
 * @returns {Object|undefined}
 */
function getElementConfig(element) {
	if (!element.hasAttribute('config')) return;
	let configID = words(element.getAttribute('config'))[0];
	return configData.get(configID);
}

/**
 * Append a sourceURL to an element's @config attribute.
 * Creates the @config attribute if it doesn't exist.
 *
 * @param {Element} scriptFor - The target element to associate config with.
 * @param {string} sourceURL - The config key to append.
 */
function setElementConfig(scriptFor, sourceURL) {
	// FIXME @config shouldn't be hard-wired here
	let configID = scriptFor.hasAttribute('config') ?
		scriptFor.getAttribute('config') :
		'';
	// TODO we can add more than one @config to an element but only first is used
	configID = configID ?
		configID.replace(/\s*$/, ' ' + sourceURL) :
		sourceURL;
	scriptFor.setAttribute('config', configID);
}

/**
 * Get the target element for a <script for> element.
 * Walks previousElementSibling, skipping <script> and <style>, falls back to parentNode.
 * @param {Element} script
 * @returns {Element}
 */
function getScriptFor(script) {
	let target = script;
	while (target = target.previousElementSibling) {
		if (!['STYLE', 'SCRIPT'].includes(target.tagName)) break;
	}
	return target || script.parentNode;
}

export { getElementConfig, setElementConfig, getScriptFor };
export default configData;
