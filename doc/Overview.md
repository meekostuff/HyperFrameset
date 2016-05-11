## Overview

The HTMLFrameset model is the starting point for the design of HyperFrameset. 
This model has been evolved in the following important ways. 

### The frameset document is like a super-stylesheet

With HTMLFramesets the browser must first open the frameset document which in turn loads primary and auxiliary content in frames.
This has the undesirable consequence that the URL in the address-bar doesn't match the URL of the primary content.

<small>**This will also be the case with more flexible HTMLFrameset-like sites that rely on `<iframe>` instead of `<frame>`.**</small>

With HyperFrameset, when the browser visits a landing-page the appropriate frameset document is loaded and *applied* via AJAX,
with the landing-page content inserted into its appropriate frame 
and auxiliary content loaded into frames as defined by the frameset. 
Hyperlink navigation within the same site is managed by AJAX and history.pushState,
so the URL in the address-bar automatically matches the URL of the primary content.

**NOTE:**

- A frameset document is similar to an external stylesheet in that it can be shared between several pages.
	It may even be referenced with a resource link in the content page, just like stylesheets:
	
	``` .html
	<link rel="frameset" type="text/html" href="frameset.html" />
	```
	
	<small>**(This referencing method depends on the configuration. Scripted frameset lookup is preferred.)**</small>

- The frameset document is still HTML

### Framed documents are **content-only**

HTMLFramesets foster a site and page design where the content of individual pages
is the primary content that matches the page URL **and no other content**.
But because HTMLFrameset frames create a new browsing context 
they allow each page to be scripted and styled in isolation from the containing frameset. 

The HyperFrameset model does not provide this scripting and styling isolation and 
more-over it considers that the primary content of a page is the only aspect of relevance to the frameset view. 
For this reason scripts and stylesheets are stripped from content pages before they are inserted into the frameset view.

### The frameset document supports custom-elements

With HTMLFramesets, `<frameset>` elements provide layout, splitting a region into either rows or columns of `<frame>`s or `<frameset>`s.

In HyperFrameset frames and layout are implemented as custom-elements. 
The equivalent elements are:

- `<frame>`: `<hf-frame>`
- `<frameset cols="">`: `<hf-hlayout>`
- `<frameset rows="">`: `<hf-vlayout>`

HyperFrameset implements other layout elements to allow more complex layout. 
Additional custom-elements can be defined if appropriate.

**Content documents SHOULD NOT contain custom-elements!!**  
If you want your content to make use of custom-elements then transform it before it is inserted into the view.

### Frames are seamless

HyperFrameset frames don't create a new browsing context with `<frame>` or `<iframe>`,
so their content automatically inherits styles from their including context.
This means that styling for all framed content is provided by the frameset document,
as you would expect from a super-stylesheet. 

HyperFrameset frames are declared with markup like

``` .html
<hf-frame src="..."></hf-frame>
```

so they look like HTMLIFrames, but don't imply a new browsing context. 
This also means that frames are *light-weight* -
use as many frames as necessary to simplify implementation of your site.

### Frames can have different presentations for different states.

Since HyperFrameset is implemented with AJAX it has complete control of frame presentation,
whether the frame is `blank`, `loading` or `loaded`.
The frameset can define appropriate presentation with conditional frame bodies, such as

``` .html
<hf-frame>
    <hf-body condition="loaded">
	...
	</hf-body>
	<hf-body condition="loading">
	...
	</hf-body>
	<hf-body condition="blank">
	...
	</hf-body>
</hf-frame>
```

Control over frame presentation can also be extended to effects for page transitions,
when a frame unloads content from one URL and loads content from the next URL.
(Transition effects have not been implemented yet)

### Framed documents can be transformed

A page that is being viewed standalone - perhaps because JS is disabled or failed, or the browser is out-of-date -
will benefit from a basic stylesheet and some basic site navigation and auxiliary content.
HyperFrameset will strip the stylesheet and has some basic ability to crop the primary content of the page,
but what if the structure of the content when displayed in the frameset 
needs to be significantly different to that in the standalone case?

HyperFrameset provides the capability of HTML-to-HTML transformation of content pages through script or templating.
The defining markup for transformation might look like

``` .html
<hf-frame>
	<hf-body>
		<hf-transform type="script">
			<script for>
			({
				transform: function(content) {
					...
				}
			})
			</script>
		</hf-transform>
	</hf-body>
</hf-frame>
```


NOTE: Transformations facilitate dynamic declaration of `<hf-frame>`s.

### Targets for hyperlinks are scriptable

With HTMLFramesets the target frame for a hyperlink in any particular frame is (by default)
obtained from the `target` attribute on the hyperlink itself.
This requires the framed document to have an understanding of the structure of the frameset in which it is placed.

With HyperFrameset the target frame is obtained from a callback function defined in *the frameset document*. 

### Frameset documents are definitions

With HTMLFramesets the frameset document is a *declaration* of browser presentation,
and there will be a one-to-one mapping of HTMLFrames in the view and `<frame>` declarations in the frameset document.

With HyperFrameset the frameset document is a *definition* of browser presentation,
and any `<hf-frame>` in the frameset document could be *both* a declaration of a frame instance in the view *and*
a definition for other frame instances.

For the purpose of illustration:
A frame *definition* would have both a frame-body (without which it doesn't define anything)
and a definition ID (so it can be referenced). For example

``` .html
<hf-frame defid="hf_frame1">
	<hf-body>
	...
	</hf-body>
</hf-frame>
```

A frame *declaration* (which isn't also a definition) would have no body and would reference a frame definition by definition ID.
For example

``` .html
<hf-frame def="hf_frame1"></hf-frame>
```

### Nested frames

With HTMLFramesets, `<frameset>` elements are nestable as long as they are a child of a `<frameset>`.

With HyperFrameset, a `<hf-frame>` is arbitrarily nestable inside another `<hf-frame>`.
When this is combined with document transformation it makes dynamically loaded hierarchical-menus and directory-trees trivial, for example

- the frameset document has a `<hf-frame>` that sources a master page which contains hyperlinks to sections of the site.
	The `<hf-frame>` defines a transform which processes some of those hyperlinks
	into `<hf-frame>`s which are in turn loaded into the view.
	
- a directory tree is split into several files, each containg one sub-directory. 
	A navigation section in the frameset has a `<hf-frame>` that sources the top level file of the directory tree.
	The `<hf-frame>` also defines a transform which converts sub-directory hyperlinks 
	into `<hf-frame>`s that source the sub-directory and apply the *same transform* as for the root directory. 

