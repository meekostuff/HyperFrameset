import { describe, test, expect, beforeEach } from 'vitest';

describe('MicrodataDecoder', () => {
  let MicrodataDecoder, Microdata;

  beforeEach(async () => {
    const mod = await import('../src/Meeko/MicrodataDecoder.mjs');
    MicrodataDecoder = mod.MicrodataDecoder;
    Microdata = mod.Microdata;
  });

  test('init parses microdata from a node', () => {
    const div = document.createElement('div');
    div.setAttribute('itemscope', '');
    div.innerHTML = '<span itemprop="name">Alice</span>';
    const decoder = new MicrodataDecoder();
    expect(() => decoder.init(div)).not.toThrow();
  });

  test('evaluate "." returns context', () => {
    const div = document.createElement('div');
    div.setAttribute('itemscope', '');
    div.innerHTML = '<span itemprop="name">Bob</span>';
    const decoder = new MicrodataDecoder();
    decoder.init(div);
    expect(decoder.evaluate('.', div)).toBe(div);
  });

  test('evaluate retrieves property value', () => {
    const div = document.createElement('div');
    div.setAttribute('itemscope', '');
    div.innerHTML = '<span itemprop="name">Carol</span>';
    const decoder = new MicrodataDecoder();
    decoder.init(div);
    const result = decoder.evaluate('name', div);
    expect(result.textContent).toBe('Carol');
  });

  test('evaluate with wantArray returns all matching properties', () => {
    const div = document.createElement('div');
    div.setAttribute('itemscope', '');
    div.innerHTML = '<span itemprop="tag">a</span><span itemprop="tag">b</span>';
    const decoder = new MicrodataDecoder();
    decoder.init(div);
    const results = decoder.evaluate('tag', div, null, true);
    expect(results).toHaveLength(2);
  });

  test('Microdata.getValue reads value from meta element', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('itemprop', 'desc');
    meta.setAttribute('content', 'a description');
    const div = document.createElement('div');
    div.setAttribute('itemscope', '');
    div.appendChild(meta);
    Microdata.getItems(div);
    expect(Microdata.getValue(meta)).toBe('a description');
  });

  test('Microdata.getValue reads href from anchor', () => {
    const a = document.createElement('a');
    a.setAttribute('itemprop', 'url');
    a.setAttribute('href', 'http://example.com');
    const div = document.createElement('div');
    div.setAttribute('itemscope', '');
    div.appendChild(a);
    Microdata.getItems(div);
    expect(Microdata.getValue(a)).toContain('example.com');
  });

  test('nested itemscope elements', () => {
    const div = document.createElement('div');
    div.setAttribute('itemscope', '');
    div.innerHTML = '<div itemprop="author" itemscope><span itemprop="name">Alice</span></div>';
    const decoder = new MicrodataDecoder();
    decoder.init(div);
    const author = decoder.evaluate('author', div);
    expect(author).toBeDefined();
    const name = decoder.evaluate('name', author);
    expect(name.textContent).toBe('Alice');
  });

  test('getValue reads datetime from time element', () => {
    const time = document.createElement('time');
    time.setAttribute('itemprop', 'date');
    time.setAttribute('datetime', '2026-01-15');
    const div = document.createElement('div');
    div.setAttribute('itemscope', '');
    div.appendChild(time);
    Microdata.getItems(div);
    expect(Microdata.getValue(time)).toBe('2026-01-15');
  });

  test('getValue reads value from data element', () => {
    const data = document.createElement('data');
    data.setAttribute('itemprop', 'count');
    data.setAttribute('value', '42');
    const div = document.createElement('div');
    div.setAttribute('itemscope', '');
    div.appendChild(data);
    Microdata.getItems(div);
    expect(Microdata.getValue(data)).toBe('42');
  });

  test('getValue reads src from img element', () => {
    const img = document.createElement('img');
    img.setAttribute('itemprop', 'photo');
    img.setAttribute('src', 'photo.jpg');
    const div = document.createElement('div');
    div.setAttribute('itemscope', '');
    div.appendChild(img);
    Microdata.getItems(div);
    expect(Microdata.getValue(img)).toContain('photo.jpg');
  });

});
