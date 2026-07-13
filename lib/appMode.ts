import { isSupabaseConfigured } from "@/lib/supabase";

export const isMockMode = process.env.NEXT_PUBLIC_APP_MODE === "mock" || !isSupabaseConfigured;
export const isBackendMode = !isMockMode;
