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

  test('insertNode handles all conf options', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    // before / beforebegin
    container.innerHTML = '<span id="ref">ref</span>';
    let ref = container.querySelector('#ref');
    let node = document.createElement('b');
    node.textContent = 'B';
    DOM.insertNode('before', ref, node);
    expect(container.innerHTML).toBe('<b>B</b><span id="ref">ref</span>');

    container.innerHTML = '<span id="ref">ref</span>';
    ref = container.querySelector('#ref');
    node = document.createElement('b');
    node.textContent = 'B';
    DOM.insertNode('beforebegin', ref, node);
    expect(container.innerHTML).toBe('<b>B</b><span id="ref">ref</span>');

    // after / afterend
    container.innerHTML = '<span id="ref">ref</span>';
    ref = container.querySelector('#ref');
    node = document.createElement('b');
    node.textContent = 'A';
    DOM.insertNode('after', ref, node);
    expect(container.innerHTML).toBe('<span id="ref">ref</span><b>A</b>');

    container.innerHTML = '<span id="ref">ref</span>';
    ref = container.querySelector('#ref');
    node = document.createElement('b');
    node.textContent = 'A';
    DOM.insertNode('afterend', ref, node);
    expect(container.innerHTML).toBe('<span id="ref">ref</span><b>A</b>');

    // start / afterbegin
    container.innerHTML = '<span>existing</span>';
    node = document.createElement('b');
    node.textContent = 'first';
    DOM.insertNode('start', container, node);
    expect(container.firstElementChild.textContent).toBe('first');

    container.innerHTML = '<span>existing</span>';
    node = document.createElement('b');
    node.textContent = 'first';
    DOM.insertNode('afterbegin', container, node);
    expect(container.firstElementChild.textContent).toBe('first');

    // end / beforeend
    container.innerHTML = '<span>existing</span>';
    node = document.createElement('b');
    node.textContent = 'last';
    DOM.insertNode('end', container, node);
    expect(container.lastElementChild.textContent).toBe('last');

    container.innerHTML = '<span>existing</span>';
    node = document.createElement('b');
    node.textContent = 'last';
    DOM.insertNode('beforeend', container, node);
    expect(container.lastElementChild.textContent).toBe('last');

    // replace
    container.innerHTML = '<span id="old">old</span>';
    ref = container.querySelector('#old');
    node = document.createElement('b');
    node.textContent = 'new';
    DOM.insertNode('replace', ref, node);
    expect(container.innerHTML).toBe('<b>new</b>');

    // empty / contents
    container.innerHTML = '<span>a</span><span>b</span>';
    node = document.createElement('b');
    node.textContent = 'only';
    DOM.insertNode('empty', container, node);
    expect(container.children).toHaveLength(1);
    expect(container.firstElementChild.textContent).toBe('only');

    container.innerHTML = '<span>a</span><span>b</span>';
    node = document.createElement('b');
    node.textContent = 'only';
    DOM.insertNode('contents', container, node);
    expect(container.children).toHaveLength(1);
    expect(container.firstElementChild.textContent).toBe('only');

    container.remove();
  });

  test('insertNode adopts node from another document', () => {
    const parent = document.createElement('div');
    const otherDoc = document.implementation.createHTMLDocument('other');
    const foreign = otherDoc.createElement('span');
    foreign.textContent = 'adopted';
    DOM.insertNode('end', parent, foreign);
    expect(parent.lastElementChild.textContent).toBe('adopted');
    expect(parent.lastElementChild.ownerDocument).toBe(document);
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

  test('dispatchEvent fires custom event', () => {
    const div = document.createElement('div');
    let received = false;
    div.addEventListener('test-event', () => { received = true; });
    DOM.dispatchEvent(div, 'test-event');
    expect(received).toBe(true);
  });

  test('isVisible returns false when element has hidden', () => {
    const div = document.createElement('div');
    div.hidden = true;
    document.body.appendChild(div);
    expect(DOM.isVisible(div)).toBe(false);
    div.remove();
  });

  test('isVisible returns false when ancestor has hidden', () => {
    const parent = document.createElement('div');
    parent.hidden = true;
    const child = document.createElement('span');
    parent.appendChild(child);
    document.body.appendChild(parent);
    expect(DOM.isVisible(child)).toBe(false);
    parent.remove();
  });

  test('isVisible returns true when not hidden', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    expect(DOM.isVisible(div)).toBe(true);
    div.remove();
  });

  test('whenVisible resolves immediately if not hidden', async () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    await DOM.whenVisible(div);
    div.remove();
  });

  test('whenVisible resolves when hidden is removed', async () => {
    const div = document.createElement('div');
    div.hidden = true;
    document.body.appendChild(div);
    let resolved = false;
    DOM.whenVisible(div).then(() => { resolved = true; });
    expect(resolved).toBe(false);
    div.hidden = false;
    await new Promise(r => setTimeout(r, 50));
    expect(resolved).toBe(true);
    div.remove();
  });
});

describe('DOM.createEvent', () => {

  test('creates event with string type', () => {
    let event = DOM.createEvent('myevent');
    expect(event.type).toBe('myevent');
    expect(event.bubbles).toBe(true);
    expect(event.cancelable).toBe(true);
  });

  test('defaults bubbles and cancelable to true', () => {
    let event = DOM.createEvent('test');
    expect(event.bubbles).toBe(true);
    expect(event.cancelable).toBe(true);
  });

  test('allows overriding bubbles and cancelable', () => {
    let event = DOM.createEvent('test', { bubbles: false, cancelable: false });
    expect(event.bubbles).toBe(false);
    expect(event.cancelable).toBe(false);
  });

  test('passes detail', () => {
    let event = DOM.createEvent('test', { detail: { foo: 'bar' } });
    expect(event.detail).toEqual({ foo: 'bar' });
  });

  test('accepts object with type property', () => {
    let event = DOM.createEvent({ type: 'myevent', detail: 42 });
    expect(event.type).toBe('myevent');
    expect(event.detail).toBe(42);
  });

  test('copies extra properties onto event', () => {
    let event = DOM.createEvent('test', { detail: null, myProp: 'hello' });
    expect(event.myProp).toBe('hello');
  });

  test('throws for invalid type', () => {
    expect(() => DOM.createEvent(123)).toThrow('invalid event type');
  });

  test('throws for missing type in object form', () => {
    expect(() => DOM.createEvent({ detail: 'x' })).toThrow('invalid event type');
  });
});

describe('DOM.cssReady', () => {

  test('resolves immediately when no stylesheets exist', async () => {
    await DOM.cssReady();
  });

  test('resolves when stylesheet is already loaded', async () => {
    let link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'data:text/css,body{}';
    document.head.appendChild(link);
    await new Promise(r => link.addEventListener('load', r, { once: true }));
    await DOM.cssReady();
    link.remove();
  });

  test('waits for stylesheet to load', async () => {
    let link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'data:text/css,div{}';
    document.head.appendChild(link);
    await DOM.cssReady();
    link.remove();
  });

  test('ignores disabled stylesheets', async () => {
    let link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'data:text/css,span{}';
    link.disabled = true;
    document.head.appendChild(link);
    await DOM.cssReady();
    link.remove();
  });
});
