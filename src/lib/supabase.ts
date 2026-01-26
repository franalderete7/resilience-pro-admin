import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Automatically detect and process hash fragments from URL
    // This is important for password reset flows
    detectSessionInUrl: true,
    // Persist session to localStorage
    persistSession: true,
    // Auto-refresh tokens
    autoRefreshToken: true,
    // Flow type - PKCE is more secure
    flowType: 'pkce'
  }
})
