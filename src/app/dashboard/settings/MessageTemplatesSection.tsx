"use client";

import { useState, useEffect, useCallback } from "react";

interface Template {
  id: string;
  type: string;
  label: string | null;
  body: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  premier_contact: "Premier contact (invitation acceptée)",
  relance: "Relance",
  remerciement: "Remerciement",
  cloture: "Clôture",
  autre: "Autre",
};

const TEMPLATE_TYPES = ["premier_contact", "relance", "remerciement", "cloture", "autre"] as const;
const PLACEHOLDERS = ["{{first_name}}", "{{last_name}}", "{{company}}", "{{job_title}}"];

export function MessageTemplatesSection() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: "premier_contact" as (typeof TEMPLATE_TYPES)[number],
    label: "",
    body: "",
    is_default: false,
  });

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/templates");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erreur chargement");
      setTemplates(data.templates ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const resetForm = () => {
    setForm({
      type: "premier_contact",
      label: "",
      body: "",
      is_default: false,
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        const res = await fetch(`/api/settings/templates/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: form.label || null,
            body: form.body,
            is_default: form.is_default,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Erreur mise à jour");
        setTemplates((prev) =>
          prev.map((t) => (t.id === editingId ? { ...t, ...data } : t))
        );
      } else {
        const res = await fetch("/api/settings/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Erreur création");
        setTemplates((prev) => [...prev, data]);
      }
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (t: Template) => {
    setForm({
      type: t.type as (typeof TEMPLATE_TYPES)[number],
      label: t.label ?? "",
      body: t.body,
      is_default: t.is_default,
    });
    setEditingId(t.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce template ?")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/settings/templates/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erreur suppression");
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium text-slate-900">Templates de message</h2>
          <p className="mt-1 text-sm text-slate-600">
            Définissez des modèles par type : premier contact, relance, remerciement, etc. Utilisez les placeholders{" "}
            {PLACEHOLDERS.join(", ")} pour personnaliser.
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-[#EA580C] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#C2410C]"
          >
            Nouveau template
          </button>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as (typeof TEMPLATE_TYPES)[number] }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#EA580C] focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                required
                disabled={!!editingId}
              >
                {TEMPLATE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nom (optionnel)</label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Ex : Relance J+3"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[#EA580C] focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Contenu du message *</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              rows={4}
              required
              placeholder="Bonjour {{first_name}}, ..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[#EA580C] focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
                className="rounded border-slate-300 text-[#EA580C] focus:ring-[#EA580C]"
              />
              Template par défaut pour ce type
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[#EA580C] px-4 py-1.5 text-sm font-medium text-white transition hover:bg-[#C2410C] disabled:opacity-50"
              >
                {saving ? "Enregistrement…" : editingId ? "Modifier" : "Créer"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Annuler
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-slate-500">Chargement…</p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun template. Créez-en un pour vos messages LinkedIn.</p>
        ) : (
          <ul className="space-y-2">
            {templates.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">
                      {t.label || TYPE_LABELS[t.type] || t.type}
                    </span>
                    {t.is_default && (
                      <span className="rounded bg-[#EA580C]/10 px-1.5 py-0.5 text-xs font-medium text-[#EA580C]">
                        Par défaut
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{t.body}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleEdit(t)}
                    className="rounded p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                    aria-label="Modifier"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(t.id)}
                    disabled={saving}
                    className="rounded p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    aria-label="Supprimer"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
