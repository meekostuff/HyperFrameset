/*!
 * Builtin Processors
 * Copyright 2016 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

import processors from './processors.mjs';
import MainProcessor from './MainProcessor.mjs';
import ScriptProcessor from './ScriptProcessor.mjs';
import HazardProcessor from './HazardProcessor.mjs';

processors.register('main', MainProcessor);

processors.register('script', ScriptProcessor);

processors.register('hazard', HazardProcessor);
