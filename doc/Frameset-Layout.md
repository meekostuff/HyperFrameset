## Frameset Layout

HyperFrameset provides several custom-elements 
which effect view-layout. 

`<hf-panel>`, `<hf-frame>`, `<hf-body>`, `<hf-hlayout>`, `<hf-vlayout>`, `<hf-deck>`, `<hf-rdeck>`, `<hf-layer>`, `<hf-popup>` 

These elements will have either `static` or `fixed` *positioning*, and 
either `vertical` or `horizontal` *orientation* of children.

Static positioned elements can also have controlled *visibility* 
by using `name` and `value` attributes to co-ordinate with pre-declared framer controllers.

### Positioning

Elements with `static` positioning are normal block elements.
This is the default.

Elements with `fixed` positioning create a new rendering box which doesn't contribute to the layout of their parent tree. 
Fixed position elements are: `<hf-layer>`, `<hf-popup>`

### Orientation

The children of HyperFrameset elements are block elements which are oriented vertically by default. 

If a HyperFrameset element is horizontally oriented then its children are floated.
Horizontally oriented elements are: `<hf-hlayout>`

### Attributes

HyperFrameset elements can have attributes which affect CSS layout.
When the element enters the view the value in these attribute are conditionally copied to the equivalent CSS style attribute. 

Implemented:
`height`, `width`, `minwidth`, `overflow`


### Elements

#### `<hf-layer>`

This is a `fixed` position element that creates a new layer (implemented with a unique `z-index`) above the current layer
and anchored to the top-left corner of the screen. 
The element itself has zero width and height so it doesn't prevent clicks from targetting lower layers. 

This element can only have one child which MUST be a 'static' positioned HyperFrameset element.

#### `<hf-panel>`

This is a `static` position element. The element's dimensions default to 100% of its parent's unless the parent is `<hf-layer>` in which case it will be 100% of the viewport height and width. 

If it has `@name` and `@value` then visibility is controlled by the framer controller of the same name. 

If it only has `@value` then it is assumed to be controlled according to the `@name` of its parent element (which MUST be `<hf-deck>`).

All other `static` position elements inherit behavior from this element.

This may only contain one child element which MUST be `<hf-body>`.

#### `<hf-frame>`

This is a `static` position element like `<hf-panel>`. It's transclusion behavior is detailed in [Frame-Declaration](./Frame-Declaration.html).

The only visible elements of this child MUST be one-or-more `<hf-body>`.

#### `<hf-vlayout>`

This is a `static` position element whose children (which MUST be `static` position HyperFrameset elements) will be oriented vertically. The parent element MUST be a HyperFrameset element. The parent element may override the element's dimensions.

#### `<hf-hlayout>`

This is a `static` position element whose children (which MUST be `static` position HyperFrameset elements) will be oriented horizontally. The parent element MUST be a HyperFrameset element. The parent element may override the element's dimensions.

#### `<hf-deck>`

This is a `static` position element that controls the visibility of its children (which MUST be `static` position HyperFrameset elements) so that at most one is visible. If the element has `@name` then it reads `@value` on child elements to co-ordinate visibility with the framer controller of the same name.

#### `<hf-rdeck>`

This is a `static` position element that controls the visibility of its children (which MUST be `static` position HyperFrameset elements) so that at most one is visible. The visible child is the first one whose `@minwidth` satisfies the width of the element. 

#### `<hf-popup>`

This is a `fixed` position element that is anchored to the top-left corner of where-ever the element would appear if it had normal layout. 

If it has `@name` and `@value` then visibility is controlled by the framer controller of the same name. 

This may only contain one child element which MUST be `<hf-body>`.

#### `<hf-body>`

This element is required as a child of `<hf-panel>`, `<hf-frame>` and `<hf-popup>`.


