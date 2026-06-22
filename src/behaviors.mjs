/*!
 * Copyright 2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

import { BaseBehavior } from './Meeko/BaseBehavior.mjs';
import { install } from './Meeko/behaviors.mjs';

install({ globalName: 'behaviors', Base: BaseBehavior });
