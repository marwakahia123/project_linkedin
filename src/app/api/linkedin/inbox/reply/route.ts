import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";
import { unipileClient, isUnipileConfigured } from "@/src/lib/unipile/client";

export const maxDuration = 30;

/**
 * POST /api/linkedin/inbox/reply
 * Envoie un message dans une conversation.
 * Body: { chat_id: string, text: string }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    if (!isUnipileConfigured()) {
      return NextResponse.json(
        { error: "Unipile non configuré" },
        { status: 500 }
      );
    }

    const sessionRes = await supabase
      .from("linkedin_sessions")
      .select("unipile_account_id, status")
      .eq("user_id", user.id)
      .single();

    if (
      sessionRes.error ||
      !sessionRes.data?.unipile_account_id ||
      sessionRes.data.status !== "connected"
    ) {
      return NextResponse.json(
        { error: "Connectez votre compte LinkedIn." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const chatId = body.chat_id ?? body.chatId;
    const text = (body.text ?? body.message ?? "").trim();

    if (!chatId || !text) {
      return NextResponse.json(
        { error: "chat_id et text requis" },
        { status: 400 }
      );
    }

    await unipileClient.messaging.sendMessage({
      chat_id: chatId,
      text,
    });

    return NextResponse.json({
      success: true,
      message: "Message envoyé",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[LinkedIn inbox reply] Erreur:", err);
    return NextResponse.json(
      { error: "Échec envoi: " + message },
      { status: 500 }
    );
  }
}
