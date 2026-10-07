/**
 * Emergency Admin Password Reset Script
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Ø§ÛŒÙ† Ø§Ø³Ú©Ø±ÛŒÙ¾Øª Ø±Ù…Ø² Ø³ÙˆÙ¾Ø± Ø§Ø¯Ù…ÛŒÙ† Ø±Ø§ Ù…Ø³ØªÙ‚ÛŒÙ…Ø§Ù‹ Ø¯Ø± Ø¯ÛŒØªØ§Ø¨ÛŒØ³ Ø¨Ø§Ø²Ù†Ø´Ø§Ù†ÛŒ Ù…ÛŒâ€ŒÚ©Ù†Ø¯.
 * ÙÙ‚Ø· Ø¯Ø± Ø´Ø±Ø§ÛŒØ· Ø§Ø¶Ø·Ø±Ø§Ø±ÛŒ ÛŒØ§ ØªÙˆØ³Ø¹Ù‡ Ø§Ø³ØªÙØ§Ø¯Ù‡ Ø´ÙˆØ¯.
 *
 * Ø§Ø³ØªÙØ§Ø¯Ù‡:
 *   npx tsx scripts/reset-password.ts
 */

import { eq } from 'drizzle-orm';
import { db } from '../src/config/db';
import { users } from '../src/db/schema';
import { hashPassword } from '../src/lib/security';
const TARGET_NATIONAL_ID = 'REDACTED_NATIONAL_ID';
const NEW_PASSWORD = 'REDACTED_PASSWORD';
async function main() {
  console.log('\nðŸ” Emergency Admin Password Reset');
  console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
  console.log(`Target national ID: ${TARGET_NATIONAL_ID}`);
  console.log(`New password:       ${NEW_PASSWORD}`);
  console.log('');

  // Û±) Ú†Ú© Ú©Ù† Ú©Ø§Ø±Ø¨Ø± ÙˆØ¬ÙˆØ¯ Ø¯Ø§Ø±Ø¯
  const existing = await db.select().from(users).where(eq(users.nationalId, TARGET_NATIONAL_ID)).limit(1);

  if (!existing.length) {
    console.error('âŒ Ú©Ø§Ø±Ø¨Ø± Ø¨Ø§ Ø§ÛŒÙ† Ú©Ø¯ Ù…Ù„ÛŒ ÙˆØ¬ÙˆØ¯ Ù†Ø¯Ø§Ø±Ø¯.');
    console.log('ðŸ’¡ Ø§Ø¨ØªØ¯Ø§ Ø¯Ø± Ø§Ù¾ Ù„Ø§Ú¯ÛŒÙ† Ú©Ù†ÛŒØ¯ ØªØ§ Bootstrap Ø§Ù†Ø¬Ø§Ù… Ø´ÙˆØ¯.');
    process.exit(1);
  }

  const u = existing[0];
  console.log(`âœ… Ú©Ø§Ø±Ø¨Ø± ÛŒØ§ÙØª Ø´Ø¯: ${u.fullName} (Ù†Ù‚Ø´: ${u.role})`);

  if (u.role !== 'super_admin') {
    console.warn(`âš ï¸  ØªÙˆØ¬Ù‡: Ø§ÛŒÙ† Ú©Ø§Ø±Ø¨Ø± Ù†Ù‚Ø´ "${u.role}" Ø¯Ø§Ø±Ø¯ØŒ Ù†Ù‡ super_admin`);
  }

  // Û²) Ù‡Ø´ Ø¬Ø¯ÛŒØ¯ Ø¨Ø³Ø§Ø²
  console.log('â³ ØªÙˆÙ„ÛŒØ¯ Ù‡Ø´ bcrypt...');
  const newHash = await hashPassword(NEW_PASSWORD);

  // Û³) Ø¨Ù‡â€ŒØ±ÙˆØ²Ø±Ø³Ø§Ù†ÛŒ Ø¯Ø± Ø¯ÛŒØªØ§Ø¨ÛŒØ³ (Ø±Ù…Ø² + Ø±ÙØ¹ Ù‚ÙÙ„ Ø§Ø­ØªÙ…Ø§Ù„ÛŒ)
  await db
    .update(users)
    .set({
      passwordHash: newHash,
      passwordSalt: null,
      loginFailures: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(users.nationalId, TARGET_NATIONAL_ID));

  console.log('');
  console.log('âœ… Ø±Ù…Ø² Ø¨Ø§ Ù…ÙˆÙÙ‚ÛŒØª Ø¨Ø§Ø²Ù†Ø´Ø§Ù†ÛŒ Ø´Ø¯!');
  console.log('');
  console.log('ðŸ“‹ Ø®Ù„Ø§ØµÙ‡:');
  console.log(`   National ID:  ${TARGET_NATIONAL_ID}`);
  console.log(`   New Password: ${NEW_PASSWORD}`);
  console.log(`   Lock Status:  Ù¾Ø§Ú© Ø´Ø¯ (loginFailures=0)`);
  console.log('');
  console.log('â–¶ï¸  Ø­Ø§Ù„Ø§ Ù…ÛŒâ€ŒØªÙˆØ§Ù†ÛŒØ¯ Ø¯Ø± Ø§Ù¾ Ø¨Ø§ Ø§ÛŒÙ† Ø±Ù…Ø² ÙˆØ§Ø±Ø¯ Ø´ÙˆÛŒØ¯ Ùˆ ØªØ³Øªâ€ŒÙ‡Ø§ Ø±Ø§ Ø¯ÙˆØ¨Ø§Ø±Ù‡ Ø§Ø¬Ø±Ø§ Ú©Ù†ÛŒØ¯.');
  console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('âŒ Ø®Ø·Ø§ Ø¯Ø± Ø¨Ø§Ø²Ù†Ø´Ø§Ù†ÛŒ Ø±Ù…Ø²:', err);
  process.exit(1);
});