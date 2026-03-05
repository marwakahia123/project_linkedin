import { createBrowserClient } from '@supabase/ssr';

/**
 * Client Supabase pour les Client Components (navigateur).
 * Utilisez ce client dans les composants avec "use client".
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url || !key) {
    console.error('Supabase: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY manquant dans .env.local');
  }
  return createBrowserClient(url, key);
}
