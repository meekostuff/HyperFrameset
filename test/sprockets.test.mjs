import { describe, test, expect } from 'vitest';
import sprockets from '../src/Meeko/sprockets.mjs';
import Binding from '../src/Meeko/Binding.mjs';

// Helper: create a bound sprocket instance on a real DOM element
function bind(definition, el) {
  if (!el) el = document.createElement('div');
  let binding = Binding.attachBinding(definition, el);
  return binding.object;
}

describe('class extends prototype chain', () => {

  test('sub prototype inherits base methods', () => {
    class Base extends sprockets.RoleType { greet() { return 'hi'; } }
    class Sub extends Base { wave() { return 'wave'; } }
    let inst = Object.create(Sub.prototype);
    expect(inst.greet()).toBe('hi');
    expect(inst.wave()).toBe('wave');
  });

  test('three-level chain inherits through all levels', () => {
    class A extends sprockets.RoleType { a() { return 'a'; } }
    class B extends A { b() { return 'b'; } }
    class C extends B { c() { return 'c'; } }
    let inst = Object.create(C.prototype);
    expect(inst.a()).toBe('a');
    expect(inst.b()).toBe('b');
    expect(inst.c()).toBe('c');
  });

  test('sub can override base method', () => {
    class Base extends sprockets.RoleType { greet() { return 'base'; } }
    class Sub extends Base { greet() { return 'sub'; } }
    let inst = Object.create(Sub.prototype);
    expect(inst.greet()).toBe('sub');
  });

  test('role property is inherited', () => {
    class A extends sprockets.RoleType {}
    A.prototype.role = 'widget';
    class B extends A {}
    expect(Object.create(B.prototype).role).toBe('widget');
  });

  test('role property can be overridden', () => {
    class A extends sprockets.RoleType {}
    A.prototype.role = 'widget';
    class B extends A {}
    B.prototype.role = 'button';
    expect(Object.create(B.prototype).role).toBe('button');
  });

});

describe('__properties__ inheritance', () => {

  test('withAria creates __properties__ on prototype', () => {
    class Base extends sprockets.RoleType {
      static { sprockets.withAria(this, { foo: { type: 'boolean', get() { return true; }, set() {} } }); }
    }
    class Sub extends Base {}
    expect(Base.prototype.__properties__).toBeDefined();
    expect(Base.prototype.__properties__.foo).toBeDefined();
  });

  test('sub inherits base ARIA property descriptors via ariaGet', () => {
    class Base extends sprockets.RoleType {
      static { sprockets.withAria(this, { foo: { type: 'boolean', get() { return 'base-get'; }, set() {} } }); }
    }
    class Sub extends Base {}
    let obj = bind(Sub);
    expect(obj.ariaGet('foo')).toBe('base-get');
  });

  test('sub can fully override inherited descriptor', () => {
    class Base extends sprockets.RoleType {
      static { sprockets.withAria(this, { foo: { type: 'boolean', get() { return 'base'; }, set() {} } }); }
    }
    class Sub extends Base {
      static { sprockets.withAria(this, { foo: { type: 'string', get() { return 'sub'; }, set() {} } }); }
    }
    expect(Sub.prototype.__properties__.foo.get()).toBe('sub');
    expect(Sub.prototype.__properties__.foo.type).toBe('string');
  });

  test('overriding in sub does not mutate base __properties__', () => {
    class Base extends sprockets.RoleType {
      static { sprockets.withAria(this, { foo: { type: 'boolean', get() { return 'base'; }, set() {} } }); }
    }
    class Sub extends Base {
      static { sprockets.withAria(this, { foo: { type: 'string', get() { return 'sub'; }, set() {} } }); }
    }
    expect(Base.prototype.__properties__.foo.get()).toBe('base');
  });

  test('three-level __properties__ inheritance', () => {
    class A extends sprockets.RoleType {
      static { sprockets.withAria(this, { x: { type: 'boolean', get() { return 'a'; }, set() {} } }); }
    }
    class B extends A {
      static { sprockets.withAria(this, { y: { type: 'boolean', get() { return 'b'; }, set() {} } }); }
    }
    class C extends B {}
    let obj = bind(C);
    expect(obj.ariaGet('x')).toBe('a');
    expect(obj.ariaGet('y')).toBe('b');
  });

});

