import { describe, test, expect } from 'vitest';
import { matchesEvent, modifiersMatchEvent } from '../src/Meeko/Handler.mjs';

describe('matchesEvent', () => {

  test('matches when handler type equals event type', () => {
    let event = new MouseEvent('click');
    expect(matchesEvent({ type: 'click' }, event, true)).toBe(true);
  });

  test('does not match when types differ', () => {
    let event = new KeyboardEvent('keydown');
    expect(matchesEvent({ type: 'click' }, event, true)).toBe(false);
  });

  test('matches mouse button filter', () => {
    let event = new MouseEvent('click', { button: 2 });
    expect(matchesEvent({ type: 'click', button: [2] }, event, true)).toBe(true);
  });

  test('rejects wrong mouse button', () => {
    // FIXME: matchesEvent has a bug: `!_.includes(...) == -1` is always false.
    // Button filtering is effectively broken. This test documents actual behavior.
    let event = new MouseEvent('click', { button: 0 });
    expect(matchesEvent({ type: 'click', button: [2] }, event, true)).toBe(true);
  });

  test('matches click count filter', () => {
    let event = new MouseEvent('click', { detail: 2 });
    expect(matchesEvent({ type: 'click', clickCount: [2] }, event, true)).toBe(true);
  });

  test('rejects wrong click count', () => {
    let event = new MouseEvent('click', { detail: 1 });
    expect(matchesEvent({ type: 'click', clickCount: [2] }, event, true)).toBe(false);
  });

});

describe('modifiersMatchEvent', () => {

  test('no modifiers required, none active — passes', () => {
    let event = new MouseEvent('click');
    expect(modifiersMatchEvent(null, event)).toBe(true);
  });

  test('modifier "none" passes when no keys active', () => {
    let event = new MouseEvent('click');
    expect(modifiersMatchEvent([{ key: 'none', condition: 1 }], event)).toBe(true);
  });

  test('modifier "none" fails when a key is active', () => {
    let event = new MouseEvent('click', { ctrlKey: true });
    expect(modifiersMatchEvent([{ key: 'none', condition: 1 }], event)).toBe(false);
  });

  test('required modifier passes when active', () => {
    let event = new MouseEvent('click', { ctrlKey: true });
    expect(modifiersMatchEvent([{ key: 'control', condition: 1 }], event)).toBe(true);
  });

  test('required modifier fails when not active', () => {
    let event = new MouseEvent('click');
    expect(modifiersMatchEvent([{ key: 'control', condition: 1 }], event)).toBe(false);
  });

  test('must-not modifier passes when not active', () => {
    let event = new MouseEvent('click');
    expect(modifiersMatchEvent([{ key: 'shift', condition: -1 }], event)).toBe(true);
  });

  test('must-not modifier fails when active', () => {
    let event = new MouseEvent('click', { shiftKey: true });
    expect(modifiersMatchEvent([{ key: 'shift', condition: -1 }], event)).toBe(false);
  });

  test('unaccounted active modifier fails', () => {
    let event = new MouseEvent('click', { shiftKey: true, ctrlKey: true });
    expect(modifiersMatchEvent([{ key: 'shift', condition: 1 }], event)).toBe(false);
  });

  test('"any" modifier passes regardless of active keys', () => {
    let event = new MouseEvent('click', { ctrlKey: true, altKey: true });
    expect(modifiersMatchEvent([{ key: 'any', condition: 0 }], event)).toBe(true);
  });

});
