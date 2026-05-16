import { describe, it, expect } from 'vitest';
import formElements, {
  ConfigurableBody,
  ConfigurableForm,
  ConfigurableInput,
  ConfigurableTextarea,
  ConfigurableFieldset,
  ConfigurableSelect,
  ConfigurableButton
} from '../src/Meeko/formElements.mjs';
import configData from '../src/Meeko/configData.mjs';

const namedExports = {
  ConfigurableBody,
  ConfigurableForm,
  ConfigurableInput,
  ConfigurableTextarea,
  ConfigurableFieldset,
  ConfigurableSelect,
  ConfigurableButton
};

describe('formElements', () => {
  it('default export has register method', () => {
    expect(typeof formElements.register).toBe('function');
  });

  describe('named exports', () => {
    Object.entries(namedExports).forEach(([name, Interface]) => {
      describe(name, () => {
        it('is defined', () => {
          expect(Interface).toBeDefined();
        });

        it('is a callable sprocket constructor', () => {
          expect(typeof Interface).toBe('function');
        });

        it('has a prototype', () => {
          expect(Interface.prototype).toBeDefined();
        });

        it('has an attached method', () => {
          expect(typeof Interface.attached).toBe('function');
        });
      });
    });
  });

  describe('event handler wiring', () => {
    it('ConfigurableForm.attached wires handlers from config', () => {
      const el = document.createElement('form');
      el.setAttribute('config', 'test-form-config');

      configData.set('test-form-config', { onsubmit: () => {} });

      const handlers = [];
      const obj = Object.create(ConfigurableForm.prototype);
      obj.element = el;
      ConfigurableForm.attached.call(obj, handlers);

      expect(handlers.length).toBeGreaterThan(0);
      expect(handlers.some(h => h.type === 'submit')).toBe(true);
    });
  });
});
