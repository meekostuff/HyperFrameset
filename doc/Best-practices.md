## Best practices

> Perfection is achieved not when there is nothing left to add, but when there is nothing left to take away.
> -- <cite>Antoine de Saint-Exupery</cite>

An important goal of HyperFrameset is to 
facilitate really-simple site-layouts and content-pages 
that are fully functional **even if** HyperFrameset fails to run. 
These best-practices are for making your site and pages 
fully usable (even if a little ugly) in all browsers (even older ones) 
without HyperFrameset.

<small>**HyperFrameset can be used for a whole site, or for a section within a site (say a documentation set).
In the following, "site" can also refer to a section within a site.**</small>

A general reminder when developing a site is to stop adding stuff to individual pages:

- don't add site navigation or contact forms to pages - they need their own page
- don't add placeholder tags to pages
- don't add presentation classes to elements
- don't add inline styles to elements


### Site Design

**HINT:** Think [API first](http://thinkbda.com/journal/the-long-web/), HTML payload.

- Site navigation (or a Table-of-Contents) is a resource. It should have its own page.
- Anything requiring a form submission is a resource. It should have its own page.
- You should be able to (eventually) navigate to any resource by starting at the home page (or Table-of-Contents page).
- If every page has a link to the home page then you can navigate (eventually) from any entry point to any other resource.
- Don't forget Search Engine Optimization. (**TODO:** expand on this)

A reasonable illustration of a simple site is the [GNU make manual](http://www.gnu.org/software/make/manual/html_node/).
- The table-of-contents has its own URL
- Each page contains only primary content and some minimal contextual links - Contents / Index / Up / Previous / Next
- There is (nearly) no inline styling
- If you remove all styling it is still readable


### Page Design

To work with HyperFrameset, an individual page only needs to contain the primary content for its URL.

But sometimes HyperFrameset will not be able to apply the frameset document to the page.
This can occur because

- Javascript is disabled
- HyperFrameset does not support the browser
- the HyperFrameset script failed to download
- HyperFrameset is configured to NOT start
- the frameset document failed to download

In this scenario you would like the content-page to have some auxiliary content and basic styling -
something that can be dispensed with if HyperFrameset takes over. 


#### Auxiliary content

Any landing-page content that isn't referenced by the frameset document
will be removed from the page when the frameset is applied. 

**RECOMMENDATIONS:** 

- Wrap the *primary content* of content pages in a `<main>` or `<div role="main">` element.
	The default processing of content pages (a `<hf-frame>` with no `<hf-transform>`) is to crop to this "main" element
	(or the `<body>` if this element isn't found). 

- Add a short navigation section near the top of the `<body>` using `<nav>` or `<div role="navigation">`. Include hyperlinks to the site-home, parent-directories of the page, and next and previous pages as appropriate.

(**TODO:** point to some demo markup. Mention appropriate hyperlinks and how they can be used in scoping)

#### Stylesheets

All `<link rel="stylesheet">` or `<style>` elements in the content page 
will be removed when the frameset document is applied,
so you can use them for fallback presentation
without worrying about clashes with styling provided by the frameset document.

**RECOMMENDATIONS:** 

- Use one external stylesheet - it can be updated without regenerating the page

- Use simple styling that would be supported even on old browsers. 

- A single column design is easier to implement and is more likely to be compatible with older browsers.

**WARNING:** Inline styles are not removed by HyperFrameset and SHOULD NOT be used in content pages.

#### Scripts

Scripts in content pages are NEVER run by HyperFrameset 
so they COULD be used for fallback actions.
If HyperFrameset does apply **and** `capturing` of the landing-page is enabled,
then scripts in the landing page are disabled anyway.
However, if HyperFrameset does apply but `capturing` is not enabled,
then there is a potential clash between the actions of the landing page scripts and HyperFrameset processing.

**RECOMMENDATIONS:** 

- Content-pages do not need and SHOULD NOT have scripts, even for fallback.

