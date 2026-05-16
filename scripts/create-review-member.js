const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PHONE = '01099990001';
const PASSWORD = 'Review2026!';
const NAME = '심사용';
const EMAIL = `${PHONE}@member.humend.hr`;

(async () => {
  console.log('🔧 심사용 회원 계정 생성 중...\n');

  // 1) 기존 auth.users 삭제 (있으면)
  const { data: existing } = await supabase.auth.admin.listUsers();
  const found = existing?.users?.find(u => u.email === EMAIL);
  if (found) {
    await supabase.auth.admin.deleteUser(found.id);
    console.log('기존 계정 삭제');
  }

  // 2) auth.users 생성
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (authErr) throw authErr;
  console.log('auth.users 생성:', authData.user.id);

  // 3) members 테이블 등록
  const { error: memErr } = await supabase.from('members').upsert({
    id: authData.user.id,
    phone: PHONE,
    name: NAME,
    email: EMAIL,
    terms_agreed: true,
    privacy_agreed: true,
    location_agreed: true,
    notification_agreed: true,
  }, { onConflict: 'id' });

  if (memErr) {
    console.log('members 컬럼 일부 미존재 → 최소 컬럼만 재시도');
    const { error: retry } = await supabase.from('members').upsert({
      id: authData.user.id,
      phone: PHONE,
      name: NAME,
    }, { onConflict: 'id' });
    if (retry) throw retry;
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ 심사용 계정 생성 완료');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📱 전화번호: ${PHONE}`);
  console.log(`🔑 비밀번호: ${PASSWORD}`);
  console.log(`📧 이메일: ${EMAIL}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
})();
