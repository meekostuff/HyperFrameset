## Introduction

> HyperFramesets are the way HTMLFramesets were meant to work -
> super-stylesheets with seamless frames, document transforms and configurable routing. And history.pushState.

HyperFrameset is a light-weight Javascript [transclusion](http://en.wikipedia.org/wiki/Transclusion)
and layout engine which runs in the browser.
Whilst the implementation relies on AJAX and `history.pushState`,
conceptually the design is an evolution of HTMLFramesets.

The primary advance is that the landing page initiates loading of
the frameset document, not the other way round.
HyperFrameset is consistent with the principles of
[Progressive Enhancement](http://en.wikipedia.org/wiki/Progressive_enhancement) and
[Resource Oriented Client Architecture](http://roca-style.org/ "ROCA").

**WARNING:** THIS PROJECT IS ALPHA SOFTWARE. ONLY USE IT FOR EXPERIMENTATION.

### Browser support

HyperFrameset requires features only available in recent versions of popular browsers, 
but sites that adapt well to HyperFrameset will (probably)
have full functionality when HyperFrameset doesn't run.

HyperFrameset can run on browsers which support `history.pushState` and `MutationObserver`.
These are available on most browsers in significant use today.
Since `MutationObserver` is NOT supported on IE10, HyperFrameset uses `MutationEvents` on that platform. 

### License

HyperFrameset is available under 
[MPL 2.0](http://www.mozilla.org/MPL/2.0/ "Mozilla Public License version 2.0").
See the [MPL 2.0 FAQ](http://www.mozilla.org/MPL/2.0/FAQ.html "Frequently Asked Questions")
for your obligations if you intend to modify or distribute HyperFrameset or part thereof. 

### Contact

If you have any questions or comments, don't hesitate to contact the author via
[web](http://meekostuff.net/), [email](mailto:shogun70@gmail.com) or [twitter](http://twitter.com/meekostuff). 

**WARNING:** THIS DOCUMENTATION IS A WORK-IN-PROGRESS.
SOME OF IT MAY BE OUT-OF-DATE. MOSTLY IT IS JUST TOO LONG AND DISORGANISED. 
A BETTER UNDERSTANDING WILL BE GAINED THROUGH EXPLORING A DEMO - VIEW SOURCE IS YOUR FRIEND.

