/*!
 * Copyright 2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

import { BehaviorRegistry } from './BehaviorRegistry.mjs';
import { BaseBehavior } from './BaseBehavior.mjs';

let behaviors;

function processScript(script, index, container, globalName) {
    let element = BehaviorRegistry.getTarget(script);
    let key = behaviors.uniqueKey();
    element.setAttribute(behaviors.attr, key);
    let newScript = document.createElement('script');
    for (let attr of script.attributes) {
        if (attr.name === 'for') continue;
        newScript.setAttribute(attr.name, attr.value);
    }
    let srcDocURL = new URL(script.ownerDocument.URL);
    let scriptSrcURL = `${srcDocURL.pathname}__script[${index}]`;
    newScript.textContent =
        `${globalName}.register('${key}', ${script.textContent});
        //# sourceURL=${scriptSrcURL}`;
    script.remove();
    container.appendChild(newScript);
}

function processScripts(root, container, globalName) {
    let scripts = root.querySelectorAll('script[for]');
    let index = 0;
    for (let script of scripts) {
        if (script.getAttribute('for')) continue;
        try { processScript(script, index++, container, globalName); }
        catch (e) { console.error(e); }
    }
}

function _install({
    globalName = 'behaviors',
    attr = 'mk-is',
    Base = BaseBehavior,
    container = document.head,
    autoProcess = true
}) {
    let defaultProto = Base.prototype || Object.getPrototypeOf(Base);
    behaviors = new BehaviorRegistry(attr, defaultProto);
    behaviors.Base = Base;

    globalThis[globalName] = behaviors;

    let behaviorGetter = { get() { return behaviors.getInstance(this); } };
    Object.defineProperty(Element.prototype, 'behavior', behaviorGetter);
    Object.defineProperty(Element.prototype, '$', behaviorGetter);

    behaviors.processScripts = (root = document) => processScripts(root, container, globalName);

    if (autoProcess) document.addEventListener('DOMContentLoaded', () => behaviors.processScripts());

    return behaviors;
}

/**
 * Install the behaviors system. Must be called exactly once with options.
 * @param {Object} options - Configuration options.
 * @param {string} [options.globalName='behaviors'] - Name for the global reference.
 * @param {string} [options.attr='mk-is'] - Attribute name used to identify behavior elements.
 * @param {Function} [options.Base=BaseBehavior] - Base class whose prototype is the default for all instances.
 * @param {HTMLElement} [options.container=document.head] - Container for generated script elements.
 * @param {boolean} [options.autoProcess=true] - Whether to process script[for] elements on DOMContentLoaded.
 * @returns {BehaviorRegistry} The installed registry instance.
 * @throws {Error} If called without options or if already installed.
 */
function install(options) {
    if (!options) throw Error('install() requires options');
    if (behaviors) throw Error('behaviors already installed');
    return _install(options);
}

/**
 * Get the installed BehaviorRegistry instance.
 * @returns {BehaviorRegistry} The installed registry instance.
 * @throws {Error} If behaviors has not been installed.
 */
function instance() {
    if (!behaviors) throw Error('behaviors has not been installed');
    return behaviors;
}

export { install, instance };
