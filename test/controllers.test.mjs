import { describe, it, expect, vi } from 'vitest';
import controllers from '../src/Meeko/controllers.mjs';

const nextFrame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

describe('controllers', () => {

  it('create registers a controller', () => {
    controllers.create('test1');
    expect(controllers.has('test1')).toBe(true);
  });

  it('has returns false for unregistered', () => {
    expect(controllers.has('nonexistent')).toBe(false);
  });

  it('get returns current value', () => {
    controllers.create('test2');
    expect(controllers.get('test2')).toEqual([]);
  });

  it('get throws for unregistered', () => {
    expect(() => controllers.get('nope')).toThrow('nope is not a registered controller');
  });

  it('set updates value', () => {
    controllers.create('test3');
    controllers.set('test3', ['a', 'b']);
    expect(controllers.get('test3')).toEqual(['a', 'b']);
  });

  it('set throws for unregistered', () => {
    expect(() => controllers.set('nope', 'x')).toThrow('nope is not a registered controller');
  });

  it('set wraps string in array', () => {
    controllers.create('test4');
    controllers.set('test4', 'solo');
    expect(controllers.get('test4')).toEqual(['solo']);
  });

  it('set normalizes null/false to empty array', () => {
    controllers.create('test5');
    controllers.set('test5', ['x']);
    controllers.set('test5', null);
    expect(controllers.get('test5')).toEqual([]);
  });

  it('set does not notify if value unchanged', async () => {
    controllers.create('test6');
    controllers.set('test6', ['a', 'b']);
    const listener = vi.fn();
    controllers.listen('test6', listener);
    await nextFrame();
    expect(listener).toHaveBeenCalledWith(['a', 'b']);
    listener.mockClear();
    // set same value again
    controllers.set('test6', ['a', 'b']);
    await nextFrame();
    expect(listener).not.toHaveBeenCalled();
  });

  it('set notifies listeners on change', async () => {
    controllers.create('test7');
    controllers.set('test7', ['a']);
    const listener = vi.fn();
    controllers.listen('test7', listener);
    await nextFrame();
    listener.mockClear();
    controllers.set('test7', ['b']);
    await nextFrame();
    expect(listener).toHaveBeenCalledWith(['b']);
  });

  it('listen calls listener immediately with current value', async () => {
    controllers.create('test8');
    controllers.set('test8', ['x']);
    const listener = vi.fn();
    controllers.listen('test8', listener);
    await nextFrame();
    expect(listener).toHaveBeenCalledWith(['x']);
  });

  it('listen throws for unregistered', () => {
    expect(() => controllers.listen('nope', () => {})).toThrow('nope is not a registered controller');
  });

});
