(function() {
    "use strict";
    let dateFormat = function() {
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
            return mask.replace(token, $0 => $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1));
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
        return str ? Array.from(str.split("-"), (part, i) => i === 0 ? part : ucFirst(part)).join("") : "";
    }
    function kebabCase(str) {
        return str ? Array.from(str.split(/(?=[A-Z])/), (part, i) => i === 0 ? part : lc(part)).join("-") : "";
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
    function find$3(a, fn, context) {
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
        forOwn(src, (val, key, object) => {
            if (typeof this[key] !== "undefined") return;
            this[key] = object[key];
        }, dest);
        return dest;
    }
    function assign(dest, src) {
        forOwn(src, (val, key, object) => {
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
        find: find$3,
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
    class Registry extends Map {
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
    const frameRate = 60;
    const frameInterval = 1e3 / frameRate;
    const frameExecutionRatio = .75;
    const frameExecutionTimeout = frameInterval * frameExecutionRatio;
    let performance = window.performance && window.performance.now ? window.performance : Date.now ? Date : {
        now: function() {
            return (new Date).getTime();
        }
    };
    let schedule = window.requestAnimationFrame;
    let asapQueue = [];
    let deferQueue = [];
    let scheduled = false;
    let processing = false;
    function asap$1(fn) {
        asapQueue.push(fn);
        if (processing) return;
        if (scheduled) return;
        schedule(processTasks);
        scheduled = true;
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
        setTimeout(() => {
            try {
                fn();
            } catch (error) {
                window.reportError(error);
            }
            processTasks();
        }, timeout);
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
    let lastStartTime = performance.now();
    function getTime(bRemaining) {
        let delta = performance.now() - lastStartTime;
        if (!bRemaining) return delta;
        return frameExecutionTimeout - delta;
    }
    let idle = true;
    function processTasks() {
        let startTime = performance.now();
        if (!idle) updateStats(frameStats, startTime - lastStartTime);
        lastStartTime = startTime;
        processing = true;
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
            if (currTime >= frameExecutionTimeout) break;
        }
        scheduled = false;
        processing = false;
        if (currTime) updateStats(execStats, currTime);
        asapQueue = asapQueue.concat(deferQueue);
        deferQueue = [];
        if (asapQueue.length) {
            schedule(processTasks);
            scheduled = true;
            idle = false;
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
    function isThenable(value) {
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
        if (Task.getTime(true) > 0) {
            settle(resolver, value);
        } else {
            Task.asap(() => settle(resolver, value));
        }
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
                while (i < length) {
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
                    if (i >= length) break;
                    let currTime = Task.getTime(true);
                    if (currTime <= 0) {
                        Task.asap(() => process(acc));
                        return;
                    }
                }
                resolve(acc);
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
    const document$b = window.document;
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
            this.supported = attrName in document$b.createElement(tagName);
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
    let document$a = window.document;
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
    const nodeData$1 = new WeakMap;
    function setData(node, data) {
        nodeData$1.set(node, data);
    }
    function hasData(node) {
        return nodeData$1.has(node);
    }
    function getData(node) {
        return nodeData$1.get(node);
    }
    function getTagName(el) {
        return el && el.nodeType === 1 ? lc(el.tagName) : "";
    }
    function matches$2(element, selector, scope) {
        if (!(element && element.nodeType === 1)) return false;
        if (typeof selector === "function") return selector(element, scope);
        return scopeify(absSelector => element.matches(absSelector), selector, scope);
    }
    function closest$1(element, selector, scope) {
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
        if (!doc) doc = document$a;
        if (!doc.getElementById) throw Error("Context for findId() must be a Document node");
        return doc.getElementById(id);
    }
    function findAll$1(selector, node, scope, inclusive) {
        if (!node) node = document$a;
        if (!node.querySelectorAll) return [];
        if (scope && !scope.nodeType) scope = node;
        return scopeify(absSelector => {
            let result = Array.from(node.querySelectorAll(absSelector));
            if (inclusive && node.nodeType === 1 && node.matches(absSelector)) result.unshift(node);
            return result;
        }, selector, scope);
    }
    function find$2(selector, node, scope, inclusive) {
        if (!node) node = document$a;
        if (!node.querySelector) return null;
        if (scope && !scope.nodeType) scope = node;
        return scopeify(absSelector => {
            if (inclusive && node.nodeType === 1 && node.matches(absSelector)) return node;
            return node.querySelector(absSelector);
        }, selector, scope);
    }
    function siblings(conf, refNode, conf2, refNode2) {
        conf = lc(conf);
        if (conf2) {
            conf2 = lc(conf2);
            if (conf === "ending" || conf === "before") throw Error("siblings() startNode looks like stopNode");
            if (conf2 === "starting" || conf2 === "after") throw Error("siblings() stopNode looks like startNode");
            if (!refNode2 || refNode2.parentNode !== refNode.parentNode) throw Error("siblings() startNode and stopNode are not siblings");
        }
        let nodeList = [];
        if (!refNode || !refNode.parentNode) return nodeList;
        let node, stopNode, first = refNode.parentNode.firstChild;
        switch (conf) {
          case "starting":
            node = refNode;
            break;

          case "after":
            node = refNode.nextSibling;
            break;

          case "ending":
            node = first;
            stopNode = refNode.nextSibling;
            break;

          case "before":
            node = first;
            stopNode = refNode;
            break;

          default:
            throw Error(`${conf} is not a valid configuration in siblings()`);
        }
        if (conf2) switch (conf2) {
          case "ending":
            stopNode = refNode2.nextSibling;
            break;

          case "before":
            stopNode = refNode2;
            break;
        }
        if (!node) return nodeList;
        for (;node && node !== stopNode; node = node.nextSibling) nodeList.push(node);
        return nodeList;
    }
    function contains(node, otherNode) {
        return node.contains(otherNode);
    }
    function dispatchEvent(target, type, params) {
        if (typeof type === "object") {
            params = type;
            type = params.type;
        }
        if (typeof type !== "string") throw Error("trigger() called with invalid event type");
        let event = new CustomEvent(type, {
            bubbles: params && "bubbles" in params ? !!params.bubbles : true,
            cancelable: params && "cancelable" in params ? !!params.cancelable : true,
            detail: params && params.detail
        });
        if (params) defaults(event, params);
        return target.dispatchEvent(event);
    }
    let managedEvents = [];
    function manageEvent(type) {
        if (includes(managedEvents, type)) return;
        managedEvents.push(type);
        window.addEventListener(type, event => {
            event.stopPropagation = () => {
                console.warn("event.stopPropagation() is a no-op");
            };
            event.stopImmediatePropagation = () => {
                console.warn("event.stopImmediatePropagation() is a no-op");
            };
        }, true);
    }
    function isVisible(element) {
        return !closest$1(element, "[hidden]");
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
            observer.observe(document$a, {
                attributes: true,
                attributeFilter: [ "hidden" ],
                subtree: true
            });
        });
    }
    function insertNode$1(conf, refNode, node) {
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
        if (!doc) doc = document$a;
        let frag = doc.createDocumentFragment();
        let node;
        while (node = parentNode.firstChild) frag.appendChild(doc.adoptNode(node));
        return frag;
    }
    function checkStyleSheets() {
        return every(findAll$1("link"), node => {
            if (!node.rel || !/^stylesheet$/i.test(node.rel)) return true;
            if (node.type && !/^text\/css$/i.test(node.type)) return true;
            if (node.disabled) return true;
            if (node.readyState) return readyStateLookup[node.readyState];
            let sheet = node.sheet;
            if (!sheet) return false;
            try {
                let rules = sheet.rules || sheet.cssRules;
                return true;
            } catch (error) {
                switch (error.name) {
                  case "NS_ERROR_DOM_SECURITY_ERR":
                  case "SecurityError":
                    return true;

                  case "NS_ERROR_DOM_INVALID_ACCESS_ERR":
                  case "InvalidAccessError":
                    return false;

                  default:
                    return true;
                }
            }
        });
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
        if (!srcDoc) srcDoc = document$a;
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
    function scrollToId(id) {
        if (id) {
            let el = findId(id);
            if (el) el.scrollIntoView(true);
        } else window.scroll(0, 0);
    }
    let readyStateLookup = {
        uninitialized: false,
        loading: false,
        interactive: false,
        loaded: true,
        complete: true
    };
    let domReady = function() {
        let readyState = document$a.readyState;
        let loaded = readyState ? readyStateLookup[readyState] : true;
        let queue = [];
        function domReady(fn) {
            if (typeof fn !== "function") return;
            queue.push(fn);
            if (loaded) processQueue();
        }
        function processQueue() {
            forEach(queue, fn => {
                setTimeout(fn);
            });
            queue.length = 0;
        }
        let events = {
            DOMContentLoaded: document$a,
            load: window
        };
        if (!loaded) forOwn(events, (node, type) => {
            node.addEventListener(type, onLoaded, false);
        });
        return domReady;
        function onLoaded(e) {
            loaded = true;
            forOwn(events, (node, type) => {
                node.removeEventListener(type, onLoaded, false);
            });
            processQueue();
        }
    }();
    var DOM = Object.freeze({
        __proto__: null,
        adoptContents: adoptContents,
        checkStyleSheets: checkStyleSheets,
        cloneDocument: cloneDocument,
        closest: closest$1,
        contains: contains,
        copyAttributes: copyAttributes,
        createDocument: createDocument,
        createHTMLDocument: createHTMLDocument,
        dispatchEvent: dispatchEvent,
        find: find$2,
        findAll: findAll$1,
        findId: findId,
        getData: getData,
        getTagName: getTagName,
        hasData: hasData,
        insertNode: insertNode$1,
        isVisible: isVisible,
        manageEvent: manageEvent,
        matches: matches$2,
        ready: domReady,
        removeAttributes: removeAttributes,
        scrollToId: scrollToId,
        setData: setData,
        siblings: siblings,
        uniqueId: uniqueId,
        uniqueIdAttr: nodeIdProperty,
        whenVisible: whenVisible
    });
    /*!
	 * scriptQueue
	 * Copyright 2009-2016 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    let document$9 = window.document;
    let queue = [], emptying = false;
    let testScript = document$9.createElement("script"), supportsSync = testScript.async === true;
    let scriptQueue = {
        push: function(node) {
            return new Promise((resolve, reject) => {
                if (emptying) throw Error("Attempt to append script to scriptQueue while emptying");
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
                let script = document$9.createElement("script");
                if (node.src) addListeners();
                copyAttributes(script, node);
                script.text = node.text;
                if (script.getAttribute("defer")) {
                    script.removeAttribute("defer");
                    script.setAttribute("async", "");
                    console.warn("@defer not supported on scripts");
                }
                if (supportsSync && script.src && !script.hasAttribute("async")) script.async = false;
                script.type = "text/javascript";
                let enabledFu = Promise.withResolvers();
                let prev = queue[queue.length - 1], prevScript = prev && prev.script;
                let trigger;
                if (prev) {
                    if (prevScript.hasAttribute("async") || script.src && supportsSync && !script.hasAttribute("async")) trigger = prev.enabled; else trigger = prev.complete;
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
                    insertNode$1("replace", node, script);
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
        },
        empty: function() {
            return new Promise((resolve, reject) => {
                emptying = true;
                if (queue.length <= 0) {
                    emptying = false;
                    resolve();
                    return;
                }
                forEach(queue, (value, i) => {
                    let acceptCallback = () => {
                        if (queue.length <= 0) {
                            emptying = false;
                            resolve();
                        }
                    };
                    value.complete.then(acceptCallback, acceptCallback);
                });
            });
        }
    };
    class BindingDefinition {
        constructor(desc) {
            assign(this, desc);
            if (!this.prototype) {
                if (desc.prototype) this.prototype = desc.prototype; else this.prototype = null;
            }
            if (!this.handlers) this.handlers = [];
        }
    }
    /*!
	 Binding
	 (c) Sean Hogan, 2008,2012,2013,2014,2016
	 Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	*/    let document$8 = window.document;
    class Binding {
        constructor(definition) {
            let binding = this;
            binding.definition = definition;
            binding.object = Object.create(definition.prototype);
            binding.handlers = definition.handlers ? Array.from(definition.handlers) : [];
            binding.listeners = [];
            binding.inDocument = null;
        }
    }
    assign(Binding.prototype, {
        attach: function(element) {
            let binding = this;
            let definition = binding.definition;
            let object = binding.object;
            object.element = element;
            binding.attachedCallback();
            forEach(binding.handlers, handler => {
                let listener = binding.addHandler(handler);
                if (listener) binding.listeners.push(listener);
            });
        },
        attachedCallback: function() {
            let binding = this;
            let definition = binding.definition;
            let object = binding.object;
            binding.inDocument = false;
            if (definition.attached) definition.attached.call(object, binding.handlers);
        },
        enteredDocumentCallback: function() {
            let binding = this;
            let definition = binding.definition;
            let object = binding.object;
            binding.inDocument = true;
            if (definition.enteredDocument) definition.enteredDocument.call(object);
        },
        leftDocumentCallback: function() {
            let binding = this;
            let definition = binding.definition;
            let object = binding.object;
            binding.inDocument = false;
            if (definition.leftDocument) definition.leftDocument.call(object);
        },
        detach: function() {
            let binding = this;
            let definition = binding.definition;
            let object = binding.object;
            forEach(binding.listeners, binding.removeListener, binding);
            binding.listeners.length = 0;
            binding.detachedCallback();
        },
        detachedCallback: function() {
            let binding = this;
            let definition = binding.definition;
            let object = binding.object;
            binding.inDocument = null;
            if (definition.detached) definition.detached.call(object);
        },
        addHandler: function(handler) {
            let binding = this;
            let object = binding.object;
            let element = object.element;
            let type = handler.type;
            let capture = handler.eventPhase === 1;
            if (capture) {
                console.warn("Capture phase for events not supported");
                return;
            }
            Binding.manageEvent(type);
            let fn = event => {
                if (fn.normalize) event = fn.normalize(event);
                try {
                    return handleEvent.call(object, event, handler);
                } catch (error) {
                    window.reportError(error);
                    throw error;
                }
            };
            fn.type = type;
            fn.capture = capture;
            element.addEventListener(type, fn, capture);
            return fn;
        },
        removeListener: function(fn) {
            let binding = this;
            let object = binding.object;
            let element = object.element;
            let type = fn.type;
            let capture = fn.capture;
            element.removeEventListener(type, fn, capture);
        }
    });
    assign(Binding, {
        getInterface: function(element) {
            let nodeData = getData(element);
            if (nodeData && nodeData.object) return nodeData;
        },
        enteredDocumentCallback: function(element) {
            let binding = Binding.getInterface(element);
            if (!binding) return;
            binding.enteredDocumentCallback();
        },
        leftDocumentCallback: function(element) {
            let binding = Binding.getInterface(element);
            if (!binding) return;
            binding.leftDocumentCallback();
        },
        managedEvents: [],
        manageEvent: function(type) {
            if (includes(this.managedEvents, type)) return;
            this.managedEvents.push(type);
            window.addEventListener(type, event => {
                event.stopPropagation = () => {
                    console.debug("event.stopPropagation() is a no-op");
                };
                event.stopImmediatePropagation = () => {
                    console.debug("event.stopImmediatePropagation() is a no-op");
                };
            }, true);
        }
    });
    function handleEvent(event, handler) {
        let bindingImplementation = this;
        let target = event.target;
        let current = bindingImplementation.element;
        if (!hasData(current)) throw Error("Handler called on non-bound element");
        if (!matchesEvent(handler, event, true)) return;
        let delegator = current;
        if (handler.delegator) {
            let el = closest$1(target, handler.delegator, current);
            if (!el) return;
            delegator = el;
        }
        switch (handler.eventPhase) {
          case 1:
            throw Error("Capture phase for events not supported");

          case 2:
            if (delegator !== target) return;
            break;

          case 3:
            if (delegator === target) return;
            break;

          default:
            break;
        }
        if (handler.action) {
            let result = handler.action.call(bindingImplementation, event, delegator);
            if (result === false) event.preventDefault();
        }
    }
    let convertXBLHandler = function(config) {
        let handler = {};
        handler.type = config.event;
        if (null == config.event) console.warn("Invalid handler: event property undeclared");
        function lookupValue(attrName, lookup) {
            let attrValue = config[attrName];
            let result;
            if (attrValue) {
                result = lookup[attrValue];
                if (null == result) console.info(`Ignoring invalid property ${attrName}: ${attrValue}`);
            }
            return result;
        }
        handler.eventPhase = lookupValue("phase", {
            capture: 1,
            target: 2,
            bubble: 3,
            "default-action": 2019716164
        }) || 0;
        handler.preventDefault = lookupValue("default-action", {
            cancel: true,
            perform: false
        }) || false;
        handler.stopPropagation = lookupValue("propagate", {
            stop: true,
            continue: false
        }) || false;
        function attrText_to_numArray(attr) {
            let attrText = config[attr];
            if (!attrText) return null;
            let result = [];
            let strings = attrText.split(/\s+/);
            for (let n = strings.length, i = 0; i < n; i++) {
                let text = strings[i];
                let num = Number(text);
                if (NaN != num && Math.floor(num) == num) result.push(num);
            }
            return result;
        }
        handler.button = attrText_to_numArray("button");
        handler.clickCount = attrText_to_numArray("click-count");
        handler.key = config.key;
        handler.keyLocation = [];
        let keyLocationText = config["key-location"];
        let keyLocationStrings = keyLocationText ? keyLocationText.split(/\s+/) : [];
        for (let n = keyLocationStrings.length, i = 0; i < n; i++) {
            let text = keyLocationStrings[i];
            switch (text) {
              case "standard":
                handler.keyLocation.push(KeyboardEvent.DOM_KEY_LOCATION_STANDARD);
                break;

              case "left":
                handler.keyLocation.push(KeyboardEvent.DOM_KEY_LOCATION_LEFT);
                break;

              case "right":
                handler.keyLocation.push(KeyboardEvent.DOM_KEY_LOCATION_RIGHT);
                break;

              case "numpad":
                handler.keyLocation.push(KeyboardEvent.DOM_KEY_LOCATION_NUMPAD);
                break;
            }
        }
        handler.text = config.text;
        handler.filter = new RegExp(config.filter, "");
        handler.attrName = config["attr-name"];
        handler.attrChange = [];
        let attrChangeText = config["attr-change"];
        let attrChangeStrings = attrChangeText ? attrChangeText.split(/\s+/) : [];
        for (let n = attrChangeStrings.length, i = 0; i < n; i++) {
            let text = attrChangeStrings[i];
            switch (text) {
              case "modification":
                handler.attrChange.push(MutationEvent.MODIFICATION);
                break;

              case "addition":
                handler.attrChange.push(MutationEvent.ADDITION);
                break;

              case "removal":
                handler.attrChange.push(MutationEvent.REMOVAL);
                break;
            }
        }
        handler.prevValue = config["prev-value"];
        handler.newValue = config["new-value"];
        if (null != config["modifiers"]) {
            handler.modifiers = [];
            let modifiersText = config["modifiers"];
            let modifiersStrings = modifiersText ? modifiersText.split(/\s+/) : [];
            for (let n = modifiersStrings, i = 0; i < n; i++) {
                let text = modifiersStrings[i];
                let m;
                m = /^([+-]?)([a-z]+)(\??)$/.exec(text);
                if (m) {
                    let key = m[2];
                    let condition = 1;
                    if (m[3]) condition = 0; else if (m[1] == "+") condition = 1; else if (m[1] == "-") condition = -1;
                    handler.modifiers.push({
                        key: key,
                        condition: condition
                    });
                }
            }
        } else handler.modifiers = null;
        handler.action = config.action;
        return handler;
    };
    let EventModules = {};
    EventModules.AllEvents = {};
    registerModule("FocusEvents", "focus blur focusin focusout");
    registerModule("MouseEvents", "click dblclick mousedown mouseup mouseover mouseout mousemove mousewheel");
    registerModule("KeyboardEvents", "keydown keyup");
    registerModule("UIEvents", "load unload abort error select change submit reset resize scroll");
    function registerModule(modName, evTypes) {
        let mod = {};
        EventModules[modName] = mod;
        forEach(words(evTypes), registerEvent, mod);
    }
    function registerEvent(evType) {
        EventModules.AllEvents[evType] = true;
        this[evType] = true;
    }
    let matchesEvent = function(handler, event, ignorePhase) {
        let allEvents = EventModules.AllEvents;
        let mouseEvents = EventModules.MouseEvents;
        let keyboardEvents = EventModules.KeyboardEvents;
        let uiEvents = EventModules.UIEvents;
        if (event.type != handler.type) return false;
        if (!ignorePhase && !phaseMatchesEvent(handler.eventPhase, event)) return false;
        let evType = event.type;
        if (evType in mouseEvents) {
            if (handler.button && handler.button.length) {
                if (!includes(handler.button, event.button) == -1) return false;
            }
            if (handler.clickCount && handler.clickCount.length) {
                let count = 1;
                if ("click" == event.type) count = event.detail ? event.detail : 1;
                if (!includes(handler.clickCount, count)) return false;
            }
            if (handler.modifiers) {
                if (!modifiersMatchEvent(handler.modifiers, event)) return false;
            }
        }
        let ourKeyIdentifiers = {
            Backspace: "U+0008",
            Delete: "U+007F",
            Escape: "U+001B",
            Space: "U+0020",
            Tab: "U+0009"
        };
        if (evType in keyboardEvents) {
            if (handler.key) {
                let success = false;
                let keyId = event.keyIdentifier;
                if (/^U\+00....$/.test(keyId)) {
                    keyId = keyId.replace(/^U\+00/, "U+");
                }
                if (handler.key != keyId && ourKeyIdentifiers[handler.key] != keyId) return false;
            }
            if (handler.modifiers || handler.key) {
                if (!modifiersMatchEvent(handler.modifiers || [ "none" ], event)) return false;
            }
        }
        if (evType in uiEvents) {}
        if (!(evType in allEvents)) {}
        return true;
    };
    let modifiersMatchEvent = function(modifiers, event) {
        let evMods = {
            control: event.ctrlKey,
            shift: event.shiftKey,
            alt: event.altKey,
            meta: event.metaKey
        };
        let evMods_any = event.ctrlKey || event.shiftKey || event.altKey || event.metaKey;
        let evMods_none = !evMods_any;
        let any = false;
        if (modifiers) {
            for (let i = 0, n = modifiers.length; i < n; i++) {
                let modifier = modifiers[i];
                switch (modifier.key) {
                  case "none":
                    if (evMods_any) return false;
                    break;

                  case "any":
                    any = true;
                    break;

                  default:
                    let active = evMods[modifier.key];
                    switch (modifier.condition) {
                      case -1:
                        if (active) return false;
                        break;

                      case 0:
                        if (active) evMods[modifier.key] = -1;
                        break;

                      case 1:
                        if (!active) return false;
                        evMods[modifier.key] = -1;
                        break;
                    }
                }
            }
        }
        if (any) return true;
        for (let key in evMods) {
            if (evMods[key] > 0) return false;
        }
        return true;
    };
    function attachBinding(definition, element) {
        let binding;
        if (hasData(element)) {
            binding = getData(element);
            if (binding.definition !== definition) throw Error("Mismatch between definition and binding already present");
            console.warn("Binding definition applied when binding already present");
            return binding;
        }
        binding = new Binding(definition);
        setData(element, binding);
        binding.attach(element);
        return binding;
    }
    function enableBinding(element) {
        if (!hasData(element)) throw Error("No binding attached to element");
        let binding = getData(element);
        if (!binding.inDocument) binding.enteredDocumentCallback();
    }
    function detachBinding(element) {
        if (!hasData(element)) throw Error("No binding attached to element");
        let binding = getData(element);
        if (binding.inDocument) binding.leftDocumentCallback();
        binding.detach();
        setData(element, null);
    }
    assign(Binding, {
        attachBinding: attachBinding,
        enableBinding: enableBinding,
        detachBinding: detachBinding
    });
    /*!
	 Sprocket
	 (c) Sean Hogan, 2008,2012,2013,2014,2016,2019
	 Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	*/    let document$7 = window.document;
    function BindingRule(selector, bindingDefn) {
        this.selector = selector;
        this.definition = bindingDefn;
    }
    let bindingRules = [];
    function findAllBoundElements(root, bExcludeRoot) {
        let selector = Array.from(bindingRules, function(rule) {
            return rule.selector;
        }).join(", ");
        let result = findAll$1(selector, root);
        if (!bExcludeRoot && matches$2(root, selector)) result.unshift(root);
        return result;
    }
    let started = false;
    let manualDOM = false;
    let start = function(options) {
        if (started) throw Error("sprockets management has already started");
        started = true;
        if (options && options.manual) manualDOM = true;
        nodeInserted(document$7.body);
        if (!manualDOM) observe(nodeInserted, nodeRemoved);
    };
    let create = function(prototype) {
        let constructor = function(element) {
            return cast(element, constructor);
        };
        constructor.prototype = prototype;
        return constructor;
    };
    let evolve = function(baseDefn, ariaProperties) {
        let prototype = Object.create(baseDefn.prototype);
        let sub = create(prototype);
        let baseProperties = baseDefn.prototype.__properties__ || {};
        let subProperties = prototype.__properties__ = {};
        forOwn(baseProperties, function(desc, name) {
            subProperties[name] = Object.create(desc);
        });
        if (ariaProperties) extendAriaProperties(sub, ariaProperties);
        return sub;
    };
    let extendAriaProperties = function(sprocket, ariaProperties) {
        let prototype = sprocket.prototype;
        let definition = prototype.__properties__ || (prototype.__properties__ = {});
        forOwn(ariaProperties, function(desc, name) {
            switch (typeof desc) {
              case "object":
                let propDesc = definition[name] || (definition[name] = {});
                assign(propDesc, desc);
                Object.defineProperty(prototype, name, {
                    get: function() {
                        throw Error("Attempt to get an ARIA property");
                    },
                    set: function() {
                        throw Error("Attempt to set an ARIA property");
                    }
                });
                break;

              default:
                prototype[name] = desc;
                break;
            }
        });
    };
    let registerElement = function(tagName, definition) {
        if (started) throw Error("sprockets management already started");
        if (definition.rules) console.warn("registerElement() does not support rules. Try registerComposite()");
        let bindingDefn = new BindingDefinition(definition);
        let selector = `${tagName}, [is=${tagName}]`;
        let rule = new BindingRule(selector, bindingDefn);
        bindingRules.push(rule);
        return rule;
    };
    let registerSprocket = function(selectorDescriptor, definition, callback) {
        let selector, composite;
        if (typeof selectorDescriptor === "string") {
            selector = selectorDescriptor;
            composite = document$7;
        } else {
            selector = selectorDescriptor.selector;
            composite = selectorDescriptor.composite;
        }
        let nodeData = getData(composite);
        if (!nodeData) {
            nodeData = {};
            setData(composite, nodeData);
        }
        let nodeRules = nodeData.rules;
        if (!nodeRules) nodeRules = nodeData.rules = [];
        let rule = new BindingRule(selector, definition);
        rule.callback = callback;
        nodeRules.unshift(rule);
    };
    let register = function(options, definition, callback) {
        return registerSprocket(options, definition, callback);
    };
    let registerComposite = function(tagName, compositeDefn) {
        let defn = assign({}, compositeDefn);
        let rules = defn.rules;
        delete defn.rules;
        if (!rules) console.warn("registerComposite() called without any sprocket rules. Try registerElement()");
        let onattached = defn.attached;
        defn.attached = function() {
            let object = this;
            if (rules) forEach(rules, function(rule) {
                let selector = {
                    composite: object.element
                };
                let definition = {};
                let callback;
                if (Array.isArray(rule)) {
                    selector.selector = rule[0];
                    definition = rule[1];
                    callback = rule[2];
                } else {
                    selector.selector = rule.selector;
                    definition = rule.definition;
                    callback = rule.callback;
                }
                registerSprocket(selector, definition, callback);
            });
            if (onattached) return onattached.call(this);
        };
        return registerElement(tagName, defn);
    };
    let registerComponent = function(tagName, definition, extras) {
        let compositeDefn = {
            prototype: definition.prototype
        };
        if (extras) {
            compositeDefn.handlers = extras.handlers;
            if (extras.sprockets) forEach(extras.sprockets, function(oldRule) {
                if (!compositeDefn.rules) compositeDefn.rules = [];
                let rule = {
                    selector: oldRule.matches,
                    definition: oldRule.sprocket,
                    callback: oldRule.enteredComponent
                };
                compositeDefn.rules.push(rule);
            });
            if (extras.callback) defaults(compositeDefn, extras.callback);
        }
        if (compositeDefn.rules) return registerComposite(tagName, compositeDefn); else return registerElement(tagName, compositeDefn);
    };
    let insertNode = function(conf, refNode, node) {
        if (!started) throw Error("sprockets management has not started yet");
        if (!manualDOM) throw Error("Must not use sprockets.insertNode: auto DOM monitoring");
        let doc = refNode.ownerDocument;
        if (doc !== document$7 || !contains(document$7, refNode)) throw Error("sprockets.insertNode must insert into `document`");
        if (doc.adoptNode) node = doc.adoptNode(node);
        let nodes = [ node ];
        if (node.nodeType === 11) nodes = Array.from(node.childNodes);
        switch (conf) {
          case "beforebegin":
            refNode.parentNode.insertBefore(node, refNode);
            break;

          case "afterend":
            refNode.parentNode.insertBefore(node, refNode.nextSibling);
            break;

          case "afterbegin":
            refNode.insertBefore(node, refNode.firstChild);
            break;

          case "beforeend":
            refNode.appendChild(node);
            break;

          case "replace":
            let parent = refNode.parentNode;
            let next = refNode.nextSibling;
            parent.removeChild(refNode);
            nodeRemoved(refNode);
            if (next) parent.insertBefore(node, next); else parent.appendChild(node);
            break;

          default:
            throw Error(`Unsupported configuration in sprockets.insertNode: ${conf}`);
        }
        forEach(nodes, nodeInserted);
        return node;
    };
    let removeNode = function(node) {
        if (!started) throw Error("sprockets management has not started yet");
        if (!manualDOM) throw Error("Must not use sprockets.insertNode: auto DOM monitoring");
        let doc = node.ownerDocument;
        if (doc !== document$7 || !contains(document$7, node)) throw Error("sprockets.removeNode must remove from `document`");
        node.parentNode.removeChild(node);
        nodeRemoved(node);
        return node;
    };
    let nodeInserted = function(node) {
        if (!started) throw Error("sprockets management has not started yet");
        if (node.nodeType !== 1) return;
        let bindees = findAllBoundElements(node);
        let composites = [];
        forEach(bindees, function(el) {
            some(bindingRules, function(rule) {
                if (!matches$2(el, rule.selector)) return false;
                let binding = Binding.attachBinding(rule.definition, el);
                if (binding && binding.rules) composites.push(el);
                return true;
            });
        });
        forEach(bindees, function(el) {
            Binding.enableBinding(el);
        });
        let composite = getComposite(node);
        if (composite) applyCompositedRules(node, composite);
        while (composite = composites.shift()) applyCompositedRules(composite);
        return;
        function applyCompositedRules(node, composite) {
            if (!composite) composite = node;
            let rules = getRules(composite);
            if (rules.length <= 0) return;
            let walker = createCompositeWalker(node, false);
            let el;
            while (el = walker.nextNode()) {
                forEach(rules, function(rule) {
                    let selector = rule.selector;
                    if (!matches$2(el, selector)) return;
                    let binding = Binding.attachBinding(rule.definition, el);
                    rule.callback.call(binding.object, el);
                });
            }
        }
        function getRules(composite) {
            let rules = [];
            let binding = getData(composite);
            forEach(binding.rules, function(rule) {
                if (!rule.callback) return;
                let clonedRule = assign({}, rule);
                clonedRule.composite = composite;
                rules.unshift(clonedRule);
            });
            return rules;
        }
    };
    let nodeRemoved = function(node) {
        if (!started) throw Error("sprockets management has not started yet");
        if (node.nodeType !== 1) return;
        let nodes = findAll$1("*", node);
        nodes.unshift(node);
        forEach(nodes, Binding.leftDocumentCallback);
    };
    let observe = function(onInserted, onRemoved) {
        let observer = new MutationObserver(function(mutations, observer) {
            if (!started) return;
            forEach(mutations, function(record) {
                if (record.type !== "childList") return;
                forEach(record.addedNodes, onInserted, sprockets);
                forEach(record.removedNodes, onRemoved, sprockets);
            });
        });
        observer.observe(document$7.body, {
            childList: true,
            subtree: true
        });
    };
    let innerMatches = function(element, sprocket, rule) {
        let binding = Binding.getInterface(element);
        if (binding) return prototypeMatchesSprocket(binding.object, sprocket);
        if (rule && matches$2(element, rule.selector)) return true;
        return false;
    };
    let matches$1 = function(element, sprocket, inComposite) {
        let composite;
        if (inComposite) {
            composite = getComposite(element);
            if (!composite) return false;
        }
        let rule = getMatchingSprocketRule(element.parentNode, sprocket, inComposite);
        return innerMatches(element, sprocket, rule);
    };
    let closest = function(element, sprocket, inComposite) {
        let composite;
        if (inComposite) {
            composite = getComposite(element);
            if (!composite) return;
        }
        let rule = getMatchingSprocketRule(element.parentNode, sprocket, inComposite);
        for (let node = element; node && node.nodeType === 1; node = node.parentNode) {
            if (innerMatches(node, sprocket, rule)) return node;
            if (node === composite) return;
        }
    };
    let findAll = function(element, sprocket) {
        let nodeList = [];
        let rule = getMatchingSprocketRule(element, sprocket);
        if (!rule) return nodeList;
        let walker = createCompositeWalker(element, true);
        let node;
        while (node = walker.nextNode()) {
            if (matches$2(node, rule.selector)) nodeList.push(node);
        }
        return nodeList;
    };
    let find$1 = function(element, sprocket) {
        let rule = getMatchingSprocketRule(element, sprocket);
        if (!rule) return null;
        let walker = createCompositeWalker(element, true);
        let node;
        while (node = walker.nextNode()) {
            if (matches$2(node, rule.selector)) return node;
        }
        return null;
    };
    let cast = function(element, sprocket) {
        let object = getInterface(element);
        if (prototypeMatchesSprocket(object, sprocket)) return object;
        throw Error("Attached sprocket is not compatible");
    };
    let getInterface = function(element) {
        let binding = Binding.getInterface(element);
        if (binding) return binding.object;
        let rule = getSprocketRule(element);
        if (!rule) throw Error("No sprocket declared");
        binding = Binding.attachBinding(rule.definition, element);
        return binding.object;
    };
    let isComposite = function(node) {
        if (!hasData(node)) return false;
        let nodeData = getData(node);
        if (!nodeData.rules) return false;
        return true;
    };
    let getComposite = function(element) {
        for (let node = element; node; node = node.parentNode) {
            if (isComposite(node)) return node;
        }
    };
    function getSprocketRule(element) {
        let sprocketRule;
        let composite = getComposite(element);
        sprocketRule = getRuleFromComposite(composite, element);
        if (sprocketRule) return sprocketRule;
        return getRuleFromComposite(document$7, element);
    }
    function getRuleFromComposite(composite, element) {
        let sprocketRule;
        let nodeData = getData(composite);
        some(nodeData.rules, function(rule) {
            if (!matches$2(element, rule.selector)) return false;
            sprocketRule = {
                composite: composite
            };
            defaults(sprocketRule, rule);
            return true;
        });
        if (sprocketRule) return sprocketRule;
    }
    function getMatchingSprocketRule(element, sprocket, inComposite) {
        let sprocketRule;
        let composite = getComposite(element);
        sprocketRule = getMatchingRuleFromComposite(composite, sprocket);
        if (inComposite || sprocketRule) return sprocketRule;
        return getMatchingRuleFromComposite(document$7, sprocket);
    }
    function getMatchingRuleFromComposite(composite, sprocket) {
        let sprocketRule;
        let nodeData = getData(composite);
        some(nodeData.rules, function(rule) {
            if (typeof sprocket === "string") {
                if (rule.definition.prototype.role !== sprocket) return false;
            } else {
                if (sprocket.prototype !== rule.definition.prototype && !sprocket.prototype.isPrototypeOf(rule.definition.prototype)) return false;
            }
            sprocketRule = {
                composite: composite
            };
            defaults(sprocketRule, rule);
            return true;
        });
        return sprocketRule;
    }
    function prototypeMatchesSprocket(prototype, sprocket) {
        if (typeof sprocket === "string") return prototype.role === sprocket; else return sprocket.prototype === prototype || sprocket.prototype.isPrototypeOf(prototype);
    }
    function createCompositeWalker(root, skipRoot) {
        return document$7.createNodeIterator(root, 1, acceptNode, null);
        function acceptNode(el) {
            return skipRoot && el === root ? NodeFilter.FILTER_SKIP : isComposite(el) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
        }
    }
    let sprockets = {
        start: start,
        insertNode: insertNode,
        removeNode: removeNode,
        registerElement: registerElement,
        registerComponent: registerComponent,
        registerComposite: registerComposite,
        register: register,
        evolve: evolve,
        cast: cast,
        find: find$1,
        findAll: findAll,
        matches: matches$1,
        closest: closest
    };
    let basePrototype = {};
    sprockets.Base = create(basePrototype);
    let Base = sprockets.Base;
    assign(Base.prototype, {
        find: function(selector, scope) {
            return find$2(selector, this.element, scope);
        },
        findAll: function(selector, scope) {
            return findAll$1(selector, this.element, scope);
        },
        matches: function(selector, scope) {
            return matches$2(this.element, selector, scope);
        },
        closest: function(selector, scope) {
            return closest$1(this.element, selector, scope);
        },
        contains: function(otherNode) {
            return contains(this.element, otherNode);
        },
        attr: function(name, value) {
            let element = this.element;
            if (typeof value === "undefined") return element.getAttribute(name);
            if (value == null) element.removeAttribute(name); else element.setAttribute(name, value);
        },
        hasClass: function(token) {
            let element = this.element;
            let text = element.getAttribute("class");
            if (!text) return false;
            return includes(words(text), token);
        },
        addClass: function(token) {
            let element = this.element;
            let text = element.getAttribute("class");
            if (!text) {
                element.setAttribute("class", token);
                return;
            }
            if (includes(words(text), token)) return;
            let n = text.length, space = n && text.charAt(n - 1) !== " " ? " " : "";
            text += space + token;
            element.setAttribute("class", text);
        },
        removeClass: function(token) {
            let element = this.element;
            let text = element.getAttribute("class");
            if (!text) return;
            let prev = words(text);
            let next = [];
            forEach(prev, function(str) {
                if (str !== token) next.push(str);
            });
            if (prev.length === next.length) return;
            element.setAttribute("class", next.join(" "));
        },
        toggleClass: function(token, force) {
            let found = this.hasClass(token);
            if (found) {
                if (force) return true;
                this.removeClass(token);
                return false;
            } else {
                if (force === false) return false;
                this.addClass(token);
                return true;
            }
        },
        css: function(name, value) {
            let element = this.element;
            let isKebabCase = name.indexOf("-") >= 0;
            if (typeof value === "undefined") return isKebabCase ? element.style.getPropertyValue(name) : element.style[name];
            if (value == null || value === "") {
                if (isKebabCase) element.style.removeProperty(name); else element.style[name] = "";
            } else {
                if (isKebabCase) element.style.setProperty(name, value); else element.style[name] = value;
            }
        },
        trigger: function(type, params) {
            return dispatchEvent(this.element, type, params);
        }
    });
    let Element = window.Element || window.HTMLElement;
    Object.defineProperty(Element.prototype, "$", {
        get: function() {
            return sprockets.cast(this, sprockets.Base);
        }
    });
    (function() {
        let ariaProperties = {
            hidden: false,
            selected: false,
            expanded: true
        };
        let Base = sprockets.Base;
        let ARIA = sprockets.evolve(Base, {
            role: "roletype",
            aria: function(name, value) {
                let element = this.element;
                let defn = ariaProperties[name];
                if (defn == null) throw Error(`No such aria property: ${name}`);
                if (name === "hidden") {
                    if (typeof value === "undefined") return element.hasAttribute("hidden");
                    if (!value) element.removeAttribute("hidden"); else element.setAttribute("hidden", "");
                    return;
                }
                let ariaName = `aria-${name}`;
                let type = typeof defn;
                if (typeof value === "undefined") {
                    let result = element.getAttribute(ariaName);
                    switch (type) {
                      case "string":
                      default:
                        return result;

                      case "boolean":
                        return result === "false" ? false : result == null ? undefined : true;
                    }
                }
                if (value == null) element.removeAttribute(ariaName); else switch (type) {
                  case "string":
                  default:
                    element.setAttribute(ariaName, value);
                    break;

                  case "boolean":
                    let bool = value === "false" ? "false" : value === false ? "false" : "true";
                    element.setAttribute(ariaName, bool);
                    break;
                }
            },
            ariaCan: function(name, value) {
                let desc = this.__properties__[name];
                if (!desc) throw Error(`Property not defined: ${name}`);
                if (desc.type !== "boolean" || desc.can && !desc.can.call(this)) return false;
                return true;
            },
            ariaToggle: function(name, value) {
                let desc = this.__properties__[name];
                if (!desc) throw Error(`Property not defined: ${name}`);
                if (desc.type !== "boolean" || desc.can && !desc.can.call(this)) throw Error(`Property can not toggle: ${name}`);
                let oldValue = desc.get.call(this);
                if (typeof value === "undefined") desc.set.call(this, !oldValue); else desc.set.call(this, !!value);
                return oldValue;
            },
            ariaGet: function(name) {
                let desc = this.__properties__[name];
                if (!desc) throw Error(`Property not defined: ${name}`);
                return desc.get.call(this);
            },
            ariaSet: function(name, value) {
                let desc = this.__properties__[name];
                if (!desc) throw Error(`Property not defined: ${name}`);
                return desc.set.call(this, value);
            },
            ariaFind: function(role) {
                return sprockets.find(this.element, role);
            },
            ariaFindAll: function(role) {
                return sprockets.findAll(this.element, role);
            },
            ariaMatches: function(role) {
                return sprockets.matches(this.element, role);
            },
            ariaClosest: function(role) {
                return sprockets.closest(this.element, role);
            }
        });
        let RoleType = sprockets.evolve(ARIA, {
            hidden: {
                type: "boolean",
                can: function() {
                    return true;
                },
                get: function() {
                    return this.aria("hidden");
                },
                set: function(value) {
                    this.aria("hidden", !!value);
                }
            }
        });
        sprockets.ARIA = ARIA;
        sprockets.RoleType = RoleType;
        sprockets.register("*", RoleType);
        let Element = window.Element || window.HTMLElement;
        defaults(Element.prototype, {
            aria: function(prop, value) {
                return this.$.aria(prop, value);
            },
            ariaCan: function(prop) {
                return this.$.ariaCan(prop);
            },
            ariaToggle: function(prop, value) {
                return this.$.ariaToggle(prop, value);
            },
            ariaGet: function(prop) {
                return this.$.ariaGet(prop);
            },
            ariaSet: function(prop, value) {
                return this.$.ariaSet(prop, value);
            },
            ariaFind: function(role) {
                return this.$.ariaFind(role);
            },
            ariaFindAll: function(role) {
                return this.$.ariaFindAll(role);
            },
            ariaMatches: function(role) {
                return this.$.ariaMatches(role);
            },
            ariaClosest: function(role) {
                return this.$.ariaClosest(role);
            }
        });
    })();
    let controllers = {
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
    function normalize(doc, details) {
        let baseURL = URLux.create(details.url);
        forEach(findAll$1("style", doc.body), node => {
            if (node.hasAttribute("scoped")) return;
            doc.head.appendChild(node);
        });
        forEach(findAll$1("style", doc), node => {
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
            return findAll$1(selector, doc);
        }, nodeList => Thenfu.reduce(null, nodeList, (dummy, el) => {
            let tag = getTagName(el);
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
            forEach(findAll$1(tag, doc), el => {
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
        let scopedStyles = findAll$1("style[scoped]", doc.body);
        forEach(scopedStyles, (el, index) => {
            let scope = el.parentNode;
            if (!matches$2(scope, allowedScopeSelector)) {
                console.warn(`Removing <style scoped>. Must be child of ${allowedScopeSelector}`);
                scope.removeChild(el);
                return;
            }
            let scopeId = `__scope_${index}__`;
            scope.setAttribute("scopeid", scopeId);
            if (scope.hasAttribute("id")) scopeId = scope.getAttribute("id"); else scope.setAttribute("id", scopeId);
            el.removeAttribute("scoped");
            let sheet = el.sheet;
            forRules(sheet, processRule, scope);
            let cssText = Array.from(sheet.cssRules, rule => rule.cssText).join("\n");
            el.textContent = cssText;
            insertNode$1("beforeend", doc.head, el);
            return;
        });
    }
    function processRule(rule, id, parentRule) {
        let scope = this;
        switch (rule.type) {
          case 1:
            let scopeId = scope.getAttribute("scopeid");
            let scopePrefix = `#${scopeId} `;
            let selectorText = scopePrefix + rule.selectorText.replace(/,(?![^(]*\))/g, `, ${scopePrefix}`);
            let cssText = rule.cssText.replace(rule.selectorText, "");
            cssText = `${selectorText} ${cssText}`;
            parentRule.deleteRule(id);
            parentRule.insertRule(cssText, id);
            break;

          case 11:
            break;

          case 4:
          case 12:
            forRules(rule, processRule, scope);
            break;

          default:
            console.warn("Deleting invalid rule for <style scoped>: \n" + rule.cssText);
            parentRule.deleteRule(id);
            break;
        }
    }
    function forRules(parentRule, callback, context) {
        let ruleList = parentRule.cssRules;
        for (let i = ruleList.length - 1; i >= 0; i--) callback.call(context, ruleList[i], i, parentRule);
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
            const entry = find$3(this.#cache, entry => {
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
                return this.#doRequest(info).then(response => {
                    this.#cacheAdd(info, response);
                    return response;
                });

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
    class SimpleTaskQueue {
        #queue=[];
        #maxSize;
        #processing=false;
        constructor(maxSize = 1) {
            this.#maxSize = maxSize;
        }
        #bump() {
            if (this.#processing) return;
            this.#processing = true;
            this.#process();
        }
        #process() {
            if (this.#queue.length <= 0) {
                this.#processing = false;
                return;
            }
            let task = this.#queue.shift();
            let promise = Thenfu.defer(task.fn);
            promise.then(() => this.#process(), () => this.#process());
            promise.then(task.resolve, task.reject);
        }
        now(fn, fail) {
            return this.whenever(fn, fail, 0);
        }
        reset(fn) {
            this.#queue.length = 0;
            return this.whenever(fn, null, 1);
        }
        whenever(fn, fail, max) {
            if (max == null) max = this.#maxSize;
            return new Promise((resolve, reject) => {
                if (this.#queue.length > max || this.#queue.length === max && this.#processing) {
                    if (fail) Thenfu.defer(fail).then(resolve, reject); else reject(() => {
                        throw Error("No `fail` callback passed to whenever()");
                    });
                    return;
                }
                this.#queue.push({
                    fn: fn,
                    resolve: resolve,
                    reject: reject
                });
                this.#bump();
            });
        }
    }
    class HistoryState {
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
    class HistoryManager {
        #taskQueue=new SimpleTaskQueue;
        #currentState;
        #popStateHandler;
        #started=false;
        constructor() {
            if (history.replaceState) window.addEventListener("popstate", e => {
                if (e.stopImmediatePropagation) e.stopImmediatePropagation(); else e.stopPropagation();
                let newSettings = e.state;
                if (!HistoryState.isValid(newSettings)) {
                    console.warn("Ignoring invalid PopStateEvent");
                    return;
                }
                this.#taskQueue.reset(() => {
                    this.#currentState = new HistoryState(newSettings);
                    if (!this.#popStateHandler) return;
                    return this.#popStateHandler(this.#currentState);
                });
            }, true);
        }
        getState() {
            return this.#currentState;
        }
        start(data, title, url, onNewState, onPopState) {
            return this.#taskQueue.now(() => {
                if (this.#started) throw Error("historyManager has already started");
                this.#started = true;
                this.#popStateHandler = onPopState;
                let newState = HistoryState.create(data, title, url);
                if (history.replaceState) {
                    history.replaceState(newState.settings, title, url);
                }
                this.#currentState = newState;
                return onNewState(newState);
            });
        }
        newState(data, title, url, useReplace, callback) {
            return this.#taskQueue.now(() => {
                let newState = HistoryState.create(data, title, url);
                if (history.replaceState) {
                    if (useReplace) history.replaceState(newState.settings, title, url); else history.pushState(newState.settings, title, url);
                }
                this.#currentState = newState;
                if (callback) return callback(newState);
            });
        }
        replaceState(data, title, url, callback) {
            return this.newState(data, title, url, true, callback);
        }
        pushState(data, title, url, callback) {
            return this.newState(data, title, url, false, callback);
        }
    }
    var historyManager = new HistoryManager;
    class CustomNamespace {
        constructor(options) {
            if (!options) return;
            let style = options.style = lc(options.style);
            let styleInfo = find$3(CustomNamespace.namespaceStyles, styleInfo => styleInfo.style === style);
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
                let styleInfo = find$3(CustomNamespace.namespaceStyles, styleInfo => fullName.indexOf(styleInfo.configPrefix) === 0);
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
            let matchingNS = find$3(coll.items, def => {
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
            let nsDef = find$3(coll.items, def => lc(def.urn) === urn);
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
            let nsDef = find$3(coll.items, def => def.prefix === prefix);
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
    let filters = new Registry({
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
    filters.register("lowercase", (value, text) => value.toLowerCase());
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
    let decoders = new Registry({
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
    const textAttr$1 = "_text";
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
        return matches$2(element, selectorGroup);
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
            return findAll$1(finalSelector, context, !isRoot, !isRoot);
        } else {
            return find$2(finalSelector, context, !isRoot, !isRoot);
        }
    }
    function markElement(context) {
        if (context.hasAttribute(nodeIdProperty)) return context.getAttribute(nodeIdProperty);
        let uid = uniqueId(context);
        context.setAttribute(nodeIdProperty, uid);
        return uid;
    }
    /*!
	 * Microdata
	 * HTML Microdata parsing and querying
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    const document$6 = window.document;
    const nodeData = new WeakMap;
    function intersects(a1, a2) {
        return a1.some(i1 => a2.includes(i1));
    }
    function walkTree$1(root, skipRoot, callback) {
        let walker = document$6.createNodeIterator(root, 1, el => {
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
        if (!rootNode) rootNode = document$6;
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
    let document$5 = window.document;
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
    class JSONDecoder {
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
    decoders.register("css", CSSDecoder);
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
            if (!main) main = find$2("main, [role=main]", srcNode);
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
                    switch (getTagName(node)) {
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
	 */    let document$4 = window.document;
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
        let walker = document$4.createNodeIterator(root, 1, acceptNode, null);
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
        if (!doc) doc = document$4;
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
                let tag = getTagName(el);
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
                let tag = getTagName(el);
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
                    let tag = getTagName(node);
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
                    let tag = getTagName(node);
                    if (tag === hazPrefix + "template") {
                        if (!firstExplicitTemplate) firstExplicitTemplate = node;
                        return false;
                    }
                    if (tag === hazPrefix + "let") return false;
                    if (tag === hazPrefix + "param") return false;
                    if (node.nodeType === 3 && !/\S/.test(node.nodeValue)) return false;
                    if (node.nodeType !== 1) return false;
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
            return find$3(processor.templates, template => lc(template.getAttribute("name")) === name);
        }
        getMatchingTemplate(element) {
            let processor = this;
            return find$3(processor.templates, template => {
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
        let details = {};
        let tag = getTagName(el);
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
            let ns = find$3([ exprNS, mexprNS ], ns => attr.name.indexOf(ns.prefix) === 0);
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
        let doc = context && context.nodeType ? context.nodeType === 9 ? context : context.ownerDocument : document$4;
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
    let configData = new Registry({
        writeOnce: true,
        keyValidator: key => typeof key === "string",
        valueValidator: o => o != null && typeof o === "object"
    });
    /*!
	 * HyperFrameset
	 * Copyright 2009-2016 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    let document$3 = window.document;
    const eventConfig = "form@submit,reset,input,change,invalid input,textarea@input,change,invalid,focus,blur select,fieldset@change,invalid,focus,blur button@click";
    let eventTable = function(config) {
        let table = {};
        forEach(config.split(/\s+/), combo => {
            let m = combo.split("@");
            let tags = m[0].split(",");
            let events = m[1].split(",");
            forEach(tags, tag => {
                table[tag] = Array.from(events);
            });
        });
        return table;
    }(eventConfig);
    let elements = {};
    let interfaces = {};
    function registerFormElements() {
        forOwn(elements, (ClassName, tag) => {
            let Interface = interfaces[ClassName];
            sprockets.registerElement(tag, Interface);
        });
    }
    forOwn(eventTable, (events, tag) => {
        let Tag = ucFirst(tag);
        let ClassName = `Configurable${Tag}`;
        let Interface = sprockets.evolve(sprockets.RoleType, {});
        assign(Interface, {
            attached: function(handlers) {
                let object = this;
                let element = object.element;
                if (!element.hasAttribute("config")) return;
                let configID = words(element.getAttribute("config"))[0];
                let options = configData.get(configID);
                if (!options) return;
                forEach(events, type => {
                    let ontype = `on${type}`;
                    let callback = options[ontype];
                    if (!callback) return;
                    let fn = function() {
                        callback.apply(object, arguments);
                    };
                    object[ontype] = fn;
                    handlers.push({
                        type: type,
                        action: fn
                    });
                });
            }
        });
        interfaces[ClassName] = Interface;
        elements[tag] = ClassName;
    });
    let ConfigurableBody = sprockets.evolve(sprockets.RoleType, {});
    assign(ConfigurableBody, {
        attached: function(handlers) {
            let object = this;
            let element = object.element;
            if (!element.hasAttribute("config")) return;
            let configID = words(element.getAttribute("config"))[0];
            let options = configData.get(configID);
            if (!options) return;
            let events = words("submit reset change input");
            let needClickWatcher = false;
            forEach(events, type => {
                let ontype = `on${type}`;
                let callback = options[ontype];
                if (!callback) return;
                let fn = function(e) {
                    if (closest$1(e.target, "form")) return;
                    callback.apply(object, arguments);
                };
                object[ontype] = fn;
                handlers.push({
                    type: type,
                    action: fn
                });
                switch (type) {
                  default:
                    break;

                  case "submit":
                  case "reset":
                    needClickWatcher = true;
                }
            });
            if (needClickWatcher) {
                document$3.addEventListener("click", e => {
                    if (closest$1(e.target, "form")) return;
                    let type = e.target.type;
                    if (!(type === "submit" || type === "reset")) return;
                    Task.asap(() => {
                        let pseudoEvent = document$3.createEvent("CustomEvent");
                        pseudoEvent.initCustomEvent(type, true, true, e.target);
                        pseudoEvent.preventDefault();
                        element.dispatchEvent(pseudoEvent);
                    });
                }, false);
            }
        }
    });
    elements["body"] = "ConfigurableBody";
    interfaces["ConfigurableBody"] = ConfigurableBody;
    let formElements = {
        register: registerFormElements
    };
    const ConfigurableForm = interfaces["ConfigurableForm"];
    const ConfigurableInput = interfaces["ConfigurableInput"];
    const ConfigurableTextarea = interfaces["ConfigurableTextarea"];
    const ConfigurableFieldset = interfaces["ConfigurableFieldset"];
    const ConfigurableSelect = interfaces["ConfigurableSelect"];
    const ConfigurableButton = interfaces["ConfigurableButton"];
    var formElements$1 = Object.freeze({
        __proto__: null,
        ConfigurableBody: ConfigurableBody,
        ConfigurableButton: ConfigurableButton,
        ConfigurableFieldset: ConfigurableFieldset,
        ConfigurableForm: ConfigurableForm,
        ConfigurableInput: ConfigurableInput,
        ConfigurableSelect: ConfigurableSelect,
        ConfigurableTextarea: ConfigurableTextarea,
        default: formElements
    });
    /*!
	 * HyperFrameset Layout Elements
	 * Copyright 2009-2016 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    let document$2 = window.document;
    let namespace$1;
    let HBase = function() {
        let HBase = sprockets.evolve(sprockets.RoleType, {});
        assign(HBase, {
            attached: function(handlers) {
                HBase.connectOptions.call(this);
            },
            enteredDocument: function() {},
            leftDocument: function() {},
            connectOptions: function() {
                let object = this;
                object.options = {};
                let element = object.element;
                if (!element.hasAttribute("config")) return;
                let configID = words(element.getAttribute("config"))[0];
                let options = configData.get(configID);
                object.options = options;
            }
        });
        return HBase;
    }();
    let Layer = function() {
        let Layer = sprockets.evolve(HBase, {
            role: "layer",
            isLayer: true
        });
        let zIndex = 1;
        assign(Layer, {
            attached: function(handlers) {
                HBase.attached.call(this, handlers);
                this.css("z-index", zIndex++);
            },
            enteredDocument: function() {
                HBase.enteredDocument.call(this);
            },
            leftDocument: function() {
                HBase.leftDocument.call(this);
            },
            isLayer: function(element) {
                return !!element.$.isLayer;
            }
        });
        return Layer;
    }();
    let Popup = function() {
        let Popup = sprockets.evolve(HBase, {
            role: "popup"
        });
        assign(Popup, {
            attached: function(handlers) {
                HBase.attached.call(this, handlers);
            },
            enteredDocument: function() {
                HBase.enteredDocument.call(this);
                Popup.connectController.call(this);
            },
            leftDocument: function() {
                HBase.leftDocument.call(this);
            },
            connectController: function() {
                let panel = this;
                let name = panel.attr("name");
                let value = panel.attr("value");
                if (!name && !value) return;
                panel.ariaToggle("hidden", true);
                if (!name) return;
                controllers.listen(name, values => {
                    panel.ariaToggle("hidden", !includes(values, value));
                });
            }
        });
        return Popup;
    }();
    let Panel = function() {
        let Panel = sprockets.evolve(HBase, {
            role: "panel",
            isPanel: true
        });
        assign(Panel, {
            attached: function(handlers) {
                HBase.attached.call(this, handlers);
                Panel.adjustBox.call(this);
            },
            enteredDocument: function() {
                HBase.enteredDocument.call(this);
                Panel.connectController.call(this);
            },
            leftDocument: function() {
                HBase.leftDocument.call(this);
            },
            adjustBox: function() {
                let overflow = this.attr("overflow");
                if (overflow) this.css("overflow", overflow);
                let height = this.attr("height");
                if (height) this.css("height", height);
                let width = this.attr("width");
                if (width) this.css("width", width);
                let minWidth = this.attr("minwidth");
                if (minWidth) this.css("min-width", minWidth);
            },
            connectController: function() {
                let panel = this;
                let name = panel.attr("name");
                let value = panel.attr("value");
                if (!name && !value) return;
                panel.ariaToggle("hidden", true);
                if (!name) return;
                controllers.listen(name, values => {
                    panel.ariaToggle("hidden", !includes(values, value));
                });
            },
            isPanel: function(element) {
                return !!element.$.isPanel;
            }
        });
        return Panel;
    }();
    let Layout = function() {
        let Layout = sprockets.evolve(HBase, {
            role: "group",
            isLayout: true,
            owns: {
                get: function() {
                    return filter(this.element.children, el => matches$2(el, el => Panel.isPanel(el) || Layout.isLayout(el)));
                }
            }
        });
        assign(Layout, {
            attached: function(handlers) {
                Panel.attached.call(this, handlers);
            },
            enteredDocument: function() {
                Panel.enteredDocument.call(this);
                Layout.adjustBox.call(this);
                Layout.normalizeChildren.call(this);
                return;
            },
            leftDocument: function() {
                Panel.leftDocument.call(this);
            },
            adjustBox: function() {
                let element = this.element;
                let parent = element.parentNode;
                if (!matches$2(parent, Layer.isLayer)) return;
                let height = this.attr("height");
                if (!height) height = "100vh"; else height = height.replace("%", "vh");
                this.css("height", height);
                let width = this.attr("width");
                if (!width) width = "100vw"; else width = width.replace("%", "vw");
                if (width) this.css("width", width);
            },
            normalizeChildren: function() {
                let element = this.element;
                forEach(Array.from(element.childNodes), normalizeChild, element);
            },
            isLayout: function(element) {
                return !!element.$.isLayout;
            }
        });
        function normalizeChild(node) {
            let element = this;
            switch (node.nodeType) {
              case 1:
                if (matches$2(node, el => Panel.isPanel(el) || Layout.isLayout(el))) return;
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
        return Layout;
    }();
    let VLayout = function() {
        let VLayout = sprockets.evolve(Layout, {});
        assign(VLayout, {
            attached: function(handlers) {
                Layout.attached.call(this, handlers);
                let hAlign = this.attr("align");
                if (hAlign) this.css("text-align", hAlign);
            },
            enteredDocument: function() {
                Layout.enteredDocument.call(this);
            },
            leftDocument: function() {
                Layout.leftDocument.call(this);
            }
        });
        return VLayout;
    }();
    let HLayout = function() {
        let HLayout = sprockets.evolve(Layout, {});
        assign(HLayout, {
            attached: function(handlers) {
                Layout.attached.call(this, handlers);
            },
            enteredDocument: function() {
                Layout.enteredDocument.call(this);
                let vAlign = this.attr("align");
                forEach(this.ariaGet("owns"), panel => {
                    if (vAlign) panel.$.css("vertical-align", vAlign);
                });
            },
            leftDocument: function() {
                Layout.leftDocument.call(this);
            }
        });
        return HLayout;
    }();
    let Deck = function() {
        let Deck = sprockets.evolve(Layout, {
            activedescendant: {
                set: function(item) {
                    let element = this.element;
                    let panels = this.ariaGet("owns");
                    if (item && !includes(panels, item)) throw Error("set activedescendant failed: item is not child of deck");
                    forEach(panels, child => {
                        if (child === item) child.ariaToggle("hidden", false); else child.ariaToggle("hidden", true);
                    });
                }
            }
        });
        assign(Deck, {
            attached: function(handlers) {
                Layout.attached.call(this, handlers);
            },
            enteredDocument: function() {
                HBase.enteredDocument.call(this);
                Layout.adjustBox.call(this);
                Layout.normalizeChildren.call(this);
                Deck.connectController.call(this);
            },
            leftDocument: function() {
                Layout.leftDocument.call(this);
            },
            connectController: function() {
                let deck = this;
                let name = deck.attr("name");
                if (!name) {
                    deck.ariaSet("activedescendant", deck.ariaGet("owns")[0]);
                    return;
                }
                controllers.listen(name, values => {
                    let panels = deck.ariaGet("owns");
                    let activePanel = find$3(panels, child => {
                        let value = child.getAttribute("value");
                        if (!includes(values, value)) return false;
                        return true;
                    });
                    if (activePanel) deck.ariaSet("activedescendant", activePanel);
                });
            }
        });
        return Deck;
    }();
    let ResponsiveDeck = function() {
        let ResponsiveDeck = sprockets.evolve(Deck, {});
        assign(ResponsiveDeck, {
            attached: function(handlers) {
                Deck.attached.call(this, handlers);
            },
            enteredDocument: function() {
                Deck.enteredDocument.call(this);
                ResponsiveDeck.refresh.call(this);
            },
            leftDocument: function() {
                Deck.leftDocument.call(this);
            },
            refresh: function() {
                let width = parseFloat(window.getComputedStyle(this.element, null).width);
                let panels = this.ariaGet("owns");
                let activePanel = find$3(panels, panel => {
                    let minWidth = window.getComputedStyle(panel, null).minWidth;
                    if (minWidth == null || minWidth === "" || minWidth === "0px") return true;
                    minWidth = parseFloat(minWidth);
                    if (minWidth > width) return false;
                    return true;
                });
                if (activePanel) {
                    activePanel.$.css("height", "100%");
                    activePanel.$.css("width", "100%");
                    this.ariaSet("activedescendant", activePanel);
                }
            }
        });
        return ResponsiveDeck;
    }();
    function registerLayoutElements(ns) {
        namespace$1 = ns;
        sprockets.registerElement(namespace$1.lookupSelector("layer"), Layer);
        sprockets.registerElement(namespace$1.lookupSelector("popup"), Popup);
        sprockets.registerElement(namespace$1.lookupSelector("panel"), Panel);
        sprockets.registerElement(namespace$1.lookupSelector("vlayout"), VLayout);
        sprockets.registerElement(namespace$1.lookupSelector("hlayout"), HLayout);
        sprockets.registerElement(namespace$1.lookupSelector("deck"), Deck);
        sprockets.registerElement(namespace$1.lookupSelector("rdeck"), ResponsiveDeck);
        let cssText = [ "*[hidden] { display: none !important; }", namespace$1.lookupSelector("layer, popup, hlayout, vlayout, deck, rdeck, panel, body") + " { box-sizing: border-box; }", namespace$1.lookupSelector("layer") + " { display: block; position: fixed; top: 0; left: 0; width: 0; height: 0; }", namespace$1.lookupSelector("hlayout, vlayout, deck, rdeck") + " { display: block; width: 0; height: 0; text-align: left; margin: 0; padding: 0; }", namespace$1.lookupSelector("hlayout, vlayout, deck, rdeck") + " { width: 100%; height: 100%; }", namespace$1.lookupSelector("panel") + " { display: block; width: auto; height: auto; text-align: left; margin: 0; padding: 0; }", namespace$1.lookupSelector("body") + " { display: block; width: auto; height: auto; margin: 0; }", namespace$1.lookupSelector("popup") + " { display: block; position: relative; width: 0; height: 0; }", namespace$1.lookupSelector("popup") + " > * { position: absolute; top: 0; left: 0; }", namespace$1.lookupSelector("vlayout") + " { display: flex; flex-direction: column; justify-content: flex-start; align-items: stretch; }", namespace$1.lookupSelector("hlayout") + " { display: flex; flex-direction: row; justify-content: space-between; align-items: stretch; }", namespace$1.lookupSelector("deck") + " > * { width: 100%; height: 100%; }", namespace$1.lookupSelector("rdeck") + " > * { width: 0; height: 0; }" ].join("\n");
        let style = document$2.createElement("style");
        style.textContent = cssText;
        document$2.head.insertBefore(style, document$2.head.firstChild);
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
	 * HyperFrameset Elements
	 * Copyright 2009-2016 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    let document$1 = window.document;
    let namespace;
    let frameDefinitions = new Registry({
        writeOnce: true,
        keyValidator: key => typeof key === "string",
        valueValidator: o => o != null && typeof o === "object"
    });
    let HFrame = function() {
        let HFrame = sprockets.evolve(Panel, {
            role: "frame",
            isFrame: true,
            preload: function(request) {
                let frame = this;
                return Thenfu.pipe(request, [ request => frame.definition.render(request, "loading"), result => {
                    if (!result) return;
                    return frame.insert(result);
                } ]);
            },
            load: function(response) {
                let frame = this;
                if (response) frame.src = response.url;
                return Thenfu.pipe(response, [ response => frame.definition.render(response, "loaded", {
                    mainSelector: frame.mainSelector
                }), result => {
                    if (!result) return;
                    return frame.insert(result, frame.element.hasAttribute("replace"));
                } ]);
            },
            insert: function(bodyElement, replace) {
                let frame = this;
                let element = frame.element;
                let options = frame.options;
                if (frame.bodyElement) {
                    if (options && options.bodyLeft) {
                        try {
                            options.bodyLeft(frame, frame.bodyElement);
                        } catch (err) {
                            window.reportError(err);
                        }
                    }
                    sprockets.removeNode(frame.bodyElement);
                }
                if (replace) {
                    let frag = adoptContents(bodyElement, element.ownerDocument);
                    sprockets.insertNode("replace", element, frag);
                    return;
                }
                sprockets.insertNode("beforeend", frame.element, bodyElement);
                frame.bodyElement = bodyElement;
                if (options && options.bodyEntered) {
                    try {
                        options.bodyEntered(frame, frame.bodyElement);
                    } catch (err) {
                        window.reportError(err);
                    }
                }
            },
            refresh: function() {
                let frame = this;
                let element = this.element;
                let src = frame.attr("src");
                return Thenfu.asap().then(() => {
                    if (src == null) {
                        return frame.load(null, {
                            condition: "loaded"
                        });
                    }
                    if (src === "") {
                        return;
                    }
                    let fullURL = URLux.create(src);
                    let nohash = fullURL.nohash;
                    let hash = fullURL.hash;
                    let request = {
                        method: "get",
                        url: nohash,
                        responseType: "document"
                    };
                    let response;
                    return Thenfu.pipe(null, [ () => frame.preload(request), () => httpProxy.load(nohash, request), resp => {
                        response = resp;
                    }, () => whenVisible(element), () => {
                        if (frame.attr("src") !== src) return;
                        return frame.load(response);
                    } ]);
                });
            }
        });
        assign(HFrame, {
            attached: function(handlers) {
                Panel.attached.call(this, handlers);
                let frame = this;
                let def = frame.attr("def");
                frame.definition = frameDefinitions.get(def);
                defaults(frame, {
                    bodyElement: null,
                    targetname: frame.attr("targetname"),
                    src: frame.attr("src"),
                    mainSelector: frame.attr("main")
                });
                HFrame.observeAttributes.call(this, "src");
            },
            enteredDocument: function() {
                Panel.enteredDocument.call(this);
                this.refresh();
            },
            leftDocument: function() {
                Panel.leftDocument.call(this);
                this.attributeObserver.disconnect();
            },
            attributeChanged: function(attrName) {
                if (attrName === "src") this.refresh();
            },
            observeAttributes: function() {
                let attrList = [].splice.call(arguments, 0);
                let frame = this;
                let element = frame.element;
                let observer = observeAttributes(element, attrName => {
                    HFrame.attributeChanged.call(frame, attrName);
                }, attrList);
                frame.attributeObserver = observer;
            },
            isFrame: function(element) {
                return !!element.$.isFrame;
            }
        });
        function observeAttributes(element, callback, attrList) {
            let observer = new MutationObserver((mutations, observer) => {
                forEach(mutations, record => {
                    if (record.type !== "attributes") return;
                    callback.call(record.target, record.attributeName);
                });
            });
            observer.observe(element, {
                attributes: true,
                attributeFilter: attrList,
                subtree: false
            });
            return observer;
        }
        return HFrame;
    }();
    function registerFrameElements(ns) {
        namespace = ns;
        sprockets.registerElement(namespace.lookupSelector("frame"), HFrame);
        let cssText = [ namespace.lookupSelector("frame") + " { box-sizing: border-box; }", namespace.lookupSelector("frame") + " { display: block; width: auto; height: auto; text-align: left; margin: 0; padding: 0; }" ].join("\n");
        let style = document$1.createElement("style");
        style.textContent = cssText;
        document$1.head.insertBefore(style, document$1.head.firstChild);
    }
    let frameElements = {
        register: registerFrameElements
    };
    class HTransformDefinition {
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
            let options;
            if (el.hasAttribute("config")) {
                let configID = words(el.getAttribute("config"))[0];
                options = configData.get(configID);
            }
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
    const conditions = words("uninitialized loading loaded error");
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
            forEach(Array.from(el.childNodes), node => {
                if (getTagName(node) === framesetDef.namespaces.lookupTagNameNS("transform", HYPERFRAMESET_URN)) {
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
            if (details.mainSelector) frag0 = find$2(details.mainSelector, doc);
            return Thenfu.reduce(frag0, bodyDef.transforms, (fragment, transform) => transform.process(fragment, details)).then(fragment => {
                let el = bodyDef.element.cloneNode(false);
                let htmlBody = find$2("body", fragment);
                if (htmlBody) fragment = adoptContents(htmlBody, el.ownerDocument);
                forEach(findAll$1("link[rel~=stylesheet], style", fragment), node => {
                    node.parentNode.removeChild(node);
                });
                insertNode$1("beforeend", el, fragment);
                return el;
            });
        }
    }
    const hfHeadTags = words("title meta link style script");
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
            forEach(Array.from(el.childNodes), node => {
                let tag = getTagName(node);
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
            let bodyDef = find$3(frameDef.bodies, body => body.condition === condition);
            if (!bodyDef) return;
            return bodyDef.render(resource, details);
        }
    }
    const {rebase: rebase, rebaseURL: rebaseURL, normalizeScopedStyles: normalizeScopedStyles} = htmlParser;
    const hfDefaultNamespace = new CustomNamespace({
        name: "hf",
        style: "vendor",
        urn: HYPERFRAMESET_URN
    });
    class HFramesetDefinition {
        constructor(doc, settings) {
            if (!doc) return;
            this.namespaces = null;
            this.init(doc, settings);
        }
        init(doc, settings) {
            let framesetDef = this;
            defaults(framesetDef, {
                url: settings.framesetURL,
                scope: settings.scope
            });
            let namespaces = framesetDef.namespaces = CustomNamespace.getNamespaces(doc);
            if (!namespaces.lookupNamespace(HYPERFRAMESET_URN)) {
                namespaces.add(hfDefaultNamespace);
            }
            let scopeURL = URLux.create(settings.scope);
            rebase(doc, scopeURL);
            let frameElts = findAll$1(framesetDef.namespaces.lookupSelector("frame", HYPERFRAMESET_URN), doc.body);
            forEach(frameElts, (el, index) => {
                let src = el.getAttribute("src");
                if (src) {
                    let newSrc = rebaseURL(src, scopeURL);
                    if (newSrc != src) el.setAttribute("src", newSrc);
                }
            });
            let idElements = findAll$1("*[id]:not(script)", doc.body);
            if (idElements.length) {
                let firstId = idElements[0].getAttribute("id");
                console.warn(`@id is strongly discouraged in frameset-documents (except on <<script>>).\n\t\t\tFound ${idElements.length}, first @id is ${firstId}`);
            }
            let scripts = findAll$1("script", doc);
            forEach(scripts, (script, i) => {
                if (script.type && !/^text\/javascript/.test(script.type)) return;
                if (script.hasAttribute("src")) return;
                let id = script.id;
                if (!id) id = script.id = `script[${i}]`;
                let sourceURL;
                if (script.hasAttribute("sourceurl")) sourceURL = script.getAttribute("sourceurl"); else {
                    sourceURL = `${framesetDef.url}__${id}`;
                    script.setAttribute("sourceurl", sourceURL);
                }
                script.text += `\n//# sourceURL=${sourceURL}`;
            });
            let firstChild = doc.body.firstChild;
            forEach(findAll$1("script[for]", doc.head), script => {
                doc.body.insertBefore(script, firstChild);
                script.setAttribute("for", "");
                console.info("Moved <script for> in frameset <head> to <body>");
            });
            forEach(findAll$1("script", doc.body), script => {
                if (script.type && !/^text\/javascript/.test(script.type)) return;
                if (script.hasAttribute("for")) return;
                doc.head.appendChild(script);
                console.info("Moved <script> in frameset <body> to <head>");
            });
            let allowedScope = "panel, frame";
            let allowedScopeSelector = framesetDef.namespaces.lookupSelector(allowedScope, HYPERFRAMESET_URN);
            normalizeScopedStyles(doc, allowedScopeSelector);
            let body = doc.body;
            body.parentNode.removeChild(body);
            framesetDef.document = doc;
            framesetDef.element = body;
        }
        preprocess() {
            let framesetDef = this;
            let body = framesetDef.element;
            defaults(framesetDef, {
                frames: {}
            });
            let scripts = findAll$1("script", body);
            forEach(scripts, (script, i) => {
                if (script.type && !/^text\/javascript/.test(script.type)) return;
                if (script.hasAttribute("src")) {
                    console.warn("Frameset <body> may not contain external scripts: \n" + script.cloneNode(false).outerHTML);
                    script.parentNode.removeChild(script);
                    return;
                }
                let sourceURL = script.getAttribute("sourceurl");
                if (!script.hasAttribute("for")) {
                    console.warn("Frameset <body> may not contain non-@for scripts:\n" + framesetDef.url + "#" + script.id);
                    script.parentNode.removeChild(script);
                    return;
                }
                if (script.getAttribute("for") !== "") {
                    console.warn("<script> may only contain EMPTY @for: \n" + script.cloneNode(false).outerHTML);
                    script.parentNode.removeChild(script);
                    return;
                }
                let scriptFor = script;
                while (scriptFor = scriptFor.previousSibling) {
                    if (scriptFor.nodeType !== 1) continue;
                    let tag = getTagName(scriptFor);
                    if (tag !== "script" && tag !== "style") break;
                }
                if (!scriptFor) scriptFor = script.parentNode;
                let configID = scriptFor.hasAttribute("config") ? scriptFor.getAttribute("config") : "";
                configID = configID ? configID.replace(/\s*$/, " " + sourceURL) : sourceURL;
                scriptFor.setAttribute("config", configID);
                let fnText = "return (" + script.text + "\n);";
                try {
                    let fn = Function(fnText);
                    let object = fn();
                    configData.set(sourceURL, object);
                } catch (err) {
                    console.warn("Error evaluating inline script in frameset:\n" + framesetDef.url + "#" + script.id);
                    window.reportError(err);
                }
                script.parentNode.removeChild(script);
            });
            let frameElts = findAll$1(framesetDef.namespaces.lookupSelector("frame", HYPERFRAMESET_URN), body);
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
                framesetDef.frames[defId] = new HFrameDefinition(el, framesetDef);
            });
            forEach(frameRefElts, el => {
                let def = el.getAttribute("def");
                let ref = framesetDef.frames[def];
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
            let framesetDef = this;
            return framesetDef.element.cloneNode(true);
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
	 * HyperFrameset framer
	 * Copyright 2009-2016 Sean Hogan (http://meekostuff.net/)
	 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
	 */    const FRAMESET_REL = "frameset";
    const SELF_REL = "self";
    let document = window.document;
    let framer = {};
    defaults(framer, {
        options: {},
        config: function(options) {
            let framer = this;
            if (!options) return;
            assign(framer.options, options);
        }
    });
    let framesetReady = Promise.withResolvers();
    defaults(framer, {
        frameset: null,
        started: false,
        start: function(startOptions) {
            let framer = this;
            if (framer.started) throw Error("Already started");
            if (!startOptions || !startOptions.contentDocument) throw Error("No contentDocument passed to start()");
            framer.started = true;
            Thenfu.asap(startOptions.contentDocument).then(function(doc) {
                return httpProxy.add({
                    url: document.URL,
                    type: "document",
                    document: doc
                });
            });
            return Thenfu.pipe(null, [ function() {
                return Thenfu.wait(function() {
                    return !!document.body;
                });
            }, function() {
                let framerConfig;
                framerConfig = framer.lookup(document.URL);
                if (framerConfig) return framerConfig;
                return startOptions.contentDocument.then(function(doc) {
                    return framer.detect(doc);
                });
            }, function(framerConfig) {
                if (!framerConfig) throw Error("No frameset could be determined for this page");
                framer.scope = framerConfig.scope;
                let framesetURL = URLux.create(framerConfig.framesetURL);
                if (framesetURL.hash) console.info(`Ignoring hash component of frameset URL: ${framesetURL.hash}`);
                framer.framesetURL = framerConfig.framesetURL = framesetURL.nohash;
                return httpProxy.load(framer.framesetURL, {
                    responseType: "document"
                }).then(function(response) {
                    let framesetDoc = response.document;
                    return new HFramesetDefinition(framesetDoc, framerConfig);
                });
            }, function(definition) {
                return Thenfu.pipe(definition, [ function() {
                    framer.definition = definition;
                    return prepareFrameset(document, definition);
                }, function() {
                    return definition.preprocess();
                }, function() {
                    return prerenderFrameset(document, definition);
                } ]);
            }, function() {
                window.addEventListener("click", function(e) {
                    if (e.defaultPrevented) return;
                    let acceptDefault = framer.onClick(e);
                    if (acceptDefault === false) e.preventDefault();
                }, false);
                window.addEventListener("submit", function(e) {
                    if (e.defaultPrevented) return;
                    let acceptDefault = framer.onSubmit(e);
                    if (acceptDefault === false) e.preventDefault();
                }, false);
                registerFrames(framer.definition);
                interceptFrameElements();
                retargetFramesetElements();
                let namespace = framer.definition.namespaces.lookupNamespace(HYPERFRAMESET_URN);
                layoutElements.register(namespace);
                frameElements.register(namespace);
                registerFramesetElement();
                formElements.register();
                return sprockets.start({
                    manual: true
                });
            }, function() {
                return framesetReady.promise.then(function() {
                    let changeset = framer.currentChangeset;
                    return historyManager.start(changeset, "", document.URL, function(state) {}, function(state) {
                        return framer.onPopState(state.getData());
                    });
                });
            }, function() {
                notify({
                    module: "frameset",
                    type: "enteredState",
                    stage: "after",
                    url: document.URL
                });
            }, function() {
                return Thenfu.wait(function() {
                    return checkStyleSheets();
                });
            } ]);
        }
    });
    let prepareFrameset = function(dstDoc, definition) {
        if (getFramesetMarker(dstDoc)) throw Error("The HFrameset has already been applied");
        let srcDoc = cloneDocument(definition.document);
        let selfMarker;
        return Thenfu.pipe(null, [ function() {
            let dstHead = dstDoc.head;
            forEach(findAll$1("link[rel|=stylesheet]", dstHead), function(node) {
                dstHead.removeChild(node);
            });
        }, function() {
            let dstBody = dstDoc.body;
            let node;
            while (node = dstBody.firstChild) dstBody.removeChild(node);
        }, function() {
            selfMarker = getSelfMarker(dstDoc);
            if (selfMarker) return;
            selfMarker = dstDoc.createElement("link");
            selfMarker.rel = SELF_REL;
            selfMarker.href = dstDoc.URL;
            dstDoc.head.insertBefore(selfMarker, dstDoc.head.firstChild);
        }, function() {
            let framesetMarker = dstDoc.createElement("link");
            framesetMarker.rel = FRAMESET_REL;
            framesetMarker.href = definition.src;
            dstDoc.head.insertBefore(framesetMarker, selfMarker);
        }, function() {
            mergeElement(dstDoc.documentElement, srcDoc.documentElement);
            mergeElement(dstDoc.head, srcDoc.head);
            mergeHead(dstDoc, srcDoc.head, true);
            forEach(findAll$1("script", dstDoc.head), function(script) {
                scriptQueue.push(script);
            });
            return scriptQueue.empty();
        } ]);
    };
    let prerenderFrameset = function(dstDoc, definition) {
        let srcBody = definition.element;
        let dstBody = document.body;
        mergeElement(dstBody, srcBody);
    };
    function separateHead(dstDoc, isFrameset) {
        let dstHead = dstDoc.head;
        let framesetMarker = getFramesetMarker(dstDoc);
        if (!framesetMarker) throw Error(`No ${FRAMESET_REL} marker found. `);
        let selfMarker = getSelfMarker(dstDoc);
        if (isFrameset) forEach(siblings("after", framesetMarker, "before", selfMarker), remove); else forEach(siblings("after", selfMarker), remove);
        function remove(node) {
            if (getTagName(node) == "script" && (!node.type || node.type.match(/^text\/javascript/i))) return;
            dstHead.removeChild(node);
        }
    }
    function mergeHead(dstDoc, srcHead, isFrameset) {
        let baseURL = URLux.create(dstDoc.URL);
        let dstHead = dstDoc.head;
        let framesetMarker = getFramesetMarker();
        if (!framesetMarker) throw Error(`No ${FRAMESET_REL} marker found. `);
        let selfMarker = getSelfMarker();
        separateHead(dstDoc, isFrameset);
        forEach(Array.from(srcHead.childNodes), function(srcNode) {
            if (srcNode.nodeType != 1) return;
            switch (getTagName(srcNode)) {
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
            if (isFrameset) insertNode$1("beforebegin", selfMarker, srcNode); else insertNode$1("beforeend", dstHead, srcNode);
            if (getTagName(srcNode) == "link") srcNode.href = srcNode.getAttribute("href");
        });
    }
    function mergeElement(dst, src) {
        removeAttributes(dst);
        copyAttributes(dst, src);
        dst.removeAttribute("style");
    }
    function getFramesetMarker(doc) {
        if (!doc) doc = document;
        let marker = find$2(`link[rel~=${FRAMESET_REL}]`, doc.head);
        return marker;
    }
    function getSelfMarker(doc) {
        if (!doc) doc = document;
        let marker = find$2(`link[rel~=${SELF_REL}]`, doc.head);
        return marker;
    }
    defaults(framer, {
        framesetEntered: function(frameset) {
            let framer = this;
            framer.frameset = frameset;
            let url = document.URL;
            framer.currentChangeset = frameset.lookup(url, {
                referrer: document.referrer
            });
            framesetReady.resolve();
        },
        framesetLeft: function(frameset) {
            let framer = this;
            delete framer.frameset;
        },
        frameEntered: function(frame) {
            let namespaces = framer.definition.namespaces;
            let parentFrame;
            let parentElement = closest$1(frame.element.parentNode, HFrame.isFrame);
            if (parentElement) parentFrame = parentElement.$; else {
                parentElement = document.body;
                parentFrame = parentElement.$;
            }
            parentFrame.frameEntered(frame);
            frame.parentFrame = parentFrame;
            if (frame.targetname === framer.currentChangeset.target) {
                frame.attr("src", framer.currentChangeset.url);
            }
        },
        frameLeft: function(frame) {
            let parentFrame = frame.parentFrame;
            delete frame.parentFrame;
            parentFrame.frameLeft(frame);
        },
        onClick: function(e) {
            let framer = this;
            if (e.button != 0) return;
            if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
            let linkElement = closest$1(e.target, "a, [link]");
            if (!linkElement) return;
            let hyperlink;
            if (getTagName(linkElement) === "a") hyperlink = linkElement; else {
                hyperlink = find$2("a, link", linkElement);
                if (!hyperlink) hyperlink = closest$1("a", linkElement);
                if (!hyperlink) return;
            }
            let href = hyperlink.getAttribute("href");
            if (!href) return;
            let baseURL = URLux.create(document.URL);
            let url = baseURL.resolve(href);
            let details = {
                url: url,
                element: hyperlink
            };
            framer.triggerRequestNavigation(details.url, details);
            return false;
        },
        onSubmit: function(e) {
            let framer = this;
            let form = e.target;
            if (form.target) return;
            let baseURL = URLux.create(document.URL);
            let action = baseURL.resolve(form.action);
            let details = {
                element: form
            };
            let method = lc(form.method);
            switch (method) {
              case "get":
                let oURL = URLux.create(action);
                let query = encode(form);
                details.url = oURL.nosearch + (oURL.search || "?") + query + oURL.hash;
                break;

              default:
                return;
            }
            framer.triggerRequestNavigation(details.url, details);
            return false;
            function encode(form) {
                let data = [];
                forEach(form.elements, function(el) {
                    if (!el.name) return;
                    data.push(el.name + "=" + encodeURIComponent(el.value));
                });
                return data.join("&");
            }
        },
        triggerRequestNavigation: function(url, details) {
            Thenfu.defer(function() {
                let event = document.createEvent("CustomEvent");
                event.initCustomEvent("requestnavigation", true, true, details.url);
                let acceptDefault = details.element.dispatchEvent(event);
                if (acceptDefault !== false) {
                    location.assign(details.url);
                }
            });
        },
        onRequestNavigation: function(e, frame) {
            let framer = this;
            if (!frame) throw Error("Invalid frame / frameset in onRequestNavigation");
            let url = e.detail;
            let details = {
                url: url,
                element: e.target
            };
            if (!frame.isFrameset) {
                if (requestNavigation(frame, url, details)) return false;
                return;
            }
            let baseURL = URLux.create(document.URL);
            let oURL = URLux.create(url);
            if (oURL.origin != baseURL.origin) return;
            let isPageLink = oURL.nohash === baseURL.nohash;
            if (isPageLink) {
                framer.onPageLink(url, details);
                return false;
            }
            let frameset = frame;
            let framesetScope = framer.lookup(url);
            if (!framesetScope || !framer.compareFramesetScope(framesetScope)) {
                return;
            }
            if (requestNavigation(frameset, url, details)) return false;
            return;
            function requestNavigation(frame, url, details) {
                let changeset = frame.lookup(url, details);
                if (changeset === "" || changeset === true) return true;
                if (changeset == null || changeset === false) return false;
                framer.load(url, changeset, frame.isFrameset);
                return true;
            }
        },
        onPageLink: function(url, details) {
            let framer = this;
            console.warn("Ignoring on-same-page links for now.");
        },
        navigate: function(url, changeset) {
            let framer = this;
            return framer.load(url, changeset, true);
        },
        load: function(url, changeset, changeState) {
            let framer = this;
            let frameset = framer.frameset;
            let mustNotify = changeState || changeState === 0;
            let target = changeset.target;
            let frames = [];
            recurseFrames(frameset, function(frame) {
                if (frame.targetname !== target) return;
                frames.push(frame);
                return true;
            });
            let fullURL = URLux.create(url);
            let hash = fullURL.hash;
            let nohash = fullURL.nohash;
            let request = {
                method: "get",
                url: nohash,
                responseType: "document"
            };
            let response;
            return Thenfu.pipe(null, [ function() {
                if (mustNotify) return notify({
                    module: "frameset",
                    type: "leftState",
                    stage: "before",
                    url: document.URL
                });
            }, function() {
                forEach(frames, function(frame) {
                    frame.attr("src", fullURL);
                });
            }, function() {
                return httpProxy.load(nohash, request).then(function(resp) {
                    response = resp;
                });
            }, function() {
                if (changeState) return historyManager.pushState(changeset, "", url, function(state) {});
            }, function() {
                if (mustNotify) return notify({
                    module: "frameset",
                    type: "enteredState",
                    stage: "after",
                    url: url
                });
            } ]);
            function recurseFrames(parentFrame, fn) {
                forEach(parentFrame.frames, function(frame) {
                    let found = fn(frame);
                    if (!found) recurseFrames(frame, fn);
                });
            }
        },
        onPopState: function(changeset) {
            let framer = this;
            let frameset = framer.frameset;
            let frames = [];
            let url = changeset.url;
            if (url !== document.URL) {
                console.warn("Popped state URL does not match address-bar URL.");
            }
            framer.load(url, changeset, 0);
        }
    });
    defaults(framer, {
        lookup: function(docURL) {
            let framer = this;
            if (!framer.options.lookup) return;
            let result = framer.options.lookup(docURL);
            if (result == null || result === false) return false;
            if (typeof result === "string") result = implyFramesetScope(result, docURL);
            if (typeof result !== "object" || !result.scope || !result.framesetURL) throw Error("Unexpected result from frameset lookup");
            return result;
        },
        detect: function(srcDoc) {
            let framer = this;
            if (!framer.options.detect) return;
            let result = framer.options.detect(srcDoc);
            if (result == null || result === false) return false;
            if (typeof result === "string") result = implyFramesetScope(result, document.URL);
            if (typeof result !== "object" || !result.scope || !result.framesetURL) throw Error("Unexpected result from frameset detect");
            return result;
        },
        compareFramesetScope: function(settings) {
            let framer = this;
            if (framer.framesetURL !== settings.framesetURL) return false;
            if (framer.scope !== settings.scope) return false;
            return true;
        },
        inferChangeset: inferChangeset
    });
    function implyFramesetScope(framesetSrc, docSrc) {
        let docURL = URLux.create(docSrc);
        let docSiteURL = URLux.create(docURL.origin);
        framesetSrc = docSiteURL.resolve(framesetSrc);
        let scope = implyScope(framesetSrc, docSrc);
        return {
            scope: scope,
            framesetURL: framesetSrc
        };
    }
    function implyScope(framesetSrc, docSrc) {
        let docURL = URLux.create(docSrc);
        let framesetURL = URLux.create(framesetSrc);
        let scope = docURL.base;
        let framesetBase = framesetURL.base;
        if (scope.indexOf(framesetBase) >= 0) scope = framesetBase;
        return scope;
    }
    function inferChangeset(url, partial) {
        let inferred = {
            url: url
        };
        switch (typeof partial) {
          case "string":
            inferred.target = partial;
            break;

          case "object":
          default:
            throw Error("Invalid changeset returned from lookup()");
            break;
        }
        return inferred;
    }
    let notify = function(msg) {
        let module;
        switch (msg.module) {
          case "frameset":
            module = framer.frameset.options;
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
            break;
        }
        if (typeof listener == "function") {
            let promise = Thenfu.defer(function() {
                listener(msg);
            });
            promise["catch"](function(err) {
                throw Error(err);
            });
            return promise;
        } else return Thenfu.asap();
    };
    function registerFrames(framesetDef) {
        forOwn(framesetDef.frames, function(o, key) {
            frameDefinitions.set(key, o);
        });
    }
    function interceptFrameElements() {
        assign(HFrame.prototype, {
            frameEntered: function(frame) {
                this.frames.push(frame);
            },
            frameLeft: function(frame) {
                let index = this.frames.indexOf(frame);
                this.frames.splice(index);
            }
        });
        HFrame._attached = HFrame.attached;
        HFrame._enteredDocument = HFrame.enteredDocument;
        HFrame._leftDocument = HFrame.leftDocument;
        assign(HFrame, {
            attached: function(handlers) {
                this.frames = [];
                HFrame._attached.call(this, handlers);
            },
            enteredDocument: function() {
                framer.frameEntered(this);
                HFrame._enteredDocument.call(this);
            },
            leftDocument: function() {
                framer.frameLeft(this);
                HFrame._leftDocument.call(this);
            }
        });
    }
    let HFrameset = function() {
        let HFrameset = sprockets.evolve(HBase, {
            role: "frameset",
            isFrameset: true,
            frameEntered: function(frame) {
                this.frames.push(frame);
            },
            frameLeft: function(frame) {
                let index = this.frames.indexOf(frame);
                this.frames.splice(index);
            },
            render: function() {
                let frameset = this;
                let definition = frameset.definition;
                let dstBody = this.element;
                let srcBody = definition.render();
                return Thenfu.pipe(null, [ function() {
                    forEach(Array.from(srcBody.childNodes), function(node) {
                        sprockets.insertNode("beforeend", dstBody, node);
                    });
                } ]);
            }
        });
        assign(HFrameset, {
            attached: function(handlers) {
                HBase.attached.call(this, handlers);
                let frameset = this;
                frameset.definition = framer.definition;
                defaults(frameset, {
                    frames: []
                });
                ConfigurableBody.attached.call(this, handlers);
            },
            enteredDocument: function() {
                let frameset = this;
                framer.framesetEntered(frameset);
                frameset.render();
            },
            leftDocument: function() {
                let frameset = this;
                framer.framesetLeft(frameset);
            }
        });
        return HFrameset;
    }();
    function retargetFramesetElements() {
        assign(HBase.prototype, {
            lookup: function(url, details) {
                let link = this;
                let options = link.options;
                if (!options || !options.lookup) return false;
                let partial = options.lookup(url, details);
                if (partial === "" || partial === true) return true;
                if (partial == null || partial === false) return false;
                return framer.inferChangeset(url, partial);
            }
        });
        HBase._attached = HBase.attached;
        HBase.attached = function(handlers) {
            HBase._attached.call(this, handlers);
            let object = this;
            let options = object.options;
            if (!options.lookup) return;
            handlers.push({
                type: "requestnavigation",
                action: function(e) {
                    if (e.defaultPrevented) return;
                    let acceptDefault = framer.onRequestNavigation(e, this);
                    if (acceptDefault === false) e.preventDefault();
                }
            });
        };
    }
    function registerFramesetElement() {
        sprockets.registerElement("body", HFrameset);
        let cssText = [ "html, body { margin: 0; padding: 0; }", "html { width: 100%; height: 100%; }" ];
        let style = document.createElement("style");
        style.textContent = cssText;
        document.head.insertBefore(style, document.head.firstChild);
    }
    (function() {
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
            sprockets: sprockets,
            htmlParser: htmlParser,
            httpProxy: httpProxy,
            historyManager: historyManager,
            CustomNamespace: CustomNamespace,
            filters: filters,
            decoders: decoders,
            processors: processors,
            configData: configData,
            controllers: controllers,
            frameElements: frameElements,
            frameDefinitions: frameDefinitions,
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
        assign(this.Meeko, formElements$1);
        assign(this.Meeko, layoutElements$1);
        assign(this.Meeko, framesetDefinitions);
    }).call(window);
})();
//# sourceMappingURL=HyperFrameset.js.map
