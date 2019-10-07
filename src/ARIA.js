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

let Group = sprockets.evolve(RoleType, {

role: 'group'

});

let TreeItem = sprockets.evolve(RoleType, {

role: 'treeitem',

selected: {
	type: 'boolean',
	can: function() { return !this.element.ariaFind('group'); },
	get: function() { return !!this.aria('selected'); },
	set: function(value) { this.aria('selected', value); }
},

expanded: {
	type: 'boolean',
	can: function() { return !!this.element.ariaFind('group'); },
	get: function() { return !!this.aria('expanded'); },
	set: function(value) {
		let group = this.element.ariaFind('group');
		group.ariaToggle('hidden', !value);
		this.aria('expanded', !!value);
	}	
}

});

let Tree = sprockets.evolve(RoleType, {

role: 'tree',

activedescendant: {
	type: 'node',
	get: function() {
		let items = this.element.ariaFindAll('treeitem');
		for (let n=items.length, i=0; i<n; i++) {
			let node = items[i];
			if (node.ariaGet('selected')) return node;
		}
	},
	set: function(node) {
		let oldNode = this.ariaGet('activedescendant');
		if (oldNode) oldNode.ariaToggle('selected', false);
		node.ariaToggle('selected', true); // FIXME check node is treeitem
		this.signalChange();
	}
},

signalChange: function() {
	this.trigger({
		type: 'change'
	});
}

});

let ScrollBox = sprockets.evolve(RoleType, {

role: 'frame',

activedescendant: {
	
	set: function(item) {
		let element = this.element;
		if (element === item || !element.contains(item)) throw Error('set activedescendant failed: item is not descendant of ScrollBox');
		element.scrollTop = item.offsetTop - element.offsetTop;
	}

}

});


let Panel = RoleType;

let SwitchBox = sprockets.evolve(RoleType, {

role: 'group',

owns: {
	get: function() { return _.map(this.element.children); }
},

activedescendant: {
	set: function(item) {
		
		let element = this.element;
		let panels = this.ariaGet('owns');
		if (!_.includes(panels, item)) throw Error('set activedescendant failed: item is not child of SwitchBox');
		_.forEach(panels, function(child) {
			if (child === item) child.ariaToggle('hidden', false);
			else child.ariaToggle('hidden', true);
		});
	
	}
},

initialize: function() {
	this.ariaSet('activedescendant', this.ariaGet('owns')[0]);
}

});


let Table = sprockets.evolve(RoleType, { // FIXME uses className. This shouldn't be hard-wired
	
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
			case 'string':
				values = values.sort();
				break;
			case 'number':
				values = values.sort(function(a, b) { return Number(a) - Number(b); });
				break;
			default:
				throw Error('Unrecognized sort type: ' + type);
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

	let type = 'string';
	let cols = this.getColumns();
	let colEl = cols[column];
	let col = new Base(colEl);
	if (col.hasClass('number')) type = 'number';
	if (col.hasClass('string')) type = 'string';
	let sortable = col.hasClass('sortable');
	let sorted = col.hasClass('sorted');
	let reversed = col.hasClass('reversed');
	if (!sortable) return;
	if (!sorted) {
		this.sort(column, type, false);
		col.addClass('sorted');
		col.removeClass('reversed');
	}
	else {
		this.sort(column, type, !reversed);
		if (reversed) col.removeClass('reversed');
		else col.addClass('reversed');
	}
	for (let n=cols.length, i=0; i<n; i++) {
		if (column != i) {
			colEl = cols[i];
			col = new Base(colEl);
			col.removeClass('sorted');
			col.removeClass('reversed');
		}
	}
	
}

});

let WF2FormElement = sprockets.evolve(RoleType, {
encode: function() {

let a = [];
_.forEach(this.elements, function(el) {
	if (el.name) a.push(el.name + '=' + encodeURIComponent(el.value));
});
let txt = a.join('&');
return txt;
			
}
});


return {
	RoleType: RoleType,
	Group: Group,
	TreeItem: TreeItem, 
	Tree: Tree, 
	Panel: Panel,
	ScrollBox: ScrollBox, 
	SwitchBox: SwitchBox, 
	Table: Table, 
	WF2FormElement: WF2FormElement	
}

})();
