/**
 * ─────────────────────────────────────────────────────────────
 *  ژرفا · تست‌رانر سبک (L-08)
 *  بدون نیاز به Jest/Vitest — در مرورگر اجرا می‌شود.
 * ─────────────────────────────────────────────────────────────
 */

export interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

export interface Expectation {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toBeTruthy: () => void;
  toBeFalsy: () => void;
  toBeNull: () => void;
  toBeUndefined: () => void;
  toBeGreaterThan: (n: number) => void;
  toBeLessThan: (n: number) => void;
  toContain: (v: unknown) => void;
  toHaveLength: (n: number) => void;
  toThrow: () => void;
}

export function expect(actual: unknown): Expectation {
  const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  return {
    toBe(expected) {
      if (!Object.is(actual, expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected) {
      if (!eq(actual, expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeTruthy() {
      if (!actual) throw new Error(`Expected truthy, got ${JSON.stringify(actual)}`);
    },
    toBeFalsy() {
      if (actual) throw new Error(`Expected falsy, got ${JSON.stringify(actual)}`);
    },
    toBeNull() {
      if (actual !== null) throw new Error(`Expected null, got ${JSON.stringify(actual)}`);
    },
    toBeUndefined() {
      if (actual !== undefined) throw new Error(`Expected undefined, got ${JSON.stringify(actual)}`);
    },
    toBeGreaterThan(n) {
      if (typeof actual !== 'number' || !(actual > n)) {
        throw new Error(`Expected ${actual} > ${n}`);
      }
    },
    toBeLessThan(n) {
      if (typeof actual !== 'number' || !(actual < n)) {
        throw new Error(`Expected ${actual} < ${n}`);
      }
    },
    toContain(v) {
      if (Array.isArray(actual)) {
        if (!actual.includes(v as any)) throw new Error(`Array does not contain ${JSON.stringify(v)}`);
      } else if (typeof actual === 'string') {
        if (!(actual as string).includes(v as string)) throw new Error(`String does not contain ${v}`);
      } else {
        throw new Error(`toContain not supported for ${typeof actual}`);
      }
    },
    toHaveLength(n) {
      if (!Array.isArray(actual) && typeof actual !== 'string') {
        throw new Error(`Cannot check length of ${typeof actual}`);
      }
      if ((actual as any).length !== n) {
        throw new Error(`Expected length ${n}, got ${(actual as any).length}`);
      }
    },
    toThrow() {
      if (typeof actual !== 'function') throw new Error('Expected a function');
      try {
        (actual as () => void)();
        throw new Error('Expected function to throw, but it did not');
      } catch (e: any) {
        if (e.message === 'Expected function to throw, but it did not') throw e;
      }
    },
  };
}

type TestFn = () => void | Promise<void>;
type Suite = { name: string; cases: { name: string; fn: TestFn }[] };

export async function runSuites(suites: Suite[]): Promise<TestResult[]> {
  const results: TestResult[] = [];
  for (const suite of suites) {
    for (const c of suite.cases) {
      const start = performance.now();
      try {
        await c.fn();
        results.push({
          suite: suite.name,
          name: c.name,
          passed: true,
          durationMs: performance.now() - start,
        });
      } catch (e: any) {
        results.push({
          suite: suite.name,
          name: c.name,
          passed: false,
          error: e?.message || 'Unknown error',
          durationMs: performance.now() - start,
        });
      }
    }
  }
  return results;
}