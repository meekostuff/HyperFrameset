(function() {

var logger = Meeko.logger;
var _ = Meeko.stuff;
var DOM = Meeko.DOM, $id = DOM.$id, $$ = DOM.$$;
var URL = Meeko.URL, baseURL = URL(document.URL);
function toArray(list) { var a = []; for (var n=list.length, i=0; i<n; i++) a[i] = list[i]; return a; }

var framesetURL, scope;
var mainTarget = 'hf_main';

Meeko.framer.configFrameset({
	/*
	The framesetURL can be dependent on anything, for-instance
	+ device / window dimensions
		- to provide optimal layout
	+ browser
		- to give minimal support to old browsers
	+ a theme setting from cookie or localStorage
		- allows you to test a frameset-document on the live site
	 */
	
	lookup: function(url) {
		if (!framesetURL) return null;
		return {
			framesetURL: framesetURL,
			scope: scope
		}
	},
	
	detect: function(doc) {
		framesetURL = getFramesetURL(doc);
		scope = URL(document.URL).base;
		return this.lookup(document.URL);
	},
	
	target:function(url, details) {
		return mainTarget;
	}
});

Meeko.framer.configFrame({
	normalize: function(doc, details) { // details contains the request `url` and `method`
		
		// This removes fallback <style>, <link rel="stylesheet"> and <script> from <head>
		var srcHead = doc.head;
		_.forEach(toArray(srcHead.childNodes), function(node) { // remove nodes that do not match specified conditions
			switch(DOM.tagName(node)) { 
			case "style":
				break;
			case "link":
				if (!/\bstylesheet\b/i.test(node.rel)) return;
				break;
			case "script":
				break;
			default: return;
			}
			srcHead.removeChild(node);
		});
		
		// YOUR NORMALIZE CODE GOES HERE
	},
	
	// These SHOULD be set by your frameset-document(s). This is just for backwards compat
	duration: 0,
	entering: { before: hide, after: show },
	leaving: { before: hide, after: show }
});

function getFramesetURL(doc) {
	var link = getFramesetLink(doc);
	if (!link) return null; // FIXME warning message
	var href = link.getAttribute("href");
	return baseURL.resolve(href); // FIXME href should already be absolute
}

function getFramesetLink(doc) {
	var matchingLinks = [];
	var link, specificity = 0;
	_.forEach($$("link", doc.head), function(el) {
		var tmp, sp = 0;
		if (el.nodeType != 1) return;
		var type = el.type.toLowerCase();
		if (!/^\s*FRAMESET\s*$/i.test(el.rel)) return;
		if (type == "text/html" || type == "") sp += 1;
		else {
			logger.warn("Invalid frameset document type: " + type);
			return;
		}
		if (tmp = el.getAttribute("media")) { // FIXME polyfill for matchMedia??
			if (window.matchMedia && window.matchMedia(tmp).matches) sp += 2;
			else return; // NOTE if the platform doesn't support media queries then this frameset is rejected
		}
		if (sp > specificity) {
			specificity = sp;
			link = el;
		}
	});
	return link;
}

function hide(msg) { msg.node.setAttribute("hidden", "hidden"); }
function show(msg) { msg.node.removeAttribute("hidden"); }
function noop(msg) { }

})();
