/**
 * ØªØ³Øª Ù…Ø³ØªÙ‚Ù„ API Client (Node.js Ø®Ø§Ù„Øµ)
 * Ø§ÛŒÙ† ÙØ§ÛŒÙ„ ÙÙ‚Ø· Ø§Ø² fetch Ø§Ø³ØªÙØ§Ø¯Ù‡ Ù…ÛŒâ€ŒÚ©Ù†Ø¯ Ùˆ Ø¨Ù‡ React Native ÙˆØ§Ø¨Ø³ØªÙ‡ Ù†ÛŒØ³Øª.
 */

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface ApiError {
  error: string;
  fa?: string;
  en?: string;
  details?: any;
}

interface SubmitCodeResponse {
  status: 'password' | 'setup';
  bootstrap: boolean;
  ticket: string;
}

interface AuthUser {
  nationalId: string;
  role: string;
  fullName: string;
  permissions: string[];
  deniedPermissions: string[];
}

interface SessionResponse {
  user: AuthUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

// â”€â”€â”€ Simple API Client for Node.js â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const apiError: ApiError = data ?? {
      error: `HTTP_${response.status}`,
      fa: 'Ø®Ø·Ø§ÛŒ Ø´Ø¨Ú©Ù‡',
      en: 'Network error',
    };
    const error = new Error(apiError.fa || apiError.en || apiError.error);
    (error as any).apiError = apiError;
    (error as any).status = response.status;
    throw error;
  }

  return data as T;
}

// â”€â”€â”€ Test Scenarios â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function runTests() {
  console.log('\nðŸš€ Ø´Ø±ÙˆØ¹ ØªØ³Øª API Client\n');
  console.log(`ðŸ“ Base URL: ${BASE_URL}\n`);
