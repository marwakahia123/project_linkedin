import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";
import { unipileClient, isUnipileConfigured } from "@/src/lib/unipile/client";

export const maxDuration = 30;

/**
 * GET /api/linkedin/inbox/messages?chat_id=xxx
 * Messages d'une conversation (uniquement celles initiées par l'app).
 */
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chat_id");
    if (!chatId) {
      return NextResponse.json({ error: "chat_id requis" }, { status: 400 });
    }

    const messagesResp = (await unipileClient.messaging.getAllMessagesFromChat({
      chat_id: chatId,
      limit: 100,
    })) as { items?: Array<{ id?: string; body?: string; text?: string; date?: string; timestamp?: string; sender_id?: string; is_sender?: number }> };

    const attendees = (await unipileClient.messaging.getAllAttendeesFromChat(
      chatId
    )) as { items?: Array<{ provider_id?: string; name?: string; is_self?: number; picture_url?: string; profile_url?: string }> };
    const myProviderId = attendees.items?.find((a) => a.is_self === 1)?.provider_id;

    const items = (messagesResp.items ?? []).map((m, idx) => ({
      id: m.id ?? `msg-${chatId}-${idx}-${m.timestamp ?? m.date ?? idx}`,
      body: m.text ?? m.body ?? "",
      date: m.timestamp ?? m.date ?? null,
      isFromMe: m.is_sender === 1 || (!!myProviderId && m.sender_id === myProviderId),
    }));

    items.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return da - db;
    });

    const prospect = attendees.items?.find((a) => a.is_self === 0);

    return NextResponse.json({
      messages: items,
      prospect: prospect
        ? { name: prospect.name, picture_url: prospect.picture_url, profile_url: prospect.profile_url }
        : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[LinkedIn inbox messages] Erreur:", err);
    return NextResponse.json(
      { error: "Échec chargement messages: " + message },
      { status: 500 }
    );
  }
}
