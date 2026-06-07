import { describe, it, expect } from 'vitest';
import framer from '../src/Meeko/framer.mjs';

describe('framer.mjs', () => {

  describe('inferChangeset', () => {
    it('converts string to target changeset', () => {
      const result = framer.inferChangeset('http://example.com/page', 'main_frame');
      expect(result).toEqual({
        url: 'http://example.com/page',
        target: 'main_frame'
      });
    });

    it('throws on null partial', () => {
      expect(() => framer.inferChangeset('http://example.com/', null))
        .toThrow('Invalid changeset');
    });

    it('throws on boolean partial', () => {
      expect(() => framer.inferChangeset('http://example.com/', true))
        .toThrow('Invalid changeset');
    });

    it('throws on number partial', () => {
      expect(() => framer.inferChangeset('http://example.com/', 123))
        .toThrow('Invalid changeset');
    });
  });

  describe('compareFramesetScope', () => {
    it('returns true when framesetURL and scope match', () => {
      framer.framesetURL = 'http://example.com/frameset.html';
      framer.scope = 'http://example.com/';
      expect(framer.compareFramesetScope({
        framesetURL: 'http://example.com/frameset.html',
        scope: 'http://example.com/'
      })).toBe(true);
    });

    it('returns false when framesetURL differs', () => {
      framer.framesetURL = 'http://example.com/frameset.html';
      framer.scope = 'http://example.com/';
      expect(framer.compareFramesetScope({
        framesetURL: 'http://example.com/other.html',
        scope: 'http://example.com/'
      })).toBe(false);
    });

    it('returns false when scope differs', () => {
      framer.framesetURL = 'http://example.com/frameset.html';
      framer.scope = 'http://example.com/';
      expect(framer.compareFramesetScope({
        framesetURL: 'http://example.com/frameset.html',
        scope: 'http://example.com/app/'
      })).toBe(false);
    });
  });

  describe('lookup', () => {
    it('returns scope match when no lookup option configured and URL is within scope', () => {
      framer.options = {};
      framer.scope = 'http://example.com/';
      framer.framesetURL = 'http://example.com/frameset.html';
      let result = framer.lookup('http://example.com/page.html');
      expect(result).toEqual({ scope: 'http://example.com/', framesetURL: 'http://example.com/frameset.html' });
    });

    it('returns false when no lookup option configured and URL is outside scope', () => {
      framer.options = {};
      framer.scope = 'http://example.com/app/';
      expect(framer.lookup('http://other.com/page.html')).toBe(false);
    });

    it('returns false when lookup returns null', () => {
      framer.options = { lookup: () => null };
      expect(framer.lookup('http://example.com/')).toBe(false);
    });

    it('returns false when lookup returns false', () => {
      framer.options = { lookup: () => false };
      expect(framer.lookup('http://example.com/')).toBe(false);
    });

    it('converts string result to scope object', () => {
      framer.options = { lookup: () => '/frameset.html' };
      const result = framer.lookup('http://example.com/app/page.html');
      expect(result).toHaveProperty('framesetURL');
      expect(result).toHaveProperty('scope');
      expect(result.framesetURL).toContain('frameset.html');
    });

    it('passes through object result with scope and framesetURL', () => {
      const expected = { scope: 'http://example.com/', framesetURL: 'http://example.com/fs.html' };
      framer.options = { lookup: () => expected };
      expect(framer.lookup('http://example.com/page')).toBe(expected);
    });

    it('throws when object result missing scope', () => {
      framer.options = { lookup: () => ({ framesetURL: '/fs.html' }) };
      expect(() => framer.lookup('http://example.com/')).toThrow('Unexpected result');
    });

    it('throws when object result missing framesetURL', () => {
      framer.options = { lookup: () => ({ scope: '/' }) };
      expect(() => framer.lookup('http://example.com/')).toThrow('Unexpected result');
    });
  });

  describe('config', () => {
    it('merges options', () => {
      framer.options = {};
      framer.config({ lookup: 'test' });
      expect(framer.options.lookup).toBe('test');
    });

    it('does nothing when called with null', () => {
      framer.options = { existing: true };
      framer.config(null);
      expect(framer.options.existing).toBe(true);
    });
  });

});
