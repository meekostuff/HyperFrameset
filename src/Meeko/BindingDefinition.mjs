import * as _ from "./stuff.mjs";

class BindingDefinition {
    constructor(desc) {
        _.assign(this, desc);
        if (!this.prototype) {
            if (desc.prototype) this.prototype = desc.prototype;
            else this.prototype = null;
        }
        if (!this.handlers) this.handlers = [];
    }
}

export default BindingDefinition;