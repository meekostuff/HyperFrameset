/*!
 * HyperFrameset
 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */
import dateFormat from './Meeko/dateFormat.mjs';
import * as _ from './Meeko/stuff.mjs';
import Registry from './Meeko/Registry.mjs';
import Task from './Meeko/Task.mjs';
import Thenfu from './Meeko/Thenfu.mjs';
import URLux from './Meeko/URLux.mjs';
import * as DOM from './Meeko/DOM.mjs';
import scriptQueue from './Meeko/scriptQueue.mjs';
import controllers from './Meeko/controllers.mjs';
import htmlParser from './Meeko/htmlParser.mjs';
import httpProxy from './Meeko/httpProxy.mjs';
import CustomNamespace from './Meeko/CustomNamespace.mjs';
import * as Microdata from './Meeko/Microdata.mjs';
import processors from './Meeko/processors.mjs';
import MainProcessor from './Meeko/MainProcessor.mjs';
import ScriptProcessor from './Meeko/ScriptProcessor.mjs';
import HazardProcessor from './Meeko/HazardProcessor.mjs';
import './Meeko/builtin-processors.mjs';
import * as layoutElements from './Meeko/layoutElements.mjs';
import transcluder from './Meeko/transcluder.mjs';
import * as framesetDefinitions from './Meeko/framesetDefinitions.mjs';
import framer, { HFrameset, HFrame } from './Meeko/framer.mjs';

(function() {

    let stuff = _.assign({}, _);
    stuff.dateFormat = dateFormat;

    if (!this.Meeko) this.Meeko = {};
    _.assign(this.Meeko, {
        stuff, Registry, Task, Thenfu, URLux, DOM, scriptQueue,
        htmlParser, httpProxy,
        CustomNamespace,
        processors,
        controllers,
        Microdata,
        transcluder,
        framer,
        MainProcessor, ScriptProcessor, HazardProcessor,
        HFrame, HFrameset
    });

    _.assign(this.Meeko, layoutElements);
    _.assign(this.Meeko, framesetDefinitions);

}).call(window);
