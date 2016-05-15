## Filters

A filter is a JS function which is registered with the frame-overseer by calling 

``` .javascript
Meeko.filters.register(name, fn)
```

where 

- `name` is a string-identifier for the filter
- `fn` is a function implementing the filter which will be called as

	``` .javascript
	fn(value, param1, param2, ...)
	```
	
	where `value` is the input value - either a DOM fragment or JS object
	and `param1`, etc are other parameters.


The built-in filters are:

- `lowercase`
- `uppercase`
- `if: <value-if-input-trueish>`
- `unless: <value-if-input-falseish>`
- `if_unless: <value-if-input-trueish>, <value-if-input-falseish>`
- `match: <comparsion-text-or-regexp>, <value-if-match>, <value-if-not-match>`
- `replace: <text-or-regex-pattern>, <replacement-text>`
- `map: <array-of-regexp-output-pairs-or-dict-of-text-output-fields>`
- `date: <date-format>, <timezone>`

**TODO:** 

- details for built-in filters


