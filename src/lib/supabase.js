import { createClient } from "@supabase/supabase-js";
import { createSupabaseRepository } from "./data/repository";

// Supabase client from the Vite env (.env.local, Vercel env vars). The
// publishable key is meant to be public: row level security protects the
// data. Without configuration everything here is null and the app says so.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase =
  url && key
    ? createClient(url, key, {
        auth: { flowType: "pkce", persistSession: true, detectSessionInUrl: true },
      })
    : null;

// Auth port used by AuthGate.
function createSupabaseAuth(client) {
  return {
    // Calls back with the current session right away and on every change.
    onChange(callback) {
      const { data } = client.auth.onAuthStateChange((_event, session) =>
        callback(session),
      );
      return () => data.subscription.unsubscribe();
    },
    async signIn() {
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        // Back to the page she was on (a recipe link keeps working).
        options: { redirectTo: window.location.href },
      });
      if (error) throw error;
    },
    async signOut() {
      await client.auth.signOut();
    },
  };
}

export const auth = supabase ? createSupabaseAuth(supabase) : null;
export const repository = supabase ? createSupabaseRepository(supabase) : null;
