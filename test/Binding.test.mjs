import { describe, test, expect } from 'vitest';
import Binding from '../src/Meeko/Binding.mjs';
import * as DOM from '../src/Meeko/DOM.mjs';

function createDefinition(overrides) {
  return Object.assign({
    prototype: {},
    handlers: [],
  }, overrides);
}

describe('Binding', () => {

  test('constructor creates object from definition prototype', () => {
    const def = createDefinition({ prototype: { greet() { return 'hi'; } } });
    const binding = new Binding(def);
    expect(binding.object.greet()).toBe('hi');
  });

  test('constructor copies handlers', () => {
    const handler = { type: 'click', action() {} };
    const binding = new Binding(createDefinition({ handlers: [handler] }));
    expect(binding.handlers).toHaveLength(1);
    expect(binding.handlers[0].type).toBe('click');
  });

  test('constructor defaults handlers to empty array', () => {
    const binding = new Binding(createDefinition());
    expect(binding.handlers).toEqual([]);
  });

  test('attach sets element on object', () => {
    const binding = new Binding(createDefinition());
    const el = document.createElement('div');
    binding.attach(el);
    expect(binding.object.element).toBe(el);
  });

  test('attach calls definition.attached', () => {
    let called = false;
    const def = createDefinition({ attached() { called = true; } });
    const binding = new Binding(def);
    binding.attach(document.createElement('div'));
    expect(called).toBe(true);
  });

  test('enteredDocumentCallback sets inDocument true', () => {
    const binding = new Binding(createDefinition());
    binding.attach(document.createElement('div'));
    binding.enteredDocumentCallback();
    expect(binding.inDocument).toBe(true);
  });

  test('enteredDocumentCallback calls definition.enteredDocument', () => {
    let called = false;
    const def = createDefinition({ enteredDocument() { called = true; } });
    const binding = new Binding(def);
    binding.attach(document.createElement('div'));
    binding.enteredDocumentCallback();
    expect(called).toBe(true);
  });

  test('leftDocumentCallback sets inDocument false', () => {
    const binding = new Binding(createDefinition());
    binding.attach(document.createElement('div'));
    binding.enteredDocumentCallback();
    binding.leftDocumentCallback();
    expect(binding.inDocument).toBe(false);
  });

  test('detach calls definition.detached', () => {
    let called = false;
    const def = createDefinition({ detached() { called = true; } });
    const binding = new Binding(def);
    binding.attach(document.createElement('div'));
    binding.detach();
    expect(called).toBe(true);
  });

  test('detach sets inDocument to null', () => {
    const binding = new Binding(createDefinition());
    binding.attach(document.createElement('div'));
    binding.enteredDocumentCallback();
    binding.detach();
    expect(binding.inDocument).toBeNull();
  });

  test('handler action fires on event', () => {
    let received = false;
    const def = createDefinition({
      handlers: [{ type: 'click', action() { received = true; } }],
    });
    const el = document.createElement('div');
    document.body.appendChild(el);
    Binding.attachBinding(def, el);
    el.click();
    expect(received).toBe(true);
    Binding.detachBinding(el);
    el.remove();
  });

  test('detach removes event listeners', () => {
    let count = 0;
    const def = createDefinition({
      handlers: [{ type: 'click', action() { count++; } }],
    });
    const el = document.createElement('div');
    document.body.appendChild(el);
    Binding.attachBinding(def, el);
    el.click();
    expect(count).toBe(1);
    Binding.detachBinding(el);
    el.click();
    expect(count).toBe(1);
    el.remove();
  });

  test('attachBinding stores binding on element', () => {
    const def = createDefinition();
    const el = document.createElement('div');
    Binding.attachBinding(def, el);
    expect(DOM.hasData(el)).toBe(true);
    expect(DOM.getData(el).definition).toBe(def);
    Binding.detachBinding(el);
  });

  test('enableBinding calls enteredDocumentCallback', () => {
    let called = false;
    const def = createDefinition({ enteredDocument() { called = true; } });
    const el = document.createElement('div');
    Binding.attachBinding(def, el);
    Binding.enableBinding(el);
    expect(called).toBe(true);
    Binding.detachBinding(el);
  });

  test('detachBinding removes binding from element', () => {
    const def = createDefinition();
    const el = document.createElement('div');
    Binding.attachBinding(def, el);
    Binding.detachBinding(el);
    expect(DOM.getData(el)).toBeNull();
  });

  test('full lifecycle', () => {
    const log = [];
    const def = createDefinition({
      attached() { log.push('attached'); },
      enteredDocument() { log.push('entered'); },
      leftDocument() { log.push('left'); },
      detached() { log.push('detached'); },
    });
    const el = document.createElement('div');
    Binding.attachBinding(def, el);
    Binding.enableBinding(el);
    const binding = DOM.getData(el);
    binding.leftDocumentCallback();
    Binding.detachBinding(el);
    expect(log).toEqual(['attached', 'entered', 'left', 'detached']);
  });

  test('getInterface returns binding for bound element', () => {
    const def = createDefinition();
    const el = document.createElement('div');
    Binding.attachBinding(def, el);
    const iface = Binding.getInterface(el);
    expect(iface).toBeDefined();
    expect(iface.definition).toBe(def);
    Binding.detachBinding(el);
  });

  test('getInterface returns undefined for unbound element', () => {
    const el = document.createElement('div');
    expect(Binding.getInterface(el)).toBeUndefined();
  });

  test('event delegation via handler.delegator', () => {
    let delegated = false;
    const def = createDefinition({
      handlers: [{
        type: 'click',
        delegator: '.target',
        action() { delegated = true; }
      }],
    });
    const el = document.createElement('div');
    el.innerHTML = '<span class="target">click me</span>';
    document.body.appendChild(el);
    Binding.attachBinding(def, el);
    el.querySelector('.target').click();
    expect(delegated).toBe(true);
    Binding.detachBinding(el);
    el.remove();
  });

  test('event phase AT_TARGET only fires when target matches', () => {
    let count = 0;
    const def = createDefinition({
      handlers: [{
        type: 'click',
        eventPhase: 2, // AT_TARGET
        action() { count++; }
      }],
    });
    const el = document.createElement('div');
    el.innerHTML = '<span>child</span>';
    document.body.appendChild(el);
    Binding.attachBinding(def, el);
    // Click on child — should NOT fire (target is span, not div)
    el.querySelector('span').click();
    expect(count).toBe(0);
    // Click on element itself — should fire
    el.click();
    expect(count).toBe(1);
    Binding.detachBinding(el);
    el.remove();
  });

});
