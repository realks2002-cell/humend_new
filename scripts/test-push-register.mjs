import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8').split('\n').reduce((a, l) => {
  const m = l.match(/^([^=]+)=(.*)$/);
  if (m) a[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  return a;
}, {});

// Generate access token via service role
const sbAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// Sign in as the test user via admin generate session
const memberId = '1e6d3813-dcf7-41cd-ae15-43d60bde517d';
const { data: ses } = await sbAdmin.auth.admin.generateLink({
  type: 'magiclink',
  email: 'phone-01034061921@humendhr.app',
});
console.log('Magic link:', ses?.properties?.action_link);

// Or use updateUserById to create temp session - actually just test with hardcoded body
