(function() {

var logger = Meeko.logger;
var _ = Meeko.stuff;
var DOM = Meeko.DOM, $id = DOM.$id, $$ = DOM.$$;
var URL = Meeko.URL, baseURL = URL(document.URL);

var framesetURL, scope;

Meeko.framer.config({
	/*
	The framesetURL can be dependent on anything, for-instance
	+ device / window dimensions
		- to provide optimal layout
	+ browser
		- to give minimal support to old browsers
	+ a theme setting from localStorage
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
	}
});

function getFramesetURL(doc) {
	var link = getFramesetLink(doc);
	if (!link) return null; // FIXME warning message
	var href = link.getAttribute("href");
	return baseURL.resolve(href); // FIXME href should already be absolute
}

function getFramesetLink(doc) {
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

_.config(Meeko.HFrameDefinition.options, {
	// These SHOULD be set by your frameset-document(s). This is just for backwards compat
	duration: 0,
	entering: { before: hide, after: show },
	leaving: { before: hide, after: show }
});

function hide(msg) { msg.node.setAttribute("hidden", "hidden"); }
function show(msg) { msg.node.removeAttribute("hidden"); }
function noop(msg) { }


})();
