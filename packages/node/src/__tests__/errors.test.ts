import { describe, it, expect } from 'vitest';
import { UnsupportedOperationError, PrinterError } from '../errors.js';

describe('UnsupportedOperationError', () => {
  it('sets name and message', () => {
    const err = new UnsupportedOperationError('not supported');
    expect(err.name).toBe('UnsupportedOperationError');
    expect(err.message).toBe('not supported');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('PrinterError', () => {
  it('sets name, message, and errors array', () => {
    const err = new PrinterError('printer failed', ['Cover open', 'No media']);
    expect(err.name).toBe('PrinterError');
    expect(err.message).toBe('printer failed');
    expect(err.errors).toEqual(['Cover open', 'No media']);
    expect(err).toBeInstanceOf(Error);
  });
});
