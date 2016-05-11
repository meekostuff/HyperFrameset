## Script Processor

The `script` processor provides maximal flexibility by allowing a user-supplied function to perform the transformation. 

The transform MUST be declared like this:

``` .html
<hf-transform type="script">
	<script for>
	({
		transform: function(fragment) { }
	})
	</script>
</hf-transform>
```
    
The script MUST NOT have a `src` attribute, and is evaluated with

``` .js
(Function('return (' + script.text + ');'))()
```

to generate a `processingObject` for the transform. The transformation is performed by calling

``` .js
processingObject.transform(fragment);
```

which is typically passed either the source document or a DOM-fragment,
and typically returns a DOM-fragment. 
