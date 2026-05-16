import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8').split('\n').reduce((a, l) => {
  const m = l.match(/^([^=]+)=(.*)$/);
  if (m) a[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  return a;
}, {});

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data } = await sb.from('device_tokens')
  .select('member_id, platform, fcm_token, created_at, updated_at')
  .eq('member_id', '1e6d3813-dcf7-41cd-ae15-43d60bde517d');

for (const t of data || []) {
  console.log(JSON.stringify({
    platform: t.platform,
    fcm_short: t.fcm_token.slice(0,30),
    created_at: t.created_at,
    updated_at: t.updated_at,
    same: t.created_at === t.updated_at,
  }, null, 2));
}
