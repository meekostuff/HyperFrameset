HyperFrameset
=============

**WARNING: This project is pre-alpha software. DO NOT USE**

**WARNING: This documentation is out of date - most of it is probably wrong.**

> HyperFramesets are how HTMLFramesets should have been designed. 
> They might even be the way web-sites were meant to work. 

HyperFrameset is a Javascript [transclusion](http://en.wikipedia.org/wiki/Transclusion)
and layout engine which runs in the browser.
It evolves the HTMLFrameset concept of independently loadable frames for HTMLDocuments
but because it is implemented with AJAX on a single-page it is far more flexible.  
And because it uses `history.pushState` the address-bar URL matches the primary content of the page. 

> HyperFrameset provides **full** separation of content from presentation.
> With CSS you can change the styling of a whole site with one stylesheet.
> With HyperFrameset you can change everything -
> banner, navbars, ads, page-layout and stylesheets.
> This facilitates API-first / HTML-payload sites which are
> simple, robust and low-bandwidth, 
> plus "pushState assisted navigation" comes for free.

A site frameset page is similar to an external stylesheet in that it can be shared between several pages.
It may even be referenced with a resource link, just like stylesheets:

    <link rel="frameset" type="text/html" href="frameset.html" />

<small>**(This referencing method depends on the configuration. Scripted frameset lookup is preferred.)**</small>

HyperFrameset.js is around 20kB when minified and gzipped.

To see it in action visit:

- FIXME demos, etc

For more info on the concept of HyperFrameset and its affinity with pushState assisted navigation, read  

- FIXME tutorials, etc

Also make sure you check the [wiki](https://github.com/meekostuff/HyperFrameset/wiki).


Installation
------------

1. Copy or clone the HyperFrameset project files to a directory on your server, say 
	
		/path/to/HyperFrameset/

2. Open a browser and navigate to the following page
	
		http://your.domain.com/path/to/HyperFrameset/test/normal.html
	
	Visually inspect the displayed page for the following possible failures:
	
	- boxes with **red** background or borders. 
	- boxes that claim to be styled with colored borders but just have the default border. 
	
3. Source the HyperFrameset boot-script into your pages with this line in the `<head>` of each page 
	
		`<script src="/path/to/HyperFrameset/boot.js"></script>`
		
	The boot-script 
	- MUST be in the `<head>` of the page
	- MUST NOT have `@async` or `@defer`
	- SHOULD be before any stylesheets - `<link rel="stylesheet" />` or `<style>`


Quick Start
-----------

**Although this is no longer the preferred way of specifying the hyperframeset, it is still the default and is conceptually easiest to understand.**
**If you are new to HyperFrameset then read this documentation straight through.**
**Otherwise feel free to skip to the [Configuration](#configuration) section first.**

Create a HTML document (page.html) with some page specific content. 
Any page specific scripts, styles or meta-data should go in `<head>`. 
The `<body>` may also contain fallback content, which is
only displayed if HyperFrameset is NOT enabled.

    <!DOCTYPE html>
	<html>
	<head>
		<title>Content</title>
		<!-- source the HyperFrameset boot-script -->
		<script src="/path/to/HyperFrameset/boot.js"></script>
		<!-- create a link to the frameset page. All attributes are needed -->
		<link rel="frameset" type="text/html" href="frameset.html" />
		<!-- include fallback stylesheets for when HyperFrameset doesn't run. -->
		<style>
		.styled-from-page { background-color: red; color: white; }
		</style>
	</head>
	<body>
		<header>
		This fallback header will be removed from the page
		</header>
		
		<main><!-- Primary content -->
			<h1>Page One<h1>
			<div class="styled-from-frameset">
			This content is styled by the frameset stylesheet
			</div>	
			<div class="styled-from-page">
			This content is styled by the page stylesheet which will not apply in the frameset view. 
			</div>	
		</main>
		
		<footer>
		This fallback footer will be removed from the page
		</footer>
	</body>
	</html>
	
Create the frameset document (frameset.html).
This is a normal page of HTML that, when viewed in the browser,
will appear as the final page without the page specific content. 

	<!DOCTYPE html>
	<html>
	<head>
		<style>
		.styled-from-frameset { border: 2px solid blue; }
		</style>
	</head>
	<body>
		<header>
		#header in frameset
		</header>
		
		<nav>
			<label>Navigation</label>
			<hf-frame name="hf_nav" type="html" src="scope:./index.html" main="nav">
				<hf-body></hf-body>
			</hf-frame>
		</nav>
		
		<main>
			<label>Primary Content</label>
			<hf-frame name="hf_main" type="html" main="main">
				<hf-body"></hf-body>
			</hf-frame>
		</main>
		
		<footer>
		#footer in frameset
		</footer>
	</body>
	</html>

When page.html is loaded into the browser, HyperFrameset will merge frameset.html into it, following these steps:

1. Set the visibility of the page to "hidden". \*
2. Detect the first `<link rel="frameset" href="..." />`, fully resolve the @href and use as the frameset URL.
3. Load the frameset URL with XMLHttpRequest and parse into a HTMLDocument (possibly using an `<iframe>`)
4. Fully resolve URLs for all scripts, images and links in the frameset page. 
5. Insert `<script>`, `<style>`, `<link>`, and conditionally `<meta>` and `<title>` 
from the `<head>` of the frameset page into the `<head>` of the content page.
6. Insert the child nodes of the `<body>` of the frameset page at the start of the `<body>` in the content page
7. Move relevant content from content page into the frameset. Remove the irrelevant content.
8. When all linked stylesheets for the document have loaded, set the visibility of the page to "visible".
This step may occur at any time during or after step 7. \*

\* Steps 1 & 8 are handled by the boot-script.

This process results in a DOM tree something like this:

	<!DOCTYPE html>
	<html>
	<head>
		<!-- source the HyperFrameset boot-script -->
		<script src="/path/to/HyperFrameset/boot.js"></script>
		<!-- create a link to the frameset page. All attributes are needed -->
		<link rel="frameset" type="text/html" href="frameset.html" />
		<style>
		.styled-from-frameset { border: 2px solid blue; }
		</style>
		<!-- NOTE: no page specific style -->
	</head>
	<body>
		<header>
		#header in frameset
		</header>
		
		<nav>
			<label>Navigation</label>
			<hf-frame name="hf_nav" type="html" src="scope:./index.html" main="nav">
				<hf-body>
					<a href="./page.html">Page One</a><br />
					<a href="./page2.html">Page Two</a>
				</hf-body>
			</hf-frame>
		</nav>
		
		<main>
			<label>Primary Content</label>
			<hf-frame name="hf_main" type="html" main="main">
				<hf-body>
					<h1>Page One<h1>
					<div class="styled-from-frameset">
					This content is styled by the frameset stylesheet
					</div>	
					<div class="styled-from-page">
					This content is styled by the page stylesheet which will not apply in the frameset view. 
					</div>	
				</hf-body>
			</hf-frame>
		</main>
		
		<footer>
		#footer in frameset
		</footer>
	</body>
	</html>


Fallbacks
---------

Sometimes HyperFrameset will not be able to apply the frameset document to the page.
This can occur because

- Javascript is disabled
- the HyperFrameset script failed to download
- HyperFrameset is configured to NOT autostart
- the frameset document failed to download

In this scenario you would like the page to have some basic styling and auxiliary content -
something that can be dispensed with when HyperFrameset runs.

### Stylesheets

All `<link rel="stylesheet">` or `<style>` elements 
will be removed from the page when the frameset document is applied.

### Auxiliary content

Any `<body>` content that isn't referenced by the frameset document
will be removed from the page when the frameset is applied. 


PushState Assisted Navigation
-----------------------------

If `history.pushState` is available then HyperFrameset will conditionally over-ride the default browser behavior when hyperlinks are clicked.
If the @href of the hyperlink is a document that specifies the same frameset as the current page then it can be merged into the current page
in a _similar_ way to the startup merging of frameset and document. 

Some hyperlinks are not appropriate for this and are ignored by HyperFrameset:

- hyperlinks to pages on other sites 
- hyperlinks with a different protocol, e.g. `javascript:...`, `ftp:`
- hyperlinks that target a different window or iframe, e.g.
	
			<a href="some_page.html" target="_blank">...</a>
- anchor hyperlinks - `<a href="#skip">`

That leaves hyperlinks to other pages within the same site.

If a frameset lookup function has been registered then HyperFrameset queries what the frameset of the hyperlinked page would be.
If it is the same as the current frameset then the page is downloaded and used to replace the real content of the current page. 

Otherwise normal browser navigation to the next page is triggered. 

**Note** that the HyperFrameset `click` handling can always be prevented by calling `event.preventDefault()`.

"PushState Assisted Navigation" (PAN) may sometimes be referred to as panning, as in [camera panning](http://en.wikipedia.org/Panning_\(camera\)). 


`<form>` handling
-----------------

HyperFrameset ONLY handles forms where `@method="GET"`.

All other forms are NOT handled, which means the native browser behavior will apply
unless external code prevents the default-action and implements a different behavior.

You are encouraged to handle other forms in a site-specific manner. 

### @method = GET

The form's `@action` and input values are processed to generate a query URL
which is then used to perform pushState assisted navigaion. 
This mimics standard browser behavior.


`<script>` handling
-------------------

- Scripts in content-pages are NEVER run by HyperFrameset. 
**RECOMMENDATION:** Content-pages do not need and SHOULD NOT have scripts, even for fallback.

- All scripts which are in the frameset document are executed via dynamic script insertion, 
but behave **like** scripts that are part of a loading document.
Content is not blocked, but earlier scripts block later scripts 
unless the earlier script has the `src` and `async` attributes. 

    `<script src="..." async></script>`

This dynamic script insertion is referred to as **enabling** in the following rules. 

- Scripts in the `<head>` of the frameset are **enabled** AFTER all the content in the `<head>` of the frameset is INSERTED INTO the page.

- Scripts in the `<body>` of the frameset are **enabled** in a context dependent manner. FIXME currently not at all


Capturing
---------

**NOTE** this option MUST be enabled (for now)

The **capturing** [boot option](#boot-options) prevents normal browser parsing of the *landing page*.  
This allows HyperFrameset to manage parsing in the same way that AJAXed pages are handled.
The main benefits of this would be:

- normalizing landing-page content occurs before the content is rendered, and 

- because `<link>` and `<img>` resources aren't automatically downloaded they can be changed (or removed) with no penalty.

The drawbacks are:

- parsing and displaying of content doesn't begin until the landing-page has fully down-loaded.
  On long pages over slow networks this will have quite a noticeable delay before any content is viewable. 

The article "[Capturing - Improving Performance of the Adaptive Web](https://hacks.mozilla.org/2013/03/capturing-improving-performance-of-the-adaptive-web/)"
provides a short description and discussion of this approach.

### Restrictions

1. The boot-script must be within - or before - `<head>`.
2. The boot-script must be the first `<script>` in the page.
3. If within `<head>` the boot-script may only be preceded by `<meta http-equiv>` elements.

Capturing should be enabled by setting the **capturing** boot option to "strict". This enforces all the preceding restrictions.

Setting the option to true only enforces the first restriction, with warnings given about the other two.


Debugging
---------

By default, HyperFrameset logs error and warning messages to the browser console.
The logger can be configured to provide info and debug messages (see Configuration).

External code is called from HyperFrameset (e.g. nodeInserted / nodeRemoved hooks)
using [event dispatch](http://dean.edwards.name/weblog/2009/03/callbacks-vs-events/)
instead of `try / catch` blocks.
This isolates HyperFrameset from errors in external code,
but doesn't prevent errors and stack-traces being logged in the browser console.

Unfortunately, Firefox [doesn't log errors in event-listeners](https://bugzilla.mozilla.org/show_bug.cgi?id=503244).
You may find debugging easier in a different browser. 


Configuration
-------------

### Preparation

Assuming the default [installation](#installation) was successful,
use these steps to prepare for site specific configuration.

1. Copy `options.js` **and** `config.js` from the HyperFrameset directory to the root directory of your domain.
	
	If you have unix shell access to the domain's server 
	
			cd /directory/of/your/domain
			cp path/to/HyperFrameset/options.js path/to/HyperFrameset/config.js .

2. Edit your copy of `options.js` to change the following lines
	
			"main_script": '{bootscriptdir}HyperFrameset.js',
			"config_script": '{bootscriptdir}config.js'
	
	to be
	
			"main_script": '/path/to/HyperFrameset/HyperFrameset.js',
			"config_script": '/config.js'

3. Concatenate your modified `options.js` with `boot.js` from the HyperFrameset directory
and store in `boot.js` of the root directory.
	
			cat options.js path/to/HyperFrameset/boot.js > boot.js

4. Source the modified HyperFrameset boot-script into your pages -
preferably before any stylesheets - 
with this line in the `<head>` of each page 
	
			<script src="/boot.js"></script>

5. Make sure to test the modifications.  
	You could symlink to the test directory from the root directory
	
			ln -s path/to/HyperFrameset/test
	
	then navigate in the browser to
	
			http://your.domain.com/test/normal.html


Now you have a simple setup allowing you to:

- modify your options without affecting the HyperFrameset installation, and
- update HyperFrameset without overwriting your options.

When you want to:

+ modify options
	- edit your copy of `options.js`
	- repeat step 3 to rebuild your boot-script

+ update HyperFrameset
	- overwrite the HyperFrameset directory with the latest version
	- repeat step 3

+ minify HyperFrameset.js
	- minify HyperFrameset.js to HyperFrameset.min.js in the /path/to/HyperFrameset directory
	- change `main_script` to `/path/to/HyperFrameset/HyperFrameset.min.js` in your copy of the `options.js` file
	- repeat step 3

+ minify boot.js
	- minify boot.js to boot.min.js in the /path/to/HyperFrameset directory
	- repeat step 3 with `path/to/HyperFrameset/boot.min.js`


<a id="boot-options"></a>
### Boot options

These options aren't specifically related to the operation of HyperFrameset. 
The boot-script has the following options (default values in **bold**).

- main_script: **"{bootscriptdir}HyperFrameset.js"**
- log_level: "none", "error", **"warn"**, "info", "debug"
- polling_interval: **50** (milliseconds)
- autostart: false, **true**
- capturing: false, **true**, "strict" FIXME only **true** is acceptable now
- hidden_timeout: **3000** (milliseconds)
- html5\_block\_elements: **"article aside figcaption figure footer header hgroup main nav section"**
- html5\_inline\_elements: **"abbr mark output time audio video picture"**
- config_script: **"{bootscriptdir}config.js"**

Sources for options are detailed below. 


#### From `Meeko.options`

**NOTE** this is how options are set in `options.js`.  
Options can be **preset** by script, like this:

    <script>
	var Meeko = window.Meeko || (window.Meeko = {});
	Meeko.options = {
		log_level: "info",
		autostart: false,
		hidden_timeout: 1000
	};
	</script>

This tells HyperFrameset to
- log 'info', 'warn' and 'error' messages
- prevent automatic startup, and
- when a manual start is requested to hide the page until all frameset-resources are loaded *or*
	1000 milliseconds (1 second) have elapsed, whichever comes *first*.

If autostart is turned off, HyperFrameset can be manually started by calling `Meeko.framer.start()`.

#### From localStorage and sessionStorage
When debugging a page you probably don't want to modify the page source to change HyperFrameset options,
especially as you may have to change them back after you've found the problem.
For this reason HyperFrameset reads `sessionStorage` and `localStorage` at startup, looking for config options.
`sessionStorage` options override those found in `localStorage`, which in turn override those in data-attributes.

Config options are read from JSON stored in the `Meeko.options` key. Thus the following would prevent `autostart` and turn on `debug` logging.

	sessionStorage.setItem('Meeko.options', JSON.stringify({ autostart: false, log_level: "debug" }) );

_Note_ that the page would require a refresh after these settings were made.


### HyperFrameset configuration

There are two aspects of HyperFrameset:

1. Decoration - the wrapping of the primary content of the page with site frameset

2. Panning - replacing the primary content of the page while retaining the same frameset

These aspects are opposite in purpose, but similar in operation.
In particular, they both involve: 
- downloading of external content
- normalizing this content to prepare for HyperFrameset processing
- notifications of content insertion / removal, etc


### Frameset engine

Options for framing are stored in `Meeko.framer.options`,
which can be accessed directly or by calling 

	Meeko.framer.config(options);
	
where `options` is an object containing key / value pairs
that will overwrite current values.

Configuration should be done before HyperFrameset starts. 
This can be achieved by editing the site-specific `config.js` created during [Preparation](#preparation).

Usually you only want to configure how HyperFrameset determines the appropriate frameset-document for a page. 
Do this by providing one of the following options: 

- **`detect(doc)`**  
	MUST return the frameset-URL by inspecting the current page when HyperFrameset starts (this doesn't allow panning)

- **`lookup(url)`**  
	MUST return the frameset-URL for any URL in the site, either the current `document.URL`,
	or the URL of a different page that is to be panned in.

`lookup(url)` is the recommended option.
`detect(doc)` is mainly provided for backwards compatibility,
as can be seen in the default `config.js` script. 

**TODO:** `request`, `normalize`, notifications


#### Pre-decorated pages

Pages on your site may not be in the format that HyperFrameset and your frameset-document are expecting.
In this case you need to provide a `normalize(doc)` function
which will manipulate the DOM of `doc` into the appropriate format, e.g.

		Meeko.panner.config({
			normalize: function(doc) {
				var content = doc.getElementsByTagName('main')[0];
				content.id = 'mk_content';
				doc.body.innerHTML = '';
				doc.body.appendChild(content);
			}
		});

**NOTE:** configuring the `normalize` option prevents initial page decoration
until the `DOMContentLoaded` event (or safest equivalent). FIXME only **capturing** is supported anyway.

### Bonus APIs

HyperFrameset defines various utility classes and functions for internal use.
Many of these are also available for external use if appropriate.
The most useful of these are in the `Meeko.DOM` namespace, and include 

+ `Meeko.URL`
	This provides overlapping functionality with the [proposed URL API](http://url.spec.whatwg.org/#api). 
	`Meeko.URL(absoluteURL)` will return a URL object with the following (read-only) fields:  
	- `href`, `protocol`, `host`, `hostname`, `port`, `pathname`, `search`, `hash` **(Standard)**  
	- `origin`, `basepath`, `base`, `filename`, `nosearch`, `nohash` **(Extensions)**  
	The URL object also has the `resolve(relativeURL)` method which performs a
	fast conversion of a relative URL to absolute, using itself for the `baseURL`.
	
+ `Meeko.DOM.$id`
	This is short-hand for `document.getElementById` (typically aliased to `$id` in a code block)

+ `Meeko.DOM.$$`
	This is short-hand for `document.getElementsByTagName` (typically aliased to `$$` in a code block)



Notes and Warnings
------------------
- HyperFrameset may not be compatible with IE behaviors, eg [CSS3 PIE](http://css3pie.com/).
- unlike CSS, frameset pages SHOULD be in the same domain as the content page otherwise the browsers cross-site restrictions will apply.
Detection for this hasn't been implemented yet. 
- all stylesheets in the content document will be deleted at the start of merging of the frameset page. 
This allows for a fallback styling option of frameset-less pages. 
- the configuration options and mechanism may change in future releases
- URLs in `<style>` sections of the frameset are not resolved.
This means that relative URLs - which are meant to be relative to the frameset URL - 
will probably be wrong when imported into the page.
The work-around for this is to use absolute-paths or absolute-URLs (which you should probably be using anyway).
- There are no compatibility checks and warnings between the content and frameset pages (charset, etc)


TODO
----
- this README is too long - needs to be split up into sub-sections
- some features would be best explained with demo pages / sites 


License
-------

HyperFrameset is available under 
[MPL 2.0](http://www.mozilla.org/MPL/2.0/ "Mozilla Public License version 2.0").
See the [MPL 2.0 FAQ](http://www.mozilla.org/MPL/2.0/FAQ.html "Frequently Asked Questions")
for your obligations if you intend to modify or distribute HyperFrameset or part thereof. 


Contact
-------

If you have any questions or comments, don't hesitate to contact the author via
[web](http://meekostuff.net/), [email](mailto:shogun70@gmail.com) or [twitter](http://twitter.com/meekostuff). 


