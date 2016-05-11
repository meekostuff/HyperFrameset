## Frame Declaration

``` .html
<hf-frame def="hfdef_frameX" targetname="hf_frame1" src="scope:./index.html" main="main"></hf-frame>
```
	
When a frame declaration enters the browser view, its `src` attribute is interpreted as a URL and fetched.
Its `def` attribute is used to lookup a frame definition which will process the fetched document
and produce a rendering for the frame.

### Frame naming

Similar to `<frame>` and `<iframe>`, 
a frame declaration can have a `targetname` attribute,
which allows it to be a target for `requestnavigation` events.

