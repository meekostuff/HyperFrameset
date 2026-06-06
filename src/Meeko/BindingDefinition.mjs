/*!
 * BindingDefinition
 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */
import * as _ from "./stuff.mjs";

class BindingDefinition {
    constructor(desc) {
        for (let name of Object.getOwnPropertyNames(desc)) {
            if (name === 'prototype' || name === 'length' || name === 'name') continue;
            this[name] = desc[name];
        }
        if (!this.prototype) this.prototype = desc.prototype || null;
        if (!this.handlers) this.handlers = [];
    }
}

export default BindingDefinition;
