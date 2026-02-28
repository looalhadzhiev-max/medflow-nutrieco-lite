import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dwehnmcsujfyttjxjylr.supabase.co'
const supabaseAnonKey = 'sb_publishable_FLXZxiBNDIncmFqhgqvnEw_NqIxsBxY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)