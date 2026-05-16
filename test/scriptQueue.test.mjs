import { describe, test, expect } from 'vitest';

const SCRIPT_SUPPORTS_ASYNC = (document.createElement('script').async === true);

describe('modern browser assumptions', () => {

  test('SCRIPT_SUPPORTS_ASYNC is true', () => {
    expect(SCRIPT_SUPPORTS_ASYNC).toBe(true);
  });

});
