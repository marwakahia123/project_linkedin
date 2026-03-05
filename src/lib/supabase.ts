/**
 * Client navigateur uniquement (pour éviter d'importer next/headers dans les Client Components).
 * Pour le serveur, importez depuis '@/src/lib/supabase/server'.
 */
export { createClient } from './supabase/client';
