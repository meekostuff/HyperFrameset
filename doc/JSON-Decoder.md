## JSON Decoder

The json-decoder is only appropriate for JS trees.

A json query will look something like:

```
^a.b.c
```

that is, an *optional* prefix followed by a path 
which is a DOT (.) separated list of property-names. 

The path is scoped (by default) to the context-object.  

If the query is a DOT (.) then it returns the context-object.  

If the query begins with a CARET (^) then 
the path is scoped to the root-object.

**TODO:**

- explain path evaluation
