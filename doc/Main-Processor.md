# Main Processor

```html
<hf-transform type="main">
</hf-transform>
```

The `main` processor extracts primary content from the source document without
any template processing.

It searches the source for the main content element in this order:
1. `<main>` element
2. Element with `[role=main]`
3. `<body>` (if source is a Document)
4. The source element itself (fallback)

The matched element's children are returned as the output fragment.
The matched element itself is not included.

**Notes:**

- The transform element should contain no template markup.
- The `@main` attribute on `<hf-frame>` provides additional selector-based
  extraction *before* the processor runs. If `@main` is set, the processor
  receives the pre-selected element rather than the full document.
- This is a built-in processor registered as `type="main"`.
- The default processor type is now `hazard`. Specify `type="main"` explicitly.
