HyperFrameset
=============

**WARNING: This project is pre-alpha software. DO NOT USE**
**WARNING: This documentation is out of date - most of it is probably wrong.**

> HyperFrameset provides **full** separation of content from presentation.
> With CSS you can change the styling of a whole site with one stylesheet.
> With HyperFrameset you can change everything -
> banner, navbars, ads, page-layout and stylesheets.
> This facilitates API-first / HTML-payload sites which are
> simple, robust and low-bandwidth, 
> plus "pushState assisted navigation" comes for free.

HyperFrameset is a Javascript page decoration engine which runs in the browser.
It allows your site to deliver real page content first and fast
(think API-first with HTML-payloads).
Your site frameset can be placed in its own page and merged in the browser instead of on the server.
Auxiliary content could also be conditionally loaded with AJAX
(think inside-out iframes).

A site frameset page is similar to an external stylesheet in that it can be shared between several pages.
Originally it was even referenced with a resource link, just like stylesheets:

    <link rel="frameset" type="text/html" href="frameset.html" />

<small>**(This referencing method has been superceded by external configuration, which is less limiting.)**</small>

As a bonus, when your site uses HyperFrameset "pushState assisted navigation" requires no additional setup. 
When someone viewing your page clicks on a link to another page that uses the same frameset
then AJAX updates the real content
and `history.pushState()` updates the browser URL. 

HyperFrameset.js is around 15kB when minified and gzipped.

