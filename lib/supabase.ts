import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseKey as string, {
      realtime: {
        params: {
          eventsPerSecond: 5
        }
      }
    })
  : null;

export function hasActiveSubscription(status: string, expiresAt?: string | null) {
  return status === "active" && Boolean(expiresAt) && new Date(expiresAt as string).getTime() > Date.now();
}
