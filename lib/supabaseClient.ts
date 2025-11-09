import { createClient } from '@supabase/supabase-js'


// ===== HARDCODED TEST =====
const supabaseUrl = 'https://kfuopseeqctmxssmcsvh.supabase.co'   // replace with your Supabase URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmdW9wc2VlcWN0bXhzc21jc3ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2ODk2OTYsImV4cCI6MjA3ODI2NTY5Nn0.Z2GbPZJOinz-JMUXPI3KsK7qvkwFB_1Bq8y2EJR2oZI'                          // replace with your Supabase anon key

// No need for the if-checks for this test
export const supabase = createClient(supabaseUrl, supabaseKey)

// import { createClient } from '@supabase/supabase-js'

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
// const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// if (!supabaseUrl) {
//   throw new Error(
//     'Missing env.NEXT_PUBLIC_SUPABASE_URL, see .env.example and create .env.local'
//   )
// }

// if (!supabaseKey) {
//   throw new Error(
//     'Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY, see .env.example and create .env.local'
//   )
// }

// export const supabase = createClient(supabaseUrl, supabaseKey)



