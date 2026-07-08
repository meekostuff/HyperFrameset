# Script Processor

The `script` processor provides maximal flexibility by allowing a user-supplied
function to perform the transformation.

```html
<hf-transform type="script">
  <script>
  ({
      transform: function(source, details) {
          let doc = source.nodeType === 9 ? source : source.ownerDocument;
          let frag = doc.createDocumentFragment();
          // ... custom transform logic ...
          return frag;
      }
  })
  </script>
</hf-transform>
```

The script MUST NOT have a `src` attribute. It is evaluated with:

```js
(Function(`return (${script.text}\n)`))()
```

to produce a processing object. The object MUST have a `transform` method:

```js
processingObject.transform(source, details)
```

**Parameters:**

- `source` — the source data (Document, Element, or JS object)
- `details` — render context including `url`, `scope`, `mainSelector`

**Returns:** a DOM fragment (or node) to be inserted into the frame.

**Notes:**

- The default processor type is now `hazard`. Specify `type="script"` explicitly.
- Consider using the hazard processor with `haz:var` and JS expressions instead —
  it provides the same power with better inspectability and fallback handling.
