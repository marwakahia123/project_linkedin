"use client";

import { useState, useEffect } from "react";

interface Prospect {
  id: string;
  full_name: string;
  job_title: string | null;
  company: string | null;
  email: string | null;
  email_status: string | null;
  profile_photo: string | null;
  email_sent_at: string | null;
}

export default function EmailCampaignsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [log, setLog] = useState<Array<{ time: string; text: string; ok: boolean }>>([]);

  const [subject, setSubject] = useState("Opportunité de collaboration");
  const [emailTemplate, setEmailTemplate] = useState(
    "Bonjour {prenom},\n\nJe me permets de vous contacter car votre profil en tant que {poste} chez {entreprise} a retenu mon attention.\n\nSeriez-vous disponible pour un échange rapide ?\n\nCordialement"
  );

  const fetchProspects = async () => {
    try {
      const res = await fetch("/api/prospects/list");
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const all = (data.prospects ?? []) as Prospect[];
        setProspects(all.filter((p) => p.email));
      }
    } catch {
      setProspects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProspects();
  }, []);

  const personalizeBody = (prospect: Prospect) => {
    const firstName = prospect.full_name.split(" ")[0] || prospect.full_name;
    return emailTemplate
      .replace(/\{prenom\}/gi, firstName)
      .replace(/\{nom\}/gi, prospect.full_name)
      .replace(/\{poste\}/gi, prospect.job_title || "votre poste")
      .replace(/\{entreprise\}/gi, prospect.company || "votre entreprise");
  };

  const addLog = (text: string, ok: boolean) => {
    setLog((prev) => [...prev, { time: new Date().toLocaleTimeString("fr-FR"), text, ok }]);
  };

  const handleSendOne = async (prospect: Prospect) => {
    setSendingId(prospect.id);
    setMessage(null);
    try {
      const body = personalizeBody(prospect);
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospectId: prospect.id,
          subject,
          emailBody: body,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        addLog(`Email envoyé à ${prospect.full_name} (${prospect.email})`, true);
        setMessage({ type: "success", text: data.message || "Email envoyé" });
        await fetchProspects();
      } else {
        addLog(`Échec : ${prospect.full_name} — ${data.error}`, false);
        setMessage({ type: "error", text: data.error || "Échec envoi" });
      }
    } catch {
      addLog(`Erreur réseau : ${prospect.full_name}`, false);
      setMessage({ type: "error", text: "Erreur réseau" });
    } finally {
      setSendingId(null);
    }
  };

  const handleBulkSend = async () => {
    const toSend = prospects.filter((p) => !p.email_sent_at);
    if (toSend.length === 0) {
      setMessage({ type: "success", text: "Tous les prospects avec email ont déjà reçu un email." });
      return;
    }
    setBulkSending(true);
    setMessage(null);
    addLog(`Lancement campagne email (${toSend.length} prospects)…`, true);
    let sent = 0;
    let errors = 0;
    for (const prospect of toSend) {
      try {
        const body = personalizeBody(prospect);
        const res = await fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prospectId: prospect.id,
            subject,
            emailBody: body,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          sent++;
          addLog(`Email envoyé à ${prospect.full_name}`, true);
        } else {
          errors++;
          addLog(`Échec : ${prospect.full_name} — ${data.error || "Erreur"}`, false);
        }
      } catch {
        errors++;
        addLog(`Erreur réseau : ${prospect.full_name}`, false);
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    await fetchProspects();
    setMessage({
      type: errors === toSend.length ? "error" : "success",
      text: `${sent} email(s) envoyé(s).${errors > 0 ? ` ${errors} échec(s).` : ""}`,
    });
    setBulkSending(false);
  };

  const prospectsNotSent = prospects.filter((p) => !p.email_sent_at);
  const prospectsSent = prospects.filter((p) => p.email_sent_at);

  const getStatusBadge = (status: string | null) => {
    if (status === "verified") return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Vérifié</span>;
    if (status === "guessed") return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">Probable</span>;
    return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{status || "Inconnu"}</span>;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Campagne d&apos;email</h1>
        <p className="mt-1 text-sm text-slate-500">
          Envoyez des emails personnalisés aux prospects dont l&apos;adresse a été enrichie via Apollo.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Template d&apos;email</h2>
        <p className="mt-1 text-sm text-slate-500">
          Variables disponibles : <code className="rounded bg-slate-100 px-1 text-xs">{"{prenom}"}</code>{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">{"{nom}"}</code>{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">{"{poste}"}</code>{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">{"{entreprise}"}</code>
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="email-subject" className="mb-1 block text-sm font-medium text-slate-600">
              Objet
            </label>
            <input
              id="email-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-[#EA580C] focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
            />
          </div>
          <div>
            <label htmlFor="email-body" className="mb-1 block text-sm font-medium text-slate-600">
              Corps du message
            </label>
            <textarea
              id="email-body"
              rows={6}
              value={emailTemplate}
              onChange={(e) => setEmailTemplate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-[#EA580C] focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm text-slate-600">
          <span className="font-medium">{prospects.length}</span> prospect(s) avec email
          {" · "}
          <span className="font-medium text-emerald-600">{prospectsSent.length}</span> envoyé(s)
          {" · "}
          <span className="font-medium text-amber-600">{prospectsNotSent.length}</span> en attente
        </div>
        <button
          type="button"
          onClick={handleBulkSend}
          disabled={bulkSending || prospectsNotSent.length === 0}
          className="rounded-lg bg-[#EA580C] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#C2410C] disabled:opacity-50"
        >
          {bulkSending ? "Envoi en cours…" : `Envoyer à tous (${prospectsNotSent.length})`}
        </button>
      </div>

      {message && (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            message.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {log.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-600">
            Journal d&apos;envoi
          </h2>
          <ul className="max-h-48 overflow-y-auto p-4 font-mono text-sm">
            {log.map((entry, i) => (
              <li
                key={i}
                className={`border-b border-slate-100 py-1.5 last:border-0 ${entry.ok ? "text-slate-600" : "text-red-600"}`}
              >
                <span className="text-slate-400">[{entry.time}]</span> {entry.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-600">
          Prospects avec email ({prospects.length})
        </h2>
        {loading ? (
          <div className="p-4 text-sm text-slate-500">Chargement…</div>
        ) : prospects.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            Aucun prospect avec email. Enrichissez vos prospects via Apollo dans{" "}
            <a href="/dashboard/prospects" className="text-[#EA580C] hover:underline">Recherche prospect</a>.
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {prospects.map((p) => (
              <li key={p.id} className="flex items-center gap-4 px-4 py-3">
                {p.profile_photo ? (
                  <img src={p.profile_photo} alt="" className="h-10 w-10 rounded-full object-cover" width={40} height={40} />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-600">
                    {p.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="block font-medium text-slate-900">{p.full_name}</span>
                  <span className="block truncate text-sm text-slate-600">
                    {p.job_title || "—"} {p.company ? `· ${p.company}` : ""}
                  </span>
                  <span className="block text-sm text-slate-500">{p.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(p.email_status)}
                  {p.email_sent_at ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      Envoyé
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendOne(p)}
                      disabled={sendingId !== null || bulkSending}
                      className="rounded-lg bg-[#EA580C] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#C2410C] disabled:opacity-50"
                    >
                      {sendingId === p.id ? "Envoi…" : "Envoyer email"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
