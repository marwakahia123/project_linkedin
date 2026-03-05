import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const list = Array.isArray(body.prospects) ? body.prospects : [];

    if (list.length === 0) {
      return NextResponse.json(
        { error: "Aucun prospect à sauvegarder" },
        { status: 400 }
      );
    }

    const rows = list
      .filter(
        (p: { linkedin_url?: string }) =>
          p && typeof p.linkedin_url === "string" && p.linkedin_url.trim()
      )
      .map((p: { full_name?: string; job_title?: string; company?: string; linkedin_url?: string; profile_photo?: string | null }) => ({
        user_id: user.id,
        full_name: String(p.full_name ?? "").trim() || "Inconnu",
        job_title: String(p.job_title ?? "").trim() || null,
        company: String(p.company ?? "").trim() || null,
        linkedin_url: String(p.linkedin_url ?? "").trim(),
        profile_photo: p.profile_photo && String(p.profile_photo).trim() ? String(p.profile_photo).trim() : null,
        status: "new",
      }));

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Aucun prospect valide (linkedin_url requis)" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("prospects")
      .insert(rows)
      .select("id");

    if (error) {
      return NextResponse.json(
        { error: "Erreur lors de la sauvegarde: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      saved: data?.length ?? rows.length,
      ids: data?.map((d) => d.id) ?? [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json(
      { error: "Erreur serveur: " + message },
      { status: 500 }
    );
  }
}
