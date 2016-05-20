## Quick Start

A HyperFrameset enabled site is similar to a HTMLFrameset based site. It has separate HTML documents for 

- the primary content
- the "frameset"
- auxiliary content

Create some HTML pages with some page specific content (page.html).
Any page specific scripts, styles or meta-data should go in `<head>`. 
The `<body>` may also contain fallback content, which is
only displayed if HyperFrameset is NOT enabled.

``` .html
<!DOCTYPE html>
<html>
<head>
	<!-- source the HyperFrameset boot-script -->
	<script src="/path/to/HyperFrameset/boot.js"></script>
	<title>Content</title>
	<!-- create a link to the frameset document. All attributes are needed -->
	<link rel="frameset" type="text/html" href="/frameset.html" />
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
```

Create an index page (index.html).

``` .html
<!DOCTYPE html>
<html>
<body>
	<h1>Index page</h1>
	<nav>
		<a href="/page.html">Page One</a><br />
		<a href="/page2.html">Page Two</a>
	</nav>
</body>
</html>
```


Create the frameset document (frameset.html).
This is a normal page of HTML that, when viewed in the browser,
will appear as the final page without the page specific content. 

``` .html
<!DOCTYPE html>
<html>
<head>
	<style>
	.styled-from-frameset { border: 2px solid blue; }
	</style>
	<script for="hf-frameset">
	({
		lookup: function(url) { return 'hf_main'; } // the target for all same-scope hyperlinks
	})
	</script>
</head>
<body>
	<header>
	#header in frameset
	</header>
	
	<nav>
		<label>Navigation</label>
		<hf-frame targetname="hf_nav" type="html" src="scope:./index.html" main="nav">
			<hf-body></hf-body>
		</hf-frame>
	</nav>
	
	<main>
		<label>Primary Content</label>
		<hf-frame targetname="hf_main" type="html" main="main">
			<hf-body></hf-body>
		</hf-frame>
	</main>
	
	<footer>
	#footer in frameset
	</footer>
</body>
</html>
```

When page.html is loaded into the browser, HyperFrameset will load frameset.html and apply it to the view,
inserting the `<main>` content from page.html into the `hf_main` frame,
and inserting the `<nav>` content from index.html into the `hf_nav` frame.

This process results in a DOM tree something like this:

``` .html
<!DOCTYPE html>
<html>
<head>
	<!-- source the HyperFrameset boot-script -->
	<script src="/path/to/HyperFrameset/boot.js"></script>
	<!-- create a link to the frameset document. All attributes are needed -->
	<link rel="frameset" type="text/html" href="/frameset.html" />
	<title>Content</title>
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
		<hf-frame targetname="hf_nav" type="html" src="/index.html" main="nav">
			<hf-body>
				<a href="/page.html">Page One</a><br />
				<a href="/page2.html">Page Two</a>
			</hf-body>
		</hf-frame>
	</nav>
	
	<main>
		<label>Primary Content</label>
		<hf-frame targetname="hf_main" type="html" main="main">
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
```

**Although this is not the preferred way of specifying the hyperframeset document, it is still the default and is conceptually easiest to understand.**  
**TODO:** A better quick start would be copying a demo site.


### How it works (approximately)

When the browser first visits a page in a HyperFrameset enabled site, the following startup sequence is applied:

1. a small boot-script is loaded
2. if the browser can't support HyperFrameset then startup is abandoned (leaving the page unframed)
3. the HyperFrameset script and config-script are loaded
4. the frameset document for the site is detected and loaded
5. the unframed landing-page in the browser view is replaced by the frameset document
6. the main content of the unframed page (and that of any other pages referenced by frames in the frameset document) is inserted into the view

When a hyperlink in the view is activated the following navigation sequence is applied:

1. If the hyperlink is to an external site then abandon scripted navigation and allow normal browser navigation
2. Examine the hyperlink URL and event-source to find the appropriate target frame and whether the address-bar URL needs updating.
3. Load the hyperlinked page and insert into the appropriate target frame.
4. If the address-bar URL needs updating then call `history.pushState`

