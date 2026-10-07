import { eq, and, isNull, gte, lte, desc, count, sql } from 'drizzle-orm';
import { db } from '../config/db';
import { meals } from '../db/schema';
import { logAudit } from '../lib/audit';
import { AppError } from '../lib/errors';
import type { CreateMealInput } from '../validators/sync.validator';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * ثبت/به‌روزرسانی وعده با idempotency.
 * اگر همان idempotencyKey دوباره بیاید (retry)، رکورد به‌روز می‌شود نه تکراری.
 * owner همیشه از توکن گرفته می‌شود، نه از body → کاربر نمی‌تواند برای دیگری ثبت کند.
 */
export async function upsertMeal(
  userId: string,
  input: CreateMealInput,
  meta: { ip?: string | null; ua?: string | null },
) {
  const m = input.meal;
  const itemsJson = JSON.stringify(m.items ?? []);

  await db.execute(sql`
    INSERT INTO meals
      (user_id, type, date, time, name, calories, protein, carbs, fat, items, logged_at, idempotency_key)
    VALUES
      (${userId}, ${m.type}, ${m.date}, ${m.time}, ${m.name},
       ${Math.round(m.calories)}, ${Math.round(m.protein)}, ${Math.round(m.carbs)}, ${Math.round(m.fat)},
       ${itemsJson}::jsonb, ${m.loggedAt}::timestamptz, ${input.idempotencyKey})
    ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL
    DO UPDATE SET
      type = EXCLUDED.type,
      date = EXCLUDED.date,
      time = EXCLUDED.time,
      name = EXCLUDED.name,
      calories = EXCLUDED.calories,
      protein = EXCLUDED.protein,
      carbs = EXCLUDED.carbs,
      fat = EXCLUDED.fat,
      items = EXCLUDED.items,
      logged_at = EXCLUDED.logged_at
  `);

  await logAudit({
    type: 'meal.upsert',
    actorId: userId,
    meta: `date=${m.date} slot=${m.type}`,
    ...meta,
  });

  return { ok: true };
}

/**
 * لیست وعده‌های خود کاربر (soft-delete رعایت می‌شود).
 */
export async function listMyMeals(
  userId: string,
  from?: string,
  to?: string,
  limit = 200,
  offset = 0,
) {
  const conds = [eq(meals.userId, userId), isNull(meals.deletedAt)];

  if (from) conds.push(gte(meals.date, from));
  if (to) conds.push(lte(meals.date, to));

  const where = and(...conds);

  const [totalRow] = await db.select({ total: count() }).from(meals).where(where);

  const items = await db
    .select()
    .from(meals)
    .where(where)
    .orderBy(desc(meals.date), desc(meals.loggedAt))
    .limit(Math.min(limit, 500))
    .offset(Math.max(offset, 0));

  return { total: totalRow?.total ?? 0, items };
}

/**
 * حذف امن با uuid رکورد.
 * فقط اگر رکورد مال خودش باشد حذف می‌شود.
 */
export async function deleteMyMeal(
  mealId: string,
  userId: string,
  meta: { ip?: string | null; ua?: string | null },
) {
  if (!isUuid(mealId)) {
    throw new AppError('NOT_FOUND', 404);
  }

  const rows = await db
    .update(meals)
    .set({ deletedAt: new Date() })
    .where(and(eq(meals.id, mealId), eq(meals.userId, userId), isNull(meals.deletedAt)))
    .returning({ id: meals.id });

  if (!rows.length) {
    throw new AppError('NOT_FOUND', 404);
  }

  await logAudit({
    type: 'meal.deleted',
    actorId: userId,
    targetId: mealId,
    ...meta,
  });

  return { ok: true };
}

/**
 * حذف امن با idempotencyKey (برای sync آفلاین/آنلاین).
 * اگر رکورد پیدا نشد → NOT_FOUND (transport فرانت آن را موفق می‌داند).
 */
export async function deleteMyMealByKey(
  idempotencyKey: string,
  userId: string,
  meta: { ip?: string | null; ua?: string | null },
) {
  const rows = await db
    .update(meals)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(meals.idempotencyKey, idempotencyKey),
        eq(meals.userId, userId),
        isNull(meals.deletedAt),
      ),
    )
    .returning({ id: meals.id });

  if (!rows.length) {
    throw new AppError('NOT_FOUND', 404);
  }

  await logAudit({
    type: 'meal.deleted_by_key',
    actorId: userId,
    meta: `key=${idempotencyKey}`,
    ...meta,
  });

  return { ok: true };
}