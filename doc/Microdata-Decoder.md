# Microdata Utility

`Microdata.mjs` provides functions for extracting structured data from HTML documents
annotated with [microdata](https://www.w3.org/TR/microdata/).

It is available as a standalone utility (not a decoder — the decoder system has been removed).

## API

### `Microdata.getItems(rootNode, type)`

Parse the microdata tree under `rootNode` and return items matching the given `itemtype`.

- `rootNode` — Document or Element to search within.
- `type` — Optional. A string (or array) of itemtype URLs to filter by.
- Returns an array of Elements with matching `itemscope`.

### `Microdata.getProperties(el)`

Get the properties collection for an itemscope element.

- `el` — An element with `itemscope`.
- Returns an object with `.names` (array of property names) and `.namedItem(name)` (returns array of elements with that `itemprop`).

### `Microdata.getValue(el)`

Get the microdata value of a property element.

- For `<meta>`: returns `content` attribute.
- For `<a>`, `<link>`, `<area>`: returns `href`.
- For `<img>`, `<video>`, `<audio>`, `<source>`, `<track>`, `<iframe>`, `<embed>`: returns `src`.
- For `<object>`: returns `data`.
- For `<time>`: returns `datetime`.
- For `<data>`, `<meter>`: returns `value`.
- For all others: returns `textContent`.

## Usage in Hazard templates

Since the decoder system has been removed, use Microdata as a helper function
available via the scope. You can expose it through the frameset config:

```html
<script for>
({
    lookup: function(url) { return 'hf_main'; },
    helpers: { Microdata: Meeko.Microdata }
})
</script>
```

Then in templates:

```html
<haz:each select="Microdata.getItems(root, 'http://schema.org/Person')" as="person">
  <haz:var name="props" select="Microdata.getProperties(person)"></haz:var>
  <span><haz:text select="Microdata.getValue(props.namedItem('name')[0])"></haz:text></span>
</haz:each>
```

Or create a convenience wrapper that converts microdata to plain objects:

```js
function microdataToObject(el) {
    let props = Microdata.getProperties(el);
    if (!props) return Microdata.getValue(el);
    let obj = {};
    for (let name of props.names) {
        let items = props.namedItem(name).map(microdataToObject);
        obj[name] = items.length === 1 ? items[0] : items;
    }
    return obj;
}
```
