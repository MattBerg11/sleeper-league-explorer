import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

export type { SupabaseClient }

/** Create a Supabase client with explicit URL and key */
export function createSupabaseClient(url: string, key: string): SupabaseClient {
  return createClient(url, key)
}