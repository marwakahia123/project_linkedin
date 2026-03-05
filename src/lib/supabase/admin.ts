import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase admin (service role) pour les opérations backend sans session utilisateur.
 * Utilisé par le webhook Unipile qui reçoit les notifications sans cookies.
 * Nécessite SUPABASE_SERVICE_ROLE_KEY dans .env.local (ou NEXT_PUBLIC_SUPABASE_ROL_KEY en fallback).
 */
export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ROL_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY (ou NEXT_PUBLIC_SUPABASE_ROL_KEY) requis pour le client admin"
    );
  }
  return createClient(url, key);
}
