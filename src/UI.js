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

// LEGACY: IE8 supports defineProperty but only on DOM objects
function declareProperties(obj, props) {
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
}

function ucFirst(text) {
	return text.substr(0,1).toUpperCase() + text.substr(1);
}

class Box extends RoleType {
	setHidden(state) {
		let element = this.element;
		if (!state) element.removeAttribute('hidden');
		else element.setAttribute('hidden', '');
	}
	getHidden() {
		let element = this.element;
		return element.getAttribute('hidden') !== null;
	}
}

declareProperties(Box.prototype, 'hidden');

class TreeItem extends Box {
	getListElement() {
		let element = this.element;
		let children = element.children;
		for (let node, i=0; node=children[i]; i++) {
			switch (node.tagName.toLowerCase()) {
				case "ol": case "ul": case "select": return node;
			}
		}
		return null;
	}
	setSelected(state) { // NOTE TreeItem is ignorant of whether multiple TreeItems can be selected
		let element = this.element;
		element.setAttribute("aria-selected", !!state);
	}
	getSelected() {
		let element = this.element;
		let state = element.getAttribute("aria-selected");
		return (/^true$/i.test(state));
	}
	setExpanded(state) {
		let listEl = this.getListElement();
		if (!listEl) throw "";
		sprockets.cast(listEl, List).setHidden(!state);
	}
	getExpanded() {
		let listEl = this.getListElement();
		if (!listEl) throw "";
		return sprockets.cast(listEl, List).getHidden();
	}
}

declareProperties(TreeItem.prototype, 'listElement selected expanded');

let ListItem = TreeItem;

class List extends Box {
	getItems() {
		let element = this.element;
		let items = [];
		for (let node=element.firstChild; node; node=node.nextSibling) {
			if (node.nodeType === 1) items.push(node);
		}
		return items;
	}
}

declareProperties(List.prototype, 'items');

class Tree extends Box {
	getListElement() { return TreeItem.prototype.getListElement.call(this); }
	getItems() {
		return sprockets.cast(this.getListElement(), List).getItems();
	}
	getSelectedItem() { // FIXME this only searches the top List, not the whole Tree
		let items = this.getItems();
		let n = items.length;
		for (let i=0; i<n; i++) {
			let node = items[i];
			let binding = sprockets.cast(node, TreeItem);
			if (binding.getSelected()) return node;
		}
		return null;
	}
	selectItem(item) {
		let items = this.getItems();
		if (!_.includes(items, item)) throw "Element doesn't exist in list";
		let n = items.length;
		for (let i=0; i<n; i++) {
			let node = items[i];
			let binding = sprockets.cast(node, TreeItem);
			if (node === item) binding.setSelected(true);
			if (node !== item) binding.setSelected(false);
		}
		this.signalChange();
	}
	signalChange() {
		this.trigger({ type: 'change' });
	}
}

declareProperties(Tree.prototype, 'listElement selectedItem');


class NavTreeItem extends TreeItem {
	getView() {
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
}

declareProperties(NavTreeItem.prototype, 'view');


class NavTree extends Tree {
	getView() { return NavTreeItem.prototype.getView.call(this); }
}

declareProperties(NavTree.prototype, 'view');


class ScrollBox extends Box {
	setView(item) {
		let element = this.element;
		if (element === item || !this.contains(item)) throw "setView failed: item is not descendant of ScrollBox";
		element.scrollTop = item.offsetTop - element.offsetTop;
	}
}

declareProperties(ScrollBox.prototype, 'view');


class ScrollBoxWithResize extends Box {
	setView(item) {
		let element = this.element;
		let document = element.ownerDocument;
		if (element === item || !this.contains(node)) {
			throw "setView failed: item is not descendant of ScrollBoxWithResize";
		}
		element.style.height = "" + item.clientHeight + "px";
		element.scrollTop = item.offsetTop - element.offsetTop;
	}
	initialize() {
		let element = this.element;
		element.style.overflow = "hidden";
		element.style.height = "0px";
	}
}

declareProperties(ScrollBoxWithResize.prototype, 'view');


let Panel = Box;

class SwitchBox extends Box {
	getPanels() {
		return this.element.children;
	}
	setView(item) {
		let element = this.element;
		let panels = this.getPanels();
		if (!_.includes(panels, item)) throw "setView failed: item is not child of SwitchBox";
		_.forEach(panels, function(child) {
			let binding = sprockets.cast(child, Panel);
			if (item == child) binding.setHidden(false);
			else binding.setHidden(true);
		}, this);
	}
	setViewByIndex(index) {
		let panels = this.getPanels();
		if (index >= panels.length) throw "setViewByIndex failed: index is not valid for SwitchBox";
		_.forEach(panels, function(child, i) {
			let binding = sprockets.cast(child, Panel);
			if (index == i) binding.setHidden(false);
			else binding.setHidden(true);
		}, this);
		return;
	}
	initialize() {
		this.setView();
	}
}

declareProperties(SwitchBox.prototype, 'view');


class Table extends Box { // FIXME uses className. This shouldn't be hard-wired
	getTable() {
		let element = this.element;
		if (element.tagName.toLowerCase() === 'table') return element;
		return DOM.find('table', element);
	}
	getColumns() {
		let table = this.getTable();
		return table.tHead.rows[0].cells;
	}
	sort(column, type, reverse) {
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
				case "string": values = values.sort(); break;
				case "number": values = values.sort(function(a, b) { return Number(a) - Number(b); }); break;
				default: throw "Unrecognized sort type: " + type;
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
	}
	toggleColumnSortState(column) { // TODO shouldn't have hard-wired classes
		let type = "string";
		let cols = this.getColumns();
		let colEl = cols[column];
		let col = sprockets.cast(colEl, Base);
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
				col = sprockets.cast(colEl, Base);
				col.removeClass("sorted");
				col.removeClass("reversed");
			}
		}
	}
}

class WF2FormElement extends RoleType {
	encode() {
		let a = [];
		_.forEach(this.elements, function(el) {
			if (el.name) a.push(el.name + "=" + encodeURIComponent(el.value));
		});
		return a.join('&');
	}
}


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
