import { describe, test, expect } from 'vitest';
import ScriptProcessor from '../src/Meeko/ScriptProcessor.mjs';

describe('ScriptProcessor', () => {

  test('constructor accepts a processor object', () => {
    const proc = new ScriptProcessor({
      transform: (srcNode) => srcNode
    });
    expect(proc.processor).toBeDefined();
    expect(typeof proc.processor.transform).toBe('function');
  });

  test('loadTemplate extracts processor from script element', () => {
    const proc = new ScriptProcessor();
    const template = document.createElement('div');
    const script = document.createElement('script');
    script.text = '({ transform: function(src) { return src; } })';
    template.appendChild(script);
    proc.loadTemplate(template);
    expect(proc.processor).toBeDefined();
    expect(typeof proc.processor.transform).toBe('function');
  });

  test('loadTemplate with no script and no preset processor warns', () => {
    const proc = new ScriptProcessor();
    const template = document.createElement('div');
    expect(() => proc.loadTemplate(template)).not.toThrow();
    expect(proc.processor).toBeUndefined();
  });

  test('transform calls processor.transform with srcNode', () => {
    const results = [];
    const proc = new ScriptProcessor({
      transform: (srcNode, details) => {
        results.push(srcNode.textContent);
        return srcNode;
      }
    });
    const div = document.createElement('div');
    div.textContent = 'hello';
    proc.transform({ srcNode: div }, {});
    expect(results).toEqual(['hello']);
  });

  test('transform returns processor result', () => {
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createElement('span'));
    const proc = new ScriptProcessor({
      transform: () => frag
    });
    const result = proc.transform({ srcNode: document.createElement('div') }, {});
    expect(result).toBe(frag);
  });

  test('transform with no processor does not throw', () => {
    const proc = new ScriptProcessor();
    expect(() => proc.transform({ srcNode: document.createElement('div') }, {})).not.toThrow();
  });
});
