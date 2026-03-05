"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Conversation {
  id: string;
  prospectId: string;
  prospectName: string;
  prospectPhoto: string | null;
  prospectUrl: string | null;
  lastMessage: string | null;
  lastMessageDate: string | null;
  unreadCount: number;
}

interface Message {
  id: string;
  body: string;
  date: string | null;
  isFromMe: boolean;
}

interface ProspectInfo {
  name: string;
  picture_url?: string;
  profile_url?: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (diff < 604800000) return d.toLocaleDateString("fr-FR", { weekday: "short" });
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function DashboardInboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [prospect, setProspect] = useState<ProspectInfo | null>(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesContainerRef.current?.scrollTo({
      top: messagesContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    if (!messagesLoading && messages.length > 0) {
      const t = setTimeout(scrollToBottom, 50);
      return () => clearTimeout(t);
    }
  }, [messagesLoading, messages.length, selectedId, scrollToBottom]);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/linkedin/inbox");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Erreur chargement");
        return;
      }
      setConversations(data.conversations ?? []);
      setError(null);
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (chatId: string, options?: { silent?: boolean }) => {
    if (!options?.silent) setMessagesLoading(true);
    try {
      const res = await fetch(`/api/linkedin/inbox/messages?chat_id=${encodeURIComponent(chatId)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Erreur chargement messages");
        return;
      }
      setMessages(data.messages ?? []);
      setProspect(data.prospect ?? null);
      setError(null);
    } catch {
      setError("Erreur réseau");
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedId) {
      fetchMessages(selectedId);
    } else {
      setMessages([]);
      setProspect(null);
    }
  }, [selectedId, fetchMessages]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !replyText.trim() || sending) return;
    const text = replyText.trim();
    setSending(true);
    try {
      const res = await fetch("/api/linkedin/inbox/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: selectedId, text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Échec envoi");
        setReplyText(text);
        return;
      }
      // Rechargement complet pour éviter l'erreur removeChild (React 19)
      window.location.reload();
    } catch {
      setError("Erreur envoi");
      setReplyText(text);
    } finally {
      setSending(false);
    }
  };

  const selectedConv = conversations.find((c) => c.id === selectedId);

  return (
    <div className="flex h-[calc(100vh-6rem)] min-h-0 flex-col overflow-hidden">
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
        <p className="mt-1 text-sm text-slate-500">
          Uniquement vos prospects (conversations initiées via l&apos;app)
        </p>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <aside className="flex h-full w-80 min-w-80 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-sm text-slate-600">
              {loading ? "Chargement…" : `${conversations.length} conversation${conversations.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="p-4 text-sm text-slate-500">Chargement…</p>
          ) : error ? (
            <p className="p-4 text-sm text-[#EF4444]">{error}</p>
          ) : conversations.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">
              Aucune conversation. Envoyez des messages depuis les campagnes pour voir vos échanges ici.
            </p>
          ) : (
            <ul className="divide-y divide-slate-200" role="list">
              {conversations.map((c) => (
                <li key={`conv-${c.id}-${c.prospectId}`}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId(c.id)}
                    onKeyDown={(e) => e.key === "Enter" && setSelectedId(c.id)}
                    className={`flex w-full cursor-pointer items-center gap-3 border-b border-slate-200 px-4 py-3 text-left transition hover:bg-slate-50 ${
                      selectedId === c.id ? "bg-slate-100" : ""
                    }`}
                  >
                    {c.prospectPhoto ? (
                      <img
                        src={c.prospectPhoto}
                        alt=""
                        className="h-12 w-12 flex-shrink-0 rounded-full object-cover"
                        width={48}
                        height={48}
                      />
                    ) : (
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-lg font-medium text-slate-600">
                        {c.prospectName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium text-slate-900">{c.prospectName}</span>
                        {c.unreadCount > 0 && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#EA580C] px-1.5 text-xs font-medium text-white">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                      <span className="block truncate text-sm text-slate-600">{c.lastMessage || "Aucun message"}</span>
                    </div>
                    <span className="flex-shrink-0 text-xs text-slate-500">{formatDate(c.lastMessageDate)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50">
          {!selectedId ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <p className="text-slate-500">Sélectionnez une conversation</p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col min-h-0">
              <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
                {prospect?.picture_url ? (
                  <img
                    src={prospect.picture_url}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                    width={40}
                    height={40}
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-600">
                    {selectedConv?.prospectName?.charAt(0).toUpperCase() ?? "?"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{prospect?.name ?? selectedConv?.prospectName ?? "Prospect"}</p>
                  {prospect?.profile_url && (
                    <a
                      href={prospect.profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#EA580C] hover:underline"
                    >
                      Voir le profil LinkedIn
                    </a>
                  )}
                </div>
              </div>

              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4">
                {messagesLoading ? (
                  <p className="text-center text-sm text-slate-500">Chargement…</p>
                ) : messages.length === 0 ? (
                  <p className="text-center text-sm text-slate-500">Aucun message</p>
                ) : (
                  <div className="space-y-3" key={selectedId}>
                    {messages.map((m, i) => (
                      <div key={`${selectedId}-${m.id || `msg-${i}`}`} className={`flex ${m.isFromMe ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                            m.isFromMe
                              ? "bg-[#EA580C] text-white"
                              : "bg-white text-slate-900 border border-slate-200"
                          }`}
                        >
                          <span className="block whitespace-pre-wrap text-sm">{m.body}</span>
                          {m.date && (
                            <span className={`mt-1 block text-xs ${m.isFromMe ? "text-white/80" : "text-slate-500"}`}>
                              {formatDate(m.date)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form onSubmit={handleSendReply} className="border-t border-slate-200 bg-white p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Écrire un message…"
                    disabled={sending}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-[#EA580C] focus:outline-none focus:ring-1 focus:ring-[#EA580C] disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={sending || !replyText.trim()}
                    className="rounded-lg bg-[#EA580C] px-6 py-2.5 font-medium text-white transition hover:bg-[#C2410C] disabled:opacity-50"
                  >
                    {sending ? "Envoi…" : "Envoyer"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