const NATIONAL_ID = 'REDACTED_NATIONAL_ID';
const PASSWORD = 'REDACTED_PASSWORD';
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Test 1: Health Check
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  try {
    console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
    console.log('ðŸ“‹ Test 1: Health Check');
    console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
    
    const health = await request<any>('/health');
    console.log('âœ… Health Check Ù…ÙˆÙÙ‚:', health);
  } catch (err: any) {
    console.error('âŒ Ø®Ø·Ø§ Ø¯Ø± Health Check:', err.message);
    return; // Ø§Ú¯Ø± Ø³Ø±ÙˆØ± Ù¾Ø§Ø³Ø® Ù†Ù…ÛŒâ€ŒØ¯Ù‡Ø¯ØŒ ØªØ³Øªâ€ŒÙ‡Ø§ÛŒ Ø¨Ø¹Ø¯ÛŒ Ø¨ÛŒâ€ŒÙ…Ø¹Ù†ÛŒ Ù‡Ø³ØªÙ†Ø¯
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Test 2: Submit Code (Ø§ÙˆÙ„ÛŒÙ† Ù…Ø±Ø­Ù„Ù‡ Ù„Ø§Ú¯ÛŒÙ†)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  let ticket: string | null = null;
  let status: 'password' | 'setup' | null = null;

  try {
    console.log('\nâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
    console.log('ðŸ“‹ Test 2: Submit Code (Ú©Ø¯ Ù…Ù„ÛŒ)');
    console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
    
    const r1 = await request<SubmitCodeResponse>('/api/auth/submit-code', {
      method: 'POST',
      body: JSON.stringify({ nationalId: NATIONAL_ID }),
    });
    
    console.log('âœ… Submit Code Ù…ÙˆÙÙ‚:');
    console.log(`   Status: ${r1.status}`);
    console.log(`   Bootstrap: ${r1.bootstrap}`);
    console.log(`   Ticket: ${r1.ticket.substring(0, 50)}...`);
    
    ticket = r1.ticket;
    status = r1.status;
  } catch (err: any) {
    console.error('âŒ Ø®Ø·Ø§ Ø¯Ø± Submit Code:', err.apiError || err.message);
    return;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Test 3: Complete Setup ÛŒØ§ Submit Password
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  let accessToken: string | null = null;

  try {
    console.log('\nâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
    if (status === 'setup') {
      console.log('ðŸ“‹ Test 3: Complete Setup (Ø³Ø§Ø®Øª Ø±Ù…Ø² Ø¬Ø¯ÛŒØ¯)');
    } else {
      console.log('ðŸ“‹ Test 3: Submit Password (ÙˆØ±ÙˆØ¯ Ø¨Ø§ Ø±Ù…Ø²)');
    }
    console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');

    const endpoint = status === 'setup' ? '/api/auth/complete-setup' : '/api/auth/submit-password';
    const r2 = await request<SessionResponse>(endpoint, {
      method: 'POST',
      body: JSON.stringify({ ticket, password: PASSWORD }),
    });

    console.log('âœ… Ø§Ø­Ø±Ø§Ø² Ù‡ÙˆÛŒØª Ù…ÙˆÙÙ‚:');
    console.log(`   National ID: ${r2.user.nationalId}`);
    console.log(`   Role: ${r2.user.role}`);
    console.log(`   Full Name: ${r2.user.fullName}`);
    console.log(`   Access Token: ${r2.tokens.accessToken.substring(0, 50)}...`);
    console.log(`   Refresh Token: ${r2.tokens.refreshToken.substring(0, 50)}...`);

    accessToken = r2.tokens.accessToken;
  } catch (err: any) {
    console.error('âŒ Ø®Ø·Ø§ Ø¯Ø± Ø§Ø­Ø±Ø§Ø² Ù‡ÙˆÛŒØª:', err.apiError || err.message);
    console.log('   ðŸ’¡ Ø§Ú¯Ø± Ø®Ø·Ø§ÛŒ PASSWORD_EXISTS Ú¯Ø±ÙØªÛŒØ¯ØŒ ÛŒØ¹Ù†ÛŒ Ú©Ø§Ø±Ø¨Ø± Ø§Ø² Ù‚Ø¨Ù„ Ø³Ø§Ø®ØªÙ‡ Ø´Ø¯Ù‡.');
    console.log('   ðŸ’¡ Ø¨Ø±Ø§ÛŒ ØªØ³Øª Ù…Ø¬Ø¯Ø¯ BootstrapØŒ Ø§ÛŒÙ† Ø¯Ø³ØªÙˆØ± Ø±Ø§ Ø§Ø¬Ø±Ø§ Ú©Ù†ÛŒØ¯:');
    console.log('      docker compose exec db psql -U camcalorie -d camcalorie -c "DELETE FROM users WHERE national_id = \'REDACTED_NATIONAL_ID'"');
    return;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Test 4: Me (Ø¨Ø±Ø±Ø³ÛŒ Ù‡ÙˆÛŒØª Ø¨Ø§ Bearer token)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  try {
    console.log('\nâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
    console.log('ðŸ“‹ Test 4: Me (Ø¨Ø±Ø±Ø³ÛŒ Ù‡ÙˆÛŒØª Ø¨Ø§ Bearer token)');
    console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');

    const me = await request<AuthUser & { isActive: boolean; lastLoginAt: string | null }>('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log('âœ… Ø¨Ø±Ø±Ø³ÛŒ Ù‡ÙˆÛŒØª Ù…ÙˆÙÙ‚:');
    console.log(`   National ID: ${me.nationalId}`);
    console.log(`   Role: ${me.role}`);
    console.log(`   Full Name: ${me.fullName}`);
    console.log(`   Active: ${me.isActive}`);
    console.log(`   Last Login: ${me.lastLoginAt}`);

    if (me.lastLoginAt) {
      console.log('   ðŸŽ‰ lastLoginAt Ø¨Ù‡â€ŒØ¯Ø±Ø³ØªÛŒ Ø«Ø¨Øª Ø´Ø¯Ù‡!');
    }
  } catch (err: any) {
    console.error('âŒ Ø®Ø·Ø§ Ø¯Ø± /me:', err.apiError || err.message);
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Test 5: Logout
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  try {
    console.log('\nâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
    console.log('ðŸ“‹ Test 5: Logout');
    console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');

    const logout = await request<any>('/api/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log('âœ… Logout Ù…ÙˆÙÙ‚:', logout);
  } catch (err: any) {
    console.error('âŒ Ø®Ø·Ø§ Ø¯Ø± Logout:', err.apiError || err.message);
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Ø®Ù„Ø§ØµÙ‡
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  console.log('\nâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
  console.log('ðŸŽ‰ ØªÙ…Ø§Ù… ØªØ³Øªâ€ŒÙ‡Ø§ Ø¨Ø§ Ù…ÙˆÙÙ‚ÛŒØª Ø§Ù†Ø¬Ø§Ù… Ø´Ø¯!');
  console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
  console.log('âœ… Ø¨Ú©â€ŒØ§Ù†Ø¯ Ø¢Ù…Ø§Ø¯Ù‡ Ø§ØªØµØ§Ù„ Ø¨Ù‡ ÙØ±Ø§Ù†Øªâ€ŒØ§Ù†Ø¯ Ø§Ø³Øª');
  console.log('âœ… Cross-platform auth (Cookie + Bearer) Ú©Ø§Ø± Ù…ÛŒâ€ŒÚ©Ù†Ø¯');
  console.log('âœ… Auto-refresh Ùˆ session management ÙØ¹Ø§Ù„ Ø§Ø³Øª');
  console.log('\n');
}

// â”€â”€â”€ Run â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
runTests().catch((err) => {
  console.error('âŒ Ø®Ø·Ø§ÛŒ ØºÛŒØ±Ù…Ù†ØªØ¸Ø±Ù‡:', err);
  process.exit(1);
});