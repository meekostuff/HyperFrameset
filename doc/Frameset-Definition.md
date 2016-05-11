## Frameset Definition

The frameset definition is created by processing the `<body>` of the frameset document.
Every `<hf-frame>` is **both** a frame definition and a frame declaration,
unless it has a `def` attribute in which case it is only a declaration - `@def` will contain the ID of a frame definition. 

Each frame definition is added to the list of definitions maintained in the frameset definition.

Each frame declaration has its children - if any - removed.

The result of this processing is list of frame definitions which contain
zero or more frame declarations as descendants.
Likewise, the `<body>` will contain one or more frame declarations as descendants.

After processing, the `<body>` is inserted into the browser view.
Its contained frame declarations are automatically handled,
typically by fetching and rendering the frame `@src`.
These renderings may insert more frame declarations which are again automatically handled.

### Configuration

Any `<script for>` in the `<body>` is used to 
to generate an options object for the "associated element", see
[script-handling](./Frameset-Document.html#script-handling).

The script SHOULD have a format like

``` .html
<script for>
({
	lookup: function(url) { }
})
</script>
```
    
This options object will configure how HyperFrameset determines 
the appropriate frame target for `requestnavigation` events 
triggered by clicks on hyperlinks or form-submission (GET only).

The following callbacks can be configured

- **`lookup(url, details)`**
	return the target frame `targetname` for the landing-page URL or a `requestnavigation` event.  
	For `requestnavigation` events the `details` object has the following fields:
		+ url: the URL to be navigated to 
		+ element: the source element for the event ( `<a href>` or `<form method="get">` ) 
		+ referrer: the current document.URL

	If this method returns a valid target frame `targetname` then 
	pushState-assisted-navigation is initiated
	and frames with that target `targetname` are loaded with the hyperlinked resource.  
	If it returns `true` then the `requestnavigation` event is cancelled.
	Otherwise the `requestnavigation` event continues to bubble, 
	where it might be handled elsewhere or eventually 
	result in a normal browser navigation being performed.

The `lookup()` callback can be configured for any of
`<hf-frame>`, `<hf-panel>`, `<hf-vlayout>`, `<hf-hlayout>`, `<hf-deck>`, `<hf-rdeck>`. 

It can also be configured for `<body>`, which means that it is used for 
determining the target-frame of the landing-page URL, and
for `requestnavigation` events will result in the document URL being changed. 

