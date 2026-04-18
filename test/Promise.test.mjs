import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));

describe('Native Promise error handling', () => {
  let unhandledRejections = [];
  let rejectionHandler;

  beforeEach(() => {
    unhandledRejections = [];
    rejectionHandler = (event) => {
      unhandledRejections.push(event.reason);
      event.preventDefault(); // Prevent Vitest from treating as test failure
    };
    window.addEventListener('unhandledrejection', rejectionHandler);
  });

  afterEach(() => {
    window.removeEventListener('unhandledrejection', rejectionHandler);
  });

  test('uncaught errors in then() are logged to console', async () => {
    Promise.resolve(42).then(() => {
      throw new Error('uncaught error');
    });

    await timeout(100);
    expect(unhandledRejections).toHaveLength(1);
    expect(unhandledRejections[0].message).toBe('uncaught error');
  });

  test('errors caught with catch() do not reach console', async () => {
    let caughtError;
    
    Promise.resolve(42)
      .then(() => { throw new Error('caught error'); })
      .catch(e => { caughtError = e; });

    await timeout(100);
    expect(caughtError.message).toBe('caught error');
    expect(unhandledRejections).toHaveLength(0); // Should not be unhandled
  });

  test('errors in Promise constructor without catch are logged to console', async () => {
    new Promise(() => {
      throw new Error('constructor error');
    });

    await timeout(100);
    expect(unhandledRejections).toHaveLength(1);
    expect(unhandledRejections[0].message).toBe('constructor error');
  });

  test('nested promise chain errors are handled', async () => {
    Promise.resolve(1)
      .then(() => Promise.resolve(2))
      .then(() => {
        throw new Error('nested error');
      });

    await timeout(100);
    expect(unhandledRejections).toHaveLength(1);
    expect(unhandledRejections[0].message).toBe('nested error');
  });

  test('Promise.reject() without catch is logged to console', async () => {
    Promise.reject(new Error('rejected error'));

    await timeout(100);
    expect(unhandledRejections).toHaveLength(1);
    expect(unhandledRejections[0].message).toBe('rejected error');
  });

  test('reject() in constructor without catch is logged to console', async () => {
    new Promise((resolve, reject) => {
      reject(new Error('constructor reject error'));
    });

    await timeout(100);
    expect(unhandledRejections).toHaveLength(1);
    expect(unhandledRejections[0].message).toBe('constructor reject error');
  });

});