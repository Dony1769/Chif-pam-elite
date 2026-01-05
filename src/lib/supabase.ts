import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ohviqihuuoiwmpckifnt.supabase.co'
const supabaseAnonKey = 'sb_publishable_MxmhGuL4yuXy-GHYjx-K8Q_EpLbmHuO'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)