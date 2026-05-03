import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8').split('\n').reduce((a, l) => {
  const m = l.match(/^([^=]+)=(.*)$/);
  if (m) a[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  return a;
}, {});

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await sb.from('members')
  .select('id, name, phone, location_permission, battery_optimized, last_permission_check, last_active_at, platform, device_manufacturer, device_model, os_version, last_gps_accuracy, last_gps_success, location_services_enabled, disk_free_mb')
  .eq('phone', '01034061921')
  .single();

if (error) console.error(error);
else console.log(JSON.stringify(data, null, 2));
