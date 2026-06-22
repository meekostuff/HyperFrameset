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
    function find$2(a, fn, context) {
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
        find: find$2,
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
	 */    const document$7 = window.document;
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
            this.supported = attrName in document$7.createElement(tagName);
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
    let document$6 = window.document;
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
    function matches$1(element, selector, scope) {
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
        if (!doc) doc = document$6;
        if (!doc.getElementById) throw Error("Context for findId() must be a Document node");
        return doc.getElementById(id);
    }
    function findAll(selector, node, scope, inclusive) {
        if (!node) node = document$6;
        if (!node.querySelectorAll) return [];
        if (scope && !scope.nodeType) scope = node;
        return scopeify(absSelector => {
            let result = Array.from(node.querySelectorAll(absSelector));
            if (inclusive && node.nodeType === 1 && node.matches(absSelector)) result.unshift(node);
            return result;
        }, selector, scope);
    }
    function find$1(selector, node, scope, inclusive) {
        if (!node) node = document$6;
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
            observer.observe(document$6, {
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
        if (!doc) doc = document$6;
        let frag = doc.createDocumentFragment();
        let node;
        while (node = parentNode.firstChild) frag.appendChild(doc.adoptNode(node));
        return frag;
    }
    function cssReady() {
        let links = document$6.querySelectorAll('link[rel="stylesheet"]');
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
        if (!srcDoc) srcDoc = document$6;
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
        find: find$1,
        findAll: findAll,
        findId: findId,
        insertNode: insertNode,
        isVisible: isVisible,
        matches: matches$1,
        removeAttributes: removeAttributes,
        whenVisible: whenVisible
    });
    /*!
	 * scriptQueue
	 * Copyright 2009-2016 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    let document$5 = window.document;
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
                let script = document$5.createElement("script");
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
    const HTML_IN_XHR = true;
    class HttpProxy {
        #methods=words("get");
        #responseTypes=words("document");
        #defaultInfo={
            method: "get",
            responseType: "document"
        };
        #cache=[];
        #cacheAdd(request, response) {
            const rq = defaults({}, request);
            const entry = {
                invalid: false,
                request: rq
            };
            if (Thenfu.isThenable(response)) entry.response = response.then(this.#cloneResponse, status => {
                entry.invalid = true;
                entry.response = null;
            }); else entry.response = this.#cloneResponse(response);
            this.#cache.push(entry);
        }
        #cacheLookup(request) {
            const entry = find$2(this.#cache, entry => {
                if (!this.#cacheMatch(request, entry)) return false;
                return true;
            });
            if (!(entry && entry.response)) return;
            const response = entry.response;
            if (Thenfu.isThenable(response)) return response.then(this.#cloneResponse); else return this.#cloneResponse(response);
        }
        #cacheMatch(request, entry) {
            if (entry.invalid || entry.response == null) return false;
            if (request.url !== entry.request.url) return false;
            return true;
        }
        #cloneResponse(response) {
            const resp = defaults({}, response);
            resp.document = cloneDocument(response.document);
            return resp;
        }
        add(response) {
            const url = response.url;
            if (!url) throw Error("Invalid url in response object");
            if (!includes(this.#responseTypes, response.type)) throw Error("Invalid type in response object");
            const request = {
                url: response.url
            };
            defaults(request, this.#defaultInfo);
            return Thenfu.pipe(undefined, [ () => htmlParser.normalize(response.document, request), doc => {
                response.document = doc;
                this.#cacheAdd(request, response);
            } ]);
        }
        load(url, requestInfo) {
            const info = {
                url: url
            };
            if (requestInfo) defaults(info, requestInfo);
            defaults(info, this.#defaultInfo);
            if (!includes(this.#methods, info.method)) throw Error(`method not supported: ${info.method}`);
            if (!includes(this.#responseTypes, info.responseType)) throw Error(`responseType not supported: ${info.responseType}`);
            return this.#request(info);
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
                let METHOD = uc(method);
                throw Error(`${METHOD} not supported`);
            }
        }
        #doRequest(info) {
            return new Promise((resolve, reject) => {
                const method = info.method;
                const url = info.url;
                const sendText = info.body;
                const xhr = new XMLHttpRequest;
                xhr.onreadystatechange = onchange;
                xhr.open(method, url, true);
                if (HTML_IN_XHR) {
                    xhr.responseType = info.responseType;
                    if (info.responseType === "document" && xhr.overrideMimeType) xhr.overrideMimeType("text/html");
                }
                xhr.send(sendText);
                function onchange() {
                    if (xhr.readyState != 4) return;
                    const protocol = URLux.create(url).protocol;
                    switch (protocol) {
                      case "http:":
                      case "https:":
                        switch (xhr.status) {
                          default:
                            reject(() => {
                                throw Error(`Unexpected status ${xhr.status} for ${url}`);
                            });
                            return;

                          case 200:
                            break;
                        }
                        break;

                      default:
                        if (HTML_IN_XHR ? !xhr.response : !xhr.responseText) {
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
            if (HTML_IN_XHR) {
                return htmlParser.normalize(xhr.response, info).then(doc => {
                    response.document = doc;
                    return response;
                });
            } else {
                return htmlParser.parse(String(xhr.responseText), info).then(doc => {
                    response.document = doc;
                    return response;
                });
            }
        }
    }
    var httpProxy = new HttpProxy;
    /*!
	 * CustomNamespace
	 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    class CustomNamespace {
        constructor(options) {
            if (!options) return;
            let style = options.style = lc(options.style);
            let styleInfo = find$2(CustomNamespace.namespaceStyles, styleInfo => styleInfo.style === style);
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
                let styleInfo = find$2(CustomNamespace.namespaceStyles, styleInfo => fullName.indexOf(styleInfo.configPrefix) === 0);
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
            let matchingNS = find$2(coll.items, def => {
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
            let nsDef = find$2(coll.items, def => lc(def.urn) === urn);
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
            let nsDef = find$2(coll.items, def => def.prefix === prefix);
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
	 * filters
	 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    let filters = new Registry({
        writeOnce: true,
        keyValidator: key => /^[_a-zA-Z][_a-zA-Z0-9]*$/.test(key),
        valueValidator: fn => typeof fn === "function"
    });
    assign(filters, {
        evaluate: function(name, value, params) {
            let fn = this.get(name);
            let args = params.slice(0);
            args.unshift(value);
            return fn.apply(undefined, args);
        }
    });
    /*!
	 * builtin-filters
	 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    filters.register("lowercase", (value, text) => value.toLowerCase());
    filters.register("uppercase", (value, text) => value.toUpperCase());
    filters.register("if", (value, yep) => !!value ? yep : value);
    filters.register("unless", (value, nope) => !value ? nope : value);
    filters.register("if_unless", (value, yep, nope) => !!value ? yep : nope);
    filters.register("map", (value, dict) => {
        if (Array.isArray(dict)) {
            let patterns = filter(dict, (item, i) => !(i % 2));
            let results = filter(dict, (item, i) => !!(i % 2));
            some(patterns, (pattern, i) => {
                if (!(pattern instanceof RegExp)) pattern = new RegExp(`^${pattern}$`);
                if (!pattern.test(value)) return false;
                value = results[i];
                return true;
            });
            return value;
        }
        if (value in dict) return dict[value];
        return value;
    });
    filters.register("match", (value, pattern, yep, nope) => {
        if (!(pattern instanceof RegExp)) pattern = new RegExp(`^${pattern}$`);
        let bMatch = pattern.test(value);
        if (yep != null && bMatch) return yep;
        if (nope != null && !bMatch) return nope;
        return bMatch;
    });
    filters.register("replace", (value, pattern, text) => value.replace(pattern, text));
    filters.register("date", (value, format, utc) => dateFormat(value, format, utc));
    /*!
	 * decoders
	 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    let decoders = new Registry({
        writeOnce: true,
        keyValidator: key => typeof key === "string" && /^[_a-zA-Z][_a-zA-Z0-9]*/.test(key),
        valueValidator: constructor => typeof constructor === "function"
    });
    assign(decoders, {
        create: function(type, options, namespaces) {
            let constructor = this.get(type);
            return new constructor(options, namespaces);
        }
    });
    /*!
	 * CSSDecoder
	 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    const textAttr$1 = "_text";
    const htmlAttr$1 = "_html";
    const CSS_CONTEXT_VARIABLE = "_";
    class CSSDecoder {
        constructor(options, namespaces) {}
        init(node) {
            this.srcNode = node;
        }
        matches(element, query) {
            let queryParts = query.match(/^\s*([^{]*)\s*(?:\{\s*([^}]*)\s*\}\s*)?$/);
            let selector = queryParts[1];
            let attr = queryParts[2];
            if (!matches(element, selector)) return;
            let node = element;
            let result = node;
            if (attr) {
                attr = attr.trim();
                if (attr.charAt(0) === "@") attr = attr.substr(1);
                result = getAttr(node, attr);
            }
            return result;
            function getAttr(node, attr) {
                switch (attr) {
                  case null:
                  case undefined:
                  case "":
                    return node;

                  case textAttr$1:
                    return node.textContent;

                  case htmlAttr$1:
                    let frag = doc.createDocumentFragment();
                    forEach(node.childNodes, child => {
                        frag.appendChild(doc.importNode(child, true));
                    });
                    return frag;

                  default:
                    return node.getAttribute(attr);
                }
            }
        }
        evaluate(query, context, variables, wantArray) {
            if (!context) context = this.srcNode;
            let doc = context.nodeType === 9 ? context : context.ownerDocument;
            let queryParts = query.match(/^\s*([^{]*)\s*(?:\{\s*([^}]*)\s*\}\s*)?$/);
            let selector = queryParts[1];
            let attr = queryParts[2];
            let result = find(selector, context, variables, wantArray);
            if (attr) {
                attr = attr.trim();
                if (attr.charAt(0) === "@") attr = attr.substr(1);
                if (!wantArray) result = [ result ];
                result = Array.from(result, node => getAttr(node, attr));
                if (!wantArray) result = result[0];
            }
            return result;
            function getAttr(node, attr) {
                switch (attr) {
                  case null:
                  case undefined:
                  case "":
                    return node;

                  case textAttr$1:
                    return node.textContent;

                  case htmlAttr$1:
                    let frag = doc.createDocumentFragment();
                    forEach(node.childNodes, child => {
                        frag.appendChild(doc.importNode(child, true));
                    });
                    return frag;

                  default:
                    return node.getAttribute(attr);
                }
            }
        }
    }
    function matches(element, selectorGroup) {
        if (selectorGroup.trim() === "") return;
        return matches$1(element, selectorGroup);
    }
    function find(selectorGroup, context, variables, wantArray) {
        selectorGroup = selectorGroup.trim();
        if (selectorGroup === "") return wantArray ? [ context ] : context;
        let nullResult = wantArray ? [] : null;
        let selectors = selectorGroup.split(/,(?![^\(]*\)|[^\[]*\])/);
        selectors = Array.from(selectors, s => s.trim());
        let invalidVarUse = false;
        let contextVar;
        forEach(selectors, (s, i) => {
            let m = s.match(/\\?\$[_a-zA-Z][_a-zA-Z0-9]*\b/g);
            if (!m) {
                if (i > 0 && contextVar) {
                    invalidVarUse = true;
                    console.warn(`All individual selectors in a selector-group must share same context: ${selectorGroup}`);
                }
                return;
            }
            forEach(m, (varRef, j) => {
                if (varRef.charAt(0) === "\\") return;
                let varName = varRef.substr(1);
                let varPos = s.indexOf(varRef);
                if (j > 0 || varPos > 0) {
                    invalidVarUse = true;
                    console.warn(`Invalid use of ${varRef} in ${selectorGroup}`);
                    return;
                }
                if (i > 0) {
                    if (varName !== contextVar) {
                        invalidVarUse = true;
                        console.warn(`All individual selectors in a selector-group must share same context: ${selectorGroup}`);
                    }
                    return;
                }
                contextVar = varName;
            });
        });
        if (invalidVarUse) {
            console.error("Invalid use of variables in CSS selector. Assuming no match.");
            return nullResult;
        }
        if (contextVar && contextVar !== CSS_CONTEXT_VARIABLE) {
            if (!variables.has(contextVar)) {
                console.debug(`Context variable $${contextVar} not defined for ${selectorGroup}`);
                return nullResult;
            }
            if (contextVar !== CSS_CONTEXT_VARIABLE) context = variables.get(contextVar);
            if (selectorGroup === `$${contextVar}`) return context;
            if (!(context && context.nodeType === 1)) {
                console.debug("Context variable $" + contextVar + " not an element in " + selectorGroup);
                return nullResult;
            }
        }
        let isRoot = false;
        if (context.nodeType === 9 || context.nodeType === 11) isRoot = true;
        selectors = filter(selectors, s => {
            switch (s.charAt(0)) {
              case "+":
              case "~":
                console.warn("Siblings of context-node cannot be selected in " + selectorGroup);
                return false;

              case ">":
                return isRoot ? false : true;

              default:
                return true;
            }
        });
        if (selectors.length <= 0) return nullResult;
        selectors = Array.from(selectors, s => {
            if (isRoot) return s;
            let prefix = ":scope";
            return contextVar ? s.replace("$" + contextVar, prefix) : prefix + " " + s;
        });
        let finalSelector = selectors.join(", ");
        if (wantArray) {
            return findAll(finalSelector, context, !isRoot, !isRoot);
        } else {
            return find$1(finalSelector, context, !isRoot, !isRoot);
        }
    }
    /*!
	 * Microdata
	 * HTML Microdata parsing and querying
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    const document$4 = window.document;
    const nodeData = new WeakMap;
    function intersects(a1, a2) {
        return a1.some(i1 => a2.includes(i1));
    }
    function walkTree$1(root, skipRoot, callback) {
        let walker = document$4.createNodeIterator(root, 1, el => {
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
    function evaluate(el) {
        let tagName = el.tagName.toLowerCase();
        let attrName = valueAttr[tagName];
        if (attrName) return el[attrName] || el.getAttribute(attrName);
        return el;
    }
    function getPropDesc(el) {
        if (nodeData.has(el)) return nodeData.get(el);
        let prop = {
            name: el.getAttribute("itemprop"),
            value: evaluate(el)
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
        if (!rootNode) rootNode = document$4;
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
	 * MicrodataDecoder
	 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    let document$3 = window.document;
    class MicrodataDecoder {
        constructor(options, namespaces) {}
        init(node) {
            getItems(node);
            this.rootNode = node;
        }
        evaluate(query, context, variables, wantArray) {
            if (!context) context = this.rootNode;
            query = query.trim();
            let startAtRoot = false;
            let baseSchema;
            let pathParts;
            if (query === ".") return wantArray ? [ context ] : context;
            let m = query.match(/^(?:(\^)?\[([^\]]*)\]\.)/);
            if (m && m.length) {
                query = query.substr(m[0].length);
                startAtRoot = !!m[1];
                baseSchema = words(m[2].trim());
            }
            pathParts = words(query.trim());
            let nodes;
            if (baseSchema) {
                if (startAtRoot) context = this.view;
                nodes = getItems(context, baseSchema);
            } else nodes = [ context ];
            let resultList = nodes;
            forEach(pathParts, (relPath, i) => {
                let parents = resultList;
                resultList = [];
                forEach(parents, el => {
                    let props = getProperties(el);
                    if (!props) return;
                    let nodeList = props.namedItem(relPath);
                    if (!nodeList) return;
                    [].push.apply(resultList, nodeList);
                });
            });
            resultList = Array.from(resultList, el => {
                let props = getProperties(el);
                if (props) return el;
                return getValue(el);
            });
            if (wantArray) return resultList;
            return resultList[0];
        }
    }
    /*!
	 * JSONDecoder
	 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    class JSONDecoder {
        constructor(options, namespaces) {}
        init(object) {
            if (typeof object !== "object" || object === null) throw Error("JSONDecoder cannot handle non-object");
            this.object = object;
        }
        evaluate(query, context, variables, wantArray) {
            if (!context) context = this.object;
            query = query.trim();
            let pathParts;
            if (query === ".") return wantArray ? [ context ] : context;
            let m = query.match(/^\^/);
            if (m && m.length) {
                query = query.substr(m[0].length);
                context = this.object;
            }
            pathParts = query.split(".");
            let resultList = [ context ];
            forEach(pathParts, (relPath, i) => {
                let parents = resultList;
                resultList = [];
                forEach(parents, item => {
                    let child = item[relPath];
                    if (child != null) {
                        if (Array.isArray(child)) [].push.apply(resultList, child); else resultList.push(child);
                    }
                });
            });
            if (wantArray) return resultList;
            let value = resultList[0];
            return value;
        }
    }
    /*!
	 * builtin-decoders
	 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    decoders.register("css", CSSDecoder);
    decoders.register("microdata", MicrodataDecoder);
    decoders.register("json", JSONDecoder);
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
            let srcNode = provider.srcNode;
            let srcDoc = srcNode.nodeType === 9 ? srcNode : srcNode.ownerDocument;
            let main;
            if (!main) main = find$1("main, [role=main]", srcNode);
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
                console.warn('No <script> found in "script" transform template');
                return;
            }
            try {
                this.processor = Function(`return (${script.text})`)();
            } catch (err) {
                window.reportError(err);
            }
            if (!this.processor || !this.processor.transform) {
                console.warn('"script" transform template did not produce valid transform object');
                return;
            }
        }
        transform(provider, details) {
            let srcNode = provider.srcNode;
            if (!this.processor || !this.processor.transform) {
                console.warn('"script" transform template did not produce valid transform object');
                return;
            }
            return this.processor.transform(srcNode, details);
        }
    }
    /*!
	 * HazardProcessor
	 * Copyright 2014-2016 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    let document$2 = window.document;
    const textAttr = "_text";
    const htmlAttr = "_html";
    const PIPE_OPERATOR = "//>";
    const HAZARD_TRANSFORM_URN = "HazardTransform";
    const hazDefaultNS = new CustomNamespace({
        urn: HAZARD_TRANSFORM_URN,
        name: "haz",
        style: "xml"
    });
    const HAZARD_EXPRESSION_URN = "HazardExpression";
    const exprDefaultNS = new CustomNamespace({
        urn: HAZARD_EXPRESSION_URN,
        name: "expr",
        style: "xml"
    });
    const HAZARD_MEXPRESSION_URN = "HazardMExpression";
    const mexprDefaultNS = new CustomNamespace({
        urn: HAZARD_MEXPRESSION_URN,
        name: "mexpr",
        style: "xml"
    });
    let hazLangDefinition = "<otherwise <when@test <each@select <one@select +var@name,select <if@test <unless@test " + ">choose <template@name,match >eval@select >mtext@select >text@select " + "call@name apply param@name,select clone deepclone element@name attr@name";
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
        let attrs = def[1];
        attrs = attrs && attrs !== "" ? attrs.split(",") : [];
        return {
            tag: tag,
            attrToElement: attrToElement,
            attrs: attrs
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
    function htmlToFragment(html, doc) {
        if (!doc) doc = document$2;
        let div = doc.createElement("div");
        div.innerHTML = html;
        let result = childNodesToFragment(div);
        return result;
    }
    class HazardProcessor {
        constructor(options, namespaces) {
            this.templates = [];
            this.namespaces = namespaces = namespaces.clone();
            if (!namespaces.lookupNamespace(HAZARD_TRANSFORM_URN)) namespaces.add(hazDefaultNS);
            if (!namespaces.lookupNamespace(HAZARD_EXPRESSION_URN)) namespaces.add(exprDefaultNS);
            if (!namespaces.lookupNamespace(HAZARD_MEXPRESSION_URN)) namespaces.add(mexprDefaultNS);
        }
        loadTemplate(template) {
            let processor = this;
            processor.root = template;
            processor.templates = [];
            let namespaces = processor.namespaces;
            let hazPrefix = namespaces.lookupPrefix(HAZARD_TRANSFORM_URN);
            let exprPrefix = namespaces.lookupPrefix(HAZARD_EXPRESSION_URN);
            let mexprPrefix = namespaces.lookupPrefix(HAZARD_MEXPRESSION_URN);
            let exprHtmlAttr = exprPrefix + htmlAttr;
            let hazEvalTag = `${hazPrefix}eval`;
            let mexprHtmlAttr = mexprPrefix + htmlAttr;
            let mexprTextAttr = mexprPrefix + textAttr;
            let hazMTextTag = `${hazPrefix}mtext`;
            let exprTextAttr = exprPrefix + textAttr;
            let hazTextTag = `${hazPrefix}text`;
            let exprToHazPriority = [ exprHtmlAttr, mexprTextAttr, exprTextAttr ];
            let exprToHazMap = {};
            exprToHazMap[exprHtmlAttr] = hazEvalTag;
            exprToHazMap[mexprTextAttr] = hazMTextTag;
            exprToHazMap[exprTextAttr] = hazTextTag;
            let doc = template.ownerDocument;
            walkTree(template, true, el => {
                let tag = el.localName;
                if (tag.indexOf(hazPrefix) === 0) return;
                forEach(exprToHazPriority, attr => {
                    if (!el.hasAttribute(attr)) return;
                    let tag = exprToHazMap[attr];
                    let val = el.getAttribute(attr);
                    el.removeAttribute(attr);
                    el.setAttribute(tag, val);
                });
                if (el.hasAttribute(mexprHtmlAttr)) {
                    console.warn(`Removing unsupported @${mexprHtmlAttr}`);
                    el.removeAttribute(mexprHtmlAttr);
                }
                forEach(hazLang, def => {
                    if (!def.attrToElement) return;
                    let nsTag = hazPrefix + def.tag;
                    if (!el.hasAttribute(nsTag)) return;
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
            });
            walkTree(template, true, el => {
                let tag = el.localName;
                if (tag === hazPrefix + "template") markTemplate(el);
                if (tag === hazPrefix + "choose") implyOtherwise(el);
            });
            implyEntryTemplate(template);
            walkTree(template, true, el => {
                el.hazardDetails = getHazardDetails(el, processor.namespaces);
            });
            function implyOtherwise(el) {
                let otherwise = el.ownerDocument.createElement(hazPrefix + "otherwise");
                forEach(Array.from(el.childNodes), node => {
                    let tag = node.localName;
                    if (tag === hazPrefix + "when") return;
                    otherwise.appendChild(node);
                });
                el.appendChild(otherwise);
            }
            function markTemplate(el) {
                processor.templates.push(el);
            }
            function implyEntryTemplate(el) {
                let firstExplicitTemplate;
                let contentNodes = filter(el.childNodes, node => {
                    if (node.nodeType === 3) return /\S/.test(node.nodeValue);
                    if (node.nodeType !== 1) return false;
                    let tag = node.localName;
                    if (tag === hazPrefix + "template") {
                        if (!firstExplicitTemplate) firstExplicitTemplate = node;
                        return false;
                    }
                    if (tag === hazPrefix + "let") return false;
                    if (tag === hazPrefix + "param") return false;
                    return true;
                });
                if (contentNodes.length <= 0) {
                    if (firstExplicitTemplate) return;
                    console.warn("This Hazard Template cannot generate any content.");
                }
                let entryTemplate = el.ownerDocument.createElement(hazPrefix + "template");
                forEach(contentNodes, node => {
                    entryTemplate.appendChild(node);
                });
                if (firstExplicitTemplate) el.insertBefore(entryTemplate, firstExplicitTemplate); else el.appendChild(entryTemplate);
                processor.templates.unshift(entryTemplate);
            }
        }
        getEntryTemplate() {
            return this.templates[0];
        }
        getNamedTemplate(name) {
            let processor = this;
            name = lc(name);
            return find$2(processor.templates, template => lc(template.getAttribute("name")) === name);
        }
        getMatchingTemplate(element) {
            let processor = this;
            return find$2(processor.templates, template => {
                if (!template.hasAttribute("match")) return false;
                let expression = template.getAttribute("match");
                return processor.provider.matches(element, expression);
            });
        }
        transform(provider, details) {
            let processor = this;
            let root = processor.root;
            let doc = root.ownerDocument;
            let frag = doc.createDocumentFragment();
            return processor._transform(provider, details, frag).then(() => frag);
        }
        _transform(provider, details, frag) {
            let processor = this;
            processor.provider = provider;
            processor.globalParams = assign({}, details);
            processor.globalVars = {};
            processor.localParams = processor.globalParams;
            processor.localVars = processor.globalVars;
            processor.localParamsStack = [];
            processor.localVarsStack = [];
            processor.variables = {
                has: key => {
                    let result = key in processor.localVars || key in processor.localParams || key in processor.globalVars || key in processor.globalParams || false;
                    return result;
                },
                get: key => {
                    let result = key in processor.localVars && processor.localVars[key] || key in processor.localParams && processor.localParams[key] || key in processor.globalVars && processor.globalVars[key] || key in processor.globalParams && processor.globalParams[key] || undefined;
                    return result;
                },
                set: (key, value, inParams, isGlobal) => {
                    let mapName = isGlobal ? inParams ? "globalParams" : "globalVars" : inParams ? "localParams" : "localVars";
                    if (mapName === "localParams" && key in processor.localParams) return;
                    if (mapName === "globalParams" && key in processor.globalParams) return;
                    processor[mapName][key] = value;
                },
                push: params => {
                    processor.localParamsStack.push(processor.localParams);
                    processor.localVarsStack.push(processor.localVars);
                    if (typeof params !== "object" || params == null) params = {};
                    processor.localParams = params;
                    processor.localVars = {};
                },
                pop: () => {
                    processor.localParams = processor.localParamsStack.pop();
                    processor.localVars = processor.localVarsStack.pop();
                }
            };
            return processor.transformChildNodes(processor.root, null, frag).then(() => {
                let template = processor.getEntryTemplate();
                return processor.transformTemplate(template, null, null, frag);
            });
        }
        transformTemplate(template, context, params, frag) {
            let processor = this;
            processor.variables.push(params);
            return processor.transformChildNodes(template, context, frag).then(() => {
                processor.variables.pop();
                return frag;
            });
        }
        transformChildNodes(srcNode, context, frag) {
            let processor = this;
            return Thenfu.reduce(null, srcNode.childNodes, (dummy, current) => processor.transformNode(current, context, frag));
        }
        transformNode(srcNode, context, frag) {
            let processor = this;
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
                let details = srcNode.hazardDetails;
                if (details.definition) return processor.transformHazardTree(srcNode, context, frag); else return processor.transformTree(srcNode, context, frag);
            }
        }
        transformHazardTree(el, context, frag) {
            let processor = this;
            let doc = el.ownerDocument;
            let details = el.hazardDetails;
            let def = details.definition;
            let invertTest = false;
            let name, selector, value, type, template, node, expr, mexpr;
            switch (def.tag) {
              default:
                return processor.transformChildNodes(el, context, frag);

              case "template":
                return frag;

              case "var":
                name = el.getAttribute("name");
                selector = el.getAttribute("select");
                value = context;
                if (selector) {
                    try {
                        value = processor.provider.evaluate(selector, context, processor.variables, false);
                    } catch (err) {
                        window.reportError(err);
                        console.warn('Error evaluating <haz:var name="' + name + '" select="' + selector + '">. Assumed empty.');
                        value = undefined;
                    }
                }
                processor.variables.set(name, value);
                return frag;

              case "param":
                name = el.getAttribute("name");
                selector = el.getAttribute("select");
                value = context;
                if (selector) {
                    try {
                        value = processor.provider.evaluate(selector, context, processor.variables, false);
                    } catch (err) {
                        window.reportError(err);
                        console.warn('Error evaluating <haz:param name="' + name + '" select="' + selector + '">. Assumed empty.');
                        value = undefined;
                    }
                }
                processor.variables.set(name, value, true);
                return frag;

              case "call":
                name = el.getAttribute("name");
                template = processor.getNamedTemplate(name);
                if (!template) {
                    console.warn("Hazard could not find template name=" + name);
                    return frag;
                }
                return processor.transformTemplate(template, context, null, frag);

              case "apply":
                template = processor.getMatchingTemplate(context);
                let promise = Thenfu.asap(el);
                if (template) {
                    return processor.transformTemplate(template, context, null, frag);
                }
                node = context.cloneNode(false);
                frag.appendChild(node);
                return Thenfu.reduce(null, context.childNodes, (dummy, child) => processor.transformHazardTree(el, child, node));

              case "clone":
                node = context.cloneNode(false);
                frag.appendChild(node);
                return processor.transformChildNodes(el, context, node);

              case "deepclone":
                node = context.cloneNode(true);
                frag.appendChild(node);
                return frag;

              case "element":
                mexpr = el.getAttribute("name");
                name = evalMExpression(mexpr, processor.provider, context, processor.variables);
                type = typeof value;
                if (type !== "string") return frag;
                node = doc.createElement(name);
                frag.appendChild(node);
                return processor.transformChildNodes(el, context, node);

              case "attr":
                mexpr = el.getAttribute("name");
                name = evalMExpression(mexpr, processor.provider, context, processor.variables);
                type = typeof value;
                if (type !== "string") return frag;
                node = doc.createDocumentFragment();
                return processor.transformChildNodes(el, context, node).then(() => {
                    value = node.textContent;
                    frag.setAttribute(name, value);
                    return frag;
                });

              case "eval":
                selector = el.getAttribute("select");
                value = evalExpression(selector, processor.provider, context, processor.variables, "node");
                type = typeof value;
                if (type === "undefined" || type === "boolean" || value == null) return frag;
                if (!value.nodeType) {
                    value = htmlToFragment(value, doc);
                }
                frag.appendChild(value);
                return frag;

              case "mtext":
                mexpr = el.getAttribute("select");
                value = evalMExpression(mexpr, processor.provider, context, processor.variables);
                if (type === "undefined" || type === "boolean" || value == null) return frag;
                if (!value.nodeType) {
                    value = doc.createTextNode(value);
                }
                frag.appendChild(value);
                return frag;

              case "text":
                expr = el.getAttribute("select");
                value = evalExpression(expr, processor.provider, context, processor.variables, "text");
                type = typeof value;
                if (type === "undefined" || type === "boolean" || value == null) return frag;
                if (!value.nodeType) {
                    value = doc.createTextNode(value);
                }
                frag.appendChild(value);
                return frag;

              case "unless":
                invertTest = true;

              case "if":
                let testVal = el.getAttribute("test");
                let pass = false;
                try {
                    pass = evalExpression(testVal, processor.provider, context, processor.variables, "boolean");
                } catch (err) {
                    window.reportError(err);
                    console.warn('Error evaluating <haz:if test="' + testVal + '">. Assumed false.');
                    pass = false;
                }
                if (invertTest) pass = !pass;
                if (!pass) return frag;
                return processor.transformChildNodes(el, context, frag);

              case "choose":
                let otherwise;
                let when;
                let found = some(el.childNodes, child => {
                    if (child.nodeType !== 1) return false;
                    let childDef = child.hazardDetails.definition;
                    if (!childDef) return false;
                    if (childDef.tag === "otherwise") {
                        if (!otherwise) otherwise = child;
                        return false;
                    }
                    if (childDef.tag !== "when") return false;
                    let testVal = child.getAttribute("test");
                    let pass = evalExpression(testVal, processor.provider, context, processor.variables, "boolean");
                    if (!pass) return false;
                    when = child;
                    return true;
                });
                if (!found) when = otherwise;
                if (!when) return frag;
                return processor.transformChildNodes(when, context, frag);

              case "one":
                selector = el.getAttribute("select");
                let subContext;
                try {
                    subContext = processor.provider.evaluate(selector, context, processor.variables, false);
                } catch (err) {
                    window.reportError(err);
                    console.warn('Error evaluating <haz:one select="' + selector + '">. Assumed empty.');
                    return frag;
                }
                if (!subContext) return frag;
                return processor.transformChildNodes(el, subContext, frag);

              case "each":
                selector = el.getAttribute("select");
                let subContexts;
                try {
                    subContexts = processor.provider.evaluate(selector, context, processor.variables, true);
                } catch (err) {
                    window.reportError(err);
                    console.warn('Error evaluating <haz:each select="' + selector + '">. Assumed empty.');
                    return frag;
                }
                return Thenfu.reduce(null, subContexts, (dummy, subContext) => processor.transformChildNodes(el, subContext, frag));
            }
        }
        transformTree(srcNode, context, frag) {
            let processor = this;
            let nodeType = srcNode.nodeType;
            if (nodeType !== 1) throw Error("transformTree() expects Element");
            let node = processor.transformSingleElement(srcNode, context);
            let nodeAsFrag = frag.appendChild(node);
            return processor.transformChildNodes(srcNode, context, nodeAsFrag);
        }
        transformSingleElement(srcNode, context) {
            let processor = this;
            let details = srcNode.hazardDetails;
            let el = srcNode.cloneNode(false);
            forEach(details.exprAttributes, desc => {
                let value;
                try {
                    value = desc.namespaceURI === HAZARD_MEXPRESSION_URN ? processMExpression(desc.mexpression, processor.provider, context, processor.variables) : processExpression(desc.expression, processor.provider, context, processor.variables, desc.type);
                } catch (err) {
                    window.reportError(err);
                    console.warn("Error evaluating @" + desc.attrName + '="' + desc.expression + '". Assumed false.');
                    value = false;
                }
                setAttribute(el, desc.attrName, value);
            });
            return el;
        }
    }
    function getHazardDetails(el, namespaces) {
        console.assert(el.nodeType === 1);
        let details = {};
        let tag = el.localName;
        let hazPrefix = namespaces.lookupPrefix(HAZARD_TRANSFORM_URN);
        let isHazElement = tag.indexOf(hazPrefix) === 0;
        if (isHazElement) {
            tag = tag.substr(hazPrefix.length);
            let def = hazLangLookup[tag];
            details.definition = def || {
                tag: ""
            };
        }
        details.exprAttributes = getExprAttributes(el, namespaces);
        return details;
    }
    function getExprAttributes(el, namespaces) {
        let attrs = [];
        let exprNS = namespaces.lookupNamespace(HAZARD_EXPRESSION_URN);
        let mexprNS = namespaces.lookupNamespace(HAZARD_MEXPRESSION_URN);
        forEach(Array.from(el.attributes), attr => {
            let ns = find$2([ exprNS, mexprNS ], ns => attr.name.indexOf(ns.prefix) === 0);
            if (!ns) return;
            let prefix = ns.prefix;
            let namespaceURI = ns.urn;
            let attrName = attr.name.substr(prefix.length);
            el.removeAttribute(attr.name);
            let desc = {
                namespaceURI: namespaceURI,
                prefix: prefix,
                attrName: attrName,
                type: "text"
            };
            switch (namespaceURI) {
              case HAZARD_EXPRESSION_URN:
                desc.expression = interpretExpression(attr.value);
                break;

              case HAZARD_MEXPRESSION_URN:
                desc.mexpression = interpretMExpression(attr.value);
                break;

              default:
                break;
            }
            attrs.push(desc);
        });
        return attrs;
    }
    function setAttribute(el, attrName, value) {
        let type = typeof value;
        if (type === "undefined" || type === "boolean" || value == null) {
            if (!value) el.removeAttribute(attrName); else el.setAttribute(attrName, "");
        } else {
            el.setAttribute(attrName, value.toString());
        }
    }
    function evalMExpression(mexprText, provider, context, variables) {
        let mexpr = interpretMExpression(mexprText);
        let result = processMExpression(mexpr, provider, context, variables);
        return result;
    }
    function evalExpression(exprText, provider, context, variables, type) {
        let expr = interpretExpression(exprText);
        let result = processExpression(expr, provider, context, variables, type);
        return result;
    }
    function interpretMExpression(mexprText) {
        let expressions = [];
        let mexpr = mexprText.replace(/\{\{((?:[^}]|\}(?=\}\})|\}(?!\}))*)\}\}/g, (all, expr) => {
            expressions.push(expr);
            return "{{}}";
        });
        expressions = expressions.map(expr => interpretExpression(expr));
        return {
            template: mexpr,
            expressions: expressions
        };
    }
    function interpretExpression(exprText) {
        let expression = {};
        expression.text = exprText;
        let exprParts = exprText.split(PIPE_OPERATOR);
        expression.selector = exprParts.shift();
        expression.filters = [];
        forEach(exprParts, filterSpec => {
            filterSpec = filterSpec.trim();
            let text = filterSpec;
            let m = text.match(/^([_a-zA-Z][_a-zA-Z0-9]*)\s*(:?)/);
            if (!m) {
                console.warn("Syntax Error in filter call: " + filterSpec);
                return false;
            }
            let filterName = m[1];
            let hasParams = m[2];
            text = text.substr(m[0].length);
            if (!hasParams && /\S+/.test(text)) {
                console.warn("Syntax Error in filter call: " + filterSpec);
                return false;
            }
            try {
                let filterParams = Function("return [" + text + "];")();
                expression.filters.push({
                    text: filterSpec,
                    name: filterName,
                    params: filterParams
                });
                return true;
            } catch (err) {
                console.warn("Syntax Error in filter call: " + filterSpec);
                return false;
            }
        });
        return expression;
    }
    function processMExpression(mexpr, provider, context, variables) {
        let i = 0;
        return mexpr.template.replace(/\{\{\}\}/g, all => processExpression(mexpr.expressions[i++], provider, context, variables, "text"));
    }
    function processExpression(expr, provider, context, variables, type) {
        let doc = context && context.nodeType ? context.nodeType === 9 ? context : context.ownerDocument : document$2;
        let value = provider.evaluate(expr.selector, context, variables);
        every(expr.filters, filter => {
            if (value == null) value = "";
            if (value.nodeType) {
                if (value.nodeType === 1) value = value.textContent; else value = "";
            }
            try {
                value = filters.evaluate(filter.name, value, filter.params);
                return true;
            } catch (err) {
                window.reportError(err);
                console.warn('Failure processing filter call: "' + filter.text + '" with input: "' + value + '"');
                value = "";
                return false;
            }
        });
        let result = cast(value, type);
        return result;
        function cast(value, type) {
            switch (type) {
              case "text":
                if (value && value.nodeType) value = value.textContent;
                break;

              case "node":
                let frag = doc.createDocumentFragment();
                if (value && value.nodeType) frag.appendChild(doc.importNode(value, true)); else {
                    let div = doc.createElement("div");
                    div.innerHTML = value;
                    let node;
                    while (node = div.firstChild) frag.appendChild(node);
                }
                value = frag;
                break;

              case "boolean":
                if (value == null || value === false) value = false; else value = true;
                break;

              default:
                if (value && value.nodeType) value = value.textContent;
                break;
            }
            return value;
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
            this.#normalizeChildren();
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
            this.#normalizeChildren();
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
                let activePanel = find$2(this.owns, child => {
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
            let activePanel = find$2(panels, panel => {
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
    function normalizeChild(node) {
        let element = this;
        switch (node.nodeType) {
          case 1:
            if (Panel.isPanel(node) || VLayout.isLayout(node)) return;
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
        let defs = [ [ "layer", Layer, `${boxSizingCSS} display: block; position: fixed; top: 0; left: 0; width: 0; height: 0;` ], [ "popup", Popup, `${boxSizingCSS} display: block; position: relative; width: 0; height: 0;`, "position: absolute; top: 0; left: 0;" ], [ "panel", Panel, `${boxSizingCSS} display: block; width: auto; height: auto; text-align: left; margin: 0; padding: 0;` ], [ "vlayout", VLayout, `${boxSizingCSS} ${layoutResetCSS} ${layoutSizeCSS} display: flex; flex-direction: column; justify-content: flex-start; align-items: stretch;` ], [ "hlayout", HLayout, `${boxSizingCSS} ${layoutResetCSS} ${layoutSizeCSS} display: flex; flex-direction: row; justify-content: space-between; align-items: stretch;` ], [ "deck", Deck, `${boxSizingCSS} ${layoutResetCSS} ${layoutSizeCSS}`, "width: 100%; height: 100%;" ], [ "rdeck", ResponsiveDeck, `${boxSizingCSS} ${layoutResetCSS} ${layoutSizeCSS}`, "width: 0; height: 0;" ] ];
        let cssText = "*[hidden] { display: none !important; }\n";
        for (let [name, Cls, css, childCss] of defs) {
            let tagName = ns.lookupTagName(name);
            customElements.define(tagName, Cls);
            cssText += `${tagName} { ${css} }\n`;
            if (childCss) cssText += `${tagName} > * { ${childCss} }\n`;
        }
        cssText += `${ns.lookupTagName("body")} { ${boxSizingCSS} display: block; width: auto; height: auto; margin: 0; }\n`;
        let style = document.createElement("style");
        style.textContent = cssText;
        document.head.insertBefore(style, document.head.firstChild);
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
            return find$1(selector, this.element, scope);
        }
        findAll(selector, scope) {
            return findAll(selector, this.element, scope);
        }
        matches(selector, scope) {
            return matches$1(this.element, selector, scope);
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
	 */    let transcludeDefinitions = new Registry({
        writeOnce: true,
        keyValidator: key => typeof key === "string",
        valueValidator: o => o != null && typeof o === "object"
    });
    class HTransclude extends Panel {
        static observedAttributes=[ "src" ];
        connectedCallback() {
            let def = this.getAttribute("def");
            this.definition = transcludeDefinitions.get(def);
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
            if (name === "src") this.refresh();
        }
        get options() {
            let behaviors = instance();
            return behaviors.getInstance(this);
        }
        preload(request) {
            return Thenfu.pipe(request, [ request => this.definition.render(request, "loading"), result => {
                if (result) return this.insert(result);
            } ]);
        }
        load(response) {
            if (response) this.src = response.url;
            return Thenfu.pipe(response, [ response => this.definition.render(response, "loaded", {
                mainSelector: this.mainSelector
            }), result => {
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
                let nohash = fullURL.nohash;
                let request = {
                    method: "get",
                    url: nohash,
                    responseType: "document"
                };
                let response;
                return Thenfu.pipe(null, [ () => this.preload(request), () => httpProxy.load(nohash, request), resp => {
                    response = resp;
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
    function registerElement(ns, name, Cls) {
        let tagName = ns.lookupTagName(name);
        customElements.define(tagName, Cls);
        let cssText = `${tagName} { box-sizing: border-box; display: block; width: auto; height: auto; text-align: left; margin: 0; padding: 0; }`;
        let style = document.createElement("style");
        style.textContent = cssText;
        document.head.insertBefore(style, document.head.firstChild);
    }
    let transcluder = {
        registerElement: registerElement
    };
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
            let transform = this;
            let framesetDef = transform.framesetDefinition;
            defaults(transform, {
                element: el,
                type: el.getAttribute("type") || "main",
                format: el.getAttribute("format")
            });
            if (transform.type === "main") transform.format = "";
            let doc = framesetDef.document;
            let frag = doc.createDocumentFragment();
            let node;
            while (node = el.firstChild) frag.appendChild(node);
            let options = el.behavior;
            let processor = transform.processor = processors.create(transform.type, options, framesetDef.namespaces);
            processor.loadTemplate(frag);
        }
        process(srcNode, details) {
            let transform = this;
            let framesetDef = transform.framesetDefinition;
            let decoder;
            if (transform.format) {
                decoder = decoders.create(transform.format, {}, framesetDef.namespaces);
                decoder.init(srcNode);
            } else decoder = {
                srcNode: srcNode
            };
            let processor = transform.processor;
            let output = processor.transform(decoder, details);
            return output;
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
            let bodyDef = this;
            let framesetDef = bodyDef.framesetDefinition;
            let condition = el.getAttribute("condition");
            let finalCondition;
            if (condition) {
                finalCondition = normalizeCondition(condition);
                if (!finalCondition) {
                    finalCondition = condition;
                    console.warn(`Frame body defined with unknown condition: ${condition}`);
                }
            } else finalCondition = "loaded";
            defaults(bodyDef, {
                element: el,
                condition: finalCondition,
                transforms: []
            });
            forEach(Array.from(el.children), node => {
                if (node.localName === framesetDef.namespaces.lookupTagNameNS("transform", HYPERFRAMESET_URN)) {
                    el.removeChild(node);
                    bodyDef.transforms.push(new HTransformDefinition(node, framesetDef));
                }
            });
            if (!bodyDef.transforms.length && bodyDef.condition === "loaded") {
                console.warn("HBody definition for loaded content contains no HTransform definitions");
            }
        }
        render(resource, details) {
            let bodyDef = this;
            let framesetDef = bodyDef.framesetDefinition;
            if (bodyDef.transforms.length <= 0) {
                return bodyDef.element.cloneNode(true);
            }
            if (!resource) return null;
            let doc = resource.document;
            if (!doc) return null;
            let frag0 = doc;
            if (details.mainSelector) frag0 = find$1(details.mainSelector, doc);
            return Thenfu.reduce(frag0, bodyDef.transforms, (fragment, transform) => transform.process(fragment, details)).then(fragment => {
                let el = bodyDef.element.cloneNode(false);
                let htmlBody = find$1("body", fragment);
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
            let frameDef = this;
            let framesetDef = frameDef.framesetDefinition;
            defaults(frameDef, {
                element: el,
                mainSelector: el.getAttribute("main")
            });
            frameDef.bodies = [];
            forEach(Array.from(el.children), node => {
                let tag = node.localName;
                if (!tag) return;
                if (includes(hfHeadTags, tag)) return;
                if (tag === framesetDef.namespaces.lookupTagNameNS("body", HYPERFRAMESET_URN)) {
                    el.removeChild(node);
                    frameDef.bodies.push(new HBodyDefinition(node, framesetDef));
                    return;
                }
                console.warn(`Unexpected element in HFrame: ${tag}`);
                return;
            });
        }
        render(resource, condition, details) {
            let frameDef = this;
            let framesetDef = frameDef.framesetDefinition;
            if (!details) details = {};
            defaults(details, {
                scope: framesetDef.scope,
                url: resource && resource.url,
                mainSelector: frameDef.mainSelector
            });
            let bodyDef = find$2(frameDef.bodies, body => body.condition === condition);
            if (!bodyDef) return;
            return bodyDef.render(resource, details);
        }
    }
    /*!
	 * HFramesetDefinition
	 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    const {rebase: rebase, rebaseURL: rebaseURL, normalizeScopedStyles: normalizeScopedStyles} = htmlParser;
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
        frames={};
        constructor(doc, settings) {
            if (!doc) return;
            if (!settings?.behaviors) throw Error("HFramesetDefinition requires settings.behaviors");
            this.behaviors = settings.behaviors;
            this.namespaces = null;
            this.init(doc, settings);
        }
        init(doc, settings) {
            this.#initMetadata(doc, settings);
            this.#rebaseURLs(doc);
            this.#normalizeScripts(doc);
            this.#normalizeStyles(doc);
            let body = doc.body;
            this.document = doc;
            this.element = body;
        }
        #initMetadata(doc, settings) {
            defaults(this, {
                url: settings.framesetURL,
                scope: settings.scope
            });
            let namespaces = this.namespaces = CustomNamespace.getNamespaces(doc);
            if (!namespaces.lookupNamespace(HYPERFRAMESET_URN)) {
                namespaces.add(hfDefaultNamespace);
            }
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
                if (script.type && !/^text\/javascript/.test(script.type)) return;
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
                if (script.type && !/^text\/javascript/.test(script.type)) return;
                if (script.hasAttribute("for")) return;
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
        preprocess() {
            this.#preprocessScripts();
            this.#preprocessFrames();
        }
        #preprocessScripts() {
            let body = this.element;
            let scripts = findAll("script", body);
            forEach(scripts, script => {
                if (script.type && !/^text\/javascript/.test(script.type)) return;
                if (script.hasAttribute("src")) {
                    console.warn("Frameset <body> may not contain external scripts: \n" + script.cloneNode(false).outerHTML);
                    script.parentNode.removeChild(script);
                    return;
                }
                if (!script.hasAttribute("for")) {
                    console.warn("Frameset <body> may not contain non-@for scripts:\n" + this.url + "#" + script.id);
                    script.parentNode.removeChild(script);
                    return;
                }
                if (script.getAttribute("for") !== "") {
                    console.warn("<script> may only contain EMPTY @for: \n" + script.cloneNode(false).outerHTML);
                    script.parentNode.removeChild(script);
                    return;
                }
            });
            this.behaviors.processScripts(body);
        }
        #preprocessFrames() {
            let body = this.element;
            let frameElts = findAll(this.namespaces.lookupSelector("frame", HYPERFRAMESET_URN), body);
            let frameDefElts = [];
            let frameRefElts = [];
            forEach(frameElts, (el, index) => {
                let placeholder = el.cloneNode(false);
                el.parentNode.replaceChild(placeholder, el);
                let defId = el.getAttribute("defid");
                let def = el.getAttribute("def");
                if (def && def !== defId) {
                    frameRefElts.push(el);
                    return;
                }
                if (!defId) {
                    defId = "__frame_" + index + "__";
                    el.setAttribute("defid", defId);
                }
                if (!def) {
                    def = defId;
                    placeholder.setAttribute("def", def);
                }
                frameDefElts.push(el);
            });
            forEach(frameDefElts, el => {
                let defId = el.getAttribute("defid");
                this.frames[defId] = new HFrameDefinition(el, this);
            });
            forEach(frameRefElts, el => {
                let def = el.getAttribute("def");
                let ref = this.frames[def];
                if (!ref) {
                    console.warn("Frame declaration references non-existant frame definition: " + def);
                    return;
                }
                let refEl = ref.element;
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
                attr: "config",
                container: document$1.body,
                autoProcess: false
            });
            if (!startOptions || !startOptions.contentDocument) {
                console.info("No contentDocument passed to start(). Assuming landing-page is the frameset.");
                return framer.#startAsFrameset(startOptions);
            }
            Thenfu.asap(startOptions.contentDocument).then(doc => httpProxy.add({
                url: document$1.URL,
                type: "document",
                document: doc
            }));
            return Thenfu.pipe(null, [ () => Thenfu.wait(() => !!document$1.body), () => {
                let framerConfig;
                framerConfig = framer.lookup(document$1.URL);
                if (framerConfig) return framerConfig;
                return startOptions.contentDocument.then(doc => framer.detect(doc));
            }, framerConfig => {
                if (!framerConfig) throw Error("No frameset could be determined for this page");
                framer.scope = framerConfig.scope;
                let framesetURL = URLux.create(framerConfig.framesetURL);
                if (framesetURL.hash) console.info(`Ignoring hash component of frameset URL: ${framesetURL.hash}`);
                framer.framesetURL = framerConfig.framesetURL = framesetURL.nohash;
                return httpProxy.load(framer.framesetURL, {
                    responseType: "document"
                }).then(response => new HFramesetDefinition(response.document, {
                    ...framerConfig,
                    behaviors: framer.behaviors
                }));
            }, definition => Thenfu.pipe(definition, [ () => {
                framer.definition = definition;
                return Framer.#prepareFrameset(document$1, definition);
            }, () => definition.preprocess(), () => Framer.#prerenderFrameset(document$1, definition) ]), () => framer.#activate() ]);
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
                behaviors: framer.behaviors
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
            }, () => definition.preprocess(), () => Framer.#insertMarkers(document$1.URL, framer.framesetURL, true), () => framer.#activate(), () => {
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
                window.addEventListener("click", e => {
                    if (e.defaultPrevented) return;
                    let acceptDefault = framer.onClick(e);
                    if (acceptDefault === false) e.preventDefault();
                }, false);
                window.addEventListener("submit", e => {
                    if (e.defaultPrevented) return;
                    let acceptDefault = framer.onSubmit(e);
                    if (acceptDefault === false) e.preventDefault();
                }, false);
                Framer.#registerFrames(framer.definition);
                Framer.#registerFramesetElement();
                let namespace = framer.definition.namespaces.lookupNamespace(HYPERFRAMESET_URN);
                layoutElements.register(namespace);
                transcluder.registerElement(namespace, "transclude", HTransclude);
                transcluder.registerElement(namespace, "frame", HFrame);
                this.framesetReady.resolve();
            }, () => framer.framesetReady.promise.then(() => {
                let changeset = framer.currentChangeset;
                if (changeset) {
                    let state = HistoryState.create(changeset, "", document$1.URL);
                    navigation.updateCurrentEntry({
                        state: state.settings
                    });
                }
                navigation.addEventListener("navigate", e => {
                    if (!e.canIntercept) return;
                    if (e.navigationType === "traverse") {
                        e.intercept({
                            handler: () => {
                                let settings = navigation.currentEntry.getState();
                                if (!HistoryState.isValid(settings)) return;
                                let state = new HistoryState(settings);
                                framer.onPopState(state.getData());
                            }
                        });
                    }
                });
            }), () => {
                Framer.#notify({
                    module: "frameset",
                    type: "enteredState",
                    stage: "after",
                    url: document$1.URL
                });
            }, () => cssReady() ]);
        }
        framesetEntered(frameset) {
            this.frameset = frameset;
            let url = document$1.URL;
            if (url === this.framesetURL) return;
            this.currentChangeset = frameset.lookup(url, {
                referrer: document$1.referrer
            });
            console.debug("framesetEntered: lookup returned", this.currentChangeset, "for", url);
            if (!this.currentChangeset && this.options.lookup) {
                let target = this.options.lookup(url);
                if (target) this.currentChangeset = Framer.#inferChangeset(url, target);
                console.debug("framesetEntered: options.lookup returned", this.currentChangeset);
            }
        }
        framesetLeft(frameset) {
            delete this.frameset;
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
            if (e.button != 0) return;
            if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
            let linkElement = closest(e.target, "a, [link]");
            if (!linkElement) return;
            let hyperlink;
            if (linkElement.localName === "a") hyperlink = linkElement; else {
                hyperlink = find$1("a, link", linkElement);
                if (!hyperlink) hyperlink = closest("a", linkElement);
                if (!hyperlink) return;
            }
            let href = hyperlink.getAttribute("href");
            if (!href) return;
            let baseURL = URLux.create(document$1.URL);
            let url = baseURL.resolve(href);
            let details = {
                url: url,
                element: hyperlink
            };
            this.triggerRequestNavigation(details.url, details);
            return false;
        }
        onSubmit(e) {
            let form = e.target;
            if (form.target) return;
            let baseURL = URLux.create(document$1.URL);
            let action = baseURL.resolve(form.action);
            let details = {
                element: form
            };
            let method = lc(form.method);
            switch (method) {
              case "get":
                let oURL = URLux.create(action);
                let query = Framer.#encode(form);
                details.url = oURL.nosearch + (oURL.search || "?") + query + oURL.hash;
                break;

              default:
                return;
            }
            this.triggerRequestNavigation(details.url, details);
            return false;
        }
        triggerRequestNavigation(url, details) {
            Thenfu.defer(() => {
                let event = new CustomEvent("requestnavigation", {
                    bubbles: true,
                    cancelable: true,
                    detail: details.url
                });
                let acceptDefault = details.element.dispatchEvent(event);
                if (acceptDefault !== false) {
                    location.assign(details.url);
                }
            });
        }
        onRequestNavigation(e, frame) {
            if (!frame) throw Error("Invalid frame / frameset in onRequestNavigation");
            let url = e.detail;
            let details = {
                url: url,
                element: e.target
            };
            let framer = this;
            if (!frame.isFrameset) {
                if (framer.requestNavigation(frame, url, details)) return false;
                return;
            }
            let baseURL = URLux.create(document$1.URL);
            let oURL = URLux.create(url);
            if (oURL.origin != baseURL.origin) return;
            let isPageLink = oURL.nohash === baseURL.nohash;
            if (isPageLink) {
                framer.onPageLink(url, details);
                return false;
            }
            let frameset = frame;
            let framesetScope = framer.lookup(url);
            if (!framesetScope || !framer.compareFramesetScope(framesetScope)) return;
            if (framer.requestNavigation(frameset, url, details)) return false;
        }
        requestNavigation(frame, url, details) {
            let changeset = frame.lookup(url, details);
            if (changeset === "" || changeset === true) return true;
            if (changeset == null || changeset === false) return false;
            this.load(url, changeset, frame.isFrameset);
            return true;
        }
        onPageLink(url, details) {
            console.warn("Ignoring on-same-page links for now.");
        }
        navigate(url, changeset) {
            return this.load(url, changeset, true);
        }
        load(url, changeset, changeState) {
            let framer = this;
            let mustNotify = changeState || changeState === 0;
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
                if (mustNotify) return Framer.#notify({
                    module: "frameset",
                    type: "leftState",
                    stage: "before",
                    url: document$1.URL
                });
            }, () => {
                forEach(frames, frame => {
                    frame.setAttribute("src", fullURL);
                });
            }, () => httpProxy.load(nohash, request).then(resp => {
                response = resp;
            }), () => {
                if (changeState) {
                    let state = HistoryState.create(changeset, "", url);
                    history.pushState(null, "", url);
                    navigation.updateCurrentEntry({
                        state: state.settings
                    });
                }
            }, () => {
                if (mustNotify) return Framer.#notify({
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
            this.load(url, changeset, 0);
        }
        lookup(docURL) {
            if (!this.options.lookup) {
                if (docURL.indexOf(this.scope) === 0) return {
                    scope: this.scope,
                    framesetURL: this.framesetURL
                };
                return false;
            }
            let result = this.options.lookup(docURL);
            if (result == null || result === false) return false;
            if (typeof result === "string") result = Framer.#implyFramesetScope(result, docURL);
            if (typeof result !== "object" || !result.scope || !result.framesetURL) throw Error("Unexpected result from frameset lookup");
            return result;
        }
        detect(srcDoc) {
            if (!this.options.detect) return;
            let result = this.options.detect(srcDoc);
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
            }, () => Framer.#insertMarkers(dstDoc.URL, definition.src, false), () => {
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
            let dstHead = dstDoc.head;
            let framesetMarker = Framer.#getFramesetMarker(dstDoc);
            if (!framesetMarker) throw Error(`No ${FRAMESET_REL} marker found. `);
            let selfMarker = Framer.#getSelfMarker(dstDoc);
            if (isFrameset) Framer.#removeBetween(framesetMarker, selfMarker); else Framer.#removeBetween(selfMarker);
        }
        static #removeBetween(exclusiveStart, exclusiveEnd) {
            let node = exclusiveStart.nextSibling;
            while (node && node !== exclusiveEnd) {
                let next = node.nextSibling;
                if (!(node.localName === "script" && (!node.type || /^text\/javascript/i.test(node.type)))) {
                    node.remove();
                }
                node = next;
            }
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
                    if (isFrameset) return;
                    if (!srcNode.innerHTML) return;
                    break;

                  case "link":
                    break;

                  case "meta":
                    if (srcNode.httpEquiv) return;
                    break;

                  case "style":
                    break;

                  case "script":
                    if (!isFrameset) return;
                    if (!srcNode.type || /^text\/javascript$/i.test(srcNode.type)) srcNode.type = "text/javascript?disabled";
                    break;
                }
                if (isFrameset) insertNode("beforebegin", selfMarker, srcNode); else insertNode("beforeend", dstHead, srcNode);
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
            return find$1(`link[rel~=${FRAMESET_REL}]`, doc.head);
        }
        static #getSelfMarker(doc) {
            if (!doc) doc = document$1;
            return find$1(`link[rel~=${SELF_REL}]`, doc.head);
        }
        static #insertMarkers(selfURL, framesetURL, isFrameset) {
            let head = document$1.head;
            let framesetMarker = document$1.createElement("link");
            framesetMarker.rel = FRAMESET_REL;
            framesetMarker.href = framesetURL;
            let selfMarker = Framer.#getSelfMarker();
            if (!selfMarker) {
                selfMarker = document$1.createElement("link");
                selfMarker.rel = SELF_REL;
                selfMarker.href = selfURL;
            }
            if (isFrameset) {
                head.insertBefore(framesetMarker, head.firstChild);
                head.appendChild(selfMarker);
            } else {
                head.insertBefore(selfMarker, head.firstChild);
                head.insertBefore(framesetMarker, selfMarker);
            }
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
        static #registerFrames(framesetDef) {
            forOwn(framesetDef.frames, (o, key) => {
                transcludeDefinitions.set(key, o);
            });
        }
        static #registerFramesetElement() {
            let cssText = [ "html, body { margin: 0; padding: 0; }", "html { width: 100%; height: 100%; }" ];
            let style = document$1.createElement("style");
            style.textContent = cssText.join("\n");
            document$1.head.insertBefore(style, document$1.head.firstChild);
            let frameset = new HFrameset(document$1.body);
            frameset.connectedCallback();
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
        connectedCallback() {
            this.element.addEventListener("requestnavigation", e => {
                if (e.defaultPrevented) return;
                if (!this.element.behavior.lookup) return;
                let acceptDefault = framer.onRequestNavigation(e, this);
                if (acceptDefault === false) e.preventDefault();
            });
            framer.framesetEntered(this);
            this.render();
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
            httpProxy: httpProxy,
            CustomNamespace: CustomNamespace,
            filters: filters,
            decoders: decoders,
            processors: processors,
            controllers: controllers,
            transcluder: transcluder,
            transcludeDefinitions: transcludeDefinitions,
            framer: framer,
            CSSDecoder: CSSDecoder,
            MicrodataDecoder: MicrodataDecoder,
            Microdata: Microdata,
            JSONDecoder: JSONDecoder,
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
