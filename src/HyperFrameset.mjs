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
import sprockets from './Meeko/sprockets.mjs';
import controllers from './Meeko/controllers.mjs';
import htmlParser from './Meeko/htmlParser.mjs';
import httpProxy from './Meeko/httpProxy.mjs';
import CustomNamespace from './Meeko/CustomNamespace.mjs';
import filters from './Meeko/filters.mjs';
import './Meeko/builtin-filters.mjs';
import decoders from './Meeko/decoders.mjs';
import CSSDecoder from './Meeko/CSSDecoder.mjs';
import { MicrodataDecoder, Microdata } from './Meeko/MicrodataDecoder.mjs';
import JSONDecoder from './Meeko/JSONDecoder.mjs';
import './Meeko/builtin-decoders.mjs';
import processors from './Meeko/processors.mjs';
import MainProcessor from './Meeko/MainProcessor.mjs';
import ScriptProcessor from './Meeko/ScriptProcessor.mjs';
import HazardProcessor from './Meeko/HazardProcessor.mjs';
import './Meeko/builtin-processors.mjs';
import configData from './Meeko/configData.mjs';
import * as formElements from './Meeko/formElements.mjs';
import * as layoutElements from './Meeko/layoutElements.mjs';
import frameElements, { frameDefinitions, HFrame } from './Meeko/frameElements.mjs';
import * as framesetDefinitions from './Meeko/framesetDefinitions.mjs';
import framer from './Meeko/framer.mjs';
import HFrameset from './Meeko/HFrameset.mjs';

(function() {

    let stuff = _.assign({}, _);
    stuff.dateFormat = dateFormat;

    if (!this.Meeko) this.Meeko = {};
    _.assign(this.Meeko, {
        stuff, Registry, Task, Thenfu, URLux, DOM, scriptQueue,
        sprockets,
        htmlParser, httpProxy,
        CustomNamespace,
        filters, decoders, processors,
        configData, controllers,
        frameElements, frameDefinitions,
        framer,
        CSSDecoder, MicrodataDecoder, Microdata, JSONDecoder,
        MainProcessor, ScriptProcessor, HazardProcessor,
        HFrame, HFrameset
    });

    _.assign(this.Meeko, formElements);
    _.assign(this.Meeko, layoutElements);
    _.assign(this.Meeko, framesetDefinitions);

}).call(window);
