import { describe, test, expect } from 'vitest';
import * as DOM from '../src/Meeko/DOM.mjs';

describe('DOM.mjs', () => {

  test('getTagName returns lowercase tag name', () => {
    const div = document.createElement('div');
    expect(DOM.getTagName(div)).toBe('div');
  });

  test('getTagName returns empty string for non-elements', () => {
    expect(DOM.getTagName(null)).toBe('');
    expect(DOM.getTagName(document.createTextNode('hi'))).toBe('');
  });

  test('find returns first matching element', () => {
    const div = document.createElement('div');
    div.innerHTML = '<span>a</span><span>b</span>';
    expect(DOM.find('span', div).textContent).toBe('a');
  });

  test('find returns null when no match', () => {
    const div = document.createElement('div');
    expect(DOM.find('span', div)).toBeNull();
  });

  test('findAll returns all matching elements', () => {
    const div = document.createElement('div');
    div.innerHTML = '<p>1</p><p>2</p><p>3</p>';
    expect(DOM.findAll('p', div)).toHaveLength(3);
  });

  test('findAll returns empty array when no match', () => {
    const div = document.createElement('div');
    expect(DOM.findAll('span', div)).toHaveLength(0);
  });

  test('matches checks if element matches selector', () => {
    const div = document.createElement('div');
    div.className = 'foo';
    expect(DOM.matches(div, 'div.foo')).toBe(true);
    expect(DOM.matches(div, 'span')).toBe(false);
  });

  test('matches with scope restricts to descendants of scope', () => {
    const outer = document.createElement('div');
    outer.innerHTML = '<div class="scope"><span class="a">1</span></div><span class="a">2</span>';
    document.body.appendChild(outer);
    const scope = outer.querySelector('.scope');
    const inside = scope.querySelector('.a');
    const outside = outer.querySelector(':scope > .a');
    expect(DOM.matches(inside, '.a', scope)).toBe(true);
    expect(DOM.matches(outside, '.a', scope)).toBe(false);
    outer.remove();
  });

  test('matches with scope using :scope selector', () => {
    const outer = document.createElement('div');
    outer.innerHTML = '<ul><li class="x">a</li><li>b</li></ul>';
    document.body.appendChild(outer);
    const scope = outer.querySelector('ul');
    const li = scope.querySelector('.x');
    expect(DOM.matches(li, ':scope > .x', scope)).toBe(true);
    expect(DOM.matches(li, ':scope > .y', scope)).toBe(false);
    outer.remove();
  });

  test('find with scope only matches within scope', () => {
    const outer = document.createElement('div');
    outer.innerHTML = '<div class="scope"><span>in</span></div><span>out</span>';
    document.body.appendChild(outer);
    const scope = outer.querySelector('.scope');
    const result = DOM.find('span', scope, true);
    expect(result.textContent).toBe('in');
    outer.remove();
  });

  test('findAll with scope only matches within scope', () => {
    const outer = document.createElement('div');
    outer.innerHTML = '<div class="scope"><p>a</p><p>b</p></div><p>c</p>';
    document.body.appendChild(outer);
    const scope = outer.querySelector('.scope');
    const results = DOM.findAll('p', scope, true);
    expect(results).toHaveLength(2);
    outer.remove();
  });

  test('closest with scope stops at scope boundary', () => {
    const outer = document.createElement('div');
    outer.className = 'stop';
    outer.innerHTML = '<div class="mid"><span class="target">hi</span></div>';
    document.body.appendChild(outer);
    const target = outer.querySelector('.target');
    const scope = outer.querySelector('.mid');
    expect(DOM.closest(target, '.mid', outer)).toBe(scope);
    expect(DOM.closest(target, '.stop', outer)).toBeUndefined();
    outer.remove();
  });

  test('matches returns false for non-elements', () => {
    expect(DOM.matches(null, 'div')).toBe(false);
  });

  test('contains checks node containment', () => {
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);
    expect(DOM.contains(parent, child)).toBe(true);
    expect(DOM.contains(child, parent)).toBe(false);
  });

  test('contains returns true for same node', () => {
    const div = document.createElement('div');
    expect(DOM.contains(div, div)).toBe(true);
  });

  test('uniqueId returns consistent id for same node', () => {
    const div = document.createElement('div');
    const id1 = DOM.uniqueId(div);
    const id2 = DOM.uniqueId(div);
    expect(id1).toBe(id2);
  });

  test('uniqueId returns different ids for different nodes', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    expect(DOM.uniqueId(a)).not.toBe(DOM.uniqueId(b));
  });

  test('setData/getData stores and retrieves data', () => {
    const div = document.createElement('div');
    DOM.setData(div, { foo: 'bar' });
    expect(DOM.hasData(div)).toBe(true);
    expect(DOM.getData(div)).toEqual({ foo: 'bar' });
  });

  test('hasData returns false for untagged nodes', () => {
    const div = document.createElement('div');
    expect(DOM.hasData(div)).toBe(false);
  });

  test('copyAttributes copies all attributes', () => {
    const src = document.createElement('div');
    src.setAttribute('class', 'foo');
    src.setAttribute('id', 'bar');
    const dest = document.createElement('div');
    DOM.copyAttributes(dest, src);
    expect(dest.getAttribute('class')).toBe('foo');
    expect(dest.getAttribute('id')).toBe('bar');
  });

  test('removeAttributes removes all attributes', () => {
    const div = document.createElement('div');
    div.setAttribute('class', 'foo');
    div.setAttribute('id', 'bar');
    DOM.removeAttributes(div);
    expect(div.attributes).toHaveLength(0);
  });

  test('insertNode appends at end', () => {
    const parent = document.createElement('div');
    parent.innerHTML = '<span>a</span>';
    const child = document.createElement('span');
    child.textContent = 'b';
    DOM.insertNode('end', parent, child);
    expect(parent.children).toHaveLength(2);
    expect(parent.lastElementChild.textContent).toBe('b');
  });

  test('insertNode inserts at start', () => {
    const parent = document.createElement('div');
    parent.innerHTML = '<span>a</span>';
    const child = document.createElement('span');
    child.textContent = 'b';
    DOM.insertNode('start', parent, child);
    expect(parent.firstElementChild.textContent).toBe('b');
  });

  test('adoptContents moves children to fragment', () => {
    const div = document.createElement('div');
    div.innerHTML = '<span>a</span><span>b</span>';
    const frag = DOM.adoptContents(div);
    expect(div.children).toHaveLength(0);
    expect(frag.children).toHaveLength(2);
  });

  test('closest finds nearest matching ancestor', () => {
    const outer = document.createElement('div');
    outer.className = 'outer';
    outer.innerHTML = '<div class="inner"><span class="target">hi</span></div>';
    const target = outer.querySelector('.target');
    expect(DOM.closest(target, '.inner')).toBe(outer.querySelector('.inner'));
    expect(DOM.closest(target, '.outer')).toBe(outer);
  });

  test('findId finds element by id', () => {
    const div = document.createElement('div');
    div.id = 'test-findid';
    document.body.appendChild(div);
    expect(DOM.findId('test-findid')).toBe(div);
    expect(DOM.findId('nonexistent')).toBeNull();
    div.remove();
  });

  test('siblings starting returns node and following siblings', () => {
    const parent = document.createElement('div');
    parent.innerHTML = '<span>a</span><span>b</span><span>c</span>';
    const second = parent.children[1];
    const result = DOM.siblings('starting', second);
    expect(result).toHaveLength(2);
    expect(result[0].textContent).toBe('b');
    expect(result[1].textContent).toBe('c');
  });

  test('siblings after returns following siblings only', () => {
    const parent = document.createElement('div');
    parent.innerHTML = '<span>a</span><span>b</span><span>c</span>';
    const first = parent.children[0];
    const result = DOM.siblings('after', first);
    expect(result).toHaveLength(2);
    expect(result[0].textContent).toBe('b');
  });

  test('siblings before returns preceding siblings', () => {
    const parent = document.createElement('div');
    parent.innerHTML = '<span>a</span><span>b</span><span>c</span>';
    const last = parent.children[2];
    const result = DOM.siblings('before', last);
    expect(result).toHaveLength(2);
    expect(result[0].textContent).toBe('a');
    expect(result[1].textContent).toBe('b');
  });

  test('siblings ending returns node and preceding siblings', () => {
    const parent = document.createElement('div');
    parent.innerHTML = '<span>a</span><span>b</span><span>c</span>';
    const second = parent.children[1];
    const result = DOM.siblings('ending', second);
    expect(result).toHaveLength(2);
    expect(result[0].textContent).toBe('a');
    expect(result[1].textContent).toBe('b');
  });

  test('siblings with two refs returns range between them', () => {
    const parent = document.createElement('div');
    parent.innerHTML = '<span>a</span><span>b</span><span>c</span><span>d</span>';
    const first = parent.children[0];
    const third = parent.children[2];
    const result = DOM.siblings('starting', first, 'before', third);
    expect(result).toHaveLength(2);
    expect(result[0].textContent).toBe('a');
    expect(result[1].textContent).toBe('b');
  });

  test('createDocument returns an empty document', () => {
    const doc = DOM.createDocument();
    expect(doc.nodeType).toBe(9);
    expect(doc.documentElement).toBeNull();
  });

  test('createHTMLDocument returns a document with head and body', () => {
    const doc = DOM.createHTMLDocument('Test');
    expect(doc.nodeType).toBe(9);
    expect(doc.head).toBeTruthy();
    expect(doc.body).toBeTruthy();
    expect(doc.title).toBe('Test');
  });

  test('cloneDocument copies the source document structure', () => {
    const src = DOM.createHTMLDocument('Clone');
    src.body.innerHTML = '<p>hello</p>';
    const clone = DOM.cloneDocument(src);
    expect(clone.nodeType).toBe(9);
    expect(clone.body.querySelector('p').textContent).toBe('hello');
    expect(clone).not.toBe(src);
  });

  test('dispatchEvent fires custom event', () => {
    const div = document.createElement('div');
    let received = false;
    div.addEventListener('test-event', () => { received = true; });
    DOM.dispatchEvent(div, 'test-event');
    expect(received).toBe(true);
  });
});
