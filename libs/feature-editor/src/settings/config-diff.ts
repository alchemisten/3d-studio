import { isRecord } from '../record';

const isPlain = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));

/** Structural equality of JSON-like values; class instances and functions compare by identity. */
export const deepEqual = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => deepEqual(item, b[index]));
  }
  if (isPlain(a) && isPlain(b)) {
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((key) => key in b && deepEqual(a[key], b[key]));
  }
  return false;
};

/**
 * The overrides that turn `baseline` into `next`: every key of `next` whose value differs. Storing only
 * these keeps a feature's saved config minimal, and a value set back to its default disappears from it.
 */
export const diffConfig = (baseline: Record<string, unknown>, next: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(next).filter(([key, value]) => value !== undefined && !deepEqual(baseline[key], value)),
  );
