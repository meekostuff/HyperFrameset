/*!
 * Builtin Processors
 * Copyright 2016 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

/**
 * @interface Processor
 * @description Virtual interface for HyperFrameset processors
 * 
 * @function loadTemplate
 * @param {Element} template - DOM element containing the processor template
 * @description Process and validate the template element
 * 
 * @function transform
 * @param {Object} provider - Object with srcNode property (source DOM node)
 * @param {Object} details - Additional transformation details
 * @returns {DocumentFragment} Transformed DOM content
 * @description Transform source content using the processor logic
 */

import processors from './processors.mjs';
import MainProcessor from './MainProcessor.mjs';
import ScriptProcessor from './ScriptProcessor.mjs';
import HazardProcessor from './HazardProcessor.mjs';

processors.register('main', MainProcessor);

processors.register('script', ScriptProcessor);

processors.register('hazard', HazardProcessor);
