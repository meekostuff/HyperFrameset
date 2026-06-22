(function() {
    "use strict";
    /*!
	 DOM utils
	 (c) Sean Hogan, 2008,2012,2013,2014,2026
	 Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	*/    const vendorPrefix = "meeko";
    let document$1 = window.document;
    const nodeIdSuffix = Math.round(Math.random() * 1e6);
    const nodeIdProperty = `__${vendorPrefix}${nodeIdSuffix}`;
    let nodeCount = 0;
    function uniqueId(node) {
        let nodeId = node[nodeIdProperty];
        if (nodeId) return nodeId;
        nodeId = `__${nodeCount++}`;
        node[nodeIdProperty] = nodeId;
        return nodeId;
    }
    function matches(element, selector, scope) {
        if (!(element && element.nodeType === 1)) return false;
        if (typeof selector === "function") return selector(element, scope);
        return scopeify(absSelector => element.matches(absSelector), selector, scope);
    }
    function closest(element, selector, scope) {
        if (typeof selector === "function") {
            for (let el = element; el && el !== scope; el = el.parentNode) {
                if (el.nodeType !== 1) continue;
                if (selector(el, scope)) return el;
            }
            return null;
        }
        return scopeify(absSelector => {
            for (let el = element; el && el !== scope; el = el.parentNode) {
                if (el.nodeType !== 1) continue;
                if (el.matches(absSelector)) return el;
            }
        }, selector, scope);
    }
    function scopeify(fn, selector, scope) {
        let absSelector = selector;
        if (scope) {
            let uid = uniqueId(scope);
            scope.setAttribute(nodeIdProperty, uid);
            absSelector = absolutizeSelector(selector, scope);
        }
        let result = fn(absSelector);
        if (scope) {
            scope.removeAttribute(nodeIdProperty);
        }
        return result;
    }
    function absolutizeSelector(selectorGroup, scope) {
        switch (scope.nodeType) {
          case 1:
            break;

          case 9:
          case 11:
            return selectorGroup;

          default:
            return selectorGroup;
        }
        let nodeId = uniqueId(scope);
        let scopeSelector = `[${nodeIdProperty}=${nodeId}]`;
        let selectors = selectorGroup.split(/,(?![^\(]*\)|[^\[]*\])/);
        selectors = Array.from(selectors, s => {
            if (/^:scope\b/.test(s)) return s.replace(/^:scope\b/, scopeSelector); else return `${scopeSelector} ${s}`;
        });
        return selectors.join(", ");
    }
    function findAll(selector, node, scope, inclusive) {
        if (!node) node = document$1;
        if (!node.querySelectorAll) return [];
        if (scope && !scope.nodeType) scope = node;
        return scopeify(absSelector => {
            let result = Array.from(node.querySelectorAll(absSelector));
            return result;
        }, selector, scope);
    }
    function find(selector, node, scope, inclusive) {
        if (!node) node = document$1;
        if (!node.querySelector) return null;
        if (scope && !scope.nodeType) scope = node;
        return scopeify(absSelector => node.querySelector(absSelector), selector, scope);
    }
    function contains(node, otherNode) {
        return node.contains(otherNode);
    }
    function createEvent(type, params) {
        if (typeof type === "object") {
            params = type;
            type = params.type;
        }
        if (typeof type !== "string") throw Error("createEvent() called with invalid event type");
        let {bubbles: bubbles = true, cancelable: cancelable = true, detail: detail, type: _type, ...extra} = params || {};
        let event = new CustomEvent(type, {
            bubbles: bubbles,
            cancelable: cancelable,
            detail: detail
        });
        Object.assign(event, extra);
        return event;
    }
    function dispatchEvent(target, type, params) {
        let event = createEvent(type, params);
        return target.dispatchEvent(event);
    }
    /*!
	 * Copyright 2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    class BaseBehavior {
        constructor(element) {
            if (element) this.element = element;
        }
        find(selector, scope) {
            return find(selector, this.element, scope);
        }
        findAll(selector, scope) {
            return findAll(selector, this.element, scope);
        }
        matches(selector, scope) {
            return matches(this.element, selector, scope);
        }
        closest(selector, scope) {
            return closest(this.element, selector, scope);
        }
        contains(otherNode) {
            return contains(this.element, otherNode);
        }
        attr(name, value) {
            if (typeof value === "undefined") return this.element.getAttribute(name);
            if (value == null) this.element.removeAttribute(name); else this.element.setAttribute(name, value);
        }
        hasClass(token) {
            return this.element.classList.contains(token);
        }
        addClass(...tokens) {
            this.element.classList.add(...tokens);
        }
        removeClass(...tokens) {
            this.element.classList.remove(...tokens);
        }
        toggleClass(token, force) {
            return this.element.classList.toggle(token, force);
        }
        css(name, value) {
            let element = this.element;
            let isKebabCase = name.indexOf("-") >= 0;
            if (typeof value === "undefined") return isKebabCase ? element.style.getPropertyValue(name) : element.style[name];
            if (value == null || value === "") {
                if (isKebabCase) element.style.removeProperty(name); else element.style[name] = "";
            } else {
                if (isKebabCase) element.style.setProperty(name, value); else element.style[name] = value;
            }
        }
        trigger(type, params) {
            return dispatchEvent(this.element, type, params);
        }
    }
    /*!
	 * Copyright 2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    class BehaviorRegistry {
        #attr;
        #table=new Map;
        #types=new Set;
        #defaultProto;
        #count=0;
        constructor(attr, defaultProto) {
            this.#attr = attr ?? "mk-is";
            this.#defaultProto = defaultProto ?? {};
        }
        uniqueKey() {
            return Math.random().toString(36).slice(2) + (this.#count++).toString(36);
        }
        get table() {
            return this.#table;
        }
        get attr() {
            return this.#attr;
        }
        register(key, proto, listeners) {
            if (arguments.length === 2) {
                let o = proto;
                if (Array.isArray(o)) {
                    listeners = o;
                    proto = null;
                } else if (typeof o === "function") {
                    if (o.name) throw new Error(`Behavior class must be anonymous (got "${o.name}")`);
                    listeners = o.on || [];
                    proto = o.prototype;
                } else {
                    listeners = o.on || [];
                    delete o.on;
                    proto = o;
                }
            }
            if (proto) {
                for (let key of Object.getOwnPropertyNames(proto).filter(k => k.startsWith("on") && k !== "on")) {
                    if (proto[key] instanceof Function) {
                        listeners = listeners || [];
                        listeners.push({
                            type: key.slice(2),
                            action: proto[key]
                        });
                    }
                }
            }
            return this.#addEntry(key, proto, listeners);
        }
        #addEntry(key, proto, listeners) {
            this.#table.set(key, {
                proto: proto,
                listeners: listeners
            });
            for (let l of listeners) {
                if (!this.#types.has(l.type)) {
                    this.#types.add(l.type);
                    window.addEventListener(l.type, this, true);
                }
            }
            return key;
        }
        define(element, proto, listeners) {
            if (element == null) {
                if (document.currentScript) {
                    element = BehaviorRegistry.getTarget(document.currentScript);
                }
                if (element == null) throw new Error("Could not autodetect target for behavior.");
            }
            let id = this.uniqueKey();
            element.setAttribute(this.#attr, id);
            return this.register(id, proto, listeners);
        }
        createInstance(element, proto) {
            if (proto == null) {
                proto = this.#defaultProto;
            } else {
                let parent = Object.getPrototypeOf(proto);
                if (parent === Object.prototype || parent === null) {
                    Object.setPrototypeOf(proto, this.#defaultProto);
                }
            }
            let instance = Object.create(proto);
            let el = new WeakRef(element);
            Object.defineProperty(instance, "element", {
                get: () => el.deref()
            });
            Object.defineProperty(instance, "$el", {
                get: () => el.deref()
            });
            return instance;
        }
        getInstance(element) {
            let key = element.getAttribute(this.#attr);
            let entry = key && this.#table.get(key);
            return this.createInstance(element, entry?.proto ?? null);
        }
        handleEvent(event) {
            for (let element of event.composedPath()) {
                if (!(element instanceof Element)) continue;
                this.#handleElement(element, event);
            }
        }
        #handleElement(element, event) {
            let key = element.getAttribute(this.#attr);
            if (!key) return;
            let entry = this.#table.get(key);
            if (!entry) return;
            this.#attachListeners(element, entry, event);
        }
        #attachListeners(element, entry, event) {
            for (let listener of entry.listeners) {
                if (!this.#matchesEvent(listener, event, element === event.target)) continue;
                this.#attachListener(element, entry.proto, listener, event);
            }
        }
        #attachListener(element, proto, listener, event) {
            let ts = event.timeStamp;
            element.addEventListener(event.type, ev => {
                if (ev.timeStamp !== ts) return;
                let instance = this.createInstance(ev.currentTarget, proto);
                listener.action.call(instance, ev);
            }, {
                once: true,
                capture: listener.phase === "capture"
            });
        }
        #matchesEvent(listener, event, isTarget) {
            if (listener.type !== event.type) return false;
            if (listener.phase === "target" && !isTarget) return false;
            if (listener.phase === "capture" && isTarget) return false;
            if (listener.phase === "bubble" && isTarget) return false;
            if (listener.key && !listener.key.split(/\s*,\s*/).includes(event.key)) return false;
            if (listener.code && !listener.code.split(/\s*,\s*/).includes(event.code)) return false;
            if (listener.clickCount && listener.clickCount !== event.detail) return false;
            return true;
        }
        static getTarget(script) {
            let target = script;
            while (target = target.previousElementSibling) {
                if (![ "STYLE", "SCRIPT" ].includes(target.tagName)) break;
            }
            return target || script.parentNode;
        }
    }
    /*!
	 * Copyright 2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    let behaviors;
    function processScript(script, index, container, globalName) {
        let element = BehaviorRegistry.getTarget(script);
        let key = behaviors.uniqueKey();
        element.setAttribute(behaviors.attr, key);
        let newScript = document.createElement("script");
        for (let attr of script.attributes) {
            if (attr.name === "for") continue;
            newScript.setAttribute(attr.name, attr.value);
        }
        let srcDocURL = new URL(script.ownerDocument.URL);
        let scriptSrcURL = `${srcDocURL.pathname}__script[${index}]`;
        newScript.textContent = `${globalName}.register('${key}', ${script.textContent});\n        //# sourceURL=${scriptSrcURL}`;
        script.remove();
        container.appendChild(newScript);
    }
    function processScripts(root, container, globalName) {
        let scripts = root.querySelectorAll("script[for]");
        let index = 0;
        for (let script of scripts) {
            if (script.getAttribute("for")) continue;
            try {
                processScript(script, index++, container, globalName);
            } catch (e) {
                console.error(e);
            }
        }
    }
    function _install({globalName: globalName = "behaviors", attr: attr = "mk-is", Base: Base = BaseBehavior, container: container = document.head, autoProcess: autoProcess = true}) {
        let defaultProto = Base.prototype || Object.getPrototypeOf(Base);
        behaviors = new BehaviorRegistry(attr, defaultProto);
        behaviors.Base = Base;
        globalThis[globalName] = behaviors;
        let behaviorGetter = {
            get() {
                return behaviors.getInstance(this);
            }
        };
        Object.defineProperty(Element.prototype, "behavior", behaviorGetter);
        Object.defineProperty(Element.prototype, "$", behaviorGetter);
        behaviors.processScripts = (root = document) => processScripts(root, container, globalName);
        if (autoProcess) document.addEventListener("DOMContentLoaded", () => behaviors.processScripts());
        return behaviors;
    }
    function install(options) {
        if (!options) throw Error("install() requires options");
        if (behaviors) throw Error("behaviors already installed");
        return _install(options);
    }
    /*!
	 * Copyright 2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    install({
        globalName: "behaviors",
        Base: BaseBehavior
    });
})();
//# sourceMappingURL=behaviors.js.map
