## Debugging

HyperFrameset logs error and warning messages to the browser console.
Use the browser's built-in console filtering to control which log levels are visible.

Inline scripts in the frameset document are automatically given 
a [sourceURL](https://developer.chrome.com/devtools/docs/javascript-debugging#@sourceurl-and%20displayname%20in%20action)
on platforms which support it. 
This should help finding the source of errors.

**TODO:** 

- more guidance, particularly about asynchronous programming and error logging
