import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/src/lib/supabase/admin";

/**
 * Webhook Unipile : reçoit les notifications quand un compte LinkedIn est connecté via Hosted Auth.
 * Payload : { status: "CREATION_SUCCESS" | "RECONNECTED", account_id: string, name: string }
 * Le champ "name" contient le user_id Supabase passé lors de la création du lien.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { status, account_id, name } = body as {
      status?: string;
      account_id?: string;
      name?: string;
    };

    if (!account_id || !name) {
      console.warn("[LinkedIn webhook] Payload invalide:", body);
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const isSuccess =
      status === "CREATION_SUCCESS" || status === "RECONNECTED";
    if (!isSuccess) {
      console.log("[LinkedIn webhook] Statut ignoré:", status);
      return NextResponse.json({ ok: true });
    }

    const supabase = createSupabaseAdmin();

    const { error } = await supabase.from("linkedin_sessions").upsert(
      {
        user_id: name,
        unipile_account_id: account_id,
        status: "connected",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      console.error("[LinkedIn webhook] Erreur Supabase:", error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    console.log("[LinkedIn webhook] Session enregistrée:", { user_id: name, account_id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[LinkedIn webhook] Erreur:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
