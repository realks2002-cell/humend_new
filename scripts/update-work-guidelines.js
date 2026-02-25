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

const HAIR_NET_CARD = `<div class="item-card">
          <span class="item-icon">💇‍♀️</span>
          <div class="item-name">머리망 · 머리핀</div>
          <div class="item-sub">Hair Net & Pins</div>
        </div>`;

async function updateWorkGuidelines() {
  console.log('🔧 clients 테이블 work_guidelines에 "머리망 · 머리핀" 카드 추가 중...\n');

  try {
    // "스타킹"은 있지만 "머리망"이 없는 행 조회
    const { data: rows, error: selectError } = await supabase
      .from('clients')
      .select('id, company_name, work_guidelines')
      .like('work_guidelines', '%스타킹%')
      .not('work_guidelines', 'like', '%머리망%');

    if (selectError) throw selectError;

    if (!rows || rows.length === 0) {
      console.log('ℹ️  추가 대상 행이 없습니다. (이미 적용되었거나 스타킹 카드가 없음)');
      return;
    }

    console.log(`📋 대상 행: ${rows.length}건\n`);

    // 스타킹 카드의 닫는 </div> 뒤에 머리망·머리핀 카드 삽입
    const stockingCardRegex = /(<div class="item-name">스타킹<\/div>\s*<div class="item-sub">Stockings<\/div>\s*<\/div>)/;

    for (const row of rows) {
      const match = row.work_guidelines.match(stockingCardRegex);
      if (!match) {
        console.log(`⚠️  [${row.company_name}] (${row.id}) 스타킹 카드 패턴을 찾을 수 없어 건너뜀`);
        continue;
      }

      const updated = row.work_guidelines.replace(stockingCardRegex, `$1\n        ${HAIR_NET_CARD}`);

      const { error: updateError } = await supabase
        .from('clients')
        .update({ work_guidelines: updated })
        .eq('id', row.id);

      if (updateError) throw updateError;

      console.log(`✅ [${row.company_name}] (${row.id}) 업데이트 완료`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ 모든 work_guidelines 업데이트 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
}

updateWorkGuidelines();
