import { describe, it, expect } from 'vitest';
import { 
  sanitizeAggregatePayload, 
  aggregateRows,
  MIN_CELL_SIZE,
  isDirectIdentifierKey 
} from '../../src/utils/aggregateGuard';

describe('aggregateGuard', () => {
  describe('isDirectIdentifierKey', () => {
    it('detects exact keys', () => {
      expect(isDirectIdentifierKey('nationalId')).toBe(true);
      expect(isDirectIdentifierKey('mobileNumber')).toBe(true);
      expect(isDirectIdentifierKey('email')).toBe(true);
    });

    it('detects suffix patterns', () => {
      expect(isDirectIdentifierKey('userId')).toBe(true);
      expect(isDirectIdentifierKey('clientNationalId')).toBe(true);
    });

    it('ignores non-ID keys', () => {
      expect(isDirectIdentifierKey('age')).toBe(false);
      expect(isDirectIdentifierKey('department')).toBe(false);
      expect(isDirectIdentifierKey('count')).toBe(false);
    });
  });

  describe('sanitizeAggregatePayload', () => {
    it('removes direct identifiers recursively', () => {
      const raw = {
        id: 'rec-1',
        nationalId: '0012345678',
        profile: {
          name: 'Ali',
          email: 'ali@test.com',
          mobile: '+98912...'
        },
        stats: { avgAge: 30 }
      };

      const result = sanitizeAggregatePayload(raw);
      
      expect(result.data.id).toBeDefined();
      expect((result.data as any).nationalId).toBeUndefined();
      expect((result.data.profile as any).name).toBeUndefined();
      expect((result.data.profile as any).email).toBeUndefined();
      expect(result.data.stats.avgAge).toBe(30);
      
      expect(result.removed.length).toBeGreaterThan(0);
    });

    it('suppresses small cells (< MIN_CELL_SIZE)', () => {
      const raw = {
        groups: [
          { key: 'A', count: 3, avgScore: 80 }, // Should be suppressed
          { key: 'B', count: 10, avgScore: 70 }, // OK
        ]
      };

      const result = sanitizeAggregatePayload(raw);
      const groups = (result.data as any).groups;

      expect(groups[0].suppressed).toBe(true);
      expect(groups[0].avgScore).toBeNull();
      expect(groups[0].countLabel).toBe(`<${MIN_CELL_SIZE}`);
      
      expect(groups[1].suppressed).toBeFalsy();
      expect(groups[1].avgScore).toBe(70);
    });
  });

  describe('aggregateRows', () => {
    it('builds safe buckets from raw rows', () => {
      const rows = [
        { dept: 'IT', age: 30, nid: '001' },
        { dept: 'IT', age: 35, nid: '002' },
        { dept: 'HR', age: 40, nid: '003' },
        { dept: 'HR', age: 25, nid: '004' },
        { dept: 'HR', age: 50, nid: '005' },
        { dept: 'Sales', age: 28, nid: '006' }, // Only 1 person -> suppress
      ];

      const buckets = aggregateRows(rows as any[], {
        groupBy: 'dept',
        valueKeys: ['age'],
        minCellSize: 5,
      });

      // 🆕 اصلاح نهایی: چون همه گروه‌ها < 5 هستند، همه suppressed می‌شوند.
      // پس نباید هیچ bucket با label واقعی ('IT', 'HR', ...) داشته باشیم.
      // بلکه همه باید label='—' و countLabel='<5' باشند.
      
      const realLabels = buckets.filter(b => b.label !== '—');
      expect(realLabels.length).toBe(0); // هیچ نام واقعی فاش نشده
      
      const suppressedCount = buckets.filter(b => b.suppressed).length;
      expect(suppressedCount).toBe(3); // IT, HR, Sales هر سه suppressed
      
      // بررسی اینکه مقادیر عددی null شده‌اند
      buckets.forEach(b => {
        if (b.suppressed) {
          expect(b.avg.age).toBeNull();
          expect(b.sum.age).toBeNull();
          expect(b.min.age).toBeNull();
          expect(b.max.age).toBeNull();
          expect(b.countLabel).toBe(`<${MIN_CELL_SIZE}`);
        }
      });
    });

    it('allows large groups (> MIN_CELL_SIZE)', () => {
      const rows = Array.from({ length: 6 }).map((_, i) => ({
        dept: 'Engineering',
        age: 20 + i,
        nid: `00${i}`,
      }));

      const buckets = aggregateRows(rows as any[], {
        groupBy: 'dept',
        valueKeys: ['age'],
        minCellSize: 5,
      });

      // Engineering has 6 people >= 5 -> NOT suppressed
      const engBucket = buckets.find(b => b.key === 'Engineering');
      
      expect(engBucket?.suppressed).toBeFalsy();
      expect(engBucket?.count).toBe(6);
      expect(engBucket?.avg.age).toBeGreaterThan(0);
    });

    it('throws if grouping by direct identifier', () => {
      const rows = [{ nid: '001', val: 10 }];
      
      expect(() => 
        aggregateRows(rows as any[], {
          groupBy: 'nid', // Direct ID!
          valueKeys: ['val'],
        })
      ).toThrow(/direct identifier/i);
    });
  });
});