import { describe, it, expect } from 'vitest';

describe('behaviors browser assumptions', () => {

  it('handleEvent protocol works with addEventListener', () => {
    let called = false;
    let el = document.createElement('div');
    document.body.appendChild(el);
    let obj = { handleEvent() { called = true; } };
    el.addEventListener('click', obj);
    el.click();
    el.remove();
    expect(called).toBe(true);
  });

  it('{ once: true } removes listener after firing', () => {
    let count = 0;
    let el = document.createElement('div');
    document.body.appendChild(el);
    el.addEventListener('click', () => count++, { once: true });
    el.click();
    el.click();
    el.remove();
    expect(count).toBe(1);
  });

  it('composedPath returns target to window order', () => {
    let path;
    let parent = document.createElement('div');
    let child = document.createElement('span');
    parent.appendChild(child);
    document.body.appendChild(parent);
    window.addEventListener('click', (e) => { path = e.composedPath(); }, { once: true, capture: true });
    child.click();
    parent.remove();
    expect(path[0]).toBe(child);
    expect(path[1]).toBe(parent);
    expect(path.at(-1)).toBe(window);
  });

  it('window capture fires before element bubble', () => {
    let order = [];
    let el = document.createElement('div');
    document.body.appendChild(el);
    let capture = () => order.push('capture');
    window.addEventListener('click', capture, true);
    el.addEventListener('click', () => order.push('bubble'));
    el.click();
    window.removeEventListener('click', capture, true);
    el.remove();
    expect(order).toEqual(['capture', 'bubble']);
  });

  it('{ once: true, capture: true } works together', () => {
    let count = 0;
    let el = document.createElement('div');
    document.body.appendChild(el);
    el.addEventListener('click', () => count++, { once: true, capture: true });
    el.click();
    el.click();
    el.remove();
    expect(count).toBe(1);
  });

  it('dispatchEvent triggers window capture listeners', () => {
    let called = false;
    let el = document.createElement('div');
    document.body.appendChild(el);
    let fn = () => { called = true; };
    window.addEventListener('click', fn, true);
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    window.removeEventListener('click', fn, true);
    el.remove();
    expect(called).toBe(true);
  });

  it('WeakRef.deref returns element while in DOM', () => {
    let el = document.createElement('div');
    document.body.appendChild(el);
    let ref = new WeakRef(el);
    expect(ref.deref()).toBe(el);
    el.remove();
  });

  it('Object.create(proto) gives access to proto methods via this', () => {
    let proto = { greet() { return 'hello ' + this.name; } };
    let instance = Object.create(proto);
    instance.name = 'world';
    expect(instance.greet()).toBe('hello world');
  });

  it('element.matches works with custom attribute selectors', () => {
    let el = document.createElement('div');
    el.setAttribute('mk-is', 'abc123');
    document.body.appendChild(el);
    expect(el.matches('[mk-is="abc123"]')).toBe(true);
    el.remove();
  });

  it('listener added during capture fires in same dispatch cycle', () => {
    let fired = false;
    let el = document.createElement('div');
    document.body.appendChild(el);
    let fn = () => {
      el.addEventListener('click', () => { fired = true; }, { once: true });
    };
    window.addEventListener('click', fn, { once: true, capture: true });
    el.click();
    el.remove();
    expect(fired).toBe(true);
  });

  it('dispatchEvent is synchronous', () => {
    let value = 'before';
    let el = document.createElement('div');
    document.body.appendChild(el);
    el.addEventListener('click', () => { value = 'during'; });
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    el.remove();
    expect(value).toBe('during');
  });

});
