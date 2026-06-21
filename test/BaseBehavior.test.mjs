import { describe, it, expect, vi } from 'vitest';
import { BaseBehavior } from '../src/Meeko/BaseBehavior.mjs';

function create(html = '<div></div>') {
  let container = document.createElement('div');
  container.innerHTML = html;
  let el = container.firstElementChild;
  document.body.appendChild(el);
  return new BaseBehavior(el);
}

function cleanup(b) { b.element.remove(); }

describe('BaseBehavior', () => {

  describe('attr()', () => {
    it('gets an attribute', () => {
      let b = create('<div data-x="hello"></div>');
      expect(b.attr('data-x')).toBe('hello');
      cleanup(b);
    });

    it('returns null for missing attribute', () => {
      let b = create();
      expect(b.attr('data-x')).toBeNull();
      cleanup(b);
    });

    it('sets an attribute', () => {
      let b = create();
      b.attr('data-x', 'world');
      expect(b.element.getAttribute('data-x')).toBe('world');
      cleanup(b);
    });

    it('removes an attribute when value is null', () => {
      let b = create('<div data-x="hello"></div>');
      b.attr('data-x', null);
      expect(b.element.hasAttribute('data-x')).toBe(false);
      cleanup(b);
    });
  });

  describe('hasClass()', () => {
    it('returns true when class exists', () => {
      let b = create('<div class="foo bar"></div>');
      expect(b.hasClass('foo')).toBe(true);
      expect(b.hasClass('bar')).toBe(true);
      cleanup(b);
    });

    it('returns false when class is missing', () => {
      let b = create('<div class="foo"></div>');
      expect(b.hasClass('bar')).toBe(false);
      cleanup(b);
    });

    it('returns false when no class attribute', () => {
      let b = create();
      expect(b.hasClass('foo')).toBe(false);
      cleanup(b);
    });
  });

  describe('addClass()', () => {
    it('adds a class to empty element', () => {
      let b = create();
      b.addClass('foo');
      expect(b.element.getAttribute('class')).toBe('foo');
      cleanup(b);
    });

    it('appends a class', () => {
      let b = create('<div class="foo"></div>');
      b.addClass('bar');
      expect(b.hasClass('foo')).toBe(true);
      expect(b.hasClass('bar')).toBe(true);
      cleanup(b);
    });

    it('does not duplicate existing class', () => {
      let b = create('<div class="foo"></div>');
      b.addClass('foo');
      expect(b.element.getAttribute('class')).toBe('foo');
      cleanup(b);
    });
  });

  describe('removeClass()', () => {
    it('removes a class', () => {
      let b = create('<div class="foo bar"></div>');
      b.removeClass('foo');
      expect(b.hasClass('foo')).toBe(false);
      expect(b.hasClass('bar')).toBe(true);
      cleanup(b);
    });

    it('does nothing if class not present', () => {
      let b = create('<div class="foo"></div>');
      b.removeClass('bar');
      expect(b.element.getAttribute('class')).toBe('foo');
      cleanup(b);
    });
  });

  describe('toggleClass()', () => {
    it('adds class if missing, returns true', () => {
      let b = create();
      let result = b.toggleClass('foo');
      expect(result).toBe(true);
      expect(b.hasClass('foo')).toBe(true);
      cleanup(b);
    });

    it('removes class if present, returns false', () => {
      let b = create('<div class="foo"></div>');
      let result = b.toggleClass('foo');
      expect(result).toBe(false);
      expect(b.hasClass('foo')).toBe(false);
      cleanup(b);
    });

    it('force true keeps class', () => {
      let b = create('<div class="foo"></div>');
      let result = b.toggleClass('foo', true);
      expect(result).toBe(true);
      expect(b.hasClass('foo')).toBe(true);
      cleanup(b);
    });

    it('force false removes class', () => {
      let b = create('<div class="foo"></div>');
      let result = b.toggleClass('foo', false);
      expect(result).toBe(false);
      expect(b.hasClass('foo')).toBe(false);
      cleanup(b);
    });
  });

  describe('css()', () => {
    it('sets a camelCase style', () => {
      let b = create();
      b.css('color', 'red');
      expect(b.element.style.color).toBe('red');
      cleanup(b);
    });

    it('gets a camelCase style', () => {
      let b = create();
      b.element.style.color = 'blue';
      expect(b.css('color')).toBe('blue');
      cleanup(b);
    });

    it('sets a kebab-case style', () => {
      let b = create();
      b.css('background-color', 'green');
      expect(b.element.style.getPropertyValue('background-color')).toBe('green');
      cleanup(b);
    });

    it('gets a kebab-case style', () => {
      let b = create();
      b.element.style.setProperty('background-color', 'yellow');
      expect(b.css('background-color')).toBe('yellow');
      cleanup(b);
    });

    it('removes style when value is null', () => {
      let b = create();
      b.element.style.color = 'red';
      b.css('color', null);
      expect(b.element.style.color).toBe('');
      cleanup(b);
    });
  });

  describe('trigger()', () => {
    it('dispatches a custom event that bubbles', () => {
      let b = create();
      let fired = false;
      document.body.addEventListener('myevent', () => { fired = true; }, { once: true });
      b.trigger('myevent');
      expect(fired).toBe(true);
      cleanup(b);
    });

    it('returns false when preventDefault is called', () => {
      let b = create();
      b.element.addEventListener('myevent', (e) => e.preventDefault(), { once: true });
      let result = b.trigger('myevent');
      expect(result).toBe(false);
      cleanup(b);
    });

    it('passes detail', () => {
      let b = create();
      let received = null;
      b.element.addEventListener('myevent', (e) => { received = e.detail; }, { once: true });
      b.trigger('myevent', { detail: 'hello' });
      expect(received).toBe('hello');
      cleanup(b);
    });
  });

});
