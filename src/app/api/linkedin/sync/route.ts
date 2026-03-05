import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";
import { unipileClient, isUnipileConfigured } from "@/src/lib/unipile/client";

export const maxDuration = 60;

/**
 * Synchronise les conversations et messages LinkedIn depuis Unipile vers Supabase.
 * À appeler périodiquement (cron, webhook, ou manuellement).
 */
export async function POST() {
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

    if (sessionRes.error || !sessionRes.data?.unipile_account_id || sessionRes.data.status !== "connected") {
      return NextResponse.json(
        { error: "Connectez votre compte LinkedIn." },
        { status: 400 }
      );
    }

    const accountId = sessionRes.data.unipile_account_id;

    const chats = await unipileClient.messaging.getAllChats({
      account_id: accountId,
      account_type: "LINKEDIN",
      limit: 50,
    });

    const items = (chats as { items?: unknown[] }).items ?? [];
    let syncedChats = 0;
    let syncedMessages = 0;

    for (const chat of items) {
      const c = chat as { id?: string; attendees?: Array<{ provider_id?: string }> };
      const chatId = c.id;
      if (!chatId) continue;

      const { data: existingConv } = await supabase
        .from("linkedin_conversations")
        .select("id")
        .eq("user_id", user.id)
        .eq("unipile_chat_id", chatId)
        .single();

      let convId = existingConv?.id;
      if (!convId) {
        const { data: newConv, error: insertErr } = await supabase
          .from("linkedin_conversations")
          .insert({
            user_id: user.id,
            unipile_chat_id: chatId,
            updated_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (insertErr) continue;
        convId = newConv?.id;
        syncedChats++;
      }

      if (!convId) continue;

      const messages = await unipileClient.messaging.getAllMessagesFromChat({
        chat_id: chatId,
      });

      const msgItems = (messages as { items?: unknown[] }).items ?? [];
      for (const msg of msgItems) {
        const m = msg as { id?: string; body?: string; sender_id?: string };
        const msgId = m.id;
        if (!msgId) continue;

        const { data: existingMsg } = await supabase
          .from("linkedin_messages")
          .select("id")
          .eq("conversation_id", convId)
          .eq("unipile_message_id", msgId)
          .single();

        if (!existingMsg) {
          await supabase.from("linkedin_messages").insert({
            conversation_id: convId,
            unipile_message_id: msgId,
            sender_provider_id: m.sender_id ?? null,
            body: m.body ?? null,
            role: "prospect",
          });
          syncedMessages++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      syncedChats,
      syncedMessages,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json(
      { error: "Sync échouée: " + message },
      { status: 500 }
    );
  }
}
