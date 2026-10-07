import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from '../config/db';
import { env } from '../config/env';

async function runMigration() {
  console.log('🔄 Starting database migration...');
  
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();