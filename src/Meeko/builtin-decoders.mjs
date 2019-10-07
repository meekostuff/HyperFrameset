
import decoders from './decoders.mjs';
import CSSDecoder from './CSSDecoder.mjs';
import MicrodataDecoder from './MicrodataDecoder.mjs';
import JSONDecoder from './JSONDecoder.mjs';

decoders.register('css', CSSDecoder);

decoders.register('microdata', MicrodataDecoder);

decoders.register('json', JSONDecoder);
