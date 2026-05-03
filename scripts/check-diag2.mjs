import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8').split('\n').reduce((a, l) => {
  const m = l.match(/^([^=]+)=(.*)$/);
  if (m) a[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  return a;
}, {});

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: tokens } = await sb.from('device_tokens')
  .select('platform, fcm_token, created_at')
  .eq('member_id', '1e6d3813-dcf7-41cd-ae15-43d60bde517d')
  .order('created_at', { ascending: false });

console.log('=== Tokens ===');
for (const t of tokens || []) {
  console.log(`${t.platform.padEnd(8)} ${t.created_at} ${t.fcm_token.slice(0,30)}...`);
}

const now = new Date();
console.log(`\n=== Current UTC: ${now.toISOString()} ===`);
console.log(`=== Current KST: ${new Date(now.getTime() + 9*3600000).toISOString()} ===`);
