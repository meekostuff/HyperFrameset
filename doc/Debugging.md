## Debugging

By default, HyperFrameset logs error and warning messages to the browser console.
The logger can be configured to provide info and debug messages (see [Boot options](./Boot-options.html)).

If the `log_level` is set to "debug" then when errors occur the 
[error stack](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/Stack)
is also dumped to the console.

Inline scripts in the frameset document are automatically given 
a [sourceURL](https://developer.chrome.com/devtools/docs/javascript-debugging#@sourceurl-and%20displayname%20in%20action)
on platforms which support it. 
Thist should help finding the source of errors.

**TODO:** 

- more guidance, particularly about asynchronous programming and error logging
