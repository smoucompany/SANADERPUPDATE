import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env')
const envContent = fs.readFileSync(envPath, 'utf8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY)

async function run() {
  console.log('Fetching accounts...')
  try {
    const { data: accounts, error } = await supabase.from('accounts').select('id,code,name_ar,level,parent_id').limit(10)
    if (error) {
      console.error('Error fetching accounts:', error.message)
      return
    }
    console.log(`Found ${accounts?.length || 0} accounts. Sample:`, accounts)

    console.log('Checking for any other tables...')
    const { data: companies, error: compErr } = await supabase.from('companies').select('id,name_ar')
    if (compErr) {
      console.error('Error fetching companies:', compErr.message)
    } else {
      console.log('Companies:', companies)
    }
  } catch (err) {
    console.error('Exception:', err)
  }
}

run()
