import { describe, test, expect } from 'vitest';
import sprockets from '../src/Meeko/sprockets.mjs';
import Binding from '../src/Meeko/Binding.mjs';

// Indirection over sprockets.evolve — swap this to test a new implementation
function evolve(base, props) {
  return sprockets.evolve(base, props);
}

// Helper: create a bound sprocket instance on a real DOM element
function bind(definition, el) {
  if (!el) el = document.createElement('div');
  let binding = Binding.attachBinding(definition, el);
  return binding.object;
}

describe('evolve prototype chain', () => {

  test('sub prototype inherits base methods', () => {
    let base = evolve(sprockets.RoleType, { greet() { return 'hi'; } });
    let sub = evolve(base, { wave() { return 'wave'; } });
    let inst = Object.create(sub.prototype);
    expect(inst.greet()).toBe('hi');
    expect(inst.wave()).toBe('wave');
  });

  test('three-level chain inherits through all levels', () => {
    let a = evolve(sprockets.RoleType, { a() { return 'a'; } });
    let b = evolve(a, { b() { return 'b'; } });
    let c = evolve(b, { c() { return 'c'; } });
    let inst = Object.create(c.prototype);
    expect(inst.a()).toBe('a');
    expect(inst.b()).toBe('b');
    expect(inst.c()).toBe('c');
  });

  test('sub can override base method', () => {
    let base = evolve(sprockets.RoleType, { greet() { return 'base'; } });
    let sub = evolve(base, { greet() { return 'sub'; } });
    let inst = Object.create(sub.prototype);
    expect(inst.greet()).toBe('sub');
  });

  test('role property is inherited', () => {
    let a = evolve(sprockets.RoleType, { role: 'widget' });
    let b = evolve(a, {});
    expect(Object.create(b.prototype).role).toBe('widget');
  });

  test('role property can be overridden', () => {
    let a = evolve(sprockets.RoleType, { role: 'widget' });
    let b = evolve(a, { role: 'button' });
    expect(Object.create(b.prototype).role).toBe('button');
  });

});

describe('__properties__ inheritance', () => {

  test('evolve creates __properties__ on sub prototype', () => {
    let base = evolve(sprockets.RoleType, {
      foo: { type: 'boolean', get() { return true; }, set() {} }
    });
    let sub = evolve(base, {});
    expect(sub.prototype.__properties__).toBeDefined();
    expect(sub.prototype.__properties__.foo).toBeDefined();
  });

  test('sub inherits base ARIA property descriptors', () => {
    let base = evolve(sprockets.RoleType, {
      foo: { type: 'boolean', get() { return 'base-get'; }, set() {} }
    });
    let sub = evolve(base, {});
    expect(sub.prototype.__properties__.foo.get()).toBe('base-get');
  });

  test('sub can fully override inherited descriptor', () => {
    let base = evolve(sprockets.RoleType, {
      foo: { type: 'boolean', get() { return 'base'; }, set() {} }
    });
    let sub = evolve(base, {
      foo: { type: 'string', get() { return 'sub'; }, set() {} }
    });
    // get is overridden
    expect(sub.prototype.__properties__.foo.get()).toBe('sub');
    // type is overridden
    expect(sub.prototype.__properties__.foo.type).toBe('string');
  });

  test('overriding in sub does not mutate base __properties__', () => {
    let base = evolve(sprockets.RoleType, {
      foo: { type: 'boolean', get() { return 'base'; }, set() {} }
    });
    let sub = evolve(base, {
      foo: { type: 'string', get() { return 'sub'; }, set() {} }
    });
    expect(base.prototype.__properties__.foo.get()).toBe('base');
  });

  test('three-level __properties__ inheritance', () => {
    let a = evolve(sprockets.RoleType, {
      x: { type: 'boolean', get() { return 'a'; }, set() {} }
    });
    let b = evolve(a, {
      y: { type: 'boolean', get() { return 'b'; }, set() {} }
    });
    let c = evolve(b, {});
    let obj = bind(c);
    expect(obj.ariaGet('x')).toBe('a');
    expect(obj.ariaGet('y')).toBe('b');
  });

});

describe('trap getters', () => {

  test('direct property get throws', () => {
    let def = evolve(sprockets.RoleType, {
      foo: { type: 'boolean', get() { return true; }, set() {} }
    });
    let inst = Object.create(def.prototype);
    expect(() => inst.foo).toThrow('ARIA property');
  });

  test('direct property set throws', () => {
    let def = evolve(sprockets.RoleType, {
      foo: { type: 'boolean', get() { return true; }, set() {} }
    });
    let inst = Object.create(def.prototype);
    expect(() => { inst.foo = false; }).toThrow('ARIA property');
  });

});

