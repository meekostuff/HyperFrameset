# Frame Definition

```html
<hf-frame defid="hfdef_frameX">
  <hf-body condition="loaded">
    <hf-transform type="hazard">
      <h1><haz:text select="root.querySelector('h1').textContent"></haz:text></h1>
    </hf-transform>
  </hf-body>
</hf-frame>
```

## `<hf-frame>`

A frame definition must contain one or more `<hf-body>` elements.

If it is to be referenced by other frame declarations then it must also have a `@defid`.

Since a frame definition is also a frame declaration it will typically contain
other attributes detailed in the [Frame Declaration](./Frame-Declaration.md) section.

Frame definitions are stored in `<template>` elements in the document `<head>`
after preprocessing, making them inspectable in devtools.

## `<hf-body>`

A frame body is a container for frame content.

Within a frame definition it will contain one or more `<hf-transform>` child elements.

Within the browser view it will contain a processed representation of the document
fetched from the frame's `@src`. The processing involves applying each of the child
transforms in turn — the first transform is applied to the source document,
subsequent transforms are fed the output of the previous transform.

### `@condition`

- `loaded` — used when the frame has received content (default)
- `loading` — used while content is being fetched (shows fallback content)

## `<hf-transform>`

The type of the transform is selected with `@type`.

Built-in transform types:

- [`hazard`](Hazard-Processor.md) — declarative template engine with JS expressions (default)
- [`main`](Main-Processor.md) — pass-through extraction of `<main>` content
- [`script`](Script-Processor.md) — custom JS transform function

If no `@type` is specified, `hazard` is used.

The `@format` attribute is no longer supported — decoders have been removed.
All data access is done via JavaScript expressions in the template (e.g.
`root.querySelector(...)` for DOM sources, `root.property` for JSON).
