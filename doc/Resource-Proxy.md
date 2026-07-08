# Resource Proxy

The resource proxy is the single resource-resolution layer for all frame content.
It fetches URLs, caches responses, and supports custom protocol handlers for
programmatic resource generation.

## API

### `Meeko.resourceProxy.load(url, requestInfo)`

Fetch a resource. Resolution order:
1. Custom handlers (matched by URL prefix)
2. Cache (matched by URL)
3. XHR fetch

```js
let response = await Meeko.resourceProxy.load('/page.html');
// response.body is a Document

let response = await Meeko.resourceProxy.load('/data.json', { responseType: 'json' });
// response.body is a parsed Object
```

**Parameters:**
- `url` — URL to fetch
- `requestInfo.method` — HTTP method (default: `'get'`)
- `requestInfo.responseType` — `'document'` (default), `'json'`, or `'text'`

**Returns:** `Promise<ResourceResponse>`

### `Meeko.resourceProxy.add(response)`

Add a pre-existing response to the cache. Documents are normalized
(relative URLs resolved) before caching.

```js
Meeko.resourceProxy.add({
    url: 'local:current-user',
    type: 'json',
    body: { name: 'Alice', role: 'admin' }
});
```

### `Meeko.resourceProxy.register(protocol, handler)`

Register a custom handler for URLs starting with a given prefix.
The handler is called instead of making a network request.

```js
Meeko.resourceProxy.register('api:', async (url, requestInfo) => {
    let apiUrl = url.replace('api:', 'https://myapi.com/');
    let resp = await fetch(apiUrl);
    let data = await resp.json();
    return { url, type: 'json', body: data };
});
```

**Handler signature:** `(url: string, requestInfo: Object) → ResourceResponse | Promise<ResourceResponse>`

## ResourceResponse

```js
{
    url: string,       // The resource URL
    type: string,      // 'document', 'json', or 'text'
    status?: number,   // HTTP status (for XHR responses)
    statusText?: string,
    body: any          // Document, Object, or String depending on type
}
```

## Response types

| Type | `body` value | Cache cloning |
|------|-------------|---------------|
| `'document'` | DOM Document | Deep clone via `cloneDocument()` |
| `'json'` | Object/Array | Deep copy via `JSON.parse(JSON.stringify())` |
| `'text'` | String | No clone needed (immutable) |

## Custom protocol handlers

Handlers intercept URLs by prefix before cache lookup or XHR:

```html
<script for>
({
    lookup: function(url) { return 'hf_main'; },
    setup: function() {
        // Generate HTML from a template
        Meeko.resourceProxy.register('template:', (url) => {
            let name = url.replace('template:', '');
            let doc = document.implementation.createHTMLDocument('');
            doc.body.innerHTML = document.getElementById(name).innerHTML;
            return { url, type: 'document', body: doc };
        });

        // Fetch from a JSON API
        Meeko.resourceProxy.register('api:', async (url) => {
            let apiUrl = url.replace('api:', 'https://myapi.com/');
            let resp = await fetch(apiUrl);
            let data = await resp.json();
            return { url, type: 'json', body: data };
        });

        // Generate data programmatically
        Meeko.resourceProxy.register('local:', (url) => {
            let key = url.replace('local:', '');
            return { url, type: 'json', body: getLocalData(key) };
        });
    }
})
</script>
```

Then frames reference custom protocols via `src`:

```html
<hf-frame src="api:users/123" targetname="hf_main">
<hf-frame src="template:sidebar" targetname="hf_nav">
<hf-frame src="local:current-user" targetname="hf_user">
```

## Usage with frames

When a frame loads, the resource proxy fetches the `src` URL. The response
is passed to the frame's transform pipeline:

- `response.body` becomes `root` in hazard template expressions
- For documents: `root.querySelector(...)`, `root.title`, etc.
- For JSON: `root.name`, `root.items`, etc.
- For text: `root` is a string

## Caching

- GET responses are cached automatically by URL
- Cached responses are cloned on retrieval (mutations don't affect the cache)
- Custom handler responses are NOT cached by default (the handler controls this)
- Use `add()` to pre-populate the cache

## Migration from httpProxy

| httpProxy | resourceProxy |
|-----------|--------------|
| `httpProxy.load(url)` | `resourceProxy.load(url)` |
| `httpProxy.add({ url, type, document })` | `resourceProxy.add({ url, type: 'document', body: doc })` |
| `response.document` | `response.body` |
| Only supports `'document'` | Supports `'document'`, `'json'`, `'text'` |
| No custom handlers | `register(protocol, handler)` |
