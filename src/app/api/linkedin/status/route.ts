import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { data: session, error } = await supabase
      .from("linkedin_sessions")
      .select("id, status, updated_at, account_restricted, unipile_account_id")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      const hint = error.code === "42703" || error.message?.includes("column")
        ? " Exécutez les migrations Supabase : supabase db push"
        : "";
      return NextResponse.json(
        { error: error.message + hint },
        { status: 500 }
      );
    }

    const connected = !!session && session.status === "connected" && !!session.unipile_account_id;
    return NextResponse.json({
      connected,
      status: session?.status ?? "disconnected",
      updated_at: session?.updated_at ?? null,
      account_restricted: session?.account_restricted ?? false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json(
      { error: "Erreur serveur: " + msg },
      { status: 500 }
    );
  }
}
