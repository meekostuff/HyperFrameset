import { describe, test, expect } from 'vitest';
import CustomNamespace from '../src/Meeko/CustomNamespace.mjs';

describe('CustomNamespace', () => {

  test('creates xml-style namespace with colon prefix', () => {
    const ns = CustomNamespace({ urn: 'TestURN', name: 'test', style: 'xml' });
    expect(ns.prefix).toBe('test:');
    expect(ns.urn).toBe('TestURN');
  });

  test('creates vendor-style namespace with hyphen prefix', () => {
    const ns = CustomNamespace({ urn: 'TestURN', name: 'test', style: 'vendor' });
    expect(ns.prefix).toBe('test-');
  });

  test('lowercases name and style', () => {
    const ns = CustomNamespace({ urn: 'X', name: 'FOO', style: 'XML' });
    expect(ns.name).toBe('foo');
    expect(ns.prefix).toBe('foo:');
  });

  test('throws on invalid style', () => {
    expect(() => CustomNamespace({ urn: 'X', name: 'foo', style: 'bad' })).toThrow();
  });

  test('throws on empty name', () => {
    expect(() => CustomNamespace({ urn: 'X', name: '', style: 'xml' })).toThrow();
  });

  test('lookupTagName returns prefixed name', () => {
    const ns = CustomNamespace({ urn: 'X', name: 'haz', style: 'xml' });
    expect(ns.lookupTagName('if')).toBe('haz:if');
  });

  test('lookupSelector prefixes each tag', () => {
    const ns = CustomNamespace({ urn: 'X', name: 'haz', style: 'xml' });
    expect(ns.lookupSelector('if, each')).toBe('haz\\:if, haz\\:each');
  });

  test('clone creates independent copy', () => {
    const ns = CustomNamespace({ urn: 'X', name: 'haz', style: 'xml' });
    const clone = ns.clone();
    expect(clone.prefix).toBe('haz:');
    expect(clone).not.toBe(ns);
  });
});

describe('NamespaceCollection', () => {

  function emptyCollection() {
    return CustomNamespace.getNamespaces(document).clone();
  }

  function makeNS(name, urn) {
    return CustomNamespace({ urn: urn || name + 'URN', name, style: 'xml' });
  }

  test('getNamespaces returns a collection', () => {
    const coll = CustomNamespace.getNamespaces(document);
    expect(coll.items).toBeDefined();
  });

  test('add and lookupNamespace by URN', () => {
    const coll = emptyCollection();
    coll.add(makeNS('haz', 'HazardTransform'));
    expect(coll.lookupNamespace('HazardTransform')).toBeDefined();
    expect(coll.lookupNamespace('HazardTransform').prefix).toBe('haz:');
  });

  test('lookupNamespace is case-insensitive', () => {
    const coll = emptyCollection();
    coll.add(makeNS('haz', 'HazardTransform'));
    expect(coll.lookupNamespace('hazardtransform')).toBeDefined();
  });

  test('lookupPrefix returns prefix string', () => {
    const coll = emptyCollection();
    coll.add(makeNS('haz', 'HazardTransform'));
    expect(coll.lookupPrefix('HazardTransform')).toBe('haz:');
  });

  test('lookupPrefix returns undefined for unknown URN', () => {
    const coll = emptyCollection();
    expect(coll.lookupPrefix('Unknown')).toBeUndefined();
  });

  test('lookupNamespaceURI returns URN for prefix', () => {
    const coll = emptyCollection();
    coll.add(makeNS('haz', 'HazardTransform'));
    expect(coll.lookupNamespaceURI('haz:')).toBe('HazardTransform');
  });

  test('lookupTagNameNS returns prefixed tag', () => {
    const coll = emptyCollection();
    coll.add(makeNS('haz', 'HazardTransform'));
    expect(coll.lookupTagNameNS('if', 'HazardTransform')).toBe('haz:if');
  });

  test('lookupTagNameNS returns unprefixed name for unknown URN', () => {
    const coll = emptyCollection();
    expect(coll.lookupTagNameNS('if', 'Unknown')).toBe('if');
  });

  test('lookupSelector prefixes selector for URN', () => {
    const coll = emptyCollection();
    coll.add(makeNS('haz', 'HazardTransform'));
    expect(coll.lookupSelector('if', 'HazardTransform')).toBe('haz\\:if');
  });

  test('add rejects duplicate URN', () => {
    const coll = emptyCollection();
    coll.add(makeNS('haz', 'HazardTransform'));
    coll.add(makeNS('other', 'HazardTransform'));
    expect(coll.items).toHaveLength(1);
    expect(coll.items[0].prefix).toBe('haz:');
  });

  test('add rejects duplicate prefix', () => {
    const coll = emptyCollection();
    coll.add(makeNS('haz', 'URN1'));
    coll.add(makeNS('haz', 'URN2'));
    expect(coll.items).toHaveLength(1);
  });

  test('clone creates independent copy', () => {
    const coll = emptyCollection();
    coll.add(makeNS('haz', 'HazardTransform'));
    const clone = coll.clone();
    clone.add(makeNS('expr', 'HazardExpression'));
    expect(clone.items).toHaveLength(2);
    expect(coll.items).toHaveLength(1);
  });

  test('init reads xmlns attributes from document', () => {
    const doc = document.implementation.createHTMLDocument('');
    doc.documentElement.setAttribute('xmlns:foo', 'FooURN');
    const coll = CustomNamespace.getNamespaces(doc);
    expect(coll.lookupPrefix('FooURN')).toBe('foo:');
  });
});
