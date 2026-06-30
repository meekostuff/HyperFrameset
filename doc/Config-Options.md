## Config options

Before a frameset document can be loaded, 
HyperFrameset must discover which frameset document is right for the landing-page.

In the same way, before responding to a hyperlink activation 
HyperFrameset must determine whether the hyperlinked page can share the currently applied frameset document.

The entity which oversees the frameset and frames is called the `framer`, and it has a JS reference object `Meeko.framer`.
This object is available once the HyperFrameset script has loaded.

`framer` options are stored in `Meeko.framer.options`,
which can be accessed directly or preferably by calling 

```
Meeko.framer.config(options);
```
	
where `options` is an object containing key / value pairs
that will overwrite current values.

Configuration should be done before HyperFrameset starts. 
This can be achieved by editing the site-specific `config.js` created during [Installation](./Installation.html).

Usually you only want to configure how HyperFrameset determines the appropriate frameset-document for a page. 
Do this by providing one of the following options: 

- **`detectFrameset(doc)`** 
	MUST return the frameset-URL by inspecting the landing-page document when HyperFrameset starts (this doesn't allow panning)

- **`lookupFrameset(url)`**
	MUST return the frameset-URL for any URL in the site, either the landing-page `document.URL`,
	or the URL of a different page that is to be panned in.

- **`lookupTarget(url)`**
	Optional fallback for routing a URL to a target frame name.
	Only used if the frameset's own `lookup()` (in its `<script for>`) does not return a result.
	MUST return a target frame name string (e.g. `'hf_main'`), or null/false if not handled.

`lookupFrameset(url)` is the recommended option for frameset resolution.
`detectFrameset(doc)` is mainly provided for backwards compatibility,
as can be seen in the default `config.js` script.
`lookupTarget(url)` is rarely needed — the frameset's own `lookup()` handles routing in most cases. 

**TODO:**

- Explain `scope` and how it is implied

