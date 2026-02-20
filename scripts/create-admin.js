const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdmin() {
  console.log('🔧 관리자 계정 생성 중...\n');

  const adminId = 'admin';
  const password = 'admin123';
  const email = `${adminId}@admin.humend.hr`;

  try {
    // 1. 기존 사용자 확인
    console.log(`📝 이메일: ${email}`);
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    let userId;
    const existingUser = users.find(u => u.email === email);

    if (existingUser) {
      console.log('⚠️  이미 존재하는 계정입니다. 기존 계정을 사용합니다.');
      userId = existingUser.id;
      console.log(`✅ 기존 사용자 ID: ${userId}`);
    } else {
      // 2. Supabase Auth에 사용자 생성
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          admin_id: adminId,
          name: '시스템 관리자',
          role: 'admin'
        }
      });

      if (authError) throw authError;

      userId = authData.user.id;
      console.log(`✅ Supabase Auth 계정 생성 완료`);
      console.log(`   User ID: ${userId}`);
    }

    // 3. admins 테이블에 레코드 추가
    const { error: adminError } = await supabase
      .from('admins')
      .upsert({
        id: userId,
        email: email,
        name: '시스템 관리자',
        role: 'admin'
      }, {
        onConflict: 'id'
      });

    if (adminError) {
      throw adminError;
    }

    console.log(`✅ admins 테이블 레코드 생성 완료\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ 관리자 계정 생성 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 이메일: ${email}`);
    console.log(`🆔 아이디: ${adminId}`);
    console.log(`🔑 비밀번호: ${password}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
}

createAdmin();
