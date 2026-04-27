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
});
