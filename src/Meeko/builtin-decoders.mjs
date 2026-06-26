/*!
 * builtin-decoders
 * Copyright 2009-2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

/** @see {Decoder} in src/types/Decoder.d.ts */

import decoders from './decoders.mjs';
import CSSDecoder from './CSSDecoder.mjs';
import MicrodataDecoder from './MicrodataDecoder.mjs';
import JSONDecoder from './JSONDecoder.mjs';

decoders.register('css', CSSDecoder);

decoders.register('microdata', MicrodataDecoder);

decoders.register('json', JSONDecoder);
