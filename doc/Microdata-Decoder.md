## Microdata Decoder

The microdata-decoder is only appropriate for DOM-documents or DOM-fragments
which are annotated with [microdata](https://www.w3.org/TR/microdata/).

A microdata query will look something like:

```
^[http://schema.org/Thing] name1 name2 ...
```

that is, an *optional* prefix followed by a path 
which is a SPACE ( ) separated list of item-names. 

The path is scoped (by default) to the context-node.  

If the query is a DOT (.) then it returns the context-node.  

If the query begins with a CARET (^) then 
the path is scoped to the whole document or fragment.  

If the query begins with a schema-url enclosed by SQUARE-BRACKETS '[', ']' then 
a query is evaluated for each node that matches that schema-url which is a descendant of the context-node (or whole document if there is a CARET first). 

**TODO:**

- explain path evaluation
