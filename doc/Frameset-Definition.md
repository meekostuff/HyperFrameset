# Frameset Definition

The frameset definition is created by processing the `<body>` of the frameset document.
Every `<hf-frame>` is **both** a frame definition and a frame declaration,
unless it has a `@def` attribute in which case it is only a declaration —
`@def` will contain the defid of a frame definition.

Each frame definition is wrapped in a `<template defid="...">` element and placed in
the document `<head>` (or a configured frame container). This makes frame definitions
inspectable in devtools while keeping them inert (not matched by document-level selectors).

Each frame declaration (a shallow clone placeholder with `@def`) remains in
the `<body>` where it was declared.

After processing, the `<body>` is inserted into the browser view.
Its contained frame declarations are automatically handled,
typically by fetching and rendering the frame `@src`.
These renderings may insert more frame declarations which are again automatically handled.

## Configuration

Any `<script for>` in the `<body>` is used to generate an options object
for the "associated element", see
[script-handling](./Frameset-Document.md#script-handling).

The script SHOULD have a format like:

```html
<script for>
({
    lookup: function(url, details) { return 'hf_main'; }
})
</script>
```

This options object configures how HyperFrameset determines
the appropriate frame target for navigation events
triggered by clicks on hyperlinks or form-submission (GET only).

### `lookup(url, details)`

Return the target frame `targetname` for the given URL.

For navigation events the `details` object has the following fields:
- `url` — the URL to be navigated to
- `element` — the source element for the event (`<a href>` or `<form method="get">`)
- `referrer` — the current document.URL

Return values:
- A valid `targetname` string — initiates pushState-assisted navigation to that frame
- `true` — cancels the navigation event
- Falsy — the event continues to bubble (may result in normal browser navigation)

The `lookup()` callback can be configured for any of
`<hf-frame>`, `<hf-panel>`, `<hf-vlayout>`, `<hf-hlayout>`, `<hf-deck>`, `<hf-rdeck>`.

It can also be configured for `<body>`, which means it is used for
determining the target-frame of the landing-page URL and
for handling navigation events at the document level.
