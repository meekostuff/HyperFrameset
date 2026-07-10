(function() {
    "use strict";
    /*!
	 * Date Format 1.2.3
	 * (c) 2007-2009 Steven Levithan <stevenlevithan.com>
	 * MIT license
	 *
	 * Includes enhancements by Scott Trenda <scott.trenda.net>
	 * and Kris Kowal <cixar.com/~kris.kowal/>
	 *
	 * Accepts a date, a mask, or a date and a mask.
	 * Returns a formatted version of the given date.
	 * The date defaults to the current date/time.
	 * The mask defaults to dateFormat.masks.default.
	 */    let dateFormat = function() {
        let token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g, timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g, timezoneClip = /[^-+\dA-Z]/g, pad = function(val, len) {
            val = String(val);
            len = len || 2;
            while (val.length < len) val = "0" + val;
            return val;
        };
        return function(date, mask, utc) {
            let dF = dateFormat;
            if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
                mask = date;
                date = undefined;
            }
            date = date ? new Date(date) : new Date;
            if (isNaN(date)) throw SyntaxError("invalid date");
            mask = String(dF.masks[mask] || mask || dF.masks["default"]);
            if (mask.slice(0, 4) == "UTC:") {
                mask = mask.slice(4);
                utc = true;
            }
            let _ = utc ? "getUTC" : "get", d = date[_ + "Date"](), D = date[_ + "Day"](), m = date[_ + "Month"](), y = date[_ + "FullYear"](), H = date[_ + "Hours"](), M = date[_ + "Minutes"](), s = date[_ + "Seconds"](), L = date[_ + "Milliseconds"](), o = utc ? 0 : date.getTimezoneOffset(), flags = {
                d: d,
                dd: pad(d),
                ddd: dF.i18n.dayNames[D],
                dddd: dF.i18n.dayNames[D + 7],
                m: m + 1,
                mm: pad(m + 1),
                mmm: dF.i18n.monthNames[m],
                mmmm: dF.i18n.monthNames[m + 12],
                yy: String(y).slice(2),
                yyyy: y,
                h: H % 12 || 12,
                hh: pad(H % 12 || 12),
                H: H,
                HH: pad(H),
                M: M,
                MM: pad(M),
                s: s,
                ss: pad(s),
                l: pad(L, 3),
                L: pad(L > 99 ? Math.round(L / 10) : L),
                t: H < 12 ? "a" : "p",
                tt: H < 12 ? "am" : "pm",
                T: H < 12 ? "A" : "P",
                TT: H < 12 ? "AM" : "PM",
                Z: utc ? "UTC" : (String(date).match(timezone) || [ "" ]).pop().replace(timezoneClip, ""),
                o: (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
                S: [ "th", "st", "nd", "rd" ][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
            };
            return mask.replace(token, function($0) {
                return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
            });
        };
    }();
    dateFormat.masks = {
        default: "ddd mmm dd yyyy HH:MM:ss",
        shortDate: "m/d/yy",
        mediumDate: "mmm d, yyyy",
        longDate: "mmmm d, yyyy",
        fullDate: "dddd, mmmm d, yyyy",
        shortTime: "h:MM TT",
        mediumTime: "h:MM:ss TT",
        longTime: "h:MM:ss TT Z",
        isoDate: "yyyy-mm-dd",
        isoTime: "HH:MM:ss",
        isoDateTime: "yyyy-mm-dd'T'HH:MM:ss",
        isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
    };
    dateFormat.i18n = {
        dayNames: [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ],
        monthNames: [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ]
    };
    /*!
	 JS utils
	 (c) Sean Hogan, 2008,2012,2013,2014,2015,2026
	 Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	*/    function uc(str) {
        return str ? str.toUpperCase() : "";
    }
    function lc(str) {
        return str ? str.toLowerCase() : "";
    }
    function ucFirst(str) {
        return str ? str.charAt(0).toUpperCase() + str.substr(1) : "";
    }
    function camelCase(str) {
        return str ? Array.from(str.split("-"), function(part, i) {
            return i === 0 ? part : ucFirst(part);
        }).join("") : "";
    }
    function kebabCase(str) {
        return str ? Array.from(str.split(/(?=[A-Z])/), function(part, i) {
            return i === 0 ? part : lc(part);
        }).join("-") : "";
    }
    function includes(a, item) {
        return a.includes(item);
    }
    function forEach(a, fn, context) {
        for (let n = a.length, i = 0; i < n; i++) fn.call(context, a[i], i, a);
    }
    function some(a, fn, context) {
        for (let n = a.length, i = 0; i < n; i++) {
            if (fn.call(context, a[i], i, a)) return true;
        }
        return false;
    }
    function every(a, fn, context) {
        for (let n = a.length, i = 0; i < n; i++) {
            if (!fn.call(context, a[i], i, a)) return false;
        }
        return true;
    }
    function filter(a, fn, context) {
        let output = [];
        for (let n = a.length, i = 0; i < n; i++) {
            let success = fn.call(context, a[i], i, a);
            if (success) output.push(a[i]);
        }
        return output;
    }
    function _find(a, fn, context, byIndex) {
        for (let n = a.length, i = 0; i < n; i++) {
            let item = a[i];
            let success = fn.call(context, item, i, a);
            if (success) return byIndex ? i : item;
        }
        return byIndex ? -1 : undefined;
    }
    function findIndex(a, fn, context) {
        return _find(a, fn, context, true);
    }
    function find$1(a, fn, context) {
        return _find(a, fn, context, false);
    }
    function words(text) {
        return text.split(/\s+/);
    }
    function forIn(object, fn, context) {
        for (let key in object) {
            fn.call(context, object[key], key, object);
        }
    }
    function forOwn(object, fn, context) {
        let keys = Object.keys(object);
        for (let i = 0, n = keys.length; i < n; i++) {
            let key = keys[i];
            fn.call(context, object[key], key, object);
        }
    }
    function isEmpty(o) {
        if (o) for (let p in o) if (o.hasOwnProperty(p)) return false;
        return true;
    }
    function defaults(dest, src) {
        forOwn(src, function(val, key, object) {
            if (typeof this[key] !== "undefined") return;
            this[key] = object[key];
        }, dest);
        return dest;
    }
    function assign(dest, src) {
        forOwn(src, function(val, key, object) {
            this[key] = object[key];
        }, dest);
        return dest;
    }
    var _ = Object.freeze({
        __proto__: null,
        assign: assign,
        camelCase: camelCase,
        defaults: defaults,
        every: every,
        filter: filter,
        find: find$1,
        findIndex: findIndex,
        forEach: forEach,
        forIn: forIn,
        forOwn: forOwn,
        includes: includes,
        isEmpty: isEmpty,
        kebabCase: kebabCase,
        lc: lc,
        some: some,
        uc: uc,
        ucFirst: ucFirst,
        words: words
    });
    /*!
	 * Registry
	 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    class Registry extends Map {
        #writeOnce;
        #keyValidator;
        #valueValidator;
        constructor({writeOnce: writeOnce, keyValidator: keyValidator, valueValidator: valueValidator} = {}) {
            super();
            this.#writeOnce = writeOnce;
            this.#keyValidator = keyValidator;
            this.#valueValidator = valueValidator;
        }
        set(key, value) {
            if (this.#writeOnce && this.has(key)) {
                throw Error(`Attempted to rewrite key ${key} in write-once storage`);
            }
            if (this.#keyValidator && !this.#keyValidator(key)) {
                throw Error(`Invalid key ${key} for storage`);
            }
            if (this.#valueValidator && !this.#valueValidator(value)) {
                throw Error(`Invalid value ${value} for storage`);
            }
            return super.set(key, value);
        }
        clear() {
            if (this.#writeOnce) throw Error(`Attempted to clear write-once storage`);
            return super.clear();
        }
        delete(key) {
            if (this.#writeOnce && this.has(key)) {
                throw Error(`Attempted to delete key ${key} in write-once storage`);
            }
            return super.delete(key);
        }
        register(key, value) {
            return this.set(key, value);
        }
    }
    /*!
	 * Task
	 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    const frameRate = 60;
    const frameInterval = 1e3 / frameRate;
    const safetyMargin = 1;
    let asapQueue = [];
    let deferQueue = [];
    let scheduled = false;
    let processing = false;
    let deadline = null;
    let channel = new MessageChannel;
    channel.port1.onmessage = processTasks;
    function requestProcessing() {
        if (processing) return;
        if (scheduled) return;
        scheduled = true;
        if (getTime() > safetyMargin) {
            channel.port2.postMessage(null);
            return;
        }
        let ricId, rafId;
        if (window.requestIdleCallback) ricId = window.requestIdleCallback(onIdle);
        rafId = window.requestAnimationFrame(onFrame);
        function onIdle(idleDeadline) {
            window.cancelAnimationFrame(rafId);
            deadline = idleDeadline;
            channel.port2.postMessage(null);
        }
        function onFrame(timestamp) {
            if (ricId) window.cancelIdleCallback(ricId);
            deadline = {
                didTimeout: false,
                timeRemaining() {
                    return Math.max(0, frameInterval - (performance.now() - timestamp));
                }
            };
            channel.port2.postMessage(null);
        }
    }
    function getTime() {
        return deadline ? deadline.timeRemaining() : 0;
    }
    function asap$1(fn) {
        asapQueue.push(fn);
        requestProcessing();
    }
    function defer$1(fn) {
        if (processing) {
            deferQueue.push(fn);
            return;
        }
        asap$1(fn);
    }
    function delay$1(fn, timeout) {
        if (timeout <= 0 || timeout == null) {
            defer$1(fn);
            return;
        }
        setTimeout(() => asap$1(fn), timeout);
    }
    let execStats = {};
    let frameStats = {};
    function resetStats() {
        forEach([ execStats, frameStats ], stats => {
            assign(stats, {
                count: 0,
                totalTime: 0,
                minTime: Infinity,
                maxTime: 0,
                avgTime: 0
            });
        });
    }
    resetStats();
    function updateStats(stats, currTime) {
        stats.count++;
        stats.totalTime += currTime;
        if (currTime < stats.minTime) stats.minTime = currTime;
        if (currTime > stats.maxTime) stats.maxTime = currTime;
    }
    function getStats() {
        let exec = assign({}, execStats);
        let frame = assign({}, frameStats);
        exec.avgTime = exec.totalTime / exec.count;
        frame.avgTime = frame.totalTime / frame.count;
        return {
            exec: exec,
            frame: frame
        };
    }
    let idle = true;
    function processTasks() {
        if (processing) return;
        processing = true;
        if (!idle) updateStats(frameStats, getTime());
        let fn;
        let currTime;
        while (asapQueue.length) {
            fn = asapQueue.shift();
            if (typeof fn !== "function") continue;
            try {
                fn();
            } catch (error) {
                window.reportError(error);
            }
            currTime = getTime();
            if (currTime <= safetyMargin) break;
        }
        processing = false;
        scheduled = false;
        if (currTime) updateStats(execStats, currTime);
        asapQueue = asapQueue.concat(deferQueue);
        deferQueue = [];
        if (asapQueue.length) {
            idle = false;
            requestProcessing();
        } else idle = true;
    }
    var Task = {
        asap: asap$1,
        defer: defer$1,
        delay: delay$1,
        getTime: getTime,
        getStats: getStats,
        resetStats: resetStats
    };
    /*!
	 * Thenfu
	 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    function isThenable(value) {
        return value !== null && (typeof value === "object" || typeof value === "function") && typeof value.then === "function";
    }
    function tryFn(fn, ...params) {
        return Promise.all(params).then(resolvedParams => asap(() => fn(...resolvedParams)));
    }
    let wait = function() {
        let tests = [];
        function wait(fn) {
            let test = {
                fn: fn
            };
            let resolver = Promise.withResolvers();
            test.resolve = resolver.resolve;
            test.reject = resolver.reject;
            asapTest(test);
            return resolver.promise;
        }
        function asapTest(test) {
            asap(test.fn).then(done => {
                if (done) test.resolve(); else deferTest(test);
            }, error => {
                test.reject(error);
            });
        }
        function deferTest(test) {
            let started = tests.length > 0;
            tests.push(test);
            if (!started) Task.defer(poller);
        }
        function poller() {
            let currentTests = tests;
            tests = [];
            forEach(currentTests, asapTest);
        }
        return wait;
    }();
    function asap(value) {
        let resolver = Promise.withResolvers();
        Task.asap(() => settle(resolver, value));
        return resolver.promise;
    }
    function defer(value) {
        let resolver = Promise.withResolvers();
        Task.defer(() => settle(resolver, value));
        return resolver.promise;
    }
    function settle({resolve: resolve, reject: reject}, value) {
        if (isThenable(value)) {
            resolve(value);
        } else if (value instanceof Error) {
            reject(value);
        } else if (typeof value === "function") {
            try {
                resolve(value());
            } catch (ex) {
                reject(ex);
            }
        } else {
            resolve(value);
        }
    }
    function delay(timeout) {
        let {promise: promise, resolve: resolve, reject: reject} = Promise.withResolvers();
        if (timeout <= 0 || timeout == null) Task.defer(resolve); else Task.delay(resolve, timeout);
        return promise;
    }
    function pipe(startValue, fnList) {
        let promise = asap(startValue);
        for (let n = fnList.length, i = 0; i < n; i++) {
            let fn = fnList[i];
            promise = promise.then(fn);
        }
        return promise;
    }
    function reduce(accumulator, a, fn, context) {
        return new Promise((resolve, reject) => {
            let length = a.length;
            let i = 0;
            Task.asap(() => process(accumulator));
            return;
            function process(acc) {
                if (i >= length) {
                    resolve(acc);
                    return;
                }
                if (isThenable(acc)) {
                    acc.then(process, reject);
                    return;
                }
                try {
                    acc = fn.call(context, acc, a[i], i, a);
                    i++;
                } catch (error) {
                    reject(error);
                    return;
                }
                Task.asap(() => process(acc));
            }
        });
    }
    var Thenfu = {
        isThenable: isThenable,
        try: tryFn,
        asap: asap,
        defer: defer,
        delay: delay,
        wait: wait,
        pipe: pipe,
        reduce: reduce,
        settle: settle
    };
    /*!
	 * URLux
	 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    const document$5 = window.document;
    class URLux extends URL {
        constructor(href, base) {
            super(href, base);
            this.supportsResolve = /^(https?|ftp|file):$/.test(this.protocol);
            if (!this.supportsResolve) return;
            const pathParts = this.pathname.split("/");
            pathParts.shift();
            this.filename = pathParts.pop() || "";
            this.basepath = pathParts.length ? "/" + pathParts.join("/") + "/" : "/";
            this.base = this.origin + this.basepath;
            this.nosearch = this.origin + this.pathname;
            this.nohash = this.nosearch + this.search;
        }
        resolve(relHref) {
            relHref = relHref.trim();
            if (!this.supportsResolve) return relHref;
            if (/^[a-zA-Z0-9-]+:/.test(relHref)) return relHref;
            if (relHref.startsWith("//")) return this.protocol + relHref;
            if (relHref.startsWith("/")) return this.origin + relHref;
            if (relHref.startsWith("?")) return this.nosearch + relHref;
            if (relHref.startsWith("#")) return this.nohash + relHref;
            if (!relHref.startsWith(".")) return this.base + relHref;
            if (relHref.startsWith("./")) return this.base + relHref.slice(2);
            let myRel = relHref;
            let myDir = this.basepath;
            while (myRel.startsWith("../")) {
                myRel = myRel.slice(3);
                myDir = myDir.replace(/[^/]+\/$/, "");
            }
            return this.origin + myDir + myRel;
        }
    }
    class AttributeDescriptor {
        constructor(tagName, attrName, loads, compound) {
            this.tagName = tagName;
            this.attrName = attrName;
            this.loads = loads;
            this.compound = compound;
            this.supported = attrName in document$5.createElement(tagName);
        }
        resolve(el, baseURL) {
            const url = el.getAttribute(this.attrName);
            if (url == null) return;
            const finalURL = this.resolveURL(url, baseURL);
            if (finalURL !== url) el.setAttribute(this.attrName, finalURL);
        }
        resolveURL(url, baseURL) {
            const relURL = url.trim();
            if (relURL.charAt(0) === "") return relURL;
            return baseURL.resolve(relURL);
        }
    }
    function resolveSrcset(urlSet, baseURL) {
        return urlSet.split(/\s*,\s*/).map((urlDesc, i, list) => urlDesc.replace(/^\s*(\S+)(?=\s|$)/, (all, url) => baseURL.resolve(url))).join(", ");
    }
    function resolvePing(urlSet, baseURL) {
        return urlSet.split(/\s+/).map(url => baseURL.resolve(url)).join(" ");
    }
    const urlAttributes = {};
    "link@<href script@<src img@<longDesc,<src,+srcset iframe@<longDesc,<src object@<data embed@<src video@<poster,<src audio@<src source@<src,+srcset input@formAction,<src button@formAction,<src a@+ping,href area@href q@cite blockquote@cite ins@cite del@cite form@action".split(/\s+/).forEach(text => {
        const [tagName, attrs] = text.split("@");
        const attrList = urlAttributes[tagName] = {};
        attrs.split(",").forEach(attrName => {
            let loads = false, compound = false;
            const modifier = attrName.charAt(0);
            if (modifier === "<") {
                loads = true;
                attrName = attrName.slice(1);
            } else if (modifier === "+") {
                compound = true;
                attrName = attrName.slice(1);
            }
            attrList[attrName] = new AttributeDescriptor(tagName, attrName, loads, compound);
        });
    });
    urlAttributes["img"]["srcset"].resolveURL = resolveSrcset;
    urlAttributes["source"]["srcset"].resolveURL = resolveSrcset;
    urlAttributes["a"]["ping"].resolveURL = resolvePing;
    URLux.attributes = urlAttributes;
    URLux.create = function(href, base) {
        return new URLux(href, base);
    };
    /*!
	 DOM utils
	 (c) Sean Hogan, 2008,2012,2013,2014,2026
	 Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	*/    const vendorPrefix = "meeko";
    let document$4 = window.document;
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
    function findId(id, doc) {
        if (!id) return;
        if (!doc) doc = document$4;
        if (!doc.getElementById) throw Error("Context for findId() must be a Document node");
        return doc.getElementById(id);
    }
    function findAll(selector, node, scope, inclusive) {
        if (!node) node = document$4;
        if (!node.querySelectorAll) return [];
        if (scope && !scope.nodeType) scope = node;
        return scopeify(absSelector => {
            let result = Array.from(node.querySelectorAll(absSelector));
            if (inclusive && node.nodeType === 1 && node.matches(absSelector)) result.unshift(node);
            return result;
        }, selector, scope);
    }
    function find(selector, node, scope, inclusive) {
        if (!node) node = document$4;
        if (!node.querySelector) return null;
        if (scope && !scope.nodeType) scope = node;
        return scopeify(absSelector => {
            if (inclusive && node.nodeType === 1 && node.matches(absSelector)) return node;
            return node.querySelector(absSelector);
        }, selector, scope);
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
    function isVisible(element) {
        return !closest(element, "[hidden]");
    }
    function whenVisible(element) {
        return new Promise(resolve => {
            if (isVisible(element)) {
                resolve();
                return;
            }
            let observer = new MutationObserver(() => {
                if (isVisible(element)) {
                    observer.disconnect();
                    resolve();
                }
            });
            observer.observe(document$4, {
                attributes: true,
                attributeFilter: [ "hidden" ],
                subtree: true
            });
        });
    }
    function insertNode(conf, refNode, node) {
        node = refNode.ownerDocument.adoptNode(node);
        switch (conf) {
          case "before":
          case "beforebegin":
            refNode.before(node);
            break;

          case "after":
          case "afterend":
            refNode.after(node);
            break;

          case "start":
          case "afterbegin":
            refNode.prepend(node);
            break;

          case "end":
          case "beforeend":
            refNode.append(node);
            break;

          case "replace":
            refNode.replaceWith(node);
            break;

          case "empty":
          case "contents":
            refNode.replaceChildren(node);
            break;
        }
        return refNode;
    }
    function adoptContents(parentNode, doc) {
        if (!doc) doc = document$4;
        let frag = doc.createDocumentFragment();
        let node;
        while (node = parentNode.firstChild) frag.appendChild(doc.adoptNode(node));
        return frag;
    }
    function cssReady() {
        let links = document$4.querySelectorAll('link[rel="stylesheet"]');
        let promises = Array.from(links, link => {
            if (link.sheet || link.disabled) return Promise.resolve();
            return new Promise(resolve => {
                link.addEventListener("load", resolve, {
                    once: true
                });
                link.addEventListener("error", resolve, {
                    once: true
                });
            });
        });
        return Promise.all(promises);
    }
    function copyAttributes(node, srcNode) {
        for (const {name: name, value: value} of srcNode.attributes) node.setAttribute(name, value);
        return node;
    }
    function removeAttributes(node) {
        while (node.attributes.length) node.removeAttribute(node.attributes[0].name);
        return node;
    }
    function createDocument(srcDoc) {
        if (!srcDoc) srcDoc = document$4;
        return srcDoc.cloneNode(false);
    }
    function createHTMLDocument(title, srcDoc) {
        let doc = createDocument(srcDoc);
        let docEl = doc.createElement("html");
        docEl.innerHTML = "<head><title>" + title + "</title></head><body></body>";
        doc.appendChild(docEl);
        return doc;
    }
    function cloneDocument(srcDoc) {
        return srcDoc.cloneNode(true);
    }
    var DOM = Object.freeze({
        __proto__: null,
        adoptContents: adoptContents,
        cloneDocument: cloneDocument,
        closest: closest,
        contains: contains,
        copyAttributes: copyAttributes,
        createDocument: createDocument,
        createEvent: createEvent,
        createHTMLDocument: createHTMLDocument,
        cssReady: cssReady,
        dispatchEvent: dispatchEvent,
        find: find,
        findAll: findAll,
        findId: findId,
        insertNode: insertNode,
        isVisible: isVisible,
        matches: matches,
        removeAttributes: removeAttributes,
        whenVisible: whenVisible
    });
    /*!
	 * scriptQueue
	 * Copyright 2009-2016 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    let document$3 = window.document;
    class ScriptQueue {
        #queue=[];
        #emptying=false;
        push(node) {
            let queue = this.#queue;
            return new Promise((resolve, reject) => {
                if (this.#emptying) throw Error("Attempt to append script to scriptQueue while emptying");
                if (!node.type || /^text\/javascript$/i.test(node.type)) {
                    console.info(`Attempt to queue already executed script ${node.src}`);
                    resolve();
                    return;
                }
                if (!/^text\/javascript\?disabled$/i.test(node.type)) {
                    console.info(`Unsupported script-type ${node.type}`);
                    resolve();
                    return;
                }
                let script = document$3.createElement("script");
                if (node.src) addListeners();
                copyAttributes(script, node);
                script.text = node.text;
                if (script.getAttribute("defer")) {
                    script.removeAttribute("defer");
                    script.setAttribute("async", "");
                    console.warn("@defer not supported on scripts");
                }
                if (script.src && !script.hasAttribute("async")) script.async = false;
                script.type = "text/javascript";
                let enabledFu = Promise.withResolvers();
                let prev = queue[queue.length - 1], prevScript = prev && prev.script;
                let trigger;
                if (prev) {
                    if (prevScript.hasAttribute("async") || script.src && !script.hasAttribute("async")) trigger = prev.enabled; else trigger = prev.complete;
                } else trigger = Thenfu.asap();
                trigger.then(enable, enable);
                let completeFu = Promise.withResolvers();
                completeFu.promise.then(resolve, reject);
                let current = {
                    script: script,
                    complete: completeFu.promise,
                    enabled: enabledFu.promise
                };
                queue.push(current);
                return;
                function enable() {
                    insertNode("replace", node, script);
                    enabledFu.resolve();
                    if (!script.src) {
                        spliceItem(queue, current);
                        completeFu.resolve();
                    }
                }
                function onLoad(e) {
                    removeListeners();
                    spliceItem(queue, current);
                    completeFu.resolve();
                }
                function onError(e) {
                    removeListeners();
                    spliceItem(queue, current);
                    completeFu.reject(() => {
                        throw Error("Script loading failed");
                    });
                }
                function addListeners() {
                    script.addEventListener("load", onLoad, false);
                    script.addEventListener("error", onError, false);
                }
                function removeListeners() {
                    script.removeEventListener("load", onLoad, false);
                    script.removeEventListener("error", onError, false);
                }
                function spliceItem(a, item) {
                    for (let n = a.length, i = 0; i < n; i++) {
                        if (a[i] !== item) continue;
                        a.splice(i, 1);
                        return;
                    }
                }
            });
        }
        empty() {
            let queue = this.#queue;
            return new Promise((resolve, reject) => {
                this.#emptying = true;
                if (queue.length <= 0) {
                    this.#emptying = false;
                    resolve();
                    return;
                }
                forEach(queue, (value, i) => {
                    let acceptCallback = () => {
                        if (queue.length <= 0) {
                            this.#emptying = false;
                            resolve();
                        }
                    };
                    value.complete.then(acceptCallback, acceptCallback);
                });
            });
        }
    }
    var scriptQueue = new ScriptQueue;
    /*!
	 * controllers
	 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    let controllers = {
        values: {},
        listeners: {},
        create: function(name) {
            this.values[name] = [];
            this.listeners[name] = [];
        },
        has: function(name) {
            return name in this.values;
        },
        get: function(name) {
            if (!this.has(name)) throw Error(`${name} is not a registered controller`);
            return this.values[name];
        },
        set: function(name, value) {
            if (!this.has(name)) throw Error(`${name} is not a registered controller`);
            if (value === false || value == null) value = []; else if (typeof value === "string" || !("length" in value)) value = [ value ];
            let oldValue = this.values[name];
            if (symmetricDifference(value, oldValue).size === 0) return;
            this.values[name] = value;
            forEach(this.listeners[name], listener => {
                Task.asap(() => {
                    listener(value);
                });
            });
        },
        listen: function(name, listener) {
            if (!this.has(name)) throw Error(`${name} is not a registered controller`);
            this.listeners[name].push(listener);
            let value = this.values[name];
            Task.asap(() => {
                listener(value);
            });
        }
    };
    function symmetricDifference(a1, a2) {
        return new Set(a1).symmetricDifference(new Set(a2));
    }
    /*!
	 * htmlParser
	 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    function normalize(doc, details) {
        let baseURL = URLux.create(details.url);
        forEach(findAll("style", doc.body), node => {
            if (node.hasAttribute("scoped")) return;
            doc.head.appendChild(node);
        });
        forEach(findAll("style", doc), node => {
            let text = node.textContent;
            let replacements = 0;
            text = text.replace(/\burl\(\s*(['"]?)([^\r\n]*)\1\s*\)/gi, (match, quote, url) => {
                let absURL = baseURL.resolve(url);
                if (absURL === url) return match;
                replacements++;
                return `url(${quote}${absURL}${quote})`;
            });
            if (replacements) node.textContent = text;
        });
        return resolveAll(doc, baseURL, false);
    }
    function resolveAll(doc, baseURL) {
        let urlAttributes = URLux.attributes;
        return Thenfu.pipe(null, [ () => {
            let selector = Object.keys(urlAttributes).join(", ");
            return findAll(selector, doc);
        }, nodeList => Thenfu.reduce(null, nodeList, (dummy, el) => {
            let tag = el.localName;
            if (!tag) return;
            let attrList = urlAttributes[tag];
            forOwn(attrList, (attrDesc, attrName) => {
                if (!el.hasAttribute(attrName)) return;
                attrDesc.resolve(el, baseURL);
            });
        }), () => doc ]);
    }
    function nativeParser(html, details) {
        return Thenfu.pipe(null, [ () => {
            let doc = (new DOMParser).parseFromString(html, "text/html");
            return normalize(doc, details);
        } ]);
    }
    function rebaseURL$1(url, baseURL) {
        let relURL = url.replace(/^scope:/i, "");
        if (relURL == url) return url;
        return baseURL.resolve(relURL);
    }
    function rebase$1(doc, scopeURL) {
        let urlAttributes = URLux.attributes;
        forOwn(urlAttributes, (attrList, tag) => {
            forEach(findAll(tag, doc), el => {
                forOwn(attrList, (attrDesc, attrName) => {
                    let relURL = el.getAttribute(attrName);
                    if (relURL == null) return;
                    let url = rebaseURL$1(relURL, scopeURL);
                    if (url != relURL) el[attrName] = url;
                });
            });
        });
    }
    function normalizeScopedStyles$1(doc, allowedScopeSelector) {
        let scopedStyles = doc.body.querySelectorAll("style[scoped]");
        scopedStyles.forEach((el, index) => {
            let scope = el.parentNode;
            if (!scope.matches(allowedScopeSelector)) {
                console.warn(`Removing <style scoped>. Must be child of ${allowedScopeSelector}`);
                el.remove();
                return;
            }
            let scopeId = `__scope_${index}__`;
            scope.setAttribute("scopeid", scopeId);
            el.removeAttribute("scoped");
            el.textContent = `@scope ([scopeid="${scopeId}"]) {\n${el.textContent}\n}`;
            doc.head.appendChild(el);
        });
    }
    var htmlParser = {
        parse: nativeParser,
        normalize: normalize,
        rebase: rebase$1,
        rebaseURL: rebaseURL$1,
        normalizeScopedStyles: normalizeScopedStyles$1
    };
    /*!
	 * ResourceProxy
	 * Copyright 2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    class ResourceProxy {
        #handlers=new Map;
        #methods=words("get");
        #responseTypes=words("document json text");
        #defaultInfo={
            method: "get",
            responseType: "document"
        };
        #cache=[];
        register(protocol, handler) {
            this.#handlers.set(protocol, handler);
        }
        add(response) {
            const url = response.url;
            if (!url) throw Error("Invalid url in response object");
            if (!includes(this.#responseTypes, response.type)) throw Error("Invalid type in response object");
            const request = {
                url: response.url
            };
            defaults(request, this.#defaultInfo);
            if (response.type === "document") {
                return Thenfu.pipe(undefined, [ () => htmlParser.normalize(response.body, request), doc => {
                    response.body = doc;
                    this.#cacheAdd(request, response);
                } ]);
            }
            this.#cacheAdd(request, response);
            return Thenfu.asap();
        }
        load(url, requestInfo) {
            const info = {
                url: url
            };
            if (requestInfo) defaults(info, requestInfo);
            defaults(info, this.#defaultInfo);
            for (let [protocol, handler] of this.#handlers) {
                if (url.startsWith(protocol)) {
                    return Thenfu.asap(handler(url, info)).then(response => {
                        if (!response.url) response.url = url;
                        return response;
                    });
                }
            }
            if (!includes(this.#methods, info.method)) throw Error(`method not supported: ${info.method}`);
            if (!includes(this.#responseTypes, info.responseType)) throw Error(`responseType not supported: ${info.responseType}`);
            return this.#request(info);
        }
        #cacheAdd(request, response) {
            const rq = defaults({}, request);
            const entry = {
                invalid: false,
                request: rq
            };
            if (Thenfu.isThenable(response)) {
                entry.response = response.then(r => this.#cloneResponse(r), () => {
                    entry.invalid = true;
                    entry.response = null;
                });
            } else {
                entry.response = this.#cloneResponse(response);
            }
            this.#cache.push(entry);
        }
        #cacheLookup(request) {
            const entry = find$1(this.#cache, entry => {
                if (entry.invalid || entry.response == null) return false;
                if (request.url !== entry.request.url) return false;
                return true;
            });
            if (!(entry && entry.response)) return;
            const response = entry.response;
            if (Thenfu.isThenable(response)) return response.then(r => this.#cloneResponse(r)); else return this.#cloneResponse(response);
        }
        #cloneResponse(response) {
            const resp = defaults({}, response);
            switch (response.type) {
              case "document":
                resp.body = cloneDocument(response.body);
                break;

              case "json":
                resp.body = JSON.parse(JSON.stringify(response.body));
                break;

              case "text":
                break;
            }
            return resp;
        }
        #request(info) {
            const method = lc(info.method);
            switch (method) {
              case "post":
                throw Error("POST not supported");

              case "get":
                const response = this.#cacheLookup(info);
                if (response) return Thenfu.asap(response);
                let pending = this.#doRequest(info);
                this.#cacheAdd(info, pending);
                return pending;

              default:
                throw Error(`${uc(method)} not supported`);
            }
        }
        #doRequest(info) {
            return new Promise((resolve, reject) => {
                const method = info.method;
                const url = info.url;
                const xhr = new XMLHttpRequest;
                xhr.onreadystatechange = onchange;
                xhr.open(method, url, true);
                if (info.responseType === "document") {
                    xhr.responseType = "document";
                    if (xhr.overrideMimeType) xhr.overrideMimeType("text/html");
                }
                xhr.send(null);
                function onchange() {
                    if (xhr.readyState != 4) return;
                    const protocol = URLux.create(url).protocol;
                    switch (protocol) {
                      case "http:":
                      case "https:":
                        if (xhr.status !== 200) {
                            reject(() => {
                                throw Error(`Unexpected status ${xhr.status} for ${url}`);
                            });
                            return;
                        }
                        break;

                      default:
                        if (!xhr.response && !xhr.responseText) {
                            reject(() => {
                                throw Error(`No response for ${url}`);
                            });
                            return;
                        }
                        break;
                    }
                    Thenfu.defer(onload);
                }
                const onload = () => {
                    const result = this.#handleResponse(xhr, info);
                    resolve(result);
                };
            });
        }
        #handleResponse(xhr, info) {
            const response = {
                url: info.url,
                type: info.responseType,
                status: xhr.status,
                statusText: xhr.statusText
            };
            switch (info.responseType) {
              case "document":
                return htmlParser.normalize(xhr.response, info).then(doc => {
                    response.body = doc;
                    return response;
                });

              case "json":
                try {
                    response.body = JSON.parse(xhr.responseText);
                } catch (e) {
                    response.body = null;
                }
                return response;

              case "text":
                response.body = xhr.responseText;
                return response;

              default:
                response.body = xhr.response || xhr.responseText;
                return response;
            }
        }
    }
    var resourceProxy = new ResourceProxy;
    /*!
	 * CustomNamespace
	 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    class CustomNamespace {
        constructor(options) {
            if (!options) return;
            let style = options.style = lc(options.style);
            let styleInfo = find$1(CustomNamespace.namespaceStyles, styleInfo => styleInfo.style === style);
            if (!styleInfo) throw Error(`Unexpected namespace style: ${style}`);
            let name = options.name = lc(options.name);
            if (!name) throw Error(`Unexpected name: ${name}`);
            assign(this, options);
            let separator = styleInfo.separator;
            this.prefix = this.name + separator;
            this.selectorPrefix = this.name + (separator === ":" ? "\\:" : separator);
        }
        clone() {
            let clone = new CustomNamespace;
            assign(clone, this);
            return clone;
        }
        lookupTagName(name) {
            return this.prefix + name;
        }
        lookupSelector(selector) {
            let prefix = this.selectorPrefix;
            let tags = selector.split(/\s*,\s*|\s+/);
            return Array.from(tags, tag => prefix + tag).join(", ");
        }
    }
    CustomNamespace.namespaceStyles = [ {
        style: "vendor",
        configNamespace: "custom",
        separator: "-"
    }, {
        style: "xml",
        configNamespace: "xmlns",
        separator: ":"
    } ];
    forOwn(CustomNamespace.namespaceStyles, styleInfo => {
        styleInfo.configPrefix = styleInfo.configNamespace + styleInfo.separator;
    });
    CustomNamespace.getNamespaces = function(doc) {
        return new NamespaceCollection(doc);
    };
    class NamespaceCollection {
        constructor(doc) {
            this.items = [];
            if (!doc) return;
            this.init(doc);
        }
        init(doc) {
            let coll = this;
            forEach(Array.from(doc.documentElement.attributes), attr => {
                let fullName = lc(attr.name);
                let styleInfo = find$1(CustomNamespace.namespaceStyles, styleInfo => fullName.indexOf(styleInfo.configPrefix) === 0);
                if (!styleInfo) return;
                let name = fullName.substr(styleInfo.configPrefix.length);
                let nsDef = new CustomNamespace({
                    urn: attr.value,
                    name: name,
                    style: styleInfo.style
                });
                coll.add(nsDef);
            });
        }
        clone() {
            let coll = new NamespaceCollection;
            forEach(this.items, nsDef => {
                coll.items.push(nsDef.clone());
            });
            return coll;
        }
        add(nsDef) {
            let coll = this;
            let matchingNS = find$1(coll.items, def => {
                if (lc(def.urn) === lc(nsDef.urn)) {
                    if (def.prefix !== nsDef.prefix) console.warn(`Attempted to add namespace with same urn as one already present: ${def.urn}`);
                    return true;
                }
                if (def.prefix === nsDef.prefix) {
                    if (lc(def.urn) !== lc(nsDef.urn)) console.warn(`Attempted to add namespace with same prefix as one already present: ${def.prefix}`);
                    return true;
                }
            });
            if (matchingNS) return;
            coll.items.push(nsDef);
        }
        lookupNamespace(urn) {
            let coll = this;
            urn = lc(urn);
            let nsDef = find$1(coll.items, def => lc(def.urn) === urn);
            return nsDef;
        }
        lookupPrefix(urn) {
            let coll = this;
            let nsDef = coll.lookupNamespace(urn);
            return nsDef && nsDef.prefix;
        }
        lookupNamespaceURI(prefix) {
            let coll = this;
            prefix = lc(prefix);
            let nsDef = find$1(coll.items, def => def.prefix === prefix);
            return nsDef && nsDef.urn;
        }
        lookupTagNameNS(name, urn) {
            let coll = this;
            let nsDef = coll.lookupNamespace(urn);
            if (!nsDef) return name;
            return nsDef.prefix + name;
        }
        lookupSelector(selector, urn) {
            let nsDef = this.lookupNamespace(urn);
            if (!nsDef) return selector;
            return nsDef.lookupSelector(selector);
        }
    }
    const HYPERFRAMESET_URN = "hyperframeset";
    /*!
	 * Microdata
	 * HTML Microdata parsing and querying
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    const nodeData = new WeakMap;
    function intersects(a1, a2) {
        return a1.some(i1 => a2.includes(i1));
    }
    function walkTree$1(root, skipRoot, callback) {
        let walker = document.createNodeIterator(root, 1, el => {
            if (skipRoot && el === root) return NodeFilter.FILTER_SKIP;
            return callback(el);
        });
        let el;
        while (el = walker.nextNode()) ;
    }
    const valueAttr = {};
    for (const text of "meta@content link@href a@href area@href img@src video@src audio@src source@src track@src iframe@src embed@src object@data time@datetime data@value meter@value".split(" ")) {
        let [tagName, attrName] = text.split("@");
        valueAttr[tagName] = attrName;
    }
    function createHTMLPropertiesCollection() {
        let list = [];
        list.names = [];
        list.nodeLists = {};
        list.namedItem = function(name) {
            return this.nodeLists[name];
        };
        list.addNamedItem = function(name, el) {
            this.push(el);
            if (!this.nodeLists[name]) {
                this.nodeLists[name] = [];
                this.names.push(name);
            }
            this.nodeLists[name].push(el);
        };
        return list;
    }
    function evaluate$1(el) {
        let tagName = el.tagName.toLowerCase();
        let attrName = valueAttr[tagName];
        if (attrName) return el[attrName] || el.getAttribute(attrName);
        return el;
    }
    function getPropDesc(el) {
        if (nodeData.has(el)) return nodeData.get(el);
        let prop = {
            name: el.getAttribute("itemprop"),
            value: evaluate$1(el)
        };
        nodeData.set(el, prop);
        return prop;
    }
    function getScopeDesc(scopeEl) {
        if (nodeData.has(scopeEl)) return nodeData.get(scopeEl);
        let scopeDesc = {
            element: scopeEl,
            isScope: true,
            type: scopeEl.nodeType === 1 ? (scopeEl.getAttribute("itemtype") || "").trim().split(/\s+/) : [],
            properties: createHTMLPropertiesCollection(),
            childScopes: []
        };
        walkTree$1(scopeEl, true, el => {
            let isScope = el.hasAttribute("itemscope");
            let propName = el.getAttribute("itemprop");
            if (!(isScope || propName)) return NodeFilter.FILTER_SKIP;
            if (isScope) getScopeDesc(el); else getPropDesc(el);
            if (propName) scopeDesc.properties.addNamedItem(propName, el); else scopeDesc.childScopes.push(el);
            return isScope ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
        });
        nodeData.set(scopeEl, scopeDesc);
        return scopeDesc;
    }
    function parse(rootNode) {
        if (!rootNode) rootNode = document;
        getScopeDesc(rootNode);
    }
    function getItems(rootNode, type) {
        if (!nodeData.has(rootNode)) parse(rootNode);
        let scope = nodeData.get(rootNode);
        let typeList = typeof type === "string" ? type.trim().split(/\s+/) : type && type.length ? type : [];
        let resultList = [];
        for (const propName of scope.properties.names) {
            let propList = scope.properties.namedItem(propName);
            for (const el of propList) {
                let desc = nodeData.get(el);
                if (desc && desc.isScope) resultList.push(...getItems(el, typeList));
            }
        }
        for (const el of scope.childScopes) {
            let desc = nodeData.get(el);
            if (!typeList.length || desc && intersects(desc.type, typeList)) resultList.push(el);
            resultList.push(...getItems(el, typeList));
        }
        return resultList;
    }
    function getProperties(el) {
        if (!nodeData.has(el)) return;
        let desc = nodeData.get(el);
        if (!desc.isScope) return;
        return desc.properties;
    }
    function getValue(el) {
        if (nodeData.has(el)) return nodeData.get(el).value;
        let desc = getPropDesc(el);
        return desc.value;
    }
    var Microdata = Object.freeze({
        __proto__: null,
        getItems: getItems,
        getProperties: getProperties,
        getValue: getValue
    });
    /*!
	 * HyperFrameset Processors
	 * Copyright 2014-2015 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    let processors = new Registry({
        writeOnce: true,
        keyValidator: key => typeof key === "string" && /^[_a-zA-Z][_a-zA-Z0-9]*/.test(key),
        valueValidator: constructor => typeof constructor === "function"
    });
    assign(processors, {
        create: function(type, options, namespaces) {
            let constructor = this.get(type);
            return new constructor(options, namespaces);
        }
    });
    /*!
	 * MainProcessor
	 * Copyright 2014-2016 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    class MainProcessor {
        constructor(options) {}
        loadTemplate(template) {
            if (/\S+/.test(template.textContent)) console.warn('"main" transforms do not use templates');
        }
        transform(provider, details) {
            let srcNode = provider.source;
            let srcDoc = srcNode.nodeType === 9 ? srcNode : srcNode.ownerDocument;
            let main;
            if (!main) main = find("main, [role=main]", srcNode);
            if (!main && srcNode === srcDoc) main = srcDoc.body;
            if (!main) main = srcNode;
            let frag = srcDoc.createDocumentFragment();
            let node;
            while (node = main.firstChild) frag.appendChild(node);
            return frag;
        }
    }
    /*!
	 * ScriptProcessor
	 * Copyright 2014-2016 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    class ScriptProcessor {
        constructor(options) {
            this.processor = options;
        }
        loadTemplate(template) {
            if (template.behavior && template.behavior.transform) {
                this.processor = template.behavior;
                return;
            }
            let script;
            forEach(Array.from(template.childNodes), node => {
                switch (node.nodeType) {
                  case 1:
                    switch (node.localName) {
                      case "script":
                        if (script) console.warn('Ignoring secondary <script> in "script" transform template'); else script = node;
                        return;

                      default:
                        console.warn('Ignoring unexpected non-<script> element in "script" transform template');
                        return;
                    }
                    break;

                  case 3:
                    if (/\S+/.test(node.nodeValue)) console.warn('"script" transforms should not have non-empty text-nodes');
                    return;

                  case 8:
                    return;

                  default:
                    console.warn('Unexpected node in "script" transform template');
                    return;
                }
            });
            if (!script) {
                if (this.processor) return;
                console.warn('No <script> or behavior found in "script" transform template');
                return;
            }
            try {
                this.processor = Function(`return (${script.text}\n)`)();
            } catch (err) {
                console.warn(`Error evaluating script transform: ${err.message}`);
            }
            if (!this.processor || !this.processor.transform) {
                console.warn('"script" transform template did not produce valid transform object');
                return;
            }
        }
        transform(provider, details) {
            let srcNode = provider.source;
            if (!this.processor || !this.processor.transform) {
                console.warn('"script" transform template did not produce valid transform object');
                return;
            }
            return this.processor.transform(srcNode, details);
        }
    }
    /*!
	 * Expressions
	 * Copyright 2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    const _cache$1 = new Map;
    const _scopeHandler = {
        has() {
            return true;
        },
        get(target, key) {
            if (key === Symbol.unscopables) return undefined;
            return target[key];
        }
    };
    function _wrapScope(scope) {
        return new Proxy(scope, _scopeHandler);
    }
    function compile(exprText) {
        if (_cache$1.has(exprText)) return _cache$1.get(exprText);
        let fn;
        try {
            let jsExpr = exprText;
            if (exprText.startsWith("${") && exprText.endsWith("}")) {
                jsExpr = exprText.slice(2, -1);
            }
            let body = new Function("__scope__", `with (__scope__) { return (${jsExpr}); }`);
            fn = scope => body(_wrapScope(scope));
        } catch (err) {
            console.warn(`Expression compilation failed: "${exprText}"`, err);
            fn = () => undefined;
        }
        _cache$1.set(exprText, fn);
        return fn;
    }
    function evaluate(exprText, scope) {
        let fn = compile(exprText);
        return fn(scope);
    }
    class Scope {
        constructor(initial) {
            this.globalParams = initial ? {
                ...initial
            } : {};
            this.globalVars = {};
            this.localParams = {};
            this.localVars = {};
            this._localParamsStack = [];
            this._localVarsStack = [];
            this._proxy = new Proxy(this, _scopeLookupHandler);
        }
        set(name, value, {param: param = false, global: global = false} = {}) {
            let target = global ? param ? this.globalParams : this.globalVars : param ? this.localParams : this.localVars;
            target[name] = value;
        }
        get(name) {
            if (name in this.localVars) return this.localVars[name];
            if (name in this.localParams) return this.localParams[name];
            if (name in this.globalVars) return this.globalVars[name];
            if (name in this.globalParams) return this.globalParams[name];
            return undefined;
        }
        has(name) {
            return name in this.localVars || name in this.localParams || name in this.globalVars || name in this.globalParams;
        }
        push(params) {
            this._localParamsStack.push(this.localParams);
            this._localVarsStack.push(this.localVars);
            this.localParams = params || {};
            this.localVars = {};
        }
        pop() {
            this.localParams = this._localParamsStack.pop();
            this.localVars = this._localVarsStack.pop();
        }
        get values() {
            return this._proxy;
        }
    }
    const _scopeLookupHandler = {
        has() {
            return true;
        },
        get(scope, key) {
            if (key === Symbol.unscopables) return undefined;
            return scope.get(key);
        }
    };
    /*!
	 * HazardProcessor
	 * Copyright 2014-2016 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    let document$2 = window.document;
    const HAZARD_TRANSFORM_URN = "HazardTransform";
    const hazDefaultNS = new CustomNamespace({
        urn: HAZARD_TRANSFORM_URN,
        name: "haz",
        style: "xml"
    });
    const _cache = new WeakMap;
    let hazLangDefinition = "<otherwise <when@$test <each@$select,as,index <one@$select,as +var@name,$select <if@$test <unless@$test " + '>choose <template@name,$match >eval@$select >text@"select ' + "call@name apply@$select,as";
    let hazLang = Array.from(words(hazLangDefinition), def => {
        def = def.split("@");
        let tag = def[0];
        let attrToElement = tag.charAt(0);
        switch (attrToElement) {
          default:
            attrToElement = false;
            break;

          case "<":
          case ">":
          case "+":
            break;
        }
        if (attrToElement) tag = tag.substr(1);
        let attrDefs = def[1];
        let attrs = [];
        let attrTypes = {};
        if (attrDefs && attrDefs !== "") {
            for (let a of attrDefs.split(",")) {
                let type = "bare";
                if (a.startsWith('"')) {
                    type = "string";
                    a = a.substring(1);
                } else if (a.startsWith("$")) {
                    type = "expr";
                    a = a.substring(1);
                }
                attrs.push(a);
                attrTypes[a] = type;
            }
        }
        return {
            tag: tag,
            attrToElement: attrToElement,
            attrs: attrs,
            attrTypes: attrTypes
        };
    });
    let hazLangLookup = {};
    forEach(hazLang, directive => {
        let tag = directive.tag;
        hazLangLookup[tag] = directive;
    });
    function walkTree(root, skipRoot, callback) {
        let walker = document$2.createNodeIterator(root, 1, acceptNode, null);
        let el;
        while (el = walker.nextNode()) callback(el);
        function acceptNode(el) {
            if (skipRoot && el === root) return NodeFilter.FILTER_SKIP;
            return NodeFilter.FILTER_ACCEPT;
        }
    }
    function childNodesToFragment(el) {
        let doc = el.ownerDocument;
        let frag = doc.createDocumentFragment();
        forEach(Array.from(el.childNodes), child => {
            frag.appendChild(child);
        });
        return frag;
    }
    function convertHtmlPrefix(el) {
        let doc = el.ownerDocument;
        if (el.localName.startsWith("html:")) {
            let newEl = doc.createElement(el.localName.substring(5));
            for (let attr of Array.from(el.attributes)) {
                newEl.setAttribute(attr.name, attr.value);
            }
            while (el.firstChild) newEl.appendChild(el.firstChild);
            el.parentNode.replaceChild(newEl, el);
            el = newEl;
        }
        for (let attr of Array.from(el.attributes)) {
            if (!attr.name.startsWith("html:")) continue;
            let targetName = attr.name.substring(5);
            if (el.hasAttribute(targetName)) {
                console.warn(`<${el.localName}> html:${targetName} overrides existing @${targetName}`);
            }
            el.removeAttribute(attr.name);
            el.setAttribute(targetName, attr.value);
        }
    }
    function promoteContentExpressions(el, hazPrefix) {
        if (el.localName.startsWith(hazPrefix)) return;
        if (el.childNodes.length !== 1) return;
        let child = el.firstChild;
        if (child.nodeType !== 3) return;
        let text = child.nodeValue.trim();
        if (!text) return;
        let doc = el.ownerDocument;
        if (text.startsWith("${")) {
            if (!text.endsWith("}")) {
                console.warn(`<${el.localName}> content starts with \${ but does not end with }: "${text}"`);
                return;
            }
            let expr = text.slice(2, -1);
            let directive = doc.createElement(hazPrefix + "eval");
            directive.setAttribute("select", expr);
            el.removeChild(child);
            el.appendChild(directive);
        } else if (text.startsWith("`")) {
            if (!text.endsWith("`")) {
                console.warn(`<${el.localName}> content starts with backtick but does not end with one: "${text}"`);
                return;
            }
            let directive = doc.createElement(hazPrefix + "text");
            directive.setAttribute("select", text);
            el.removeChild(child);
            el.appendChild(directive);
        }
    }
    function normalizeExprAttrs(el, hazPrefix) {
        if (!el.localName.startsWith(hazPrefix)) return;
        let tag = el.localName.substring(hazPrefix.length);
        let def = hazLangLookup[tag];
        if (!def) return;
        for (let attrName of def.attrs) {
            let value = el.getAttribute(attrName);
            if (!value) continue;
            let type = def.attrTypes[attrName];
            if (type === "bare") continue;
            if (value.startsWith("${") && value.endsWith("}")) {
                if (type === "expr") {
                    continue;
                }
                console.warn(`<${el.localName}> @${attrName} does not need \${} wrapper.`);
                value = value.slice(2, -1);
            }
            if (type === "expr") {
                if (!value.startsWith("${")) {
                    el.setAttribute(attrName, "${" + value + "}");
                }
            } else if (type === "string") {
                if (!value.startsWith("`")) {
                    el.setAttribute(attrName, "`${" + value + "}`");
                }
            }
        }
    }
    function promoteHazAttrs(el, hazPrefix) {
        if (el.localName.startsWith(hazPrefix)) return;
        forEach(hazLang, def => {
            if (!def.attrToElement) return;
            let nsTag = hazPrefix + def.tag;
            if (!el.hasAttribute(nsTag)) return;
            let doc = el.ownerDocument;
            let directiveEl = doc.createElement(nsTag);
            let defaultAttr = def.attrs[0];
            let value = el.getAttribute(nsTag);
            el.removeAttribute(nsTag);
            if (defaultAttr) directiveEl.setAttribute(defaultAttr, value);
            forEach(def.attrs, (attr, i) => {
                if (i === 0) return;
                let nsAttr = hazPrefix + attr;
                if (!el.hasAttribute(nsAttr)) return;
                let value = el.getAttribute(nsAttr);
                el.removeAttribute(nsAttr);
                directiveEl.setAttribute(attr, value);
            });
            switch (def.attrToElement) {
              case ">":
                let frag = childNodesToFragment(el);
                directiveEl.appendChild(frag);
                el.appendChild(directiveEl);
                break;

              case "<":
                el.parentNode.replaceChild(directiveEl, el);
                directiveEl.appendChild(el);
                break;

              case "+":
                el.parentNode.insertBefore(directiveEl, el);
                break;

              default:
                break;
            }
        });
    }
    function implyOtherwise(el, hazPrefix) {
        let otherwise = el.ownerDocument.createElement(hazPrefix + "otherwise");
        forEach(Array.from(el.childNodes), node => {
            let tag = node.localName;
            if (tag === hazPrefix + "when") return;
            otherwise.appendChild(node);
        });
        el.appendChild(otherwise);
    }
    class HazardProcessor {
        constructor(options, namespaces) {
            this.templates = [];
            this.namespaces = namespaces = namespaces.clone();
            if (!namespaces.lookupNamespace(HAZARD_TRANSFORM_URN)) namespaces.add(hazDefaultNS);
            this.#hazPrefix = namespaces.lookupPrefix(HAZARD_TRANSFORM_URN);
        }
        #hazPrefix;
        #getHazardTag(el) {
            if (!el.localName.startsWith(this.#hazPrefix)) return null;
            return el.localName.substring(this.#hazPrefix.length);
        }
        loadTemplate(template) {
            if (_cache.has(template)) {
                let cached = _cache.get(template);
                this.root = cached.root;
                this.templates = cached.templates;
                return;
            }
            this.root = template;
            this.templates = [];
            let hazPrefix = this.#hazPrefix;
            walkTree(template, true, el => convertHtmlPrefix(el));
            walkTree(template, true, el => promoteContentExpressions(el, hazPrefix));
            walkTree(template, true, el => promoteHazAttrs(el, hazPrefix));
            walkTree(template, true, el => normalizeExprAttrs(el, hazPrefix));
            walkTree(template, true, el => {
                let tag = el.localName;
                if (tag === hazPrefix + "template") this.#markTemplate(el);
                if (tag === hazPrefix + "choose") implyOtherwise(el, hazPrefix);
            });
            this.#implyEntryTemplate(template);
            _cache.set(template, {
                root: this.root,
                templates: this.templates
            });
        }
        #markTemplate(el) {
            this.templates.push(el);
        }
        #implyEntryTemplate(el) {
            let firstExplicitTemplate;
            let contentNodes = filter(el.childNodes, node => {
                if (node.nodeType === 3) return /\S/.test(node.nodeValue);
                if (node.nodeType !== 1) return false;
                let tag = node.localName;
                if (tag === this.#hazPrefix + "template") {
                    if (!firstExplicitTemplate) firstExplicitTemplate = node;
                    return false;
                }
                if (tag === this.#hazPrefix + "let") return false;
                if (tag === this.#hazPrefix + "param") return false;
                return true;
            });
            if (contentNodes.length <= 0) {
                if (firstExplicitTemplate) return;
                console.warn("This Hazard Template cannot generate any content.");
            }
            let entryTemplate = el.ownerDocument.createElement(this.#hazPrefix + "template");
            forEach(contentNodes, node => {
                entryTemplate.appendChild(node);
            });
            if (firstExplicitTemplate) el.insertBefore(entryTemplate, firstExplicitTemplate); else el.appendChild(entryTemplate);
            this.templates.unshift(entryTemplate);
        }
        getEntryTemplate() {
            return this.templates[0];
        }
        getNamedTemplate(name) {
            let processor = this;
            name = lc(name);
            return find$1(processor.templates, template => lc(template.getAttribute("name")) === name);
        }
        transform(provider, details) {
            let doc = this.root.ownerDocument;
            let frag = doc.createDocumentFragment();
            return this._transform(provider, details, frag).then(() => frag);
        }
        _transform(provider, details, frag) {
            this.scope = new Scope(details);
            this.scope.set("root", provider.source, {
                global: true
            });
            return this.transformChildNodes(this.root, frag).then(() => {
                let template = this.getEntryTemplate();
                return this.transformTemplate(template, null, frag);
            });
        }
        transformTemplate(template, params, frag) {
            this.scope.push(params);
            return this.transformChildNodes(template, frag).then(() => {
                this.scope.pop();
                return frag;
            });
        }
        transformChildNodes(srcNode, frag) {
            return Thenfu.reduce(null, srcNode.childNodes, (dummy, current) => this.transformNode(current, frag));
        }
        transformNode(srcNode, frag) {
            switch (srcNode.nodeType) {
              default:
                let node = srcNode.cloneNode(true);
                frag.appendChild(node);
                return;

              case 3:
                let textNode = srcNode.cloneNode(true);
                frag.appendChild(textNode);
                return;

              case 1:
                if (this.#getHazardTag(srcNode)) return this.transformHazardTree(srcNode, frag); else return this.transformTree(srcNode, frag);
            }
        }
        transformHazardTree(el, frag) {
            let doc = el.ownerDocument;
            let tag = this.#getHazardTag(el);
            let invertTest = false;
            switch (tag) {
              default:
                console.warn(`Unknown hazard element <${el.localName}> — processing children only`);
                return this.transformChildNodes(el, frag);

              case "template":
                return frag;

              case "var":
                {
                    let name = el.getAttribute("name");
                    let selectExpr = el.getAttribute("select");
                    let value;
                    if (selectExpr) {
                        try {
                            value = evaluate(selectExpr, this.scope.values);
                        } catch (err) {
                            console.warn(`Error evaluating <haz:var name="${name}" select="${selectExpr}">. Assumed undefined.`);
                        }
                    }
                    this.scope.set(name, value);
                    return frag;
                }

              case "param":
                {
                    let name = el.getAttribute("name");
                    let selectExpr = el.getAttribute("select");
                    let value;
                    if (selectExpr) {
                        try {
                            value = evaluate(selectExpr, this.scope.values);
                        } catch (err) {
                            console.warn(`Error evaluating <haz:param name="${name}" select="${selectExpr}">. Assumed undefined.`);
                        }
                    }
                    this.scope.set(name, value, {
                        param: true
                    });
                    return frag;
                }

              case "call":
                {
                    let name = el.getAttribute("name");
                    let template = this.getNamedTemplate(name);
                    if (!template) {
                        console.warn(`Hazard could not find template name="${name}"`);
                        return frag;
                    }
                    let params = {};
                    for (let child of el.children) {
                        if (this.#getHazardTag(child) === "param") {
                            let pName = child.getAttribute("name");
                            let pSelect = child.getAttribute("select");
                            if (pName && pSelect) {
                                try {
                                    params[pName] = evaluate(pSelect, this.scope.values);
                                } catch (err) {
                                    console.warn(`Error evaluating param "${pName}": ${pSelect}`);
                                }
                            }
                        }
                    }
                    return this.transformTemplate(template, params, frag);
                }

              case "apply":
                {
                    console.warn("<haz:apply> is not currently supported. Use haz:call with explicit template names.");
                    return frag;
                }

              case "eval":
                {
                    let selectExpr = el.getAttribute("select");
                    let value;
                    try {
                        value = evaluate(selectExpr, this.scope.values);
                    } catch (err) {
                        console.warn(`Error evaluating <haz:eval select="${selectExpr}">.`);
                        return this.transformChildNodes(el, frag);
                    }
                    if (value == null || value === false || value === undefined) {
                        return this.transformChildNodes(el, frag);
                    }
                    if (value.nodeType) {
                        frag.appendChild(value);
                    } else {
                        frag.appendChild(doc.createTextNode(String(value)));
                    }
                    return frag;
                }

              case "text":
                {
                    let selectExpr = el.getAttribute("select");
                    let value;
                    try {
                        value = evaluate(selectExpr, this.scope.values);
                    } catch (err) {
                        console.warn(`Error evaluating <haz:text select="${selectExpr}">.`);
                        return frag;
                    }
                    frag.appendChild(doc.createTextNode(String(value)));
                    return frag;
                }

              case "unless":
                invertTest = true;

              case "if":
                {
                    let testExpr = el.getAttribute("test");
                    let pass = false;
                    try {
                        pass = evaluate(testExpr, this.scope.values);
                    } catch (err) {
                        console.warn(`Error evaluating <haz:if test="${testExpr}">. Assumed false.`);
                    }
                    if (invertTest) pass = !pass;
                    if (!pass) return frag;
                    return this.transformChildNodes(el, frag);
                }

              case "choose":
                {
                    let otherwise;
                    let when;
                    let found = some(el.childNodes, child => {
                        if (child.nodeType !== 1) return false;
                        let childTag = this.#getHazardTag(child);
                        if (!childTag) return false;
                        if (childTag === "otherwise") {
                            if (!otherwise) otherwise = child;
                            return false;
                        }
                        if (childTag !== "when") return false;
                        let testExpr = child.getAttribute("test");
                        let pass = false;
                        try {
                            pass = evaluate(testExpr, this.scope.values);
                        } catch (err) {
                            console.warn(`Error evaluating <haz:when test="${testExpr}">. Assumed false.`);
                        }
                        if (!pass) return false;
                        when = child;
                        return true;
                    });
                    if (!found) when = otherwise;
                    if (!when) {
                        console.debug("<haz:choose> had no matching <haz:when> and no <haz:otherwise>");
                        return frag;
                    }
                    return this.transformChildNodes(when, frag);
                }

              case "one":
                {
                    let selectExpr = el.getAttribute("select");
                    let asName = el.getAttribute("as");
                    if (!asName) console.warn(`<haz:one select="${selectExpr}"> has no @as — selected value will be inaccessible.`);
                    let value;
                    try {
                        value = evaluate(selectExpr, this.scope.values);
                    } catch (err) {
                        console.warn(`Error evaluating <haz:one select="${selectExpr}">. Assumed empty.`);
                        return frag;
                    }
                    if (!value) {
                        console.debug(`<haz:one select="${selectExpr}"> resolved to nothing`);
                        return frag;
                    }
                    if (asName) this.scope.set(asName, value);
                    return this.transformChildNodes(el, frag);
                }

              case "each":
                {
                    let selectExpr = el.getAttribute("select");
                    let asName = el.getAttribute("as");
                    let indexName = el.getAttribute("index");
                    if (!asName) console.warn(`<haz:each select="${selectExpr}"> has no @as — iteration variable will be inaccessible.`);
                    let items;
                    try {
                        items = evaluate(selectExpr, this.scope.values);
                    } catch (err) {
                        console.warn(`Error evaluating <haz:each select="${selectExpr}">. Assumed empty.`);
                        return frag;
                    }
                    if (!items) {
                        console.debug(`<haz:each select="${selectExpr}"> resolved to nothing`);
                        return frag;
                    }
                    return Thenfu.reduce(null, items, (dummy, item, index) => {
                        if (asName) this.scope.set(asName, item);
                        if (indexName) this.scope.set(indexName, index);
                        return this.transformChildNodes(el, frag);
                    });
                }
            }
        }
        transformTree(srcNode, frag) {
            let node = this.transformSingleElement(srcNode);
            let nodeAsFrag = frag.appendChild(node);
            return this.transformChildNodes(srcNode, nodeAsFrag);
        }
        transformSingleElement(srcNode) {
            let el = srcNode.cloneNode(false);
            for (let attr of Array.from(srcNode.attributes)) {
                let name = attr.name;
                let value = attr.value;
                if (value.startsWith("`")) {
                    if (!value.endsWith("`")) {
                        console.warn(`<${srcNode.localName}> @${name} starts with backtick but does not end with one: "${value}"`);
                        continue;
                    }
                    el.removeAttribute(name);
                    try {
                        value = evaluate(value, this.scope.values);
                    } catch (err) {
                        console.warn(`Error evaluating attribute ${name}="${attr.value}".`);
                        continue;
                    }
                    setAttribute(el, name, value);
                } else if (value.startsWith("${")) {
                    if (!value.endsWith("}")) {
                        console.warn(`<${srcNode.localName}> @${name} starts with \${ but does not end with }: "${value}"`);
                        continue;
                    }
                    el.removeAttribute(name);
                    let expr = value.slice(2, -1);
                    try {
                        value = evaluate(expr, this.scope.values);
                    } catch (err) {
                        console.warn(`Error evaluating attribute ${name}="${attr.value}".`);
                        continue;
                    }
                    setAttribute(el, name, value);
                }
            }
            return el;
        }
    }
    function setAttribute(el, attrName, value) {
        let type = typeof value;
        if (type === "undefined" || type === "boolean" || value == null) {
            if (!value) el.removeAttribute(attrName); else el.setAttribute(attrName, "");
        } else {
            el.setAttribute(attrName, value.toString());
        }
    }
    /*!
	 * Builtin Processors
	 * Copyright 2016 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    processors.register("main", MainProcessor);
    processors.register("script", ScriptProcessor);
    processors.register("hazard", HazardProcessor);
    /*!
	 * HyperFrameset Layout Custom Elements
	 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    let zIndex = 1;
    class HBase extends HTMLElement {
        get options() {
            return this.behavior || {};
        }
    }
    class Layer extends HBase {
        connectedCallback() {
            this.style.zIndex = zIndex++;
        }
        static isLayer(element) {
            return element instanceof Layer;
        }
    }
    class Popup extends HBase {
        connectedCallback() {
            this.#connectController();
        }
        #connectController() {
            let name = this.getAttribute("name");
            let value = this.getAttribute("value");
            if (!name && !value) return;
            this.hidden = true;
            if (!name) return;
            controllers.listen(name, values => {
                this.hidden = !includes(values, value);
            });
        }
    }
    class Panel extends HBase {
        connectedCallback() {
            this.#adjustBox();
            this.#connectController();
        }
        #adjustBox() {
            let overflow = this.getAttribute("overflow");
            if (overflow) this.style.overflow = overflow;
            let height = this.getAttribute("height");
            if (height) this.style.height = height;
            let width = this.getAttribute("width");
            if (width) this.style.width = width;
            let minWidth = this.getAttribute("minwidth");
            if (minWidth) this.style.minWidth = minWidth;
        }
        #connectController() {
            let name = this.getAttribute("name");
            let value = this.getAttribute("value");
            if (!name && !value) return;
            this.hidden = true;
            if (!name) return;
            controllers.listen(name, values => {
                this.hidden = !includes(values, value);
            });
        }
        static isPanel(element) {
            return element instanceof Panel;
        }
    }
    class VLayout extends Panel {
        connectedCallback() {
            super.connectedCallback();
            this.#adjustLayout();
            queueMicrotask(() => this.#normalizeChildren());
        }
        #adjustLayout() {
            let parent = this.parentNode;
            if (parent instanceof Layer) {
                let height = this.getAttribute("height");
                if (!height) height = "100vh"; else height = height.replace("%", "vh");
                this.style.height = height;
                let width = this.getAttribute("width");
                if (!width) width = "100vw"; else width = width.replace("%", "vw");
                this.style.width = width;
            }
            let hAlign = this.getAttribute("align");
            if (hAlign) this.style.textAlign = hAlign;
        }
        #normalizeChildren() {
            forEach(Array.from(this.childNodes), normalizeChild, this);
        }
        static isLayout(element) {
            return element instanceof VLayout || element instanceof HLayout;
        }
    }
    class HLayout extends Panel {
        connectedCallback() {
            super.connectedCallback();
            this.#adjustLayout();
            queueMicrotask(() => this.#normalizeChildren());
        }
        #adjustLayout() {
            let parent = this.parentNode;
            if (parent instanceof Layer) {
                let height = this.getAttribute("height");
                if (!height) height = "100vh"; else height = height.replace("%", "vh");
                this.style.height = height;
                let width = this.getAttribute("width");
                if (!width) width = "100vw"; else width = width.replace("%", "vw");
                this.style.width = width;
            }
            let vAlign = this.getAttribute("align");
            if (vAlign) {
                for (let child of this.children) {
                    if (Panel.isPanel(child) || VLayout.isLayout(child)) {
                        child.style.verticalAlign = vAlign;
                    }
                }
            }
        }
        #normalizeChildren() {
            forEach(Array.from(this.childNodes), normalizeChild, this);
        }
    }
    class Deck extends Panel {
        connectedCallback() {
            super.connectedCallback();
            this.#normalizeChildren();
            this.#connectDeckController();
        }
        get owns() {
            return filter(Array.from(this.children), el => Panel.isPanel(el) || VLayout.isLayout(el));
        }
        set activedescendant(item) {
            let panels = this.owns;
            if (item && !includes(panels, item)) throw Error("set activedescendant failed: item is not child of deck");
            forEach(panels, child => {
                child.hidden = child !== item;
            });
        }
        #normalizeChildren() {
            forEach(Array.from(this.childNodes), normalizeChild, this);
        }
        #connectDeckController() {
            let name = this.getAttribute("name");
            if (!name) {
                this.activedescendant = this.owns[0];
                return;
            }
            controllers.listen(name, values => {
                let activePanel = find$1(this.owns, child => {
                    let value = child.getAttribute("value");
                    return includes(values, value);
                });
                if (activePanel) this.activedescendant = activePanel;
            });
        }
    }
    class ResponsiveDeck extends Deck {
        connectedCallback() {
            super.connectedCallback();
            this.#refresh();
        }
        #refresh() {
            let width = parseFloat(window.getComputedStyle(this).width);
            let panels = this.owns;
            let activePanel = find$1(panels, panel => {
                let minWidth = window.getComputedStyle(panel).minWidth;
                if (minWidth == null || minWidth === "" || minWidth === "0px") return true;
                minWidth = parseFloat(minWidth);
                if (minWidth > width) return false;
                return true;
            });
            if (activePanel) {
                activePanel.style.height = "100%";
                activePanel.style.width = "100%";
                this.activedescendant = activePanel;
            }
        }
    }
    class Splitter extends HBase {
        connectedCallback() {
            this.addEventListener("pointerdown", e => this.#startResize(e));
        }
        #startResize(startEvent) {
            startEvent.preventDefault();
            this.setPointerCapture(startEvent.pointerId);
            let prev = this.previousElementSibling;
            let next = this.nextElementSibling;
            if (!prev || !next) return;
            let parent = this.parentElement;
            let isVertical = parent instanceof VLayout;
            let startPos = isVertical ? startEvent.clientY : startEvent.clientX;
            let prevSize = isVertical ? prev.offsetHeight : prev.offsetWidth;
            let nextSize = isVertical ? next.offsetHeight : next.offsetWidth;
            let prevMin = parseFloat(prev.getAttribute("min-width") || prev.getAttribute("min-height") || "0");
            let prevMax = parseFloat(prev.getAttribute("max-width") || prev.getAttribute("max-height") || "Infinity");
            let nextMin = parseFloat(next.getAttribute("min-width") || next.getAttribute("min-height") || "0");
            let nextMax = parseFloat(next.getAttribute("max-width") || next.getAttribute("max-height") || "Infinity");
            let onMove = e => {
                let delta = (isVertical ? e.clientY : e.clientX) - startPos;
                let newPrev = prevSize + delta;
                let newNext = nextSize - delta;
                if (newPrev < prevMin) delta = prevMin - prevSize; else if (newPrev > prevMax) delta = prevMax - prevSize;
                if (newNext < nextMin) delta = nextSize - nextMin; else if (newNext > nextMax) delta = -(nextMax - nextSize);
                prev.style.flexBasis = prevSize + delta + "px";
                next.style.flexBasis = nextSize - delta + "px";
                prev.style.flexGrow = "0";
                next.style.flexGrow = "0";
            };
            let onUp = () => {
                this.removeEventListener("pointermove", onMove);
                this.removeEventListener("pointerup", onUp);
                this.releasePointerCapture(startEvent.pointerId);
            };
            this.addEventListener("pointermove", onMove);
            this.addEventListener("pointerup", onUp);
        }
        static isSplitter(element) {
            return element instanceof Splitter;
        }
    }
    function normalizeChild(node) {
        let element = this;
        switch (node.nodeType) {
          case 1:
            if (Panel.isPanel(node) || VLayout.isLayout(node) || Splitter.isSplitter(node)) return;
            node.hidden = true;
            return;

          case 3:
            if (/^\s*$/.test(node.nodeValue)) {
                element.removeChild(node);
                return;
            }
            let wbr = element.ownerDocument.createElement("wbr");
            wbr.hidden = true;
            element.replaceChild(wbr, node);
            wbr.appendChild(node);
            return;

          default:
            return;
        }
    }
    function registerLayoutElements(ns) {
        let boxSizingCSS = "box-sizing: border-box;";
        let layoutResetCSS = "display: block; width: 0; height: 0; text-align: left; margin: 0; padding: 0;";
        let layoutSizeCSS = "width: 100%; height: 100%;";
        let defs = [ [ "layer", Layer, `${boxSizingCSS} display: block; position: fixed; top: 0; left: 0; width: 0; height: 0;` ], [ "popup", Popup, `${boxSizingCSS} display: block; position: relative; width: 0; height: 0;`, "position: absolute; top: 0; left: 0;" ], [ "panel", Panel, `${boxSizingCSS} display: block; width: auto; height: auto; text-align: left; margin: 0; padding: 0;` ], [ "splitter", Splitter, `${boxSizingCSS} flex: 0 0 4px; background: #ccc; user-select: none; touch-action: none;` ], [ "vlayout", VLayout, `${boxSizingCSS} ${layoutResetCSS} ${layoutSizeCSS} display: flex; flex-direction: column; justify-content: flex-start; align-items: stretch;` ], [ "hlayout", HLayout, `${boxSizingCSS} ${layoutResetCSS} ${layoutSizeCSS} display: flex; flex-direction: row; justify-content: space-between; align-items: stretch;` ], [ "deck", Deck, `${boxSizingCSS} ${layoutResetCSS} ${layoutSizeCSS}`, "width: 100%; height: 100%;" ], [ "rdeck", ResponsiveDeck, `${boxSizingCSS} ${layoutResetCSS} ${layoutSizeCSS}`, "width: 0; height: 0;" ] ];
        let cssText = "*[hidden] { display: none !important; }\n";
        for (let [name, Cls, css, childCss] of defs) {
            let tagName = ns.lookupTagName(name);
            customElements.define(tagName, Cls);
            cssText += `${tagName} { ${css} }\n`;
            if (childCss) cssText += `${tagName} > * { ${childCss} }\n`;
        }
        cssText += `${ns.lookupTagName("body")} { ${boxSizingCSS} display: block; width: auto; height: auto; margin: 0; }\n`;
        let splitterTag = ns.lookupTagName("splitter");
        cssText += `${splitterTag}:hover { background: #999; }\n`;
        cssText += `${ns.lookupTagName("hlayout")} > ${splitterTag} { cursor: col-resize; }\n`;
        cssText += `${ns.lookupTagName("vlayout")} > ${splitterTag} { cursor: row-resize; }\n`;
        let style = document.createElement("style");
        style.textContent = cssText;
        document.head.append(style);
    }
    let layoutElements = {
        register: registerLayoutElements
    };
    var layoutElements$1 = Object.freeze({
        __proto__: null,
        Deck: Deck,
        HBase: HBase,
        HLayout: HLayout,
        Layer: Layer,
        Panel: Panel,
        Popup: Popup,
        ResponsiveDeck: ResponsiveDeck,
        Splitter: Splitter,
        VLayout: VLayout,
        default: layoutElements
    });
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
    function instance() {
        if (!behaviors) throw Error("behaviors has not been installed");
        return behaviors;
    }
    /*!
	 * transcluder
	 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    const DEF_ATTR$1 = "def";
    let definitionLookup;
    function setDefinitionLookup(fn) {
        definitionLookup = fn;
    }
    let _globals = {};
    function setGlobals(globals) {
        _globals = globals;
    }
    function registerElement(ns, name, Cls) {
        let tagName = ns.lookupTagName(name);
        customElements.define(tagName, Cls);
        let cssText = `${tagName} { box-sizing: border-box; display: block; width: auto; height: auto; text-align: left; margin: 0; padding: 0; }`;
        let style = document.createElement("style");
        style.textContent = cssText;
        document.head.append(style);
    }
    let transcluder = {
        registerElement: registerElement,
        setDefinitionLookup: setDefinitionLookup,
        setGlobals: setGlobals
    };
    class HTransclude extends Panel {
        static observedAttributes=[ "src" ];
        connectedCallback() {
            let def = this.getAttribute(DEF_ATTR$1);
            this.definition = definitionLookup(def);
            this.bodyElement = null;
            this.targetname = this.getAttribute("targetname");
            this.src = this.getAttribute("src");
            this.mainSelector = this.getAttribute("main");
            this._connected = true;
            console.debug("HTransclude connected:", this.targetname, "src:", this.src);
            this.refresh();
        }
        disconnectedCallback() {
            this._connected = false;
        }
        attributeChangedCallback(name, oldValue, newValue) {
            if (!this._connected) return;
            if (name === "src") {
                console.info(`[HyperFrameset] Frame "${this.targetname || "(unnamed)"}" src changed: "${oldValue}" → "${newValue}"`);
                this.refresh();
            }
        }
        get options() {
            return this.behavior;
        }
        preload(request) {
            return Thenfu.pipe(request, [ request => this.definition.render(request, "loading"), result => {
                if (result) return this.insert(result);
            } ]);
        }
        load(response) {
            if (response) this.src = response.url;
            let details = {
                mainSelector: this.mainSelector
            };
            Object.assign(details, _globals);
            let bodyBehavior = document.body.behavior;
            if (bodyBehavior && bodyBehavior.globals) Object.assign(details, bodyBehavior.globals);
            let options = this.options;
            if (options && options.globals) Object.assign(details, options.globals);
            return Thenfu.pipe(response, [ response => this.definition.render(response, "loaded", details), result => {
                if (result) return this.insert(result, this.hasAttribute("replace"));
            } ]);
        }
        insert(bodyElement, replace) {
            let options = this.options;
            if (this.bodyElement) {
                if (options && options.bodyLeft) {
                    try {
                        options.bodyLeft(this, this.bodyElement);
                    } catch (err) {
                        window.reportError(err);
                    }
                }
                this.bodyElement.remove();
            }
            if (replace) {
                let frag = adoptContents(bodyElement, this.ownerDocument);
                let parent = this.parentNode;
                let next = this.nextSibling;
                this.remove();
                if (next) parent.insertBefore(frag, next); else parent.appendChild(frag);
                return;
            }
            this.appendChild(bodyElement);
            this.bodyElement = bodyElement;
            if (options && options.bodyEntered) {
                try {
                    options.bodyEntered(this, this.bodyElement);
                } catch (err) {
                    window.reportError(err);
                }
            }
        }
        refresh() {
            let src = this.getAttribute("src");
            return Thenfu.asap().then(() => {
                if (src == null) {
                    return this.load(null);
                }
                if (src === "") return;
                let fullURL = URLux.create(src);
                let nohash = fullURL.supportsResolve ? fullURL.nohash : src;
                let request = {
                    method: "get",
                    url: nohash,
                    responseType: "document"
                };
                let response;
                return Thenfu.pipe(null, [ () => this.preload(request), () => resourceProxy.load(nohash, request), resp => {
                    response = resp;
                    if (response && response.status === 404) {
                        console.warn(`[HyperFrameset] Frame "${this.targetname || "(unnamed)"}" src returned 404: ${nohash}`);
                    } else if (!response || !response.body) {
                        console.warn(`[HyperFrameset] Frame "${this.targetname || "(unnamed)"}" src returned empty/null document: ${nohash}`);
                    }
                }, () => whenVisible(this), () => {
                    if (this.getAttribute("src") !== src) return;
                    return this.load(response);
                } ]);
            });
        }
        static isFrame(element) {
            return element instanceof HTransclude;
        }
    }
    /*!
	 * HTransformDefinition
	 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    class HTransformDefinition {
        constructor(el, framesetDef) {
            if (!el) return;
            this.framesetDefinition = framesetDef;
            this.init(el);
        }
        init(el) {
            defaults(this, {
                element: el,
                type: el.getAttribute("type") || "hazard"
            });
            let options = el.behavior;
            let processor = this.processor = processors.create(this.type, options, this.framesetDefinition.namespaces);
            processor.loadTemplate(el);
        }
        process(source, details) {
            let behavior = this.element.behavior;
            if (behavior && behavior.globals) {
                details = Object.assign({}, details, behavior.globals);
            }
            return this.processor.transform({
                source: source
            }, details);
        }
    }
    /*!
	 * HBodyDefinition
	 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    const conditions = words("uninitialized loading loaded error");
    const conditionAliases = {
        blank: "uninitialized",
        waiting: "loading",
        interactive: "loaded",
        complete: "loaded"
    };
    function normalizeCondition(condition) {
        condition = lc(condition);
        if (includes(conditions, condition)) return condition;
        return conditionAliases[condition];
    }
    class HBodyDefinition {
        static conditions=conditions;
        static conditionAliases=conditionAliases;
        constructor(el, framesetDef) {
            if (!el) return;
            this.framesetDefinition = framesetDef;
            this.init(el);
        }
        init(el) {
            let condition = el.getAttribute("condition");
            let finalCondition;
            if (condition) {
                finalCondition = normalizeCondition(condition);
                if (!finalCondition) {
                    finalCondition = condition;
                    console.warn(`Frame body defined with unknown condition: ${condition}`);
                }
            } else finalCondition = "loaded";
            defaults(this, {
                element: el,
                condition: finalCondition,
                transforms: []
            });
            forEach(Array.from(el.children), node => {
                if (node.localName === this.framesetDefinition.namespaces.lookupTagNameNS("transform", HYPERFRAMESET_URN)) {
                    this.transforms.push(new HTransformDefinition(node, this.framesetDefinition));
                }
            });
            if (!this.transforms.length && this.condition === "loaded") {
                console.warn("HBody definition for loaded content contains no HTransform definitions");
            }
        }
        render(resource, details) {
            if (this.transforms.length <= 0) {
                return this.element.cloneNode(true);
            }
            if (!resource) return null;
            let doc = resource.body;
            if (!doc) return null;
            let frag0 = doc;
            if (details.mainSelector) {
                frag0 = find(details.mainSelector, doc);
                if (frag0 == null) console.warn(`[HyperFrameset] Main selector "${details.mainSelector}" matched nothing in document. Content will be empty.`);
            }
            return Thenfu.reduce(frag0, this.transforms, (fragment, transform) => transform.process(fragment, details)).then(fragment => {
                let el = this.element.cloneNode(false);
                let htmlBody = find("body", fragment);
                if (htmlBody) fragment = adoptContents(htmlBody, el.ownerDocument);
                forEach(findAll("link[rel~=stylesheet], style", fragment), node => {
                    node.parentNode.removeChild(node);
                });
                insertNode("beforeend", el, fragment);
                return el;
            });
        }
    }
    /*!
	 * HFrameDefinition
	 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    const hfHeadTags = words("title meta link style script");
    class HFrameDefinition {
        constructor(el, framesetDef) {
            if (!el) return;
            this.framesetDefinition = framesetDef;
            this.init(el);
        }
        init(el) {
            defaults(this, {
                element: el,
                mainSelector: el.getAttribute("main")
            });
            this.bodies = [];
            forEach(Array.from(el.children), node => {
                let tag = node.localName;
                if (!tag) return;
                if (includes(hfHeadTags, tag)) return;
                if (tag === this.framesetDefinition.namespaces.lookupTagNameNS("body", HYPERFRAMESET_URN)) {
                    this.bodies.push(new HBodyDefinition(node, this.framesetDefinition));
                    return;
                }
                console.warn(`Unexpected element in HFrame: ${tag}`);
                return;
            });
        }
        render(resource, condition, details) {
            if (!details) details = {};
            defaults(details, {
                scope: this.framesetDefinition.scope,
                url: resource && resource.url,
                mainSelector: this.mainSelector
            });
            let bodyDef = find$1(this.bodies, body => body.condition === condition);
            if (!bodyDef) return;
            return bodyDef.render(resource, details);
        }
    }
    /*!
	 * HFramesetDefinition
	 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    const {rebase: rebase, rebaseURL: rebaseURL, normalizeScopedStyles: normalizeScopedStyles} = htmlParser;
    const DEFID_ATTR = "defid";
    const DEF_ATTR = "def";
    function isExecutableScript$1(script) {
        let type = script.type;
        if (!type) return true;
        if (/^text\/javascript/i.test(type)) return true;
        if (/^application\/javascript/i.test(type)) return true;
        if (type === "module") return true;
        return false;
    }
    const hfDefaultNamespace = new CustomNamespace({
        name: "hf",
        style: "vendor",
        urn: HYPERFRAMESET_URN
    });
    class HFramesetDefinition {
        url;
        scope;
        namespaces;
        document;
        element;
        frameContainer;
        constructor(doc, settings) {
            if (!doc) return;
            if (!settings?.behaviors) throw Error("HFramesetDefinition requires settings.behaviors");
            this.behaviors = settings.behaviors;
            if (settings.frameContainer) this.frameContainer = settings.frameContainer;
            defaults(this, {
                url: settings.framesetURL,
                scope: settings.scope
            });
            this.document = doc;
            this.element = doc.body;
            if (!this.frameContainer) this.frameContainer = doc.head;
            this.namespaces = this.#getNamespaces(doc);
            this.init(doc);
        }
        init(doc) {
            this.#rebaseURLs(doc);
            this.#normalizeScripts(doc);
            this.#normalizeStyles(doc);
        }
        #getNamespaces(doc) {
            let namespaces = CustomNamespace.getNamespaces(doc);
            if (!namespaces.lookupNamespace(HYPERFRAMESET_URN)) {
                namespaces.add(hfDefaultNamespace);
            }
            return namespaces;
        }
        #rebaseURLs(doc) {
            let scopeURL = URLux.create(this.scope);
            rebase(doc, scopeURL);
            let frameElts = findAll(this.namespaces.lookupSelector("frame", HYPERFRAMESET_URN), doc.body);
            forEach(frameElts, (el, index) => {
                let src = el.getAttribute("src");
                if (src) {
                    let newSrc = rebaseURL(src, scopeURL);
                    if (newSrc != src) el.setAttribute("src", newSrc);
                }
            });
        }
        #normalizeScripts(doc) {
            let idElements = findAll("*[id]:not(script)", doc.body);
            if (idElements.length) {
                let firstId = idElements[0].getAttribute("id");
                console.warn(`@id is strongly discouraged in frameset-documents (except on <<script>>).\n\t\t\tFound ${idElements.length}, first @id is ${firstId}`);
            }
            let scripts = findAll("script", doc);
            forEach(scripts, (script, i) => {
                if (!isExecutableScript$1(script)) return;
                if (script.hasAttribute("src")) return;
                if (script.hasAttribute("for")) return;
                this.#normalizeScript(script, i);
            });
            let firstChild = doc.body.firstChild;
            forEach(findAll("script[for]", doc.head), script => {
                doc.body.insertBefore(script, firstChild);
                script.setAttribute("for", "");
                console.info("Moved <script for> in frameset <head> to <body>");
            });
            forEach(findAll("script", doc.body), script => {
                if (!isExecutableScript$1(script)) return;
                if (script.hasAttribute("for")) return;
                if (!script.hasAttribute("src") && script.parentElement.localName.includes("-")) return;
                doc.head.appendChild(script);
                console.info("Moved <script> in frameset <body> to <head>");
            });
        }
        #normalizeScript(script, i) {
            let id = script.id;
            if (!id) id = script.id = `script[${i}]`;
            let sourceURL;
            if (script.hasAttribute("sourceurl")) sourceURL = script.getAttribute("sourceurl"); else {
                sourceURL = `${this.url}__${id}`;
                script.setAttribute("sourceurl", sourceURL);
            }
            script.text += `\n//# sourceURL=${sourceURL}`;
        }
        #normalizeStyles(doc) {
            let allowedScope = "panel, frame";
            let allowedScopeSelector = this.namespaces.lookupSelector(allowedScope, HYPERFRAMESET_URN);
            normalizeScopedStyles(doc, allowedScopeSelector);
        }
        process() {
            this.#processScripts();
            this.#processFrames();
        }
        #processScripts() {
            let body = this.element;
            let scripts = findAll("script", body);
            forEach(scripts, script => {
                if (!isExecutableScript$1(script)) return;
                if (script.hasAttribute("src")) {
                    console.warn("Frameset <body> may not contain external scripts: \n" + script.cloneNode(false).outerHTML);
                    script.type = "text/javascript?disabled";
                    return;
                }
                if (!script.hasAttribute("for")) {
                    console.warn("non-@for script in frameset <body> are disabled :\n" + this.url + "#" + script.id);
                    script.type = "behavior";
                    return;
                }
                if (script.getAttribute("for") !== "") {
                    console.warn('<script for="..."> with non-empty @for is not supported: \n' + script.cloneNode(false).outerHTML);
                    script.type = "text/javascript?disabled";
                    return;
                }
            });
            this.behaviors.processScripts(body);
        }
        #processFrames() {
            let body = this.element;
            let container = this.frameContainer;
            let frameElts = findAll(this.namespaces.lookupSelector("frame", HYPERFRAMESET_URN), body);
            let frameDefElts = [];
            let frameRefElts = [];
            forEach(frameElts, (el, index) => {
                let placeholder = el.cloneNode(false);
                el.parentNode.replaceChild(placeholder, el);
                let defId = el.getAttribute(DEFID_ATTR);
                let def = el.getAttribute(DEF_ATTR);
                if (def && def !== defId) {
                    frameRefElts.push(el);
                    return;
                }
                if (!defId) {
                    defId = "__frame_" + index + "__";
                    el.setAttribute(DEFID_ATTR, defId);
                }
                if (!def) {
                    def = defId;
                    placeholder.setAttribute(DEF_ATTR, def);
                }
                frameDefElts.push(el);
            });
            forEach(frameDefElts, el => {
                let tmpl = container.ownerDocument.createElement("template");
                tmpl.setAttribute(DEFID_ATTR, el.getAttribute(DEFID_ATTR));
                tmpl.content.appendChild(el);
                container.appendChild(tmpl);
            });
            forEach(frameRefElts, el => {
                let def = el.getAttribute(DEF_ATTR);
                let tmpl = find(`template[${DEFID_ATTR}="${def}"]`, container);
                let refEl = tmpl && tmpl.content.firstElementChild;
                if (!refEl) {
                    console.warn("Frame declaration references non-existant frame definition: " + def);
                    return;
                }
                if (!refEl.hasAttribute("scopeid")) return;
                let id = el.getAttribute("id");
                if (id) {
                    console.warn("Frame declaration references a frame definition with scoped-styles but these cannot be applied because the frame declaration has its own @id: " + id);
                    return;
                }
                id = refEl.getAttribute("id");
                let scopeId = refEl.getAttribute("scopeid");
                if (id !== scopeId) {
                    console.warn("Frame declaration references a frame definition with scoped-styles but these cannot be applied because the frame definition has its own @id: " + id);
                    return;
                }
                el.setAttribute("id", scopeId);
            });
        }
        getFrame(defId) {
            let tmpl = find(`template[${DEFID_ATTR}="${defId}"]`, this.frameContainer);
            if (!tmpl) return undefined;
            let el = tmpl.content.firstElementChild;
            if (!el) return undefined;
            return new HFrameDefinition(el, this);
        }
        render() {
            return this.element.cloneNode(true);
        }
    }
    /*!
	 * HyperFrameset definitions
	 * Copyright 2009-2016 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    var framesetDefinitions = Object.freeze({
        __proto__: null,
        HBodyDefinition: HBodyDefinition,
        HFrameDefinition: HFrameDefinition,
        HFramesetDefinition: HFramesetDefinition,
        HTransformDefinition: HTransformDefinition
    });
    /*!
	 * HistoryState
	 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    class HistoryState {
        static #STATE_TAG="HyperFrameset";
        constructor(settings) {
            if (!HistoryState.isValid(settings)) throw Error("Invalid settings for new HistoryState");
            this.settings = settings;
        }
        static isValid(settings) {
            return settings != null && settings[HistoryState.#STATE_TAG] === true;
        }
        static create(data, title, url) {
            let settings = {
                title: title,
                url: url,
                timeStamp: Date.now(),
                data: data
            };
            settings[HistoryState.#STATE_TAG] = true;
            return new HistoryState(settings);
        }
        getData() {
            return this.settings.data;
        }
    }
    /*!
	 * HyperFrameset framer
	 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    const FRAMESET_REL = "frameset";
    const SELF_REL = "self";
    let document$1 = window.document;
    function isExecutableScript(node) {
        if (node.localName !== "script") return false;
        return !node.type || /^text\/javascript/i.test(node.type) || node.type === "module";
    }
    function walkSiblings(inclusiveStart, callback, exclusiveEnd) {
        if (exclusiveEnd) console.assert(inclusiveStart.parentNode === exclusiveEnd.parentNode);
        let node = inclusiveStart;
        while (node && node !== exclusiveEnd) {
            let next = node.nextSibling;
            callback(node);
            node = next;
        }
    }
    class Framer {
        options={};
        frameset=null;
        started=false;
        framesetReady=Promise.withResolvers();
        scope=null;
        framesetURL=null;
        definition=null;
        currentChangeset=null;
        config(options) {
            if (!options) return;
            assign(this.options, options);
        }
        start(startOptions) {
            let framer = this;
            if (framer.started) throw Error("Already started");
            framer.started = true;
            framer.behaviors = install({
                globalName: "behaviors",
                attr: "_config",
                container: document$1.head,
                autoProcess: false
            });
            if (!startOptions || !startOptions.contentDocument) {
                console.info("No contentDocument passed to start(). Assuming landing-page is the frameset.");
                return framer.#startAsFrameset(startOptions);
            }
            Thenfu.asap(startOptions.contentDocument).then(doc => resourceProxy.add({
                url: document$1.URL,
                type: "document",
                body: doc
            }));
            return Thenfu.pipe(null, [ () => Thenfu.wait(() => !!document$1.body), () => {
                let framerConfig;
                framerConfig = framer.lookupFrameset(document$1.URL);
                if (framerConfig) return framerConfig;
                return startOptions.contentDocument.then(doc => framer.detectFrameset(doc));
            }, framerConfig => {
                if (!framerConfig) throw Error("No frameset could be determined for this page");
                framer.scope = framerConfig.scope;
                let framesetURL = URLux.create(framerConfig.framesetURL);
                if (framesetURL.hash) console.info(`Ignoring hash component of frameset URL: ${framesetURL.hash}`);
                framer.framesetURL = framerConfig.framesetURL = framesetURL.nohash;
                return resourceProxy.load(framer.framesetURL, {
                    responseType: "document"
                }).then(response => {
                    if (!response || !response.body) {
                        console.warn(`[HyperFrameset] Frameset document failed to load or is empty: ${framer.framesetURL}`);
                    }
                    return new HFramesetDefinition(response.body, {
                        ...framerConfig,
                        behaviors: framer.behaviors,
                        frameContainer: document$1.head
                    });
                });
            }, definition => Thenfu.pipe(definition, [ () => {
                framer.definition = definition;
                return Framer.#prepareFrameset(document$1, definition);
            }, () => definition.process(), () => Framer.#prerenderFrameset(document$1, definition) ]), () => framer.#activate() ]);
        }
        #startAsFrameset(startOptions) {
            let framer = this;
            let startURL = startOptions && startOptions.start_url;
            let framesetURL = URLux.create(document$1.URL);
            framer.framesetURL = framesetURL.nohash;
            framer.scope = Framer.#deriveScope(startOptions && startOptions.scope, startURL, framesetURL);
            let settings = {
                framesetURL: framer.framesetURL,
                scope: framer.scope,
                behaviors: framer.behaviors,
                frameContainer: document$1.head
            };
            let definition = new HFramesetDefinition(document$1, settings);
            framer.definition = definition;
            return Thenfu.pipe(null, [ () => Thenfu.wait(() => !!document$1.body), () => {
                if (startOptions && startOptions.hide) document$1.body.hidden = true;
            }, () => new Promise(resolve => {
                if (document$1.readyState !== "loading") resolve(); else document$1.addEventListener("DOMContentLoaded", resolve, {
                    once: true
                });
            }), () => {
                if (startURL) history.replaceState(null, "", startURL);
            }, () => definition.process(), () => Framer.#insertMarkers(document$1.URL, framer.framesetURL), () => framer.#activate(), () => {
                if (startOptions && startOptions.hide) document$1.body.hidden = false;
            } ]);
        }
        static #deriveScope(scope, startURL, framesetURL) {
            let resolvedStartURL = startURL ? URLux.create(framesetURL.resolve(startURL)).nohash : null;
            scope = scope || (resolvedStartURL ? URLux.create(resolvedStartURL).base : framesetURL.base);
            if (resolvedStartURL && resolvedStartURL.indexOf(scope) !== 0) {
                throw Error("start_url is not within scope: " + resolvedStartURL);
            }
            return scope;
        }
        #activate() {
            let framer = this;
            return Thenfu.pipe(null, [ () => {
                transcluder.setDefinitionLookup(def => framer.definition.getFrame(def));
                framer.#registerFramesetElement();
                let namespace = framer.definition.namespaces.lookupNamespace(HYPERFRAMESET_URN);
                layoutElements.register(namespace);
                transcluder.registerElement(namespace, "transclude", HTransclude);
                transcluder.registerElement(namespace, "frame", HFrame);
            }, () => {
                navigation.addEventListener("navigate", e => this.onNavigate(e));
                window.addEventListener("click", e => {
                    if (e.defaultPrevented) return;
                    let acceptDefault = framer.onClick(e);
                    if (acceptDefault === false) e.preventDefault();
                }, false);
            }, () => {
                let url = document$1.URL;
                if (url === this.framesetURL) return;
                this.currentChangeset = this.frameset.lookup(url, {
                    referrer: document$1.referrer
                });
                console.debug("framesetEntered: options.lookup returned", this.currentChangeset);
                if (!this.currentChangeset && this.options.lookupTarget) {
                    let target = this.options.lookupTarget(url);
                    if (target) this.currentChangeset = Framer.#inferChangeset(url, target);
                    console.debug("framesetEntered: config.lookupTarget returned", this.currentChangeset);
                }
                if (!this.currentChangeset && url.indexOf(this.scope) === 0) {
                    console.warn(`[HyperFrameset] No target found for URL "${url}" within scope "${this.scope}". Check your frameset lookup() function.`);
                }
            }, () => {
                let changeset = this.currentChangeset;
                if (changeset) {
                    console.debug("#activate: calling renderChangeset()", changeset);
                    navigation.updateCurrentEntry({
                        state: HistoryState.create(changeset, "", document$1.URL).settings
                    });
                    return this.#renderChangeset(document$1.URL, changeset, {
                        isFrameset: true,
                        firstLoad: true
                    });
                }
                console.debug("#activate: no changeset, skipping renderChangeset()");
            }, () => cssReady() ]);
        }
        onNavigate(e) {
            console.debug("navigate event:", e.navigationType, e.destination.url, "canIntercept:", e.canIntercept, "hashChange:", e.hashChange);
            if (!e.canIntercept) {
                console.debug("navigate: not interceptable, allowing default");
                return;
            }
            if (e.navigationType === "traverse") {
                let settings = e.destination.getState() ?? navigation.entries().find(entry => entry.key === e.destination.key)?.getState();
                if (!HistoryState.isValid(settings)) {
                    console.warn(`Traversal to ${e.destination.url} has no HyperFrameset state — allowing default navigation`);
                    return;
                }
                console.debug("navigate: intercepting traverse");
                e.intercept({
                    handler: async () => {
                        console.debug("traverse handler: running onPopState");
                        let state = new HistoryState(settings);
                        this.onPopState(state.getData());
                        console.debug("traverse handler: complete");
                    }
                });
            } else if (e.navigationType === "push" || e.navigationType === "replace") {
                if (e.formData) {
                    console.debug("navigate: form submission, allowing default");
                    return;
                }
                let sourceElement = e.sourceElement || e.info?.sourceElement || document$1.body;
                console.debug("navigate: dispatching requestnavigation to", sourceElement.localName || "body");
                let reqEvent = new NavigateEvent("requestnavigation", e);
                let handled = !sourceElement.dispatchEvent(reqEvent);
                console.debug("navigate: requestnavigation handled by frame?", handled);
                if (handled) {
                    console.debug("navigate: frame handled, calling preventDefault");
                    e.preventDefault();
                } else {
                    console.debug("navigate: calling onRequestNavigation on frameset");
                    let framesetHandled = !this.onRequestNavigation(e, this.frameset);
                    console.debug("navigate: framesetHandled =", framesetHandled);
                    if (framesetHandled) {
                        let changeset = this.currentChangeset;
                        console.debug("navigate: intercepting with changeset", changeset);
                        e.intercept({
                            handler: async () => {
                                console.debug("navigate intercept handler: saving state");
                                let state = HistoryState.create(changeset, "", e.destination.url);
                                navigation.updateCurrentEntry({
                                    state: state.settings
                                });
                                console.debug("navigate intercept handler: complete");
                            }
                        });
                    } else {
                        console.debug("navigate: frameset did not handle, allowing default navigation");
                    }
                }
            }
        }
        frameEntered(frame) {
            let targetName = frame.getAttribute("targetname");
            console.debug("frameEntered:", targetName, "currentChangeset:", this.currentChangeset);
            if (this.currentChangeset && targetName === this.currentChangeset.target) {
                frame.setAttribute("src", this.currentChangeset.url);
                console.debug("frameEntered: set src to", frame.getAttribute("src"));
            }
        }
        onClick(e) {
            if (e.defaultPrevented) return;
            if (e.button !== 0) return;
            if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
            let linkElement = closest(e.target, "[link]");
            if (!linkElement) return;
            let hyperlink = find("a, link", linkElement);
            if (!hyperlink) return;
            let href = hyperlink.getAttribute("href");
            if (!href) return;
            let baseURL = URLux.create(document$1.URL);
            let url = baseURL.resolve(href);
            Task.asap(() => navigation.navigate(url, {
                info: {
                    sourceElement: linkElement
                }
            }));
            return false;
        }
        onRequestNavigation(e, frame) {
            if (!frame) throw Error("Invalid frame / frameset in onRequestNavigation");
            let url = e.destination.url;
            let sourceElement = e.sourceElement || e.info?.sourceElement || e.target;
            let details = {
                url: url,
                element: sourceElement
            };
            let framer = this;
            if (!frame.isFrameset) {
                if (framer.requestNavigation(frame, url, details)) return false;
                return;
            }
            let baseURL = URLux.create(document$1.URL);
            let oURL = URLux.create(url);
            if (oURL.origin !== baseURL.origin) return;
            let isPageLink = oURL.nohash === baseURL.nohash;
            if (isPageLink) {
                framer.onPageLink(url, details);
                return false;
            }
            let frameset = frame;
            let framesetScope = framer.lookupFrameset(url);
            if (!framesetScope || !framer.compareFramesetScope(framesetScope)) return;
            if (framer.requestNavigation(frameset, url, details)) return false;
        }
        requestNavigation(frame, url, details) {
            let changeset = frame.lookup(url, details);
            if (changeset === "" || changeset === true) return true;
            if (changeset == null || changeset === false) return false;
            this.currentChangeset = changeset;
            this.#renderChangeset(url, changeset, {
                isFrameset: frame.isFrameset
            });
            return true;
        }
        onPageLink(url, details) {
            console.warn("Ignoring on-same-page links for now.");
        }
        navigate(url, changeset, useReplace) {
            return navigation.navigate(url, {
                history: !!useReplace ? "replace" : "push",
                state: HistoryState.create(changeset, "", url)
            });
        }
        #renderChangeset(url, changeset, options) {
            let {isFrameset: isFrameset = false, firstLoad: firstLoad = false} = options || {};
            let target = changeset.target;
            let frames = document$1.body.querySelectorAll(`[targetname="${target}"]`);
            frames = Array.from(frames).filter(el => el instanceof HFrame);
            let fullURL = URLux.create(url);
            let hash = fullURL.hash;
            let nohash = fullURL.nohash;
            let request = {
                method: "get",
                url: nohash,
                responseType: "document"
            };
            let response;
            return Thenfu.pipe(null, [ () => {
                if (isFrameset && !firstLoad) return Framer.#notify({
                    module: "frameset",
                    type: "leftState",
                    stage: "before",
                    url: document$1.URL
                });
            }, () => resourceProxy.load(nohash, request).then(resp => {
                response = resp;
            }), () => {
                forEach(frames, frame => {
                    frame.setAttribute("src", fullURL);
                });
            }, () => {
                if (!isFrameset) return;
                Framer.#separateHead(document$1, false);
                let selfMarker = Framer.#getSelfMarker();
                if (selfMarker) selfMarker.href = url;
                if (response?.body?.head) Framer.#mergeHead(document$1, response.body.head, false);
            }, () => {
                if (isFrameset) return Framer.#notify({
                    module: "frameset",
                    type: "enteredState",
                    stage: "after",
                    url: url
                });
            } ]);
        }
        onPopState(changeset) {
            let url = changeset.url;
            if (url !== document$1.URL) {
                console.warn("Popped state URL does not match address-bar URL.");
            }
            this.#renderChangeset(url, changeset, {
                isFrameset: true
            });
        }
        lookupFrameset(docURL) {
            if (!this.options.lookupFrameset) {
                if (docURL.indexOf(this.scope) === 0) return {
                    scope: this.scope,
                    framesetURL: this.framesetURL
                };
                return false;
            }
            let result = this.options.lookupFrameset(docURL);
            if (result == null || result === false) return false;
            if (typeof result === "string") result = Framer.#implyFramesetScope(result, docURL);
            if (typeof result !== "object" || !result.scope || !result.framesetURL) throw Error("Unexpected result from frameset lookup");
            return result;
        }
        detectFrameset(srcDoc) {
            if (!this.options.detectFrameset) return;
            let result = this.options.detectFrameset(srcDoc);
            if (result == null || result === false) return false;
            if (typeof result === "string") result = Framer.#implyFramesetScope(result, document$1.URL);
            if (typeof result !== "object" || !result.scope || !result.framesetURL) throw Error("Unexpected result from frameset detect");
            return result;
        }
        compareFramesetScope(settings) {
            if (this.framesetURL !== settings.framesetURL) return false;
            if (this.scope !== settings.scope) return false;
            return true;
        }
        inferChangeset(url, partial) {
            return Framer.#inferChangeset(url, partial);
        }
        static #encode(form) {
            let data = [];
            forEach(form.elements, el => {
                if (!el.name) return;
                data.push(el.name + "=" + encodeURIComponent(el.value));
            });
            return data.join("&");
        }
        static #prepareFrameset(dstDoc, definition) {
            if (Framer.#getFramesetMarker(dstDoc)) throw Error("The HFrameset has already been applied");
            let srcDoc = cloneDocument(definition.document);
            return Thenfu.pipe(null, [ () => {
                let dstHead = dstDoc.head;
                forEach(findAll("link[rel|=stylesheet]", dstHead), node => {
                    dstHead.removeChild(node);
                });
            }, () => {
                let dstBody = dstDoc.body;
                let node;
                while (node = dstBody.firstChild) dstBody.removeChild(node);
            }, () => Framer.#insertMarkers(dstDoc.URL, definition.src), () => {
                Framer.#mergeElement(dstDoc.documentElement, srcDoc.documentElement);
                Framer.#mergeElement(dstDoc.head, srcDoc.head);
                Framer.#mergeHead(dstDoc, srcDoc.head, true);
                forEach(findAll("script", dstDoc.head), script => {
                    scriptQueue.push(script);
                });
                return scriptQueue.empty();
            } ]);
        }
        static #prerenderFrameset(dstDoc, definition) {
            let srcBody = definition.element;
            let dstBody = dstDoc.body;
            Framer.#mergeElement(dstBody, srcBody);
        }
        static #separateHead(dstDoc, isFrameset) {
            let framesetMarker = Framer.#getFramesetMarker(dstDoc);
            if (!framesetMarker) throw Error(`No ${FRAMESET_REL} marker found. `);
            let selfMarker = Framer.#getSelfMarker(dstDoc);
            if (isFrameset) Framer.#removeBetween(framesetMarker); else Framer.#removeBetween(selfMarker, framesetMarker);
        }
        static #removeBetween(exclusiveStart, exclusiveEnd) {
            walkSiblings(exclusiveStart.nextSibling, node => {
                if (!isExecutableScript(node)) node.remove();
            }, exclusiveEnd);
        }
        static #mergeHead(dstDoc, srcHead, isFrameset) {
            let baseURL = URLux.create(dstDoc.URL);
            let dstHead = dstDoc.head;
            let framesetMarker = Framer.#getFramesetMarker();
            if (!framesetMarker) throw Error(`No ${FRAMESET_REL} marker found. `);
            let selfMarker = Framer.#getSelfMarker();
            Framer.#separateHead(dstDoc, isFrameset);
            forEach(Array.from(srcHead.childNodes), srcNode => {
                if (srcNode.nodeType !== 1) return;
                switch (srcNode.localName) {
                  default:
                    break;

                  case "title":
                    if (!srcNode.innerHTML) return;
                    break;

                  case "link":
                    if (/\bframeset\b/i.test(srcNode.rel)) return;
                    if (/\bself\b/i.test(srcNode.rel)) return;
                    if (!isFrameset && /\bstylesheet\b/i.test(srcNode.rel)) return;
                    break;

                  case "meta":
                    if (srcNode.httpEquiv) return;
                    break;

                  case "style":
                    if (!isFrameset) return;
                    break;

                  case "script":
                    if (!isFrameset) return;
                    if (!srcNode.type || /^text\/javascript$/i.test(srcNode.type)) srcNode.type = "text/javascript?disabled";
                    break;
                }
                if (isFrameset) dstHead.append(srcNode); else framesetMarker.before(srcNode);
                if (srcNode.localName === "link") srcNode.href = srcNode.getAttribute("href");
            });
        }
        static #mergeElement(dst, src) {
            if (dst === src) return;
            removeAttributes(dst);
            copyAttributes(dst, src);
            dst.removeAttribute("style");
        }
        static #getFramesetMarker(doc) {
            if (!doc) doc = document$1;
            return find(`link[rel~=${FRAMESET_REL}]`, doc.head);
        }
        static #getSelfMarker(doc) {
            if (!doc) doc = document$1;
            return find(`link[rel~=${SELF_REL}]`, doc.head);
        }
        static #insertMarkers(selfURL, framesetURL) {
            let head = document$1.head;
            let framesetMarker = document$1.createElement("link");
            framesetMarker.rel = FRAMESET_REL;
            framesetMarker.href = framesetURL;
            let selfMarker = Framer.#getSelfMarker();
            if (!selfMarker) {
                selfMarker = document$1.createElement("link");
                selfMarker.rel = SELF_REL;
                selfMarker.href = selfURL;
                head.prepend(selfMarker);
            }
            head.append(framesetMarker);
            walkSiblings(selfMarker.nextSibling, node => {
                if (isExecutableScript(node)) head.insertBefore(node, selfMarker);
            }, framesetMarker);
        }
        static #implyFramesetScope(framesetSrc, docSrc) {
            let docURL = URLux.create(docSrc);
            let docSiteURL = URLux.create(docURL.origin);
            framesetSrc = docSiteURL.resolve(framesetSrc);
            let scope = Framer.#implyScope(framesetSrc, docSrc);
            return {
                scope: scope,
                framesetURL: framesetSrc
            };
        }
        static #implyScope(framesetSrc, docSrc) {
            let docURL = URLux.create(docSrc);
            let framesetURL = URLux.create(framesetSrc);
            let scope = docURL.base;
            let framesetBase = framesetURL.base;
            if (scope.indexOf(framesetBase) >= 0) scope = framesetBase;
            return scope;
        }
        static #inferChangeset(url, partial) {
            let inferred = {
                url: url
            };
            switch (typeof partial) {
              case "string":
                inferred.target = partial;
                break;

              default:
                throw Error("Invalid changeset returned from lookup()");
            }
            return inferred;
        }
        static #notify(msg) {
            let module;
            switch (msg.module) {
              case "frameset":
                module = framer.frameset.behavior;
                break;

              default:
                return Thenfu.asap();
            }
            let handler = module[msg.type];
            if (!handler) return Thenfu.asap();
            let listener;
            if (handler[msg.stage]) listener = handler[msg.stage]; else switch (msg.module) {
              case "frame":
                listener = msg.type == "bodyLeft" ? msg.stage == "before" ? handler : null : msg.type == "bodyEntered" ? msg.stage == "after" ? handler : null : null;
                break;

              case "frameset":
                listener = msg.type == "leftState" ? msg.stage == "before" ? handler : null : msg.type == "enteredState" ? msg.stage == "after" ? handler : null : null;
                break;

              default:
                throw Error(msg.module + " is invalid module");
            }
            if (typeof listener == "function") {
                let promise = Thenfu.defer(() => {
                    listener(msg);
                });
                promise["catch"](err => {
                    throw Error(err);
                });
                return promise;
            }
            return Thenfu.asap();
        }
        #registerFramesetElement() {
            let cssText = [ "html, body { margin: 0; padding: 0; }", "html { width: 100%; height: 100%; }" ];
            let style = document$1.createElement("style");
            style.textContent = cssText.join("\n");
            document$1.head.append(style);
            let element = document$1.body;
            this.frameset = new HFrameset(element);
            this.frameset.render();
        }
    }
    let framer = new Framer;
    class HFrameset {
        constructor(body) {
            this.element = body;
            this.behavior = this.element.behavior;
            this.isFrameset = true;
            this.definition = framer.definition;
        }
        lookup(url, details) {
            let partial = this.element.behavior.lookup(url, details);
            if (partial === "" || partial === true) return true;
            if (partial == null || partial === false) return false;
            return framer.inferChangeset(url, partial);
        }
        render() {
            let definition = this.definition;
            let dstBody = this.element;
            if (definition.element === dstBody) return;
            let srcBody = definition.render();
            return Thenfu.pipe(null, [ function() {
                forEach(Array.from(srcBody.childNodes), function(node) {
                    dstBody.appendChild(node);
                });
            } ]);
        }
    }
    class HFrame extends HTransclude {
        connectedCallback() {
            this.addEventListener("requestnavigation", e => {
                if (e.defaultPrevented) return;
                if (this.behavior.lookup) {
                    let acceptDefault = framer.onRequestNavigation(e, this);
                    if (acceptDefault === false) e.preventDefault();
                }
            });
            framer.frameEntered(this);
            super.connectedCallback();
        }
        disconnectedCallback() {
            super.disconnectedCallback();
        }
        lookup(url, details) {
            let element = this;
            if (!element.behavior.lookup) return false;
            let partial = element.behavior.lookup(url, details);
            if (partial === "" || partial === true) return true;
            if (partial == null || partial === false) return false;
            return framer.inferChangeset(url, partial);
        }
        static isFrame(element) {
            return HTransclude.isFrame(element);
        }
    }
    /*!
	 * HyperFrameset
	 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    (function() {
        let stuff = assign({}, _);
        stuff.dateFormat = dateFormat;
        if (!this.Meeko) this.Meeko = {};
        assign(this.Meeko, {
            stuff: stuff,
            Registry: Registry,
            Task: Task,
            Thenfu: Thenfu,
            URLux: URLux,
            DOM: DOM,
            scriptQueue: scriptQueue,
            htmlParser: htmlParser,
            resourceProxy: resourceProxy,
            CustomNamespace: CustomNamespace,
            processors: processors,
            controllers: controllers,
            Microdata: Microdata,
            transcluder: transcluder,
            framer: framer,
            MainProcessor: MainProcessor,
            ScriptProcessor: ScriptProcessor,
            HazardProcessor: HazardProcessor,
            HFrame: HFrame,
            HFrameset: HFrameset
        });
        assign(this.Meeko, layoutElements$1);
        assign(this.Meeko, framesetDefinitions);
    }).call(window);
})();
//# sourceMappingURL=HyperFrameset.js.map
