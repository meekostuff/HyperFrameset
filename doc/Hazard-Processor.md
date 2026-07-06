# Hazard Processor

```html
<hf-transform type="hazard">
  <nav>
    <haz:each select="[...root.querySelectorAll('nav li')]" as="item">
      <div><haz:eval select="item.querySelector('a')"></haz:eval></div>
    </haz:each>
  </nav>
</hf-transform>
```

The `hazard` processor provides a declarative templating engine.
Templates are HTML with special directive elements and JavaScript expression attributes.

All expressions are JavaScript, evaluated against a scope that includes:
- `root` — the source data (Document, Element, or JS object)
- Variables declared with `haz:var`, `haz:param`, or `@as`
- Global values passed via the `details` parameter

## Directives

### `<haz:if>` / `<haz:unless>`

```html
<haz:if test="root.items.length > 0">
  <p>There are items.</p>
</haz:if>

<haz:unless test="root.user">
  <p>Not logged in.</p>
</haz:unless>
```

Standard JavaScript truthiness: `false`, `0`, `""`, `null`, `undefined`, `NaN` are falsy.

### `<haz:choose>`, `<haz:when>`, `<haz:otherwise>`

```html
<haz:choose>
  <haz:when test="root.status === 'active'"><span>Active</span></haz:when>
  <haz:when test="root.status === 'pending'"><span>Pending</span></haz:when>
  <haz:otherwise><span>Unknown</span></haz:otherwise>
</haz:choose>
```

### `<haz:each>`

```html
<haz:each select="root.items" as="item">
  <div>${item.name}</div>
</haz:each>
```

`@select` must evaluate to an iterable (array, NodeList, etc.).
`@as` names the iteration variable (required).

### `<haz:one>`

```html
<haz:one select="root.querySelector('.hero')" as="hero">
  <h1><haz:text select="hero.textContent"></haz:text></h1>
</haz:one>
```

Like `haz:each` but for a single value. If the expression is falsy, children are skipped.

### `<haz:var>`

```html
<haz:var name="count" select="root.items.length"></haz:var>
```

Sets a named variable in the current scope.

### `<haz:text>`

```html
<haz:text select="root.title"></haz:text>
<haz:text select="`Hello ${root.name}, you have ${root.count} items`"></haz:text>
```

Inserts the expression result as text content (stringified).

### `<haz:eval>`

```html
<haz:eval select="root.querySelector('#content')">
  <p>Fallback if #content not found</p>
</haz:eval>
```

Inserts the expression result as-is (node or text). If the result is
`null`, `undefined`, or `false` — or if the expression throws — children
are rendered as fallback content.

### `<haz:template>` / `<haz:call>` / `<haz:param>`

```html
<haz:template name="user-card">
  <div class="card"><haz:text select="user.name"></haz:text></div>
</haz:template>

<haz:call name="user-card">
  <haz:param name="user" select="root.currentUser"></haz:param>
</haz:call>
```

Templates receive data explicitly via `<haz:param>`. Params are scoped
to the called template. Global variables (including `root`) remain accessible.

## Attribute expressions

On non-hazard HTML elements, attributes can contain expressions:

```html
<a href="${root.url}" title="${root.title}">link</a>
<span class="`item-${root.status}`">text</span>
<img html:src="${root.imageUrl}" alt="${root.alt}">
```

| Syntax | Meaning |
|--------|---------|
| `attr="${expr}"` | Single expression — result sets the attribute. `undefined`/`null`/`false` removes it. |
| `` attr="`text ${expr}`" `` | Template literal — always produces a string. |
| `html:attr="${expr}"` | Same as above but the `html:` prefix prevents browser fetch during parsing (frameset-first mode). |

## Directives as attributes

Most directives can be written as attributes on HTML elements.
They are promoted to elements during preprocessing:

```html
<!-- Attribute form -->
<li haz:each="root.items" haz:as="item" haz:text="item.name"></li>

<!-- Promoted to -->
<haz:each select="root.items" as="item">
  <li><haz:text select="item.name"></haz:text></li>
</haz:each>
```

Promotion directions:
- `<` wraps the element (haz:if, haz:unless, haz:each, haz:one, haz:when, haz:otherwise, haz:template)
- `>` wraps children (haz:choose, haz:eval, haz:text)
- `+` inserts before the element (haz:var)

## Content expressions

An element whose sole text content is `${expr}` or `` `template` `` is
promoted to contain a `<haz:eval>` or `<haz:text>` element:

```html
<!-- Author writes -->
<span>${root.name}</span>
<p>`Hello ${root.name}`</p>

<!-- Promoted to -->
<span><haz:eval select="root.name"></haz:eval></span>
<p><haz:text select="`Hello ${root.name}`"></haz:text></p>
```

The expression must be the entire content of the element — mixed text/element content is not promoted.

## `html:` prefix

For elements or attributes that would trigger unwanted browser behavior during parsing
(resource fetches, parser restrictions), use the `html:` prefix:

```html
<!-- Prevents fetch of literal "${expr}" during parse -->
<img html:src="${root.imageUrl}">

<!-- Prevents parser interference with table elements -->
<html:table>
  <haz:each select="root.rows" as="row">
    <html:tr><html:td><haz:text select="row.name"></haz:text></html:td></html:tr>
  </haz:each>
</html:table>
```

The `html:` prefix is stripped during preprocessing — the output contains standard HTML elements.

## Injecting globals (helper functions)

Custom functions and values can be made available in template expressions
by declaring a `globals` property in a behavior config.

### Frameset-wide globals

Declare `globals` in the frameset body's `<script for>`:

```html
<body>
<script for>
({
    lookup: function(url) { return 'hf_main'; },
    globals: {
        fn: { formatDate, normalize, truncate },
        q: (el, sel) => el.querySelector(sel),
        qa: (el, sel) => [...el.querySelectorAll(sel)]
    }
})
</script>
...
</body>
```

Everything in `globals` is available by name in all template expressions:

```html
<span><haz:text select="fn.formatDate(root.date)"></haz:text></span>
<haz:each select="qa(root, '.item')" as="item">
  <p><haz:text select="q(item, 'h2').textContent"></haz:text></p>
</haz:each>
```

### Transform-specific globals

Declare `globals` in a `<script for>` inside `<hf-transform>`:

```html
<hf-transform type="hazard">
  <script for>({ globals: { fmt: { currency } } })</script>
  <span><haz:text select="fmt.currency(root.price)"></haz:text></span>
</hf-transform>
```

Transform-level globals override frameset-level globals with the same name.

### Programmatic globals

Set globals from JavaScript before frames load:

```js
Meeko.transcluder.setGlobals({
    fn: { formatDate, normalize },
    q: (el, sel) => el.querySelector(sel)
});
```

### Merge order (last wins)

1. `transcluder.setGlobals({...})` — programmatic baseline
2. Body `<script for>` `globals` — frameset-wide
3. Transform `<script for>` `globals` — most specific

### Namespacing

Use an object (`fn`, `utils`, etc.) to avoid name collisions with data:

```html
<span>${fn.truncate(root.title, 50)}</span>
```