To see it in action visit my [blog](http://meekostuff.net/blog/).
Make sure you view the page source and check that it is just raw content.
The navbar and contact popup are all in the [site-frameset page](http://meekostuff.net/blog/frameset.html). 

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
		<!-- source the HyperFrameset boot-script -->
		<script src="/path/to/HyperFrameset/boot.js"></script>
		<!-- create a link to the frameset page. All attributes are needed -->
		<link rel="frameset" type="text/html" href="frameset.html" />
		<!-- include fallback stylesheets for when HyperFrameset doesn't run. -->
		<link rel="stylesheet" href="noframeset.css" />
	</head>
	<body>
		<header>
		This fallback content will be removed from the page
		</header>
		
		<article id="mk_content"><!-- Page specific content, identified by @id -->
		#mk_content in page
			<div class="styled-from-frameset">
			This content is styled by the frameset stylesheet
			</div>	
			<div class="styled-from-page">
			This content is styled by the page stylesheet
			</div>	
		</article>
		
		<footer>
		This fallback content will be removed from the page
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
		
		<div id="mk_main">
			#mk_main in frameset
			<article id="mk_content">
			#mk_content in frameset: This will be replaced by #mk_content from the page
			</article>
		</div>
		
		<footer>
		#footer in frameset
		</footer>
	</body>
	</html>

When page.html is loaded into the browser, HyperFrameset will merge frameset.html into it, following these steps:

1. Set the visibility of the page to "hidden". \*
2. Detect the first `<link rel="frameset" href="..." />`, fully resolve the @href and use as the frameset URL.
3. Load the frameset URL into an iframe.
4. Fully resolve URLs for all scripts, images and links in the frameset page. 
5. Insert `<script>`, `<style>`, `<link>`, and conditionally `<meta>` and `<title>` 
from the `<head>` of the frameset page into the `<head>` of the content page.
6. Insert the child nodes of the `<body>` of the frameset page at the start of the `<body>` in the content page
7. For each child node of the `<body>` in the content page, determine whether it should be deleted or moved into the frameset.
 If a child node is an element with an ID, and the ID matches an element in the frameset,
 then the element in the frameset is replaced with the element from the content.
 All other child nodes of the body in the content page are deleted.
8. When all linked stylesheets for the document have loaded, set the visibility of the page to "visible".
This step may occur at any time during or after step 7. \*

\* Steps 1 & 8 are handled by the boot-script.

This process results in a DOM tree like this:

	<!DOCTYPE html>
	<html>
	<head>
		<style>
		.styled-from-frameset { border: 2px solid blue; }
		</style>
		<!-- create a link to the frameset page -->
		<link rel="frameset" type="text/html" href="frameset.html" />
		<!-- and source the HyperFrameset boot-script -->
		<script src="/path/to/HyperFrameset/boot.js"></script>
		<!-- page specific style -->
		<style>
		.styled-from-page { border: 2px dashed green; }
		</style>
	</head>
	<body>
		<header>
		#header in frameset
		</header>
		
		<div id="mk_main">
			#mk_main in frameset
			<article id="mk_content">
			#mk_content in page
				<div class="styled-from-frameset">
				This content is styled by the frameset stylesheet
				</div>	
				<div class="styled-from-page">
				This content is styled by the page stylesheet
				</div>	
			</article>
		</div>
		
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

Any `<link rel="stylesheet">` or `<style>` elements that have `@title="noframeset"`
will be removed from the page before the frameset document is applied, e.g.

	<style title="noframeset">body { max-width: 72ex; }</style>
	
**NOTE:** this is done in the default `config.js`.
If you want to remove or modify this behavior then do so in your site-specific `config.js`.

### Auxiliary content

Children of `<body>` which have no `@id`,
or which have `@id` that cannot be found in the frameset document
will be removed from the page before the frameset is applied, e.g.

	<body>
		<div>
		This irrelevant content will be DEFINITELY REMOVED from the page
		because it has no @id
		</div>
		
		<div id="mk_irrelevant">
		This content will be REMOVED from the page
		assuming the frameset has no element with matching @id
		</div>

		<div id="mk_content">
		This content will be RETAINED in the page
		assuming the frameset has an element with matching @id
		</div>
	</body>	


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

### Page Transition Animation

To enable author supplied animation of page transitions, HyperFrameset provides the `Meeko.panner.config()` method.
You could use it by placing something like the following in your **frameset document**

	Meeko.panner.config({
		duration: 0, // minimum time (ms) between paging start and end. 
		nodeRemoved: {
			before: hide, // handler for before a content node leaves the page. Called at start of transition.
			after: show // handler for after a content node leaves the page. Cannot be called before duration has expired. 
		},
		nodeInserted: {
			before: hide, // handler for before a node enters the page, after the new url has been downloaded.
			after: show // handler for after a node enters the page. Called after a delay to allow styles set by `before` to be applied. 
		},
		pageOut: {
			before: noop,
			after: noop
		},
		pageIn: {
			before: noop, // indicates that the frameset is ready for content to be placed. This would allow frameset to be mutated in url dependent way
			after: noop // the equivalent of `window.onload` in non-pushstate enabled environments.
		}
	});

	function hide(msg) { msg.node.setAttribute("hidden", "hidden"); }
	function show(msg) { msg.node.removeAttribute("hidden"); }
	function noop() {}

These are actually the options set by the default `config.js`, so there's no need to repeat these settings.
The method can be called at anytime. 
Key / value pairs in the passed options object overwrite the matching previous settings.

**NOTE** There is not always a notification **after** `pageOut`.
For instance, if the next page is ready before the transition duration has expired
then the new nodes replace the old nodes directly, rather than transitioning through the frameset placeholders. 

**Example:** A simple way to achieve a fade-out / fade-in effect on page transition is to use the following in the frameset document:

	<script>
	Meeko.panner.config({
		duration: 500 // allows our fade-out to complete
	});
	</script>
	<style>
	#mk_content { /\* assuming #mk_content is the page-specific content \*/
		-webkit-transition: opacity 0.5s linear;
		-moz-transition: opacity 0.5s linear;
		-ms-transition: opacity 0.5s linear;
		-o-transition: opacity 0.5s linear;
		transition: opacity 0.5s linear;
	}
	#mk_content[hidden] {
		display: block;
		visibility: visible;
		opacity: 0;
	}
	</style>


