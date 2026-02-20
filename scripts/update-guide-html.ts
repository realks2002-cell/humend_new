import { createClient } from '@supabase/supabase-js'
import { PREPARATION_GUIDE_HTML } from '../src/app/admin/clients/preparation-guide-html'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  const { data, error, count } = await supabase
    .from('clients')
    .update({ work_guidelines: PREPARATION_GUIDE_HTML })
    .not('work_guidelines', 'is', null)
    .neq('work_guidelines', '')
    .select('id, company_name')

  if (error) {
    console.error('Update failed:', error.message)
    process.exit(1)
  }

  console.log(`Updated ${data?.length ?? 0} client(s):`)
  data?.forEach((c) => console.log(`  - [${c.id}] ${c.company_name}`))
}

main()
