import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";
import { unipileClient, isUnipileConfigured } from "@/src/lib/unipile/client";

export const maxDuration = 60;

function extractSlugFromUrl(url: string): string {
  if (!url || typeof url !== "string") return "";
  const match = url.toLowerCase().match(/linkedin\.com\/in\/([^/?\s]+)/);
  return match ? match[1].replace(/\/$/, "").toLowerCase().trim() : "";
}

/**
 * GET /api/linkedin/inbox
 * Liste les conversations avec vos prospects (via unipile_chat_id stocké à l'envoi).
 */
export async function GET() {
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

    const accountId = sessionRes.data.unipile_account_id;

    // Prospects avec unipile_chat_id (message envoyé via l'app) - source fiable
    let prospectsWithChat: Array<{ id: string; full_name: string; linkedin_url: string | null; profile_photo: string | null; unipile_chat_id: string }> = [];
    const res = await supabase
      .from("prospects")
      .select("id, full_name, linkedin_url, profile_photo, unipile_chat_id")
      .eq("user_id", user.id)
      .not("unipile_chat_id", "is", null);

    if (!res.error) {
      prospectsWithChat = (res.data ?? []).filter(
        (p): p is typeof p & { unipile_chat_id: string } => !!p.unipile_chat_id
      );
    }

    const conversations: Array<{
      id: string;
      prospectId: string;
      prospectName: string;
      prospectPhoto: string | null;
      prospectUrl: string | null;
      lastMessage: string | null;
      lastMessageDate: string | null;
      unreadCount: number;
    }> = [];

    for (const prospect of prospectsWithChat) {
      const chatId = prospect.unipile_chat_id;
      if (!chatId) continue;

      try {
        const attendees = (await unipileClient.messaging.getAllAttendeesFromChat(
          chatId
        )) as { items?: Array<{ name?: string; picture_url?: string; profile_url?: string; is_self?: number }> };
        const other = attendees.items?.find((a) => a.is_self === 0);

        let lastMessage: string | null = null;
        let lastMessageDate: string | null = null;
        let unreadCount = 0;
        try {
          const msgs = (await unipileClient.messaging.getAllMessagesFromChat({
            chat_id: chatId,
            limit: 1,
          })) as { items?: Array<{ body?: string; text?: string; date?: string; timestamp?: string }> };
          const m = msgs.items?.[0];
          if (m) {
            lastMessage = m.text ?? m.body ?? null;
            lastMessageDate = m.timestamp ?? m.date ?? null;
          }
        } catch (err) {
          console.error("[inbox] Erreur récup dernier message pour chat", chatId, err);
        }

        conversations.push({
          id: chatId,
          prospectId: prospect.id,
          prospectName: other?.name ?? prospect.full_name,
          prospectPhoto: other?.picture_url ?? prospect.profile_photo,
          prospectUrl: other?.profile_url ?? null,
          lastMessage: lastMessage ? lastMessage.slice(0, 100) + (lastMessage.length > 100 ? "…" : "") : null,
          lastMessageDate,
          unreadCount,
        });
      } catch {
        continue;
      }
    }

    if (conversations.length === 0 && prospectsWithChat.length === 0) {
      const fallbackRes = await supabase
        .from("prospects")
        .select("id, full_name, linkedin_url, profile_photo")
        .eq("user_id", user.id)
        .not("first_message_sent_at", "is", null);
      const fallbackList = fallbackRes.data ?? [];
      if (fallbackList.length > 0) {
        const prospectSlugs = new Map<string, (typeof fallbackList)[0]>();
        for (const p of fallbackList) {
          if (p.linkedin_url) {
            const slug = extractSlugFromUrl(p.linkedin_url);
            if (slug) prospectSlugs.set(slug, p);
          }
        }
        const chats = (await unipileClient.messaging.getAllChats({
          account_id: accountId,
          account_type: "LINKEDIN",
          limit: 100,
        })) as { items?: Array<{ id?: string; chat_id?: string; timestamp?: string; unread_count?: number }> };
        for (const chat of chats.items ?? []) {
          const cid = chat.id ?? chat.chat_id;
          if (!cid) continue;
          try {
            const att = (await unipileClient.messaging.getAllAttendeesFromChat(cid)) as {
              items?: Array<{ name?: string; picture_url?: string; profile_url?: string; is_self?: number }>;
            };
            const other = att.items?.find((a) => a.is_self === 0);
            if (!other?.profile_url) continue;
            const slug = extractSlugFromUrl(other.profile_url);
            const prospect = prospectSlugs.get(slug);
            if (!prospect) continue;
            let lastMessage: string | null = null;
            let lastMessageDate: string | null = chat.timestamp ?? null;
            try {
              const msgs = (await unipileClient.messaging.getAllMessagesFromChat({ chat_id: cid, limit: 1 })) as { items?: Array<{ body?: string; text?: string; date?: string; timestamp?: string }> };
              const m = msgs.items?.[0];
              if (m) {
                lastMessage = m.text ?? m.body ?? null;
                lastMessageDate = m.timestamp ?? m.date ?? lastMessageDate;
              }
            } catch {
              /* ignore */
            }
            conversations.push({
              id: cid,
              prospectId: prospect.id,
              prospectName: other.name ?? prospect.full_name,
              prospectPhoto: other.picture_url ?? prospect.profile_photo,
              prospectUrl: other.profile_url ?? null,
              lastMessage: lastMessage ? lastMessage.slice(0, 100) + (lastMessage.length > 100 ? "…" : "") : null,
              lastMessageDate,
              unreadCount: chat.unread_count ?? 0,
            });
          } catch {
            continue;
          }
        }
      }
    }

    conversations.sort((a, b) => {
      const da = a.lastMessageDate ? new Date(a.lastMessageDate).getTime() : 0;
      const db = b.lastMessageDate ? new Date(b.lastMessageDate).getTime() : 0;
      return db - da;
    });

    return NextResponse.json({ conversations });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[LinkedIn inbox] Erreur:", err);
    return NextResponse.json(
      { error: "Échec chargement inbox: " + message },
      { status: 500 }
    );
  }
}