**Example:** If your pages rely on `@class` on the `<body>` or `<html>` elements,
the following will install them in the view-document when the page is panned in:

	<script>
	Meeko.panner.config({
		pageIn: {
			before: function(msg) {
				var doc = msg.node;
				if (document == doc) return;
				document.documentElement.className = doc.documentElement.className;
				document.body.className = doc.body.className;
			}
		}
	});
	</script>
	

### Waiting Indicators

If a new page takes longer than one second to load, the user may wonder if the loading has stalled.
In this case a waiting indicator is typically used to reassure the user that the page is still loading.
HyperFrameset provides a simple way to do this - when the `duration` has expired (and the next page still hasn't loaded)
the frameset document is used as the waiting page. 

### Manual handling

You can stop HyperFrameset handling hyperlink clicks by calling `event.preventDefault()` in a click handler, e.g.

	document.onclick = function(event) { event.preventDefault(); }
	
You can also request HyperFrameset to navigate manually to a new URL by the following: 

	Meeko.panner.assign(newURL)
	
or with `history.replaceState()` behavior: 

	Meeko.panner.replace(newURL)


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

- Scripts in content-pages are never run by HyperFrameset. 
**RECOMMENDATION:** Content-pages do not need and SHOULD NOT have scripts - they SHOULD all be part of the frameset. 

- All scripts which are in the frameset document are executed via dynamic script insertion, 
but behave **like** scripts that are part of a loading document.
Content is not blocked, but earlier scripts block later scripts 
unless the earlier script has the `src` and `async` attributes. 

    `<script src="..." async></script>`

This dynamic script insertion is referred to as **enabling** in the following rules. 

- Scripts in the `<head>` of the frameset are **enabled** AFTER all the content in the `<head>` of the frameset is INSERTED INTO the page.

- Scripts in the `<body>` of the frameset are **enabled** AFTER all the content in the `<body>` of the frameset is INSERTED INTO the page,
but BEFORE any page content is MERGED WITH the frameset.


Capturing
---------

**NOTE** this option MUST be used (for now)

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


### Panner engine

Options for the panner are stored in `Meeko.panner.options`,
which can be accessed directly or by calling 

	Meeko.panner.config(options);
	
where `options` is an object containing key / value pairs
that will overwrite current values.

Typically you only want to configure panner animation options.
These would be set in the frameset-document,
as dealt with in [Page Transition Animation](#page-transition-animation).

All other configuration should be done before HyperFrameset starts. 
This can be achieved by editing the site-specific `config.js` created during [Preparation](#preparation).


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


#### Non-HTML payloads

You can also make your landing-page download as HTML 
and thereafter request, say JSON, and build the primary-content HTML in the browser.
Do this by providing a `request(url, data, details, callback)` function, where

+ **method** is the HTTP method for the request, which will be 'GET' or 'POST'. 
+ **url** is the URL of the page to be panned in
+ **data** is any form data (**WARNING** not implemented yet)
+ **details** is an object containing at least the `URL` and `method`
+ **callback** is an object with `complete(result)` and `error(err)` callback-methods
	
An example of configuration might be

		Meeko.panner.config({
			request: function(method, url, data, details, callback) { // assumes 'GET'
				if (!/GET/i.test(method)) throw "Only supporting GET requests";
				var rq = new XMLHttpRequest;
				rq.open(method, url, true);
				rq.setRequestHeader('Accept', 'application/json');
				rq.onreadystatechange = onchange;
				rq.send();
				function onchange() {
					if (rq.readyState != 4) return;
					if (rq.status != 200) {
						callback.error(rq.status);
						return;
					}
					onload();
				}
				function onload() {
					var json = JSON.parse(rq.responseText);
					var doc = document.implementation.createHTMLDocument(json.title);
					doc.body.innerHTML = processJSON(json); // your json-to-html converter
					callback.complete(doc);
				}
			}
		});


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


