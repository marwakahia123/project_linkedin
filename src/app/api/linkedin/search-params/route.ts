import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";
import { unipileClient, isUnipileConfigured } from "@/src/lib/unipile/client";

export const maxDuration = 30;

/**
 * Résout un texte libre (ex: "publicitaire", "Paris") en IDs LinkedIn
 * via l'endpoint Unipile GET /linkedin/search/parameters.
 *
 * Query params:
 *   type: "INDUSTRY" | "LOCATION" | "COMPANY" | "SCHOOL" | "FUNCTION"
 *   keywords: texte à rechercher
 *   limit: nombre max de résultats (défaut 10)
 */
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    if (!isUnipileConfigured()) {
      return NextResponse.json({ error: "Unipile non configuré" }, { status: 500 });
    }

    const sessionRes = await supabase
      .from("linkedin_sessions")
      .select("unipile_account_id, status")
      .eq("user_id", user.id)
      .single();

    if (sessionRes.error || !sessionRes.data?.unipile_account_id || sessionRes.data.status !== "connected") {
      return NextResponse.json({ error: "LinkedIn non connecté" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") ?? "").toUpperCase();
    const keywords = (searchParams.get("keywords") ?? "").trim();
    const limit = parseInt(searchParams.get("limit") ?? "10", 10);

    if (!type || !keywords) {
      return NextResponse.json({ error: "type et keywords requis" }, { status: 400 });
    }

    const validTypes = ["INDUSTRY", "LOCATION", "COMPANY", "SCHOOL", "FUNCTION"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `type invalide. Valeurs: ${validTypes.join(", ")}` }, { status: 400 });
    }

    const response = await unipileClient.request.send({
      method: "GET",
      path: ["linkedin", "search", "parameters"],
      parameters: {
        account_id: sessionRes.data.unipile_account_id,
        type,
        keywords,
        limit: String(limit),
      },
      options: { validateRequestPayload: false },
    }) as { items?: Array<{ id: string; title: string }> };

    const items = (response.items ?? []).map((item) => ({
      id: item.id,
      title: item.title,
    }));

    console.log(`[search-params] type=${type} keywords="${keywords}" → ${items.length} résultat(s)`, items.map(i => `${i.id}:${i.title}`).join(", "));

    return NextResponse.json({ items });
  } catch (err) {
    console.error("[search-params] Erreur:", err);
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
