import { pgTable, uuid, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';

// ==========================================
// 🏢 Organizations
// ==========================================
export const organizations = pgTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  nameFa: text('name_fa'),
  code: text('code'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// 👥 Personnel
// ==========================================
export const personnel = pgTable('personnel', {
  id: uuid('id').primaryKey().defaultRandom(),
  nationalId: text('national_id').notNull().unique(),
  fullName: text('full_name').notNull(),
  fullNamePrefixed: text('full_name_prefixed'),
  mobile: text('mobile'),
  birthDate: text('birth_date'),
  gender: text('gender'),
  organizationId: text('organization_id').references(() => organizations.id),
  position: text('position'),
  department: text('department'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// 👤 Users (Accounts)
// ==========================================
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  nationalId: text('national_id').notNull().unique(),
  email: text('email'),
  phone: text('phone'),
  fullName: text('full_name').notNull(),
  role: text('role').notNull().default('user'),
  isActive: boolean('is_active').notNull().default(true),
  permissions: jsonb('permissions').$type<string[]>().default([]),
  deniedPermissions: jsonb('denied_permissions').$type<string[]>().default([]),

  // 🔐 Password
  passwordHash: text('password_hash'),
  passwordSalt: text('password_salt'),

  // 🔐 PIN (future / OTP)
  pinHash: text('pin_hash'),
  pinSalt: text('pin_salt'),

  // 🔒 Security
  loginFailures: integer('login_failures').default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),

  // 🧭 Activity
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// 📊 Body Analysis Records
// ==========================================
export const bodyAnalyses = pgTable('body_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  nationalId: text('national_id').notNull(),
  fullName: text('full_name'),
  mobile: text('mobile'),
  gender: text('gender'),
  age: integer('age'),

  weight: text('weight'),
  height: text('height'),
  bmi: text('bmi'),
  bodyFatPercentage: text('body_fat_percentage'),
  skeletalMuscleMass: text('skeletal_muscle_mass'),
  visceralFatLevel: text('visceral_fat_level'),
  basalMetabolicRate: text('basal_metabolic_rate'),
  bodyWater: text('body_water'),
  proteinMass: text('protein_mass'),
  mineralMass: text('mineral_mass'),

  rawData: jsonb('raw_data').$type<Record<string, any>>(),

  // 🔁 Idempotency for offline-first sync
  idempotencyKey: text('idempotency_key'),

  analyzedAt: timestamp('analyzed_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// 🍽️ Meals
// ==========================================
export const meals = pgTable('meals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  type: text('type').notNull(),
  date: text('date').notNull(),
  time: text('time').notNull(),
  name: text('name'),

  calories: integer('calories').notNull(),
  protein: integer('protein').notNull(),
  carbs: integer('carbs').notNull(),
  fat: integer('fat').notNull(),

  items: jsonb('items').$type<any[]>().default([]),

  loggedAt: timestamp('logged_at', { withTimezone: true }).defaultNow().notNull(),

  // 🔁 Idempotency for offline-first sync
  idempotencyKey: text('idempotency_key'),

  // 🗑️ Soft delete
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ==========================================
// 📝 Audit Logs
// ==========================================
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(),
  actorId: text('actor_id').notNull(),
  targetId: text('target_id'),
  meta: text('meta'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// ⚙️ System Settings
// ==========================================
export const systemSettings = pgTable('system_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  value: jsonb('value').$type<any>().notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// 📦 Type Exports
// ==========================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

export type Personnel = typeof personnel.$inferSelect;
export type NewPersonnel = typeof personnel.$inferInsert;

export type BodyAnalysis = typeof bodyAnalyses.$inferSelect;
export type NewBodyAnalysis = typeof bodyAnalyses.$inferInsert;

export type Meal = typeof meals.$inferSelect;
export type NewMeal = typeof meals.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export type SystemSetting = typeof systemSettings.$inferSelect;
export type NewSystemSetting = typeof systemSettings.$inferInsert;