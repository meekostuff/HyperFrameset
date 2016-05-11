## Frame Definition

``` .html
<hf-frame defid="hfdef_frameX">
	<hf-body condition="loaded">
		<hf-transform type="main">
		</hf-transform>
	</hf-body>
</hf-frame>
```
	
### `<hf-frame>`

A frame definition must contain one or more `<hf-body>` elements.

If it is to be referenced by other frame declarations then it must also have an `@id`.

Since a frame definition is also a frame declaration it will typically contain
other attributes detailed in the [Frame Declaration](./Frame-Declaration.html) section.

### `<hf-body>`

A frame body is a container for frame content.

Within a frame definition it will contain one or more `<hf-transform>` child elements.

Within the browser view it will contain a processed representation of the document fetched from the frame's `@src`.
The processing involves applying each of the child transforms in turn -
the first transform is applied to the `@src` document,
subsequent transforms are fed the output of the previous transform.

**TODO:** 

- `@condition`: `loaded`, `loading`, `uninitialized`
- transition details

### `<hf-transform>`

The type of the transform is selected with `@type`.
The type must be compatible with the input format.

There are three built-in transform types: 

- [`main`](Main-Processor.html): compatible with "html" input
- [`script`](Script-Processor.html): compatible with "html" or "json" input
- [`hazard`](Hazard-Processor.html): compatibility depends on the "provider"

Some types of transform (e.g. `hazard`) support programmable querying of the input content. 
In this case the transform processor will use a "provider" which is responsible for 
decoding the input content and processing specific queries. 
The provider is specified with `@format` which must be compatible with the type of transform and the input format. 

There are three built-in providers: 

- [`css`](CSS-Decoder.html): compatible with `hazard` transform and "html" input
- [`microdata`](Microdata-Decoder.html): compatible with `hazard` transform and "html" input
- [`json`](JSON-Decoder): compatible with `hazard` transform and "json" input

