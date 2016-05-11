## Frameset Document

When the frameset document has loaded, the `<body>` is separated and used to create the frameset definition.
The remainder of the document - the `<html>`, `<head>` and children - replaces the landing-page in the browser view.
After this replacement the window state should be as though the frameset document was the landing-page. 

**TODO:**

- xml and custom namespaces on `<html>`
- changing the namespace for HyperFrameset


### `<script>` handling { #script-handling }

- Scripts in the `<head>` of the frameset document 
	are executed via dynamic script insertion, 
	but behave **like** scripts that are part of a landing page. 
	So earlier scripts block later scripts 
	unless the earlier script has the `src` **and** `async` attributes. 
	
	``` .html
	<script src="..." async></script>
	```
	
	These scripts are **enabled** AFTER all the content in the `<head>` of the frameset 
	is INSERTED INTO the page.

- Scripts in the `<body>` of the frameset document MUST NOT have a `src` attribute. 
	They are ignored if they do.
- Scripts containing an empty `for` attribute are options scripts attached to 
	the previous non-`<script>`, non-`<style>` element 
	(either a previous sibling or the parent of the script). 
	The script MUST NOT have a `src` attribute, and is evaluated with  
	 
	``` .js
	(Function('return (' + script.text + ');'))()
	```
	
	For example:
    
	``` .html
    <script for>
    ({
        lookup: function(url) { }
    })
    </script>
	```
	
	This is a valid yet inert script when not handled by HyperFrameset.

- Scripts containing a non-empty `for` attribute are ignored.
- Other scripts are executed via dynamic script insertion.

