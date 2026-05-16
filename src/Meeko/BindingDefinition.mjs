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