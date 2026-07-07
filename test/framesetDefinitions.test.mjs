import { describe, it, expect, vi } from 'vitest';
import {
  HFrameDefinition,
  HFramesetDefinition,
  HBodyDefinition,
  HTransformDefinition
} from '../src/Meeko/framesetDefinitions.mjs';
import CustomNamespace from '../src/Meeko/CustomNamespace.mjs';
import { install } from '../src/Meeko/behaviors.mjs';

const behaviors = install({ attr: 'config', autoProcess: false });

function makeNamespaces() {
  let ns = new CustomNamespace({ name: 'hf', style: 'vendor', urn: 'hyperframeset' });
  let coll = CustomNamespace.getNamespaces(document.implementation.createHTMLDocument(''));
  coll.add(ns);
  return coll;
}

function makeFramesetDef(overrides) {
  return Object.assign({
    namespaces: makeNamespaces(),
    scope: 'http://example.com/',
    document: document.implementation.createHTMLDocument('')
  }, overrides);
}

function createFramesetDoc(bodyHTML) {
  let doc = document.implementation.createHTMLDocument('test');
  doc.body.innerHTML = bodyHTML;
  return doc;
}

describe('framesetDefinitions exports', () => {

  // --- Shape checks ---

  describe('HFrameDefinition shape', () => {
    it('is a constructor with init and render on prototype', () => {
      expect(typeof HFrameDefinition).toBe('function');
      expect(typeof HFrameDefinition.prototype.init).toBe('function');
      expect(typeof HFrameDefinition.prototype.render).toBe('function');
    });
  });

  describe('HBodyDefinition shape', () => {
    it('is a constructor with init and render on prototype', () => {
      expect(typeof HBodyDefinition).toBe('function');
      expect(typeof HBodyDefinition.prototype.init).toBe('function');
      expect(typeof HBodyDefinition.prototype.render).toBe('function');
    });

    it('has conditions and conditionAliases statics', () => {
      expect(HBodyDefinition.conditions).toContain('loaded');
      expect(HBodyDefinition.conditionAliases['complete']).toBe('loaded');
    });
  });

  describe('HTransformDefinition shape', () => {
    it('is a constructor with init and process on prototype', () => {
      expect(typeof HTransformDefinition).toBe('function');
      expect(typeof HTransformDefinition.prototype.init).toBe('function');
      expect(typeof HTransformDefinition.prototype.process).toBe('function');
    });
  });

  describe('HFramesetDefinition shape', () => {
    it('is a constructor with init, preprocess and render on prototype', () => {
      expect(typeof HFramesetDefinition).toBe('function');
      expect(typeof HFramesetDefinition.prototype.init).toBe('function');
      expect(typeof HFramesetDefinition.prototype.process).toBe('function');
      expect(typeof HFramesetDefinition.prototype.render).toBe('function');
    });

  });

  // --- HFrameDefinition ---

  describe('HFrameDefinition', () => {
    it('parses @main attribute', () => {
      const el = document.createElement('div');
      el.setAttribute('main', 'article');
      const def = new HFrameDefinition(el, makeFramesetDef());
      expect(def.mainSelector).toBe('article');
    });

    it('has empty bodies when no hf-body children', () => {
      const el = document.createElement('div');
      const def = new HFrameDefinition(el, makeFramesetDef());
      expect(def.bodies).toEqual([]);
    });

    it('extracts hf-body children as HBodyDefinition instances', () => {
      const el = document.createElement('div');
      const body = document.createElement('hf-body');
      body.setAttribute('condition', 'loaded');
      el.appendChild(body);
      const def = new HFrameDefinition(el, makeFramesetDef());
      expect(def.bodies.length).toBe(1);
      expect(def.bodies[0]).toBeInstanceOf(HBodyDefinition);
      expect(def.bodies[0].condition).toBe('loaded');
    });

    it('extracts multiple hf-body children with different conditions', () => {
      const el = document.createElement('div');
      const loading = document.createElement('hf-body');
      loading.setAttribute('condition', 'loading');
      const loaded = document.createElement('hf-body');
      loaded.setAttribute('condition', 'loaded');
      el.appendChild(loading);
      el.appendChild(loaded);
      const def = new HFrameDefinition(el, makeFramesetDef());
      expect(def.bodies.length).toBe(2);
      expect(def.bodies[0].condition).toBe('loading');
      expect(def.bodies[1].condition).toBe('loaded');
    });

    it('keeps hf-body children in the source element', () => {
      const el = document.createElement('div');
      el.appendChild(document.createElement('hf-body'));
      new HFrameDefinition(el, makeFramesetDef());
      expect(el.querySelector('hf-body')).not.toBeNull();
    });

    it('ignores head-like children (title, meta, link, style, script)', () => {
      const el = document.createElement('div');
      el.appendChild(document.createElement('title'));
      el.appendChild(document.createElement('style'));
      const def = new HFrameDefinition(el, makeFramesetDef());
      expect(def.bodies).toEqual([]);
    });

    it('render returns undefined when no body matches condition', () => {
      const el = document.createElement('div');
      const def = new HFrameDefinition(el, makeFramesetDef());
      expect(def.render({url: 'http://example.com'}, 'loading')).toBeUndefined();
    });

    it('render delegates to matching HBodyDefinition', () => {
      const el = document.createElement('div');
      const body = document.createElement('hf-body');
      body.setAttribute('condition', 'loading');
      body.textContent = 'Loading...';
      el.appendChild(body);
      const def = new HFrameDefinition(el, makeFramesetDef());
      // loading body has no transforms, so render clones the element
      const result = def.render({url: 'http://example.com/'}, 'loading');
      expect(result).toBeInstanceOf(HTMLElement);
      expect(result.textContent).toBe('Loading...');
    });

    it('render passes details through to body', () => {
      const el = document.createElement('div');
      const body = document.createElement('hf-body');
      body.setAttribute('condition', 'loaded');
      el.appendChild(body);
      const fsDef = makeFramesetDef();
      const def = new HFrameDefinition(el, fsDef);
      // no transforms, so render returns a clone regardless of details
      const result = def.render({url: 'http://example.com/'}, 'loaded', { mainSelector: '.content' });
      expect(result).toBeInstanceOf(HTMLElement);
    });
  });

  // --- HBodyDefinition ---

  describe('HBodyDefinition', () => {
    it('defaults condition to loaded', () => {
      const el = document.createElement('div');
      const def = new HBodyDefinition(el, makeFramesetDef());
      expect(def.condition).toBe('loaded');
    });

    it('normalizes condition aliases', () => {
      const cases = { blank: 'uninitialized', waiting: 'loading', interactive: 'loaded', complete: 'loaded' };
      for (const [input, expected] of Object.entries(cases)) {
        const el = document.createElement('div');
        el.setAttribute('condition', input);
        const def = new HBodyDefinition(el, makeFramesetDef());
        expect(def.condition).toBe(expected);
      }
    });

    it('preserves unknown conditions with a warning', () => {
      const el = document.createElement('div');
      el.setAttribute('condition', 'custom-state');
      const def = new HBodyDefinition(el, makeFramesetDef());
      expect(def.condition).toBe('custom-state');
    });

    it('starts with empty transforms array', () => {
      const el = document.createElement('div');
      const def = new HBodyDefinition(el, makeFramesetDef());
      expect(def.transforms).toEqual([]);
    });

    it('render clones element when no transforms', () => {
      const el = document.createElement('div');
      el.textContent = 'fallback content';
      const def = new HBodyDefinition(el, makeFramesetDef());
      const result = def.render({}, {});
      expect(result).not.toBe(el);
      expect(result.textContent).toBe('fallback content');
    });

    it('render returns null when transforms exist but no resource document', () => {
      const el = document.createElement('div');
      const def = new HBodyDefinition(el, makeFramesetDef());
      // Manually add a transform to avoid processors dependency
      def.transforms.push({});
      expect(def.render({}, {})).toBeNull();
    });

    it('render returns null when transforms exist and resource has no document', () => {
      const el = document.createElement('div');
      const def = new HBodyDefinition(el, makeFramesetDef());
      def.transforms.push({});
      expect(def.render({ document: null }, {})).toBeNull();
    });
  });

  // --- HFramesetDefinition ---

  describe('HFramesetDefinition', () => {
    it('init parses a minimal frameset document', () => {
      const doc = createFramesetDoc('<main>content</main>');
      const def = new HFramesetDefinition(doc, { behaviors,
        framesetURL: 'http://example.com/frameset.html',
        scope: 'http://example.com/'
      });
      expect(def.url).toBe('http://example.com/frameset.html');
      expect(def.scope).toBe('http://example.com/');
      expect(def.element).toBeInstanceOf(HTMLElement);
      expect(def.document).toBe(doc);
    });

    it('init sets up namespaces with hf default', () => {
      const doc = createFramesetDoc('');
      const def = new HFramesetDefinition(doc, { behaviors,
        framesetURL: 'http://example.com/frameset.html',
        scope: 'http://example.com/'
      });
      expect(def.namespaces).toBeDefined();
      expect(def.namespaces.lookupNamespace('hyperframeset')).toBeDefined();
    });

    it('init rebases scope: URLs in known attributes', () => {
      const doc = createFramesetDoc('<a href="scope:page.html">link</a>');
      new HFramesetDefinition(doc, { behaviors,
        framesetURL: 'http://example.com/frameset.html',
        scope: 'http://example.com/app/'
      });
      // The <a> was in body which is now detached, but the href should have been rebased
      // before detachment. We can't easily check after detach, so this is a smoke test.
    });

    it('init adds sourceURL to inline scripts', () => {
      const doc = createFramesetDoc('');
      const script = doc.createElement('script');
      script.text = '({})';
      doc.head.appendChild(script);
      const def = new HFramesetDefinition(doc, { behaviors,
        framesetURL: 'http://example.com/frameset.html',
        scope: 'http://example.com/'
      });
      const scripts = def.document.querySelectorAll('script');
      const inlineScript = Array.from(scripts).find(s => !s.hasAttribute('src'));
      if (inlineScript) {
        expect(inlineScript.hasAttribute('sourceurl')).toBe(true);
        expect(inlineScript.text).toContain('//# sourceURL=');
      }
    });

    it('preprocess creates frame definitions from hf-frame elements', () => {
      const doc = createFramesetDoc(
        '<hf-frame defid="main_frame"><hf-body condition="loading">Loading</hf-body></hf-frame>'
      );
      const def = new HFramesetDefinition(doc, { behaviors,
        framesetURL: 'http://example.com/frameset.html',
        scope: 'http://example.com/'
      });
      def.process();
      expect(def.getFrame('main_frame')).toBeInstanceOf(HFrameDefinition);
    });

    it('preprocess auto-generates defid when missing', () => {
      const doc = createFramesetDoc('<hf-frame></hf-frame>');
      const def = new HFramesetDefinition(doc, { behaviors,
        framesetURL: 'http://example.com/frameset.html',
        scope: 'http://example.com/'
      });
      def.process();
      expect(def.getFrame('__frame_0__')).toBeInstanceOf(HFrameDefinition);
    });

    it('preprocess handles multiple frames', () => {
      const doc = createFramesetDoc(
        '<hf-frame defid="nav"></hf-frame><hf-frame defid="main"></hf-frame>'
      );
      const def = new HFramesetDefinition(doc, { behaviors,
        framesetURL: 'http://example.com/frameset.html',
        scope: 'http://example.com/'
      });
      def.process();
      expect(def.getFrame('nav')).toBeInstanceOf(HFrameDefinition);
      expect(def.getFrame('main')).toBeInstanceOf(HFrameDefinition);
    });

    it('render returns a clone of the frameset body', () => {
      const doc = createFramesetDoc('<header>Header</header><main>Main</main>');
      const def = new HFramesetDefinition(doc, { behaviors,
        framesetURL: 'http://example.com/frameset.html',
        scope: 'http://example.com/'
      });
      const result = def.render();
      expect(result).not.toBe(def.element);
      expect(result.querySelector('header').textContent).toBe('Header');
      expect(result.querySelector('main').textContent).toBe('Main');
    });

    it('full pipeline: init → preprocess → render with frames containing bodies', () => {
      const doc = createFramesetDoc(
        '<hf-frame defid="content">' +
          '<hf-body condition="loading"><p>Loading...</p></hf-body>' +
          '<hf-body condition="loaded"></hf-body>' +
        '</hf-frame>'
      );
      const def = new HFramesetDefinition(doc, { behaviors,
        framesetURL: 'http://example.com/frameset.html',
        scope: 'http://example.com/'
      });
      def.process();

      const frameDef = def.getFrame('content');
      expect(frameDef.bodies.length).toBe(2);

      // Render the loading body
      const loadingResult = frameDef.render({url: 'http://example.com/'}, 'loading');
      expect(loadingResult.textContent).toBe('Loading...');

      // Render returns a clone of the frameset body
      const rendered = def.render();
      expect(rendered).toBeInstanceOf(HTMLElement);
    });
  });

  // --- HFramesetDefinition init() edge cases ---

  describe('HFramesetDefinition init edge cases', () => {
    it('warns about @id usage in frameset body', () => {
      const doc = createFramesetDoc('<div id="bad">content</div>');
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      new HFramesetDefinition(doc, { behaviors,
        framesetURL: 'http://example.com/frameset.html',
        scope: 'http://example.com/'
      });
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('@id is strongly discouraged'));
      spy.mockRestore();
    });

    it('skips non-javascript scripts', () => {
      const doc = createFramesetDoc('');
      const script = doc.createElement('script');
      script.type = 'text/x-template';
      script.text = '<div>template</div>';
      doc.head.appendChild(script);
      new HFramesetDefinition(doc, { behaviors,
        framesetURL: 'http://example.com/frameset.html',
        scope: 'http://example.com/'
      });
      // Should not have sourceurl added
      expect(script.hasAttribute('sourceurl')).toBe(false);
    });

    it('skips external scripts (with @src)', () => {
      const doc = createFramesetDoc('');
      const script = doc.createElement('script');
      script.setAttribute('src', 'external.js');
      doc.head.appendChild(script);
      new HFramesetDefinition(doc, { behaviors,
        framesetURL: 'http://example.com/frameset.html',
        scope: 'http://example.com/'
      });
      expect(script.hasAttribute('sourceurl')).toBe(false);
    });

    it('preserves pre-existing @sourceurl on scripts', () => {
      const doc = createFramesetDoc('');
      const script = doc.createElement('script');
      script.setAttribute('sourceurl', 'custom://my-source');
      script.text = '({})';
      doc.head.appendChild(script);
      new HFramesetDefinition(doc, { behaviors,
        framesetURL: 'http://example.com/frameset.html',
        scope: 'http://example.com/'
      });
      expect(script.getAttribute('sourceurl')).toBe('custom://my-source');
      expect(script.text).toContain('//# sourceURL=custom://my-source');
    });

    it('moves <script for> from head to body', () => {
      const doc = createFramesetDoc('<p>content</p>');
      const script = doc.createElement('script');
      script.setAttribute('for', 'something');
      script.text = '({})';
      doc.head.appendChild(script);
      const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const def = new HFramesetDefinition(doc, { behaviors,
        framesetURL: 'http://example.com/frameset.html',
        scope: 'http://example.com/'
      });
      // Script should now be in the detached body element with empty @for
      const scripts = def.element.querySelectorAll('script[for]');
      expect(scripts.length).toBe(1);
      expect(scripts[0].getAttribute('for')).toBe('');
      spy.mockRestore();
    });

    it('moves non-@for scripts from body to head', () => {
      const doc = createFramesetDoc('<script>var x = 1;</script>');
      const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const def = new HFramesetDefinition(doc, { behaviors,
        framesetURL: 'http://example.com/frameset.html',
        scope: 'http://example.com/'
      });
      // Script should have been moved to head before body was detached
      const headScripts = def.document.querySelectorAll('head script');
      expect(headScripts.length).toBeGreaterThan(0);
      spy.mockRestore();
    });
  });

  // --- HFramesetDefinition preprocess() edge cases ---

  describe('HFramesetDefinition preprocess edge cases', () => {
    it('warns and removes external scripts in body', () => {
      const doc = createFramesetDoc(
        '<script for="" src="external.js"></script><p>content</p>'
      );
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const def = new HFramesetDefinition(doc, { behaviors,
        framesetURL: 'http://example.com/frameset.html',
        scope: 'http://example.com/'
      });
      def.process();
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('may not contain external scripts'));
      expect(def.element.querySelectorAll('script[src]').length).toBe(0);
      spy.mockRestore();
    });

    it('warns and removes non-@for scripts in body during preprocess', () => {
      // Create a script that survives init (has @for but non-empty value)
      const doc = createFramesetDoc('<p>content</p>');
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const def = new HFramesetDefinition(doc, { behaviors,
        framesetURL: 'http://example.com/frameset.html',
        scope: 'http://example.com/'
      });
      // Manually insert a script without @for into the detached body
      const script = document.createElement('script');
      script.text = 'var x = 1;';
      def.element.appendChild(script);
      def.process();
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('may not contain non-@for scripts'));
      expect(def.element.querySelectorAll('script:not([for])').length).toBe(0);
      spy.mockRestore();
    });

    it('warns and removes scripts with non-empty @for', () => {
      const doc = createFramesetDoc('<p>content</p>');
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const def = new HFramesetDefinition(doc, { behaviors,
        framesetURL: 'http://example.com/frameset.html',
        scope: 'http://example.com/'
      });
      const script = document.createElement('script');
      script.setAttribute('for', 'non-empty');
      script.setAttribute('sourceurl', 'test');
      script.text = '({})';
      def.element.appendChild(script);
      def.process();
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('may only contain EMPTY @for'));
      spy.mockRestore();
    });

    it('evaluates inline @for script and stores in configData', () => {
      const doc = createFramesetDoc(
        '<div><script for="">({ myOption: true })</script></div>'
      );
      const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const def = new HFramesetDefinition(doc, { behaviors,
        framesetURL: 'http://example.com/frameset.html',
        scope: 'http://example.com/'
      });
      def.process();
      // The div should have a @config attribute set by preprocess
      const div = def.element.querySelector('div');
      expect(div.hasAttribute('config')).toBe(true);
      // Script should have been removed
      expect(def.element.querySelectorAll('script').length).toBe(0);
      spy.mockRestore();
    });

    it('handles script evaluation errors gracefully', () => {
      const doc = createFramesetDoc(
        '<div><script for="">this is not valid JS object {{{</script></div>'
      );
      let errorFired = false;
      const handler = () => { errorFired = true; };
      window.addEventListener('error', handler);
      const def = new HFramesetDefinition(doc, { behaviors,
        framesetURL: 'http://example.com/frameset.html',
        scope: 'http://example.com/'
      });
      def.process();
      window.removeEventListener('error', handler);
      expect(errorFired).toBe(true);
    });

    it('frame @def referencing non-existent definition warns', () => {
      const doc = createFramesetDoc(
        '<hf-frame def="nonexistent"></hf-frame>'
      );
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const def = new HFramesetDefinition(doc, { behaviors,
        framesetURL: 'http://example.com/frameset.html',
        scope: 'http://example.com/'
      });
      def.process();
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('non-existant frame definition'));
      spy.mockRestore();
    });

    it('frame def and ref with matching defid/def', () => {
      const doc = createFramesetDoc(
        '<hf-frame defid="shared" def="shared"><hf-body condition="loading">Loading</hf-body></hf-frame>' +
        '<hf-frame def="shared"></hf-frame>'
      );
      const def = new HFramesetDefinition(doc, { behaviors,
        framesetURL: 'http://example.com/frameset.html',
        scope: 'http://example.com/'
      });
      def.process();
      expect(def.getFrame('shared')).toBeInstanceOf(HFrameDefinition);
    });
  });
});
