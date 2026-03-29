require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { GoogleAuth } = require('google-auth-library');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getAccessToken() {
  const keyStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
  if (!keyStr) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 not set');
  const key = JSON.parse(Buffer.from(keyStr, 'base64').toString());
  const auth = new GoogleAuth({ credentials: key, scopes: ['https://www.googleapis.com/auth/firebase.messaging'] });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return { token: token.token, projectId: key.project_id };
}

async function sendPush(fcmToken, opts) {
  const { token, projectId } = await getAccessToken();
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token: fcmToken,
        notification: { title: opts.title, body: opts.body },
        data: opts.data || {},
        android: { priority: 'high', notification: { channel_id: 'default' } },
      }
    })
  });
  return { success: res.ok, status: res.status };
}

(async () => {
  const { data: shifts } = await supabase
    .from('daily_shifts')
    .select('id, member_id, start_time, clients(company_name)')
    .eq('work_date', '2026-03-28');

  if (!shifts || shifts.length === 0) { console.log('배정 없음'); return; }

  const { data: tokens } = await supabase
    .from('device_tokens')
    .select('member_id, fcm_token');

  console.log(`등록된 기기: ${tokens?.length || 0} / 배정: ${shifts.length}`);
  if (!tokens || tokens.length === 0) { console.log('FCM 토큰 없음'); return; }

  const tokenMap = {};
  for (const t of tokens) {
    if (!tokenMap[t.member_id]) tokenMap[t.member_id] = [];
    tokenMap[t.member_id].push(t.fcm_token);
  }

  let sent = 0;
  for (const shift of shifts) {
    const fcmTokens = tokenMap[shift.member_id];
    if (!fcmTokens) continue;
    const companyName = shift.clients?.company_name || '근무지';
    const timeStr = shift.start_time.slice(0, 5);
    for (const fcmToken of fcmTokens) {
      const r = await sendPush(fcmToken, {
        title: '출근 예정이신가요?',
        body: `${companyName} ${timeStr} 출근 — 터치하여 출근 의사를 알려주세요.`,
        data: { action: 'confirm_attendance', shiftId: shift.id, url: '/my/attendance' }
      });
      console.log(shift.member_id.substring(0, 8), companyName, r.success ? 'OK' : `FAIL(${r.status})`);
      if (r.success) sent++;
    }
  }
  console.log(`발송: ${sent}`);
})();
