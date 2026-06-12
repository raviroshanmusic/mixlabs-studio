import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vjvhbukbqklgrllwiliv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqdmhidWticWtsZ3JsbHdpbGl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMzE0MjgsImV4cCI6MjA5NjcwNzQyOH0.NlOUslZynlqSgwOSK6wMm_Yi9qeCRx6S3w2Kkaf9Jus";

// Singleton to avoid multiple instances
let client: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  if (!client) {
    client = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return client;
}
