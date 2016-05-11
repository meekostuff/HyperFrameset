## Main Processor

``` .html
<hf-transform type="main" main=".content">
</hf-transform>
```
	
The `main` processor identifies a single element in the source document that contains the primary content -
the identified element is not included in the primary content. 
This element can be identified with a CSS selector in the `main` attribute, e.g. `main=".content"`.
If `@main` is not defined then a sequential search is performed with `main`, then `[role=main]`, then `body`.

**NOTES:**

- The transform element will contain no markup.
- This is a built-in processor.
