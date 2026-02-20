const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addAdminRecord() {
  console.log('🔧 admins 테이블에 관리자 추가 중...\n');

  const userId = 'dfba4c76-5db7-40a4-b141-1900b00031f1'; // 이미 생성된 Supabase Auth 사용자 ID
  const email = 'admin@admin.humend.hr';

  try {
    const { error } = await supabase
      .from('admins')
      .upsert({
        id: userId,
        email: email,
        name: '시스템 관리자',
        role: 'admin'
      }, {
        onConflict: 'id'
      });

    if (error) throw error;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ 관리자 계정 설정 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 이메일: ${email}`);
    console.log(`🆔 아이디: admin`);
    console.log(`🔑 비밀번호: admin123`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ 이제 로그인할 수 있습니다!');

  } catch (error) {
    console.error('❌ 오류:', error.message);
    process.exit(1);
  }
}

addAdminRecord();