describe('ariaGet / ariaSet', () => {

  test('ariaGet dispatches to descriptor get', () => {
    let def = evolve(sprockets.RoleType, {
      foo: { type: 'boolean', get() { return this.aria('hidden'); }, set() {} }
    });
    let obj = bind(def);
    expect(obj.ariaGet('foo')).toBe(false); // hidden defaults to false
  });

  test('ariaSet dispatches to descriptor set', () => {
    let value;
    let def = evolve(sprockets.RoleType, {
      foo: { type: 'boolean', get() { return value; }, set(v) { value = v; } }
    });
    let obj = bind(def);
    obj.ariaSet('foo', 42);
    expect(value).toBe(42);
    expect(obj.ariaGet('foo')).toBe(42);
  });

  test('ariaGet throws for undefined property', () => {
    let def = evolve(sprockets.RoleType, {});
    let obj = bind(def);
    expect(() => obj.ariaGet('nonexistent')).toThrow('not defined');
  });

  test('ariaSet throws for undefined property', () => {
    let def = evolve(sprockets.RoleType, {});
    let obj = bind(def);
    expect(() => obj.ariaSet('nonexistent', 1)).toThrow('not defined');
  });

});

describe('ariaCan / ariaToggle', () => {

  test('ariaCan returns true for boolean property with no can guard', () => {
    let def = evolve(sprockets.RoleType, {
      foo: { type: 'boolean', get() { return false; }, set() {} }
    });
    let obj = bind(def);
    expect(obj.ariaCan('foo')).toBe(true);
  });

  test('ariaCan returns false for non-boolean property', () => {
    let def = evolve(sprockets.RoleType, {
      foo: { type: 'node', get() { return null; }, set() {} }
    });
    let obj = bind(def);
    expect(obj.ariaCan('foo')).toBe(false);
  });

  test('ariaCan respects can guard returning false', () => {
    let def = evolve(sprockets.RoleType, {
      foo: { type: 'boolean', can() { return false; }, get() { return false; }, set() {} }
    });
    let obj = bind(def);
    expect(obj.ariaCan('foo')).toBe(false);
  });

  test('ariaCan respects can guard returning true', () => {
    let def = evolve(sprockets.RoleType, {
      foo: { type: 'boolean', can() { return true; }, get() { return false; }, set() {} }
    });
    let obj = bind(def);
    expect(obj.ariaCan('foo')).toBe(true);
  });

  test('ariaCan throws for undefined property', () => {
    let def = evolve(sprockets.RoleType, {});
    let obj = bind(def);
    expect(() => obj.ariaCan('nonexistent')).toThrow('not defined');
  });

  test('ariaToggle flips boolean value', () => {
    let value = false;
    let def = evolve(sprockets.RoleType, {
      foo: { type: 'boolean', get() { return value; }, set(v) { value = v; } }
    });
    let obj = bind(def);
    let old = obj.ariaToggle('foo');
    expect(old).toBe(false);
    expect(value).toBe(true);
  });

  test('ariaToggle sets explicit value', () => {
    let value = true;
    let def = evolve(sprockets.RoleType, {
      foo: { type: 'boolean', get() { return value; }, set(v) { value = v; } }
    });
    let obj = bind(def);
    obj.ariaToggle('foo', false);
    expect(value).toBe(false);
  });

  test('ariaToggle throws when can guard returns false', () => {
    let def = evolve(sprockets.RoleType, {
      foo: { type: 'boolean', can() { return false; }, get() { return false; }, set() {} }
    });
    let obj = bind(def);
    expect(() => obj.ariaToggle('foo')).toThrow('can not toggle');
  });

  test('ariaToggle throws for non-boolean property', () => {
    let def = evolve(sprockets.RoleType, {
      foo: { type: 'node', get() { return null; }, set() {} }
    });
    let obj = bind(def);
    expect(() => obj.ariaToggle('foo')).toThrow('can not toggle');
  });

});

describe('hidden property (from RoleType)', () => {

  test('ariaGet hidden returns false by default', () => {
    let obj = bind(sprockets.RoleType);
    expect(obj.ariaGet('hidden')).toBe(false);
  });

  test('ariaToggle hidden sets hidden attribute', () => {
    let el = document.createElement('div');
    let obj = bind(sprockets.RoleType, el);
    obj.ariaToggle('hidden', true);
    expect(el.hasAttribute('hidden')).toBe(true);
  });

  test('ariaToggle hidden removes hidden attribute', () => {
    let el = document.createElement('div');
    el.setAttribute('hidden', '');
    let obj = bind(sprockets.RoleType, el);
    obj.ariaToggle('hidden', false);
    expect(el.hasAttribute('hidden')).toBe(false);
  });

  test('ariaCan hidden returns true', () => {
    let obj = bind(sprockets.RoleType);
    expect(obj.ariaCan('hidden')).toBe(true);
  });

});

