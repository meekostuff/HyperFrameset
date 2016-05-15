## Processors

A processor transforms an input (typically a DOM-fragment or DOM-document) to an output. 
The processing MAY be configurable with a processing-template and other options passed during initialization, and input related details passed before processing. 

A processor is a javascript "class" which is registered with the frame-overseer by calling 

``` .javascript
Meeko.processors.register(name, processor)
```

where 

- `name` is a string-identifier for the processor
- `processor` is the processor class constructor function

The frame-overseer will create a processor instance by calling

``` .javascript
new processor(options)
```

where `options` is the configuration object associated with a `<hf-transform>` definition.

The processor prototype MUST have two methods:

``` .javascript
loadTemplate: function(template)

transform: function(input, details)
```

`loadTemplate(template)` is called immediately after processor construction, 
where `template` is a DOM-fragment. 

If the processor doesn't use a template then the implementation should log a warning if the template is non-empty.

`transform(input, details)` is called to process the `input` 
where `details` is a JS object with the following fields:

- url: the url of the original document which is being processed
- scope: the scope-url in which the current frameset is operating

