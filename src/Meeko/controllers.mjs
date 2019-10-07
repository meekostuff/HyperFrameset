// TODO should this be under Meeko.sprockets??
import * as _ from './stuff.mjs';
import Task from './Task.mjs';

let controllers = {

values: {},

listeners: {},

create: function(name) {
        this.values[name] = [];
        this.listeners[name] = [];
},

has: function(name) {
        return (name in this.values);
},

get: function(name) { 
        if (!this.has(name)) throw name + ' is not a registered controller';
        return this.values[name];
},

set: function(name, value) {
        if (!this.has(name)) throw name + ' is not a registered controller';
        if (value === false || value == null) value = [];
        else if (typeof value === 'string' || !('length' in value)) value = [ value ];
        let oldValue = this.values[name];
        if (_.difference(value, oldValue).length <= 0) return;
        this.values[name] = value;
        _.forEach(this.listeners[name], function(listener) {
                Task.asap(function() { listener(value); });
        });     
},

listen: function(name, listener) {
        if (!this.has(name)) throw name + ' is not a registered controller';
        this.listeners[name].push(listener);
        let value = this.values[name];
        Task.asap(function() { listener(value) });
}

};

export default controllers;