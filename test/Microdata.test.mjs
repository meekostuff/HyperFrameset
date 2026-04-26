import { describe, test, expect } from 'vitest';
import { getItems, getProperties, getValue } from '../src/Meeko/Microdata.mjs';

describe('Microdata', () => {

  function makeScope(html) {
    const div = document.createElement('div');
    div.setAttribute('itemscope', '');
    div.innerHTML = html;
    return div;
  }

  test('getItems parses and returns scope elements', () => {
    const scope = makeScope(
      '<span itemprop="name">A</span>'
    );
    getItems(scope);
    const props = getProperties(scope);
    expect(props).toBeDefined();
    expect(props.names).toContain('name');
  });

  test('getItems filters by type', () => {
    const root = document.createElement('div');
    root.innerHTML =
      '<div itemscope itemtype="Person"><span itemprop="name">A</span></div>' +
      '<div itemscope itemtype="Org"><span itemprop="name">B</span></div>';
    const people = getItems(root, 'Person');
    expect(people).toHaveLength(1);
  });

  test('getItems returns empty for unmatched type', () => {
    const scope = makeScope('<span itemprop="name">A</span>');
    const items = getItems(scope, 'Animal');
    expect(items).toHaveLength(0);
  });

  test('getProperties returns properties collection for scope', () => {
    const scope = makeScope('<span itemprop="name">Alice</span><span itemprop="age">30</span>');
    getItems(scope);
    const props = getProperties(scope);
    expect(props).toBeDefined();
    expect(props.names).toContain('name');
    expect(props.names).toContain('age');
  });

  test('getProperties returns undefined for non-scope', () => {
    const scope = makeScope('<span itemprop="name">Alice</span>');
    getItems(scope);
    const span = scope.querySelector('span');
    expect(getProperties(span)).toBeUndefined();
  });

  test('getProperties.namedItem returns elements for property', () => {
    const scope = makeScope('<span itemprop="tag">a</span><span itemprop="tag">b</span>');
    getItems(scope);
    const props = getProperties(scope);
    const tags = props.namedItem('tag');
    expect(tags).toHaveLength(2);
    expect(tags[0].textContent).toBe('a');
    expect(tags[1].textContent).toBe('b');
  });

  test('getValue returns textContent for plain element', () => {
    const scope = makeScope('<span itemprop="name">Bob</span>');
    getItems(scope);
    const span = scope.querySelector('span');
    expect(getValue(span)).toBe(span);
  });

  test('getValue returns content attr for meta', () => {
    const scope = makeScope('<meta itemprop="desc" content="a description">');
    getItems(scope);
    const meta = scope.querySelector('meta');
    expect(getValue(meta)).toBe('a description');
  });

  test('getValue returns href for anchor', () => {
    const scope = makeScope('<a itemprop="url" href="http://example.com">link</a>');
    getItems(scope);
    const a = scope.querySelector('a');
    expect(getValue(a)).toContain('example.com');
  });

  test('getValue returns src for img', () => {
    const scope = makeScope('<img itemprop="photo" src="http://example.com/img.png">');
    getItems(scope);
    const img = scope.querySelector('img');
    expect(getValue(img)).toContain('img.png');
  });

  test('getValue returns datetime for time element', () => {
    const scope = makeScope('<time itemprop="date" datetime="2026-01-01">Jan 1</time>');
    getItems(scope);
    const time = scope.querySelector('time');
    expect(getValue(time)).toBe('2026-01-01');
  });

  test('nested itemscope creates nested properties', () => {
    const scope = makeScope(
      '<div itemprop="author" itemscope><span itemprop="name">Alice</span></div>'
    );
    getItems(scope);
    const author = getProperties(scope).namedItem('author')[0];
    const authorProps = getProperties(author);
    expect(authorProps).toBeDefined();
    expect(authorProps.namedItem('name')[0].textContent).toBe('Alice');
  });

  test('child scopes without itemprop are accessible', () => {
    const scope = makeScope(
      '<div itemscope><span itemprop="name">A</span></div>'
    );
    getItems(scope);
    const props = getProperties(scope);
    expect(props).toBeDefined();
  });

});
