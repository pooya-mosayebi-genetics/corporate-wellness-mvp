import { eq, and, desc, count, sql } from 'drizzle-orm';
import { db } from '../config/db';
import { bodyAnalyses } from '../db/schema';
import { logAudit } from '../lib/audit';
import type { CreateAnalysisInput } from '../validators/sync.validator';

/** ثبت آنالیز با idempotency (Gap ۱). nationalId از توکن، نه body. */
export async function upsertAnalysis(
  nationalId: string,
  input: CreateAnalysisInput,
  meta: { ip?: string | null; ua?: string | null }
) {
  const r = input.record;
  await db.execute(sql`
    INSERT INTO body_analyses
      (national_id, full_name, mobile, gender, age, weight, height, bmi,
       body_fat_percentage, skeletal_muscle_mass, visceral_fat_level, basal_metabolic_rate,
       body_water, protein_mass, mineral_mass, raw_data, analyzed_at, idempotency_key)
    VALUES
      (${nationalId}, ${r.fullName ?? null}, ${r.mobile ?? null}, ${r.gender ?? null},
       ${r.age ?? null}, ${r.weight ?? null}, ${r.height ?? null}, ${r.bmi ?? null},
       ${r.bodyFatPercentage ?? null}, ${r.skeletalMuscleMass ?? null}, ${r.visceralFatLevel ?? null},
       ${r.basalMetabolicRate ?? null}, ${r.bodyWater ?? null}, ${r.proteinMass ?? null}, ${r.mineralMass ?? null},
       ${JSON.stringify(r.rawData ?? {})}::jsonb,
       COALESCE(${r.analyzedAt ?? null}::timestamptz, NOW()), ${input.idempotencyKey})
    ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL
    DO UPDATE SET
      weight = EXCLUDED.weight, height = EXCLUDED.height, bmi = EXCLUDED.bmi,
      body_fat_percentage = EXCLUDED.body_fat_percentage, skeletal_muscle_mass = EXCLUDED.skeletal_muscle_mass,
      visceral_fat_level = EXCLUDED.visceral_fat_level, basal_metabolic_rate = EXCLUDED.basal_metabolic_rate,
      body_water = EXCLUDED.body_water, protein_mass = EXCLUDED.protein_mass, mineral_mass = EXCLUDED.mineral_mass,
      raw_data = EXCLUDED.raw_data, analyzed_at = EXCLUDED.analyzed_at
  `);

  await logAudit({ type: 'analysis.upsert', actorId: nationalId, ...meta });
  return { ok: true };
}

/** لیست آنالیزهای خود کاربر (جدیدترین اول). */
export async function listMyAnalyses(nationalId: string, limit = 100, offset = 0) {
  const where = eq(bodyAnalyses.nationalId, nationalId);
  const [totalRow] = await db.select({ total: count() }).from(bodyAnalyses).where(where);
  const items = await db
    .select()
    .from(bodyAnalyses)
    .where(where)
    .orderBy(desc(bodyAnalyses.analyzedAt))
    .limit(Math.min(limit, 500))
    .offset(Math.max(offset, 0));
  return { total: totalRow?.total ?? 0, items };
}