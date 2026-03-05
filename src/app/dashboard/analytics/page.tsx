"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Stats {
  invitationsToday: number;
  invitationsLimit: number;
  invitationsAcceptedThisWeek: number;
  messagesSent: number;
  responseRate: number;
}

interface Prospect {
  id: string;
  full_name: string;
  status: string;
  invited_at: string | null;
}

export default function DashboardAnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [statsRes, prospectsRes] = await Promise.all([
          fetch("/api/dashboard/stats"),
          fetch("/api/prospects/list"),
        ]);
        const statsData = await statsRes.json().catch(() => ({}));
        const prospectsData = await prospectsRes.json().catch(() => ({}));
        if (statsRes.ok) setStats(statsData);
        if (prospectsRes.ok) setProspects(prospectsData.prospects ?? []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const byStatus = prospects.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const activityByDay = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toISOString().slice(0, 10);
    const count = prospects.filter((p) => p.invited_at?.startsWith(dayStr)).length;
    return { label: d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }), value: count };
  });
  const maxActivity = Math.max(1, ...activityByDay.map((x) => x.value));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">
          Statistiques et tendances de votre prospection
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Invitations aujourd&apos;hui</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {loading ? "—" : `${stats?.invitationsToday ?? 0}/${stats?.invitationsLimit ?? 20}`}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Acceptées cette semaine</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {loading ? "—" : stats?.invitationsAcceptedThisWeek ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Messages envoyés</p>
          <p className="mt-1 text-2xl font-bold text-[#3B82F6]">
            {loading ? "—" : stats?.messagesSent ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Taux de réponse</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {loading ? "—" : `${stats?.responseRate ?? 0}%`}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-slate-900">Activité (7 derniers jours)</h2>
          <div className="mt-4 flex h-40 items-end justify-between gap-2">
            {activityByDay.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-[#EA580C] transition-all"
                  style={{ height: `${Math.max(4, (d.value / maxActivity) * 100)}%` }}
                />
                <span className="text-center text-xs text-slate-500">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-slate-900">Répartition par statut</h2>
          <div className="mt-4 space-y-3">
            {[
              { key: "new", label: "Nouveau", color: "bg-slate-400" },
              { key: "invited", label: "En attente", color: "bg-[#F59E0B]" },
              { key: "connected", label: "Connecté", color: "bg-[#22C55E]" },
              { key: "ignored", label: "Ignoré", color: "bg-[#71717A]" },
            ].map(({ key, label, color }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{label}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full ${color} transition-all`}
                      style={{
                        width: `${prospects.length ? ((byStatus[key] ?? 0) / prospects.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm font-medium text-slate-900">
                    {byStatus[key] ?? 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-medium text-slate-900">Total prospects</h2>
        <p className="mt-2 text-3xl font-bold text-slate-900">{prospects.length}</p>
        <Link
          href="/dashboard/campaigns"
          className="mt-2 inline-block text-sm text-[#EA580C] hover:underline"
        >
          Voir les campagnes →
        </Link>
      </div>
    </div>
  );
}
