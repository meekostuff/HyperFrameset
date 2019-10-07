/*!
 UI components 
 (c) Sean Hogan, 2008,2012,2014
 Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
*/

/* NOTE
	+ Assumes Sprocket.js already loaded
*/

Meeko.sprockets.UI = (function() {

let _ = Meeko.stuff, DOM = Meeko.DOM;
let sprockets = Meeko.sprockets, Base = sprockets.Base, RoleType = sprockets.RoleType;

let declareProperties = (Object.defineProperty && Object.create) ? // IE8 supports defineProperty but only on DOM objects
function(obj, props) {
	_.forEach(_.words(props), function(prop) {
		let Prop = ucFirst(prop);
		let getterName = 'get' + Prop;
		let getter = obj[getterName];
		if (typeof getter !== 'function') getter = function() { throw 'Attempt to read write-only property'; }
		let setterName = 'set' + Prop;
		let setter = obj[setterName];
		if (typeof setter !== 'function') setter = function() { throw 'Attempt to write read-only property'; }
		Object.defineProperty(obj, prop, {
			get: getter,
			set: setter
		});
	});
} :
function(obj, props) { };

function ucFirst(text) {
	return text.substr(0,1).toUpperCase() + text.substr(1);
}

let Box = sprockets.evolve(RoleType, {

setHidden: function(state) {
	let element = this.element;
	if (!state) element.removeAttribute('hidden');
	else element.setAttribute('hidden', '');
},

getHidden: function() {
	let element = this.element;
	return element.getAttribute('hidden') !== null;
}

});

declareProperties(Box.prototype, 'hidden');

let TreeItem = sprockets.evolve(Box, {

getListElement: function() {

	let element = this.element;
	let children = element.children;
	for (let node, i=0; node=children[i]; i++) {
		switch (node.tagName.toLowerCase()) {
			case "ol": case "ul": case "select": return node;	
		}
	}	
	return null;
		
},
setSelected: function(state) { // NOTE TreeItem is ignorant of whether multiple TreeItems can be selected
	let element = this.element;
	element.setAttribute("aria-selected", !!state);
},
getSelected: function() {
	let element = this.element;
	let state = element.getAttribute("aria-selected");
	return (/^true$/i.test(state));	
},
setExpanded: function(state) {	
	let listEl = this.getListElement();
	if (!listEl) throw "";
	List(listEl).setHidden(!state);
},
getExpanded: function() {
	let listEl = this.getListElement();
	if (!listEl) throw "";
	return List(listEl).getHidden();
}

});

declareProperties(TreeItem.prototype, 'listElement selected expanded');

let ListItem = TreeItem;

let List = sprockets.evolve(Box, {

getItems: function() {
	let element = this.element;
	let items = [];
	for (let node=element.firstChild; node; node=node.nextSibling) {
		if (node.nodeType === 1) items.push(node);
	}
	return items;
}

});

declareProperties(List.prototype, 'items');

let Tree = sprockets.evolve(Box, {

getListElement: TreeItem.prototype.getListElement,

getItems: function() {
	return List(this.getListElement()).getItems();
},

getSelectedItem: function() { // FIXME this only searches the top List, not the whole Tree

	let items = this.getItems();
	let n = items.length;
	for (let i=0; i<n; i++) {
		let node = items[i];
		let binding = TreeItem(node);
		if (binding.getSelected()) return node;
	}
	return null;
		
},
selectItem: function(item) {

	let items = this.getItems();
	if (!_.includes(items, item)) throw "Element doesn't exist in list";
	let n = items.length;
	for (let i=0; i<n; i++) {
		let node = items[i];
		let binding = TreeItem(node);
		if (node === item) binding.setSelected(true);
		if (node !== item) binding.setSelected(false);
	}
	this.signalChange();
		
},
signalChange: function() {
	this.trigger({
		type: 'change'
	});
}

});

declareProperties(Tree.prototype, 'listElement selectedItem');


let NavTreeItem = sprockets.evolve(TreeItem, {

getView: function() {
	
	let element = this.element;
	let document = element.ownerDocument;
	for (let ref=this.element.firstChild; ref; ref=ref.nextSibling) if (ref.nodeType === 1) break;
	let tagName = ref && ref.tagName.toLowerCase();
	switch(tagName) {
	case "a":
		if (!ref.getAttribute("href")) break;
		let href = ref.href;
		let base = document.URL.replace(/#.*$/, '')  + "#";
		if (href.indexOf(base) != 0) break;
		let id = href.replace(base, "");
		return DOM.findId(id);
		break;
	case "label":
		let labelId = ref.htmlFor;
		if (labelId) return DOM.findId(labelId);
		break;
	}
	return null;
			
}
	
});

declareProperties(NavTreeItem.prototype, 'view');


let NavTree = sprockets.evolve(Tree, {

getView: NavTreeItem.prototype.getView
	
});

declareProperties(NavTree.prototype, 'view');


let ScrollBox = sprockets.evolve(Box, {
	
setView: function(item) {

	let element = this.element;
	if (element === item || !this.contains(item)) throw "setView failed: item is not descendant of ScrollBox";
	element.scrollTop = item.offsetTop - element.offsetTop;

}

});

declareProperties(ScrollBox.prototype, 'view');


let ScrollBoxWithResize = sprockets.evolve(Box, {
	
setView: function(item) {

	let element = this.element;
	let document = element.ownerDocument;
	if (element === item || !this.contains(node)) {
		throw "setView failed: item is not descendant of ScrollBoxWithResize";
	}
	element.style.height = "" + item.clientHeight + "px";
	element.scrollTop = item.offsetTop - element.offsetTop;
			
},
initialize: function() {
	
	let element = this.element;
	element.style.overflow = "hidden";
	element.style.height = "0px";

}

});


declareProperties(ScrollBoxWithResize.prototype, 'view');


let Panel = Box;

let SwitchBox = sprockets.evolve(Box, {

getPanels: function() {
	return this.element.children;
},
setView: function(item) {
	
	let element = this.element;
	let panels = this.getPanels();
	if (!_.includes(panels, item)) throw "setView failed: item is not child of SwitchBox";
	_.forEach(panels, function(child) {
		let binding = Panel(child);
		if (item == child) binding.setHidden(false);
		else binding.setHidden(true);
	}, this);

},
setViewByIndex: function(index) {

	let panels = this.getPanels();
	if (index >= panels.length) throw "setViewByIndex failed: index is not valid for SwitchBox";
	_.forEach(panels, function(child, i) {
		let binding = Panel(child);
		if (index == i) binding.setHidden(false);
		else binding.setHidden(true);
	}, this);
	return;

},
initialize: function() {
	this.setView();
}

});

declareProperties(SwitchBox.prototype, 'view');


let Table = sprockets.evolve(Box, { // FIXME uses className. This shouldn't be hard-wired
	
getTable: function() {
	let element = this.element;
	if (element.tagName.toLowerCase() === 'table') return element;
	return DOM.find('table', element);
},

getColumns: function() {
	
	let table = this.getTable();
	return table.tHead.rows[0].cells;
			
},
sort: function(column, type, reverse) {
	

	let table = this.getTable();
	let tBodies = table.tBodies;
	for (let j=0, m=tBodies.length; j<m; j++) {
		let tBody = tBodies[j];
		let rows = tBody.rows;
		let values = [];
		for (let i=0, n=rows.length; i<n; i++) {
			let row = rows[i]; let cell = row.cells[column];
			let val = new String(cell.firstChild.nodeValue);
			val.row = row;
			values.push(val);
		}
		switch (type) {
			case "string":
				values = values.sort();
				break;
			case "number":
				values = values.sort(function(a, b) { return Number(a) - Number(b); });
				break;
			default:
				throw "Unrecognized sort type: " + type;
				break;
		}
		if (reverse) values = values.reverse();
		for (let n=values.length, i=0; i<n; i++) {
			let val = values[i];
			let row = val.row;
			tBody.removeChild(row);
			if (i == n-1) tBody.appendChild(row);
			else tBody.insertBefore(row, tBody.rows[i]);
		}
	}

},
toggleColumnSortState: function(column) { // TODO shouldn't have hard-wired classes

	let type = "string";
	let cols = this.getColumns();
	let colEl = cols[column];
	let col = new Base(colEl);
	if (col.hasClass("number")) type = "number";
	if (col.hasClass("string")) type = "string";
	let sortable = col.hasClass("sortable");
	let sorted = col.hasClass("sorted");
	let reversed = col.hasClass("reversed");
	if (!sortable) return;
	if (!sorted) {
		this.sort(column, type, false);
		col.addClass("sorted");
		col.removeClass("reversed");
	}
	else {
		this.sort(column, type, !reversed);
		if (reversed) col.removeClass("reversed");
		else col.addClass("reversed");
	}
	for (let n=cols.length, i=0; i<n; i++) {
		if (column != i) {
			colEl = cols[i];
			col = new Base(colEl);
			col.removeClass("sorted");
			col.removeClass("reversed");
		}
	}
	
}

});

let WF2FormElement = sprockets.evolve(RoleType, {
encode: function() {

let a = [];
_.forEach(this.elements, function(el) {
	if (el.name) a.push(el.name + "=" + encodeURIComponent(el.value));
});
let txt = a.join('&');
return txt;
			
}
});


return {
	Base: Base,
	Box: Box,
	List: List,
	TreeItem: TreeItem, 
	Tree: Tree, 
	NavTreeItem: NavTreeItem, 
	NavTree: NavTree,
	Panel: Panel,
	ScrollBox: ScrollBox, 
	ScrollBoxWithResize: ScrollBoxWithResize, 
	SwitchBox: SwitchBox, 
	Table: Table, 
	WF2FormElement: WF2FormElement	
}

})();
