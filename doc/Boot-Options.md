## Boot options

These options aren't specifically related to the operation of HyperFrameset. 
The boot-script has the following options (default values in **bold**).

- log_level: "none", "error", **"warn"**, "info", "debug"
- polling_interval: **50** (milliseconds)
- no_style: **false**, true
- no_frameset: **false**, true
- capturing: false, "auto", **true**, "strict"
- hidden_timeout: **3000** (milliseconds)
- startup_timeout: **10000** (milliseconds)
- html5\_block\_elements: **"article aside figcaption figure footer header hgroup main nav section"**
- html5\_inline\_elements: **"abbr mark output time audio video picture"**
- config_script: **"{bootscriptdir}config.js"**
- main_script: **"{bootscriptdir}HyperFrameset.js"**

Sources for options are detailed below. 

### From `Meeko.options`

**NOTE** this is how options are set in `options.js`.  
Options can be **preset** by script, like this:

``` .html
<script>
var Meeko = window.Meeko || (window.Meeko = {});
Meeko.options = {
	log_level: "info",
	hidden_timeout: 1000
};
</script>
```

This tells HyperFrameset to
- log 'info', 'warn' and 'error' messages
- hide the page until all frameset-resources are loaded *or*
	1000 milliseconds (1 second) have elapsed, whichever comes *first*.

### From localStorage and sessionStorage
When debugging a page you probably don't want to modify the page source to change HyperFrameset options,
especially as you may have to change them back after you've found the problem.
For this reason HyperFrameset reads `sessionStorage` and `localStorage` at startup, looking for config options.
`sessionStorage` options override those found in `localStorage`, which in turn override those in data-attributes.

Config options are read from JSON stored in the `Meeko.options` key. Thus the following would disable hiding of the landing-page and turn on `debug` logging.

``` .html
sessionStorage.setItem(
	'Meeko.options', 
	JSON.stringify({ 
		hidden_timeout: 0, 
		log_level: "debug" 
	}) 
);
```

_Note_ that the page would require a refresh after these settings were made.


## Capturing the Landing Page

The **capturing** [boot option](#boot-options) prevents normal browser parsing of the *landing page*.  
This allows HyperFrameset to manage parsing in the same way that AJAXed pages are handled.
The main benefits of this would be:

- other `<script>`s in the landing-page are disabled

- because `<link>` and `<img>` resources aren't automatically downloaded they can be changed (or removed) with no penalty.

The drawbacks are:

- parsing and displaying of content doesn't begin until the landing-page has fully down-loaded.
  On long pages over slow networks this will have quite a noticeable delay before any content is viewable. 

The article "[Capturing - Improving Performance of the Adaptive Web](https://hacks.mozilla.org/2013/03/capturing-improving-performance-of-the-adaptive-web/)"
provides a short description and discussion of this approach.

### Restrictions

1. The boot-script must be within - or before - `<head>`.
2. The boot-script should be the first `<script>` in the page.
3. If within `<head>` the boot-script should only be preceded by `<meta http-equiv>` elements.

Capturing should be enabled by setting the **capturing** boot option to "strict". This enforces all the preceding restrictions.

Setting the option to true only enforces the first restriction, with warnings given about the other two.