describe('consumer patterns: owns', () => {

  test('owns getter returns children', () => {
    let def = evolve(sprockets.RoleType, {
      owns: {
        get() { return Array.from(this.element.children); }
      }
    });
    let el = document.createElement('div');
    el.innerHTML = '<span>a</span><span>b</span>';
    let obj = bind(def, el);
    let owned = obj.ariaGet('owns');
    expect(owned).toHaveLength(2);
    expect(owned[0].textContent).toBe('a');
  });

});

describe('consumer patterns: activedescendant', () => {

  test('activedescendant set toggles hidden on children', () => {
    // Mimics Deck pattern from layoutElements
    let OwnerDef = evolve(sprockets.RoleType, {
      owns: {
        get() { return Array.from(this.element.children); }
      },
      activedescendant: {
        set(item) {
          let panels = this.ariaGet('owns');
          for (let child of panels) {
            child.ariaToggle('hidden', child !== item);
          }
        }
      }
    });

    let container = document.createElement('div');
    let a = document.createElement('div');
    let b = document.createElement('div');
    container.appendChild(a);
    container.appendChild(b);
    document.body.appendChild(container);

    // Bind RoleType on children so ariaToggle works via element.$
    Binding.attachBinding(sprockets.RoleType, a);
    Binding.enableBinding(a);
    Binding.attachBinding(sprockets.RoleType, b);
    Binding.enableBinding(b);

    let owner = bind(OwnerDef, container);
    owner.ariaSet('activedescendant', a);

    expect(a.hasAttribute('hidden')).toBe(false);
    expect(b.hasAttribute('hidden')).toBe(true);

    // Cleanup
    Binding.detachBinding(a);
    Binding.detachBinding(b);
    container.remove();
  });

});

describe('consumer patterns: dynamic can guard', () => {

  test('can guard receives this context', () => {
    let def = evolve(sprockets.RoleType, {
      foo: {
        type: 'boolean',
        can() { return this.element.hasAttribute('data-enabled'); },
        get() { return false; },
        set() {}
      }
    });
    let el = document.createElement('div');
    let obj = bind(def, el);
    expect(obj.ariaCan('foo')).toBe(false);
    el.setAttribute('data-enabled', '');
    expect(obj.ariaCan('foo')).toBe(true);
  });

});

describe('cast', () => {

  test('cast returns the bound object for a matching sprocket', () => {
    let Def = evolve(sprockets.RoleType, { role: 'widget' });
    let el = document.createElement('div');
    let binding = Binding.attachBinding(Def, el);
    let result = sprockets.cast(el, Def);
    expect(result).toBe(binding.object);
  });

  test('cast returns the bound object when cast to a base type', () => {
    let Base = evolve(sprockets.RoleType, { role: 'base' });
    let Sub = evolve(Base, { role: 'sub' });
    let el = document.createElement('div');
    let binding = Binding.attachBinding(Sub, el);
    let result = sprockets.cast(el, Base);
    expect(result).toBe(binding.object);
  });

  test('cast throws when element has no binding', () => {
    let Def = evolve(sprockets.RoleType, {});
    let el = document.createElement('div');
    expect(() => sprockets.cast(el, Def)).toThrow();
  });

  test('cast throws when bound sprocket does not match requested type', () => {
    let A = evolve(sprockets.RoleType, { role: 'a' });
    let B = evolve(sprockets.RoleType, { role: 'b' });
    let el = document.createElement('div');
    Binding.attachBinding(A, el);
    expect(() => sprockets.cast(el, B)).toThrow('not compatible');
  });

  test('cast with RoleType succeeds for any bound element', () => {
    let Def = evolve(sprockets.RoleType, { role: 'anything' });
    let el = document.createElement('div');
    let binding = Binding.attachBinding(Def, el);
    let result = sprockets.cast(el, sprockets.RoleType);
    expect(result).toBe(binding.object);
  });

});

describe('element.$', () => {

  test('element.$ returns the bound sprocket object', () => {
    let Def = evolve(sprockets.RoleType, { role: 'widget' });
    let el = document.createElement('div');
    document.body.appendChild(el);
    let binding = Binding.attachBinding(Def, el);
    expect(el.$).toBe(binding.object);
    el.remove();
  });

  test('element.$ on unbound element lazily attaches via fallback rule', () => {
    let el = document.createElement('div');
    document.body.appendChild(el);
    // Universal '*' rule means any element gets a RoleType binding
    let obj = el.$;
    expect(obj).toBeDefined();
    el.remove();
  });

});