describe('trap getters', () => {

  test('direct property get throws', () => {
    class Def extends sprockets.RoleType {
      static { sprockets.withAria(this, { foo: { type: 'boolean', get() { return true; }, set() {} } }); }
    }
    let inst = Object.create(Def.prototype);
    expect(() => inst.foo).toThrow('ARIA property');
  });

  test('direct property set throws', () => {
    class Def extends sprockets.RoleType {
      static { sprockets.withAria(this, { foo: { type: 'boolean', get() { return true; }, set() {} } }); }
    }
    let inst = Object.create(Def.prototype);
    expect(() => { inst.foo = false; }).toThrow('ARIA property');
  });

});

describe('ariaGet / ariaSet', () => {

  test('ariaGet dispatches to descriptor get', () => {
    class Def extends sprockets.RoleType {
      static { sprockets.withAria(this, { foo: { type: 'boolean', get() { return this.aria('hidden'); }, set() {} } }); }
    }
    let obj = bind(Def);
    expect(obj.ariaGet('foo')).toBe(false);
  });

  test('ariaSet dispatches to descriptor set', () => {
    let value;
    class Def extends sprockets.RoleType {
      static { sprockets.withAria(this, { foo: { type: 'boolean', get() { return value; }, set(v) { value = v; } } }); }
    }
    let obj = bind(Def);
    obj.ariaSet('foo', 42);
    expect(value).toBe(42);
    expect(obj.ariaGet('foo')).toBe(42);
  });

  test('ariaGet throws for undefined property', () => {
    class Def extends sprockets.RoleType {}
    let obj = bind(Def);
    expect(() => obj.ariaGet('nonexistent')).toThrow('not defined');
  });

  test('ariaSet throws for undefined property', () => {
    class Def extends sprockets.RoleType {}
    let obj = bind(Def);
    expect(() => obj.ariaSet('nonexistent', 1)).toThrow('not defined');
  });

});

describe('ariaCan / ariaToggle', () => {

  test('ariaCan returns true for boolean property with no can guard', () => {
    class Def extends sprockets.RoleType {
      static { sprockets.withAria(this, { foo: { type: 'boolean', get() { return false; }, set() {} } }); }
    }
    let obj = bind(Def);
    expect(obj.ariaCan('foo')).toBe(true);
  });

  test('ariaCan returns false for non-boolean property', () => {
    class Def extends sprockets.RoleType {
      static { sprockets.withAria(this, { foo: { type: 'node', get() { return null; }, set() {} } }); }
    }
    let obj = bind(Def);
    expect(obj.ariaCan('foo')).toBe(false);
  });

  test('ariaCan respects can guard returning false', () => {
    class Def extends sprockets.RoleType {
      static { sprockets.withAria(this, { foo: { type: 'boolean', can() { return false; }, get() { return false; }, set() {} } }); }
    }
    let obj = bind(Def);
    expect(obj.ariaCan('foo')).toBe(false);
  });

  test('ariaCan respects can guard returning true', () => {
    class Def extends sprockets.RoleType {
      static { sprockets.withAria(this, { foo: { type: 'boolean', can() { return true; }, get() { return false; }, set() {} } }); }
    }
    let obj = bind(Def);
    expect(obj.ariaCan('foo')).toBe(true);
  });

  test('ariaCan throws for undefined property', () => {
    class Def extends sprockets.RoleType {}
    let obj = bind(Def);
    expect(() => obj.ariaCan('nonexistent')).toThrow('not defined');
  });

  test('ariaToggle flips boolean value', () => {
    let value = false;
    class Def extends sprockets.RoleType {
      static { sprockets.withAria(this, { foo: { type: 'boolean', get() { return value; }, set(v) { value = v; } } }); }
    }
    let obj = bind(Def);
    let old = obj.ariaToggle('foo');
    expect(old).toBe(false);
    expect(value).toBe(true);
  });

  test('ariaToggle sets explicit value', () => {
    let value = true;
    class Def extends sprockets.RoleType {
      static { sprockets.withAria(this, { foo: { type: 'boolean', get() { return value; }, set(v) { value = v; } } }); }
    }
    let obj = bind(Def);
    obj.ariaToggle('foo', false);
    expect(value).toBe(false);
  });

  test('ariaToggle throws when can guard returns false', () => {
    class Def extends sprockets.RoleType {
      static { sprockets.withAria(this, { foo: { type: 'boolean', can() { return false; }, get() { return false; }, set() {} } }); }
    }
    let obj = bind(Def);
    expect(() => obj.ariaToggle('foo')).toThrow('can not toggle');
  });

  test('ariaToggle throws for non-boolean property', () => {
    class Def extends sprockets.RoleType {
      static { sprockets.withAria(this, { foo: { type: 'node', get() { return null; }, set() {} } }); }
    }
    let obj = bind(Def);
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
    class Def extends sprockets.RoleType {
      static { sprockets.withAria(this, { owns: { get() { return Array.from(this.element.children); } } }); }
    }
    let el = document.createElement('div');
    el.innerHTML = '<span>a</span><span>b</span>';
    let obj = bind(Def, el);
    let owned = obj.ariaGet('owns');
    expect(owned).toHaveLength(2);
    expect(owned[0].textContent).toBe('a');
  });

});

