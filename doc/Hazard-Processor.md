## Hazard Processor

``` .html
<hf-transform type="hazard" format="css">
<!-- Your HTML template here -->
	<nav>
		<haz:each select=".navigation ul li">
			<div>
				<span expr:_html="a"></span><!-- span.innerHTML = a.outerHTML -->
			</div>
		</haz:each>
	</nav>
</hf-transform>
```

The `hazard` processor provides a simple templating service.
The content will be HTML with special templating elements and attributes,
which include directives such as `<haz:if>`
and data expressions such as `@expr:href`.

Directives and data expressions are interpreted using an input data decoder
which is selected by `@format`. Current `format` options are `css`, `microdata`, `json`.

### Directives

#### `<haz:if>`

``` .html
<haz:if test="expression">...</haz:if>
```

The contents of this element will be part of the output only if the expression evaluates to `true`.

#### `<haz:unless>`

``` .html
<haz:unless test="expression">...</haz:unless>
```

The contents of this element will be part of the output only if the expression evaluates to `false`.

#### `<haz:choose>`, `<haz:when>`, `<haz:otherwise>`

``` .html
<haz:choose>
	<haz:when test="expression1">...</haz:when>
	<haz:when test="expression2">...</haz:when>
	<haz:otherwise>...</haz:otherwise>
</haz:choose>
```

The `<haz:choose>` element will be replaced by the contents of 
the first child `<haz:when>` whose expression evaluates to `true`, 
or (if none of them do) the contents of `<haz-otherwise>` child elements.

#### `<haz:each>`

``` .html
<haz:each select="expression">
```

The contents of this element will be repeated in the output 
for each item found by the expression. 
If zero items are found then the contents will not be in the output at all.

#### `<haz:one>` EXPERIMENTAL

``` .html
<haz:one select="expression">
```

This is like `<haz:each>` but
only for the *first* item found by the expression. 
If zero items are found then the contents will not be in the output at all.


#### `<haz:template>`

``` .html
<haz:template name="ID">
```

This declares a template which will be used 
to *replace* an `<haz:call>` element identified by `ID`.

#### `<haz:call>`

``` .html
<haz:call name="ID">
```

The element will be *replaced* with 
the contents of the `<haz:template>` element identified by `ID`.
This template must be in the *current* hazard transform.

**TODO:** 

- `<haz:apply>`
- `<haz:var name="alphanumeric_name" select="expression">`
- `<haz:template match="expression">`
- `<haz:eval select="expression">` 
- `<haz:text select="expression">` 
- `<haz:mtext select="mexpression">`
- `<haz:clone>more processing</haz:clone>`
- `<haz:deepclone>`
- `<haz:element name="mexpression">`,
- `<haz:attr name="mexpression">contents</haz:attr>`


### Directives as attributes

There are a few HTML elements which cannot be wrapped inside arbitrary elements.
For example, when parsing a HTML table any unexpected non-table-tags 
between `<table>` and `<td>` are dropped from the output.

In this situation you cannot markup with Hazard elements, 
but most of them can be implemented with attribute markup. 
These Hazard attributes are promoted to elements after parsing,
according to the following rules in order:

``` .html
<element haz:otherwise /> -> 
	<haz:otherwise><element /></haz:otherwise>

<element haz:when="expression" /> -> 
	<haz:when test="expression"><element /></haz:when>

<element haz:each="expression" /> ->
	<haz:each select="expression"><element /></haz:each>

<element haz:if="expression" /> -> 
	<haz:if test="expression"><element /></haz:if>

<element haz:unless="expression" /> -> 
	<haz:unless test="expression"><element /></haz:unless>

<element haz:choose /> -> 
	<element><haz:choose /></element>

<element haz:template="id" /> -> 
	<haz:template name="id"><element /></haz:template>
```

### Data Expressions

These attributes have a name composed of a prefix then a colon (:) then a regular attribute name, e.g.

```
expr:href
```
	
The prefix determines how the expression given in the attribute value is processed.
After processing the unprefixed attribute is set to the returned value.

If the returned value is `boolean` then the attribute is either removed (`false`) or added as an empty attribute (`true`).

If the attribute name is `_html` then the `innerHTML` of the element is set to the returned value
(or if a node is returned then all current children of the element are reoved and the node is appended to the element).

If the attribute name is `_text` then the `textContent` of the element is set to the returned value.

There are two possible prefixes: `expr` and `mexpr`.

*`expr:`* attribute values have the form (FIXME BNF or something)

```
query //> filter-name: params //> filter-name: params
```

where
- `query` is a string in the specified decoder format
- `filter-name` identifies a registered filter function
- `params` is a COMMA (,) separated list of JSON-like objects.
	It is evaluated with `(Function('return [' + params + '];'))()`
	to create an `arguments` array to pass to the `filter` function

Filters are optional


*`mexpr:`* attribute values are plain-text with sections bounded by `{{` and `}}` being interpolated by the algorithm of `expr:` attributes.

