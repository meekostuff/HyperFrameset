## Installation

1. Copy or clone the HyperFrameset project files to a directory on your server, say 
	
	```
	/path/to/HyperFrameset/
	```

2. Open a **modern** browser and navigate to the following page
	
	```
	http://your.domain.com/path/to/HyperFrameset/test/normal.html
	```
	
	Visually inspect the displayed page for the following possible failures:
	
	- boxes with **red** background or borders. 
	- boxes that claim to be styled with colored borders but just have the default border. 
	
3. Copy `options.js` **and** `config.js` from the HyperFrameset directory to the root directory of your domain.
	
	If you have unix shell access to the domain's server 
	
	```
	cd /directory/of/your/domain
	cp path/to/HyperFrameset/options.js path/to/HyperFrameset/config.js .
	```

4. Edit your copy of `options.js` to change the following lines
	
	```
	"main_script": '{bootscriptdir}HyperFrameset.js',
	"config_script": '{bootscriptdir}config.js'
	```
	
	to be
	
	```
	"main_script": '/path/to/HyperFrameset/HyperFrameset.js',
	"config_script": '/config.js'
	```

5. Concatenate your modified `options.js` with `boot.js` from the HyperFrameset directory
	and store in `boot.js` of the root directory.
	
	```
	cat options.js path/to/HyperFrameset/boot.js > boot.js
	```

6. Source the modified HyperFrameset boot-script into your pages -
preferably before any stylesheets - 
with this line in the `<head>` of each page 
	
	``` .html
	<script src="/boot.js"></script>
	```

7. Make sure to test the modifications.  
	You could symlink to the test directory from the root directory

	```
	ln -s path/to/HyperFrameset/test
	```
	
	then navigate in the browser to
	
	```
	http://your.domain.com/test/normal.html
	```


Now you have a simple setup allowing you to:

- modify your options without affecting the HyperFrameset installation, and
- update HyperFrameset without overwriting your options.

When you want to:

+ modify options
	- edit your copy of `options.js`
	- repeat step 3 to rebuild your boot-script

+ update HyperFrameset
	- overwrite the HyperFrameset directory with the latest version
	- repeat step 3

+ minify HyperFrameset.js
	- minify HyperFrameset.js to HyperFrameset.min.js in the /path/to/HyperFrameset directory
	- change `main_script` to `/path/to/HyperFrameset/HyperFrameset.min.js` in your copy of the `options.js` file
	- repeat step 3

+ minify boot.js
	- minify boot.js to boot.min.js in the /path/to/HyperFrameset directory
	- repeat step 3 with `path/to/HyperFrameset/boot.min.js`