describe('consumer patterns: activedescendant', () => {

  test('activedescendant set toggles hidden on children', () => {
    // Mimics Deck pattern from layoutElements
    class OwnerDef extends sprockets.RoleType {
      static { sprockets.withAria(this, {
        owns: { get() { return Array.from(this.element.children); } },
        activedescendant: {
          set(item) {
            let panels = this.ariaGet('owns');
            for (let child of panels) { child.ariaToggle('hidden', child !== item); }
          }
        }
      }); }
    }

    let container = document.createElement('div');
    let a = document.createElement('div');
    let b = document.createElement('div');
    container.appendChild(a);
    container.appendChild(b);
    document.body.appendChild(container);

    Binding.attachBinding(sprockets.RoleType, a);
    Binding.enableBinding(a);
    Binding.attachBinding(sprockets.RoleType, b);
    Binding.enableBinding(b);

    let owner = bind(OwnerDef, container);
    owner.ariaSet('activedescendant', a);

    expect(a.hasAttribute('hidden')).toBe(false);
    expect(b.hasAttribute('hidden')).toBe(true);

    Binding.detachBinding(a);
    Binding.detachBinding(b);
    container.remove();
  });

});

describe('consumer patterns: dynamic can guard', () => {

  test('can guard receives this context', () => {
    class Def extends sprockets.RoleType {
      static { sprockets.withAria(this, {
        foo: { type: 'boolean', can() { return this.element.hasAttribute('data-enabled'); }, get() { return false; }, set() {} }
      }); }
    }
    let el = document.createElement('div');
    let obj = bind(Def, el);
    expect(obj.ariaCan('foo')).toBe(false);
    el.setAttribute('data-enabled', '');
    expect(obj.ariaCan('foo')).toBe(true);
  });

});

describe('cast', () => {

  test('cast returns the bound object for a matching sprocket', () => {
    class Def extends sprockets.RoleType {}
    Def.prototype.role = 'widget';
    let el = document.createElement('div');
    let binding = Binding.attachBinding(Def, el);
    let result = sprockets.cast(el, Def);
    expect(result).toBe(binding.object);
  });

  test('cast returns the bound object when cast to a base type', () => {
    class Base extends sprockets.RoleType {}
    Base.prototype.role = 'base';
    class Sub extends Base {}
    Sub.prototype.role = 'sub';
    let el = document.createElement('div');
    let binding = Binding.attachBinding(Sub, el);
    let result = sprockets.cast(el, Base);
    expect(result).toBe(binding.object);
  });

  test('cast throws when element has no binding', () => {
    class Def extends sprockets.RoleType {}
    let el = document.createElement('div');
    expect(() => sprockets.cast(el, Def)).toThrow();
  });

  test('cast throws when bound sprocket does not match requested type', () => {
    class A extends sprockets.RoleType {}
    A.prototype.role = 'a';
    class B extends sprockets.RoleType {}
    B.prototype.role = 'b';
    let el = document.createElement('div');
    Binding.attachBinding(A, el);
    expect(() => sprockets.cast(el, B)).toThrow('not compatible');
  });

  test('cast with RoleType succeeds for any bound element', () => {
    class Def extends sprockets.RoleType {}
    Def.prototype.role = 'anything';
    let el = document.createElement('div');
    let binding = Binding.attachBinding(Def, el);
    let result = sprockets.cast(el, sprockets.RoleType);
    expect(result).toBe(binding.object);
  });

});

describe('element.$', () => {

  test('element.$ returns the bound sprocket object', () => {
    class Def extends sprockets.RoleType {}
    Def.prototype.role = 'widget';
    let el = document.createElement('div');
    document.body.appendChild(el);
    let binding = Binding.attachBinding(Def, el);
    expect(el.$).toBe(binding.object);
    el.remove();
  });

  test('element.$ on unbound element lazily attaches via fallback rule', () => {
    let el = document.createElement('div');
    document.body.appendChild(el);
    let obj = el.$;
    expect(obj).toBeDefined();
    el.remove();
  });

});
