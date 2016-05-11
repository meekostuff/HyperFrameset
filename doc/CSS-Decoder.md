## CSS Decoder

The css-decoder is only appropriate for DOM-document or DOM-fragment.

The query has the following format

```
css-selector {attribute-name}
```

where:

- `css-selector` is a css-selector which is scoped to the context-node
- `attribute-name` can be a regular attribute 
	or `_html` (for `innerHTML`) 
	or `_text` (for `textContent`)

**TODO:**

- more details on css-selector scoping
