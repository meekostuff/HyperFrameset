import { describe, test, expect } from 'vitest';
import HistoryState from '../src/Meeko/HistoryState.mjs';

describe('HistoryState', () => {

  test('create returns a HistoryState instance', () => {
    const state = HistoryState.create('data', 'title', '/url');
    expect(state).toBeInstanceOf(HistoryState);
  });

  test('create stores data, title, url, and timeStamp', () => {
    const before = Date.now();
    const state = HistoryState.create({ key: 'value' }, 'My Title', '/page');
    const after = Date.now();

    expect(state.settings.data).toEqual({ key: 'value' });
    expect(state.settings.title).toBe('My Title');
    expect(state.settings.url).toBe('/page');
    expect(state.settings.timeStamp).toBeGreaterThanOrEqual(before);
    expect(state.settings.timeStamp).toBeLessThanOrEqual(after);
  });

  test('getData returns the stored data', () => {
    const state = HistoryState.create({ foo: 42 }, 'title', '/');
    expect(state.getData()).toEqual({ foo: 42 });
  });

  test('isValid returns true for settings from create', () => {
    const state = HistoryState.create('data', 'title', '/');
    expect(HistoryState.isValid(state.settings)).toBe(true);
  });

  test('isValid returns false for null', () => {
    expect(HistoryState.isValid(null)).toBe(false);
  });

  test('isValid returns false for undefined', () => {
    expect(HistoryState.isValid(undefined)).toBe(false);
  });

  test('isValid returns false for a plain object', () => {
    expect(HistoryState.isValid({ title: 'test' })).toBe(false);
  });

  test('constructor throws for invalid settings', () => {
    expect(() => new HistoryState({})).toThrow('Invalid settings');
  });

  test('constructor throws for null', () => {
    expect(() => new HistoryState(null)).toThrow();
  });

  test('constructor accepts valid settings from create', () => {
    const state = HistoryState.create('data', 'title', '/');
    const restored = new HistoryState(state.settings);
    expect(restored.getData()).toBe('data');
  });
});
