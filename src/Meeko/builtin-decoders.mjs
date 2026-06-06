/*!
 * builtin-decoders
 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

/**
 * @interface Decoder
 * @description Virtual interface for HyperFrameset decoders
 * 
 * @function init
 * @param {*} source - The source data to initialize with
 * @description Initialize decoder with source data
 * 
 * @function evaluate
 * @param {string} query - Query string to evaluate
 * @param {*} context - Current context for evaluation
 * @param {Object} variables - Available variables
 * @param {boolean} wantArray - Whether to return array result
 * @returns {*} Evaluation result
 * @description Evaluate query against source data
 * 
 * @function matches
 * @param {Element} element - Element to test
 * @param {string} query - Query to match against
 * @returns {boolean} Whether element matches query
 * @description Test if element matches query (optional method)
 */

import decoders from './decoders.mjs';
import CSSDecoder from './CSSDecoder.mjs';
import MicrodataDecoder from './MicrodataDecoder.mjs';
import JSONDecoder from './JSONDecoder.mjs';

decoders.register('css', CSSDecoder);

decoders.register('microdata', MicrodataDecoder);

decoders.register('json', JSONDecoder);
