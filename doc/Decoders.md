## Decoders

A decoder executes queries on a DOM (or other) tree.

A decoder is a javascript "class" which is registered with the frame-overseer by calling 

``` .javascript
Meeko.decoders.register(name, decoder)
```

where 

- `name` is a string-identifier for the decoder
- `decoder` is the decoder class constructor function

The frame-overseer will create a decoder instance by calling

``` .javascript
new decoder()
```

The decoder prototype MUST have two methods:

``` .javascript
init: function(srcTree)

evaluate: function(query, context, variables, wantArray)
```

`init(srcTree)` is called to assign `srcTree` to the decoder. Preparsing (if appropriate) should be done in this method.
`srcTree` is typically a DOM-document or DOM-fragment, but can be any JS tree. 

`evaluate(query, context, variables, wantArray)` is called to process a query, where:

- query: the query string
- context: the context "node" for the query
- variables: a map of variable-names and values
- wantArray: whether the query should return all matches or just the first

