# Processors

A processor transforms source data into DOM output using a template.

## Registration

Processors are registered by name:

```javascript
Meeko.processors.register(name, ProcessorClass)
```

Built-in processors:
- `'hazard'` — the primary template engine (default)
- `'main'` — pass-through: extracts `<main>` or `[role=main]` content
- `'script'` — evaluates a `<script>` to produce a custom transform function

## Interface

A processor class must implement:

```javascript
class MyProcessor {
    constructor(options, namespaces) {}
    loadTemplate(element) {}
    transform(provider, details) {}
}
```

### `loadTemplate(element)`

Called once during preprocessing. Receives the `<hf-transform>` element
containing the template markup. The processor should parse and prepare
the template for later rendering.

### `transform(provider, details)`

Called at render time. Returns a DocumentFragment (or a Promise resolving to one).

- `provider.source` — the source data (Document, Element, or JS object)
- `details` — render context (url, scope, mainSelector, plus any custom values)

## Default: Hazard Processor

The default transform type is `hazard`. If no `type` attribute is specified
on `<hf-transform>`, the hazard processor is used.

See [Hazard-Processor.md](Hazard-Processor.md) for full documentation.

## Main Processor

The `main` processor extracts content from the source document without
applying any template logic:

```html
<hf-transform type="main"></hf-transform>
```

It finds `<main>`, `[role=main]`, or falls back to `<body>` content,
and returns the children as a fragment.

## Script Processor

The `script` processor evaluates a `<script>` inside the transform element
to produce a custom transform object:

```html
<hf-transform type="script">
  <script>
  ({
      transform(source, details) {
          // custom logic
          let frag = document.createDocumentFragment();
          // ... build output ...
          return frag;
      }
  })
  </script>
</hf-transform>
```

The script must return an object with a `transform(source, details)` method.
