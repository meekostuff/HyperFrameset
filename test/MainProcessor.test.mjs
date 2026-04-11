import { describe, test, expect } from 'vitest';
import MainProcessor from '../src/Meeko/MainProcessor.mjs';

describe('MainProcessor', () => {

  test('loadTemplate warns but does not throw', () => {
    const proc = new MainProcessor();
    const template = document.createElement('div');
    expect(() => proc.loadTemplate(template)).not.toThrow();
  });

  test('transform extracts <main> content', () => {
    const doc = document.implementation.createHTMLDocument('');
    doc.body.innerHTML = '<header>h</header><main><p>content</p></main><footer>f</footer>';
    const frag = proc().transform({ srcNode: doc }, {});
    expect(frag.querySelector('p').textContent).toBe('content');
    expect(frag.querySelector('header')).toBeNull();
    expect(frag.querySelector('footer')).toBeNull();
  });

  test('transform extracts [role=main] content', () => {
    const doc = document.implementation.createHTMLDocument('');
    doc.body.innerHTML = '<div role="main"><p>main content</p></div>';
    const frag = proc().transform({ srcNode: doc }, {});
    expect(frag.querySelector('p').textContent).toBe('main content');
  });

  test('transform falls back to body when no main element', () => {
    const doc = document.implementation.createHTMLDocument('');
    doc.body.innerHTML = '<p>body content</p>';
    const frag = proc().transform({ srcNode: doc }, {});
    expect(frag.querySelector('p').textContent).toBe('body content');
  });

  test('transform on a non-document node uses that node', () => {
    const div = document.createElement('div');
    div.innerHTML = '<span>hello</span>';
    const frag = proc().transform({ srcNode: div }, {});
    expect(frag.querySelector('span').textContent).toBe('hello');
  });

  function proc() {
    const p = new MainProcessor();
    p.loadTemplate(document.createElement('div'));
    return p;
  }
});
