/*!
 * Copyright 2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

/**
 * Registry for behaviors. Behaviors are keyed by a unique attribute value
 * and dispatched via a single window capture listener per event type.
 */
class BehaviorRegistry {
    #attr;
    #table = new Map(); // key → { proto, listeners }
    #types = new Set();
    #defaultProto;

    #count = 0;

    /**
     * @param {string} [attr='mk-is'] - Attribute name used to identify behavior elements.
     * @param {object|null} [defaultProto=null] - Default prototype for instances when no behavior is registered.
     */
    constructor(attr, defaultProto) {
        this.#attr = attr ?? 'mk-is';
        this.#defaultProto = defaultProto ?? {};
    }

    /**
     * Generate a unique key for a behavior registration.
     * @returns {string}
     */
    uniqueKey() {
        return Math.random().toString(36).slice(2) + (this.#count++).toString(36);
    }

    /** @returns {Map} The behavior table (key → { proto, listeners }). */
    get table() { return this.#table; }

    /** @returns {string} The attribute name used for behavior identification. */
    get attr() { return this.#attr; }

    /**
     * Register a behavior by key.
     * - 3 args: register(key, proto, listeners) — explicit proto and listeners.
     * - 2 args: register(key, declaration) — autodetects from object, class, or array.
     * @param {string} key - Unique behavior key (the attribute value).
     * @param {object|Function|Array|null} proto - Proto, class, array, or declaration object.
     * @param {Array} [listeners] - Event listeners (omit for autodetect mode).
     * @returns {string} The registered key.
     */
    register(key, proto, listeners) {
        if (arguments.length === 2) {
            let o = proto;
            if (Array.isArray(o)) {
                listeners = o;
                proto = null;
            } else if (typeof o === 'function') {
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
            for (let key of Object.getOwnPropertyNames(proto).filter(k => k.startsWith('on') && k !== 'on')) {
                if (proto[key] instanceof Function) {
                    listeners = listeners || [];
                    listeners.push({ type: key.slice(2), action: proto[key] });
                }
            }
        }
        return this.#addEntry(key, proto, listeners);
    }

    /**
     * Store a behavior entry and ensure window capture listeners exist for its event types.
     * @param {string} key
     * @param {object|null} proto
     * @param {Array} listeners
     * @returns {string} The registered key.
     */
    #addEntry(key, proto, listeners) {
        this.#table.set(key, { proto, listeners });
        for (let l of listeners) {
            if (!this.#types.has(l.type)) {
                this.#types.add(l.type);
                window.addEventListener(l.type, this, true);
            }
        }
        return key;
    }

    /**
     * Define a behavior on an element. Generates a unique key, sets the attribute,
     * and extracts any `on*` slots from proto as listeners.
     * @param {Element|null} element - Target element, or null to autodetect from currentScript.
     * @param {object|null} proto - Prototype for transient instances.
     * @param {Array} [listeners] - Event listeners.
     * @returns {string} The registered key.
     */
    define(element, proto, listeners) {
        if (element == null) {
            if (document.currentScript) {
                element = BehaviorRegistry.getTarget(document.currentScript);
            }
            if (element == null) throw new Error('Could not autodetect target for behavior.');
        }
        let id = this.uniqueKey();
        element.setAttribute(this.#attr, id);
        return this.register(id, proto, listeners);
    }

    /**
     * Create a transient behavior instance for an element.
     * Wires in defaultProto if the given proto has no custom parent.
     * @param {Element} element
     * @param {object|null} proto
     * @returns {object} Instance with `element` getter.
     */
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
        Object.defineProperty(instance, 'element', { get: () => el.deref() });
        Object.defineProperty(instance, '$el', { get: () => el.deref() });
        return instance;
    }

    /**
     * Get a transient instance for an element, using its registered proto or the default.
     * @param {Element} element
     * @returns {object} Instance with `element` getter.
     */
    getInstance(element) {
        let key = element.getAttribute(this.#attr);
        let entry = key && this.#table.get(key);
        return this.createInstance(element, entry?.proto ?? null);
    }

    /**
     * EventListener interface. Called by the browser for each captured event.
     * Walks the composed path and attaches once-listeners on matching elements.
     * @param {Event} event
     */
    handleEvent(event) {
        for (let element of event.composedPath()) {
            if (!(element instanceof Element)) continue;
            this.#handleElement(element, event);
        }
    }

    /**
     * Look up and attach listeners for a single element in the event path.
     * @param {Element} element
     * @param {Event} event
     */
    #handleElement(element, event) {
        let key = element.getAttribute(this.#attr);
        if (!key) return;
        let entry = this.#table.get(key);
        if (!entry) return;
        this.#attachListeners(element, entry, event);
    }

    /**
     * Iterate entry listeners, filter by event match, and attach each.
     * @param {Element} element
     * @param {{proto: object|null, listeners: Array}} entry
     * @param {Event} event
     */
    #attachListeners(element, entry, event) {
        for (let listener of entry.listeners) {
            if (!this.#matchesEvent(listener, event, element === event.target)) continue;
            this.#attachListener(element, entry.proto, listener, event);
        }
    }

    /**
     * Attach a single once-listener on the element for this event dispatch cycle.
     * @param {Element} element
     * @param {object|null} proto
     * @param {{type: string, phase?: string, action: Function}} listener
     * @param {Event} event
     */
    #attachListener(element, proto, listener, event) {
        // Guard: if stopImmediatePropagation prevents this from firing on the
        // current event, it becomes a no-op on the next event and self-removes via once.
        let ts = event.timeStamp;
        element.addEventListener(event.type, (ev) => {
            if (ev.timeStamp !== ts) return;
            let instance = this.createInstance(ev.currentTarget, proto);
            listener.action.call(instance, ev);
        }, { once: true, capture: listener.phase === 'capture' });
    }

    /**
     * Test whether a listener matches the current event (type, phase, modifiers).
     * @param {{type: string, phase?: string, key?: string, code?: string, clickCount?: number}} listener
     * @param {Event} event
     * @param {boolean} isTarget - Whether the element is the event target.
     * @returns {boolean}
     */
    #matchesEvent(listener, event, isTarget) {
        if (listener.type !== event.type) return false;
        if (listener.phase === 'target' && !isTarget) return false;
        if (listener.phase === 'capture' && isTarget) return false;
        if (listener.phase === 'bubble' && isTarget) return false;
        if (listener.key && !listener.key.split(/\s*,\s*/).includes(event.key)) return false;
        if (listener.code && !listener.code.split(/\s*,\s*/).includes(event.code)) return false;
        if (listener.clickCount && listener.clickCount !== event.detail) return false;
        return true;
    }

    /**
     * Derive the target element from a script element by finding the
     * preceding non-script/style sibling, or the parent node.
     * @param {HTMLScriptElement} script
     * @returns {Element}
     */
    static getTarget(script) {
        let target = script;
        while (target = target.previousElementSibling) {
            if (!['STYLE', 'SCRIPT'].includes(target.tagName)) break;
        }
        return target || script.parentNode;
    }
}

export { BehaviorRegistry };
