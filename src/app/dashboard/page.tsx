"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Stats {
  invitationsToday: number;
  invitationsLimit: number;
  invitationsAcceptedThisWeek: number;
  messagesSent: number;
  responseRate: number;
  conversionRate: number;
  accountRestricted?: boolean;
}

interface Prospect {
  id: string;
  full_name: string;
  job_title: string | null;
  company: string | null;
  linkedin_url: string | null;
  status: string;
  profile_photo: string | null;
  invited_at?: string | null;
  first_message_sent_at?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  new: "Nouveau",
  invited: "Invité",
  connected: "Connecté",
  ignored: "Ignoré",
};

function KpiCard({
  label,
  value,
  change,
  icon,
}: {
  label: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-600">
        {icon}
      </div>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
      {change && (
        <p className="mt-1 text-xs font-medium text-emerald-600">{change}</p>
      )}
    </div>
  );
}

export default function DashboardPage() {
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

  const totalLeads = prospects.length;
  const invitedCount = prospects.filter((p) => p.status === "invited").length;
  const connectedCount = prospects.filter((p) => p.status === "connected").length;
  const messagesSent = prospects.filter((p) => p.first_message_sent_at).length;

  const recentLeads = prospects.slice(0, 4);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-emerald-100 text-emerald-700";
      case "invited":
        return "bg-amber-100 text-amber-700";
      case "ignored":
        return "bg-slate-100 text-slate-600";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Vue d&apos;ensemble de votre prospection LinkedIn
        </p>
      </div>

      {stats?.accountRestricted && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">
            Compte LinkedIn restreint. Vérifiez votre identité sur LinkedIn avant de continuer.
          </p>
        </div>
      )}

      {/* 6 KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Prospects"
          value={loading ? "—" : totalLeads}
          icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
        <KpiCard
          label="Invitations envoyées"
          value={loading ? "—" : invitedCount + (stats?.invitationsToday ?? 0)}
          icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          }
        />
        <KpiCard
          label="Connexions acceptées"
          value={loading ? "—" : connectedCount}
          icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />
        <KpiCard
          label="Messages envoyés"
          value={loading ? "—" : stats?.messagesSent ?? messagesSent}
          icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          }
        />
        <KpiCard
          label="Taux de réponse"
          value={loading ? "—" : `${stats?.responseRate ?? 0}%`}
          change={loading ? undefined : `${messagesSent} msg / ${connectedCount} connectés`}
          icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          }
        />
        <KpiCard
          label="Taux de conversion"
          value={loading ? "—" : `${stats?.conversionRate ?? 0}%`}
          change={loading ? undefined : `${connectedCount} connectés / ${invitedCount + connectedCount} invités`}
          icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          }
        />
      </div>

      {/* Leads récents */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Leads récents</h2>
          <Link
            href="/dashboard/campaigns"
            className="text-sm font-medium text-[#EA580C] transition hover:underline"
          >
            Voir tous les leads
          </Link>
        </div>
        {recentLeads.length === 0 ? (
          <p className="mt-6 text-center text-sm text-slate-500">
            Aucun prospect.{" "}
            <Link href="/dashboard/prospects" className="text-[#EA580C] hover:underline">
              Rechercher des prospects
            </Link>{" "}
            pour en ajouter.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {recentLeads.map((p) => (
              <div
                key={p.id}
                className="relative rounded-lg border border-slate-200 bg-slate-50/50 p-4"
              >
                <div className="absolute right-3 top-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClass(p.status)}`}
                  >
                    {STATUS_LABELS[p.status] ?? p.status}
                  </span>
                </div>
                <div className="flex gap-3">
                  {p.profile_photo ? (
                    <img
                      src={p.profile_photo}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover"
                      width={48}
                      height={48}
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-lg font-medium text-slate-600">
                      {p.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{p.full_name}</p>
                    <p className="text-sm text-slate-600">
                      {p.job_title || "—"}
                      {p.company && ` • ${p.company}`}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {p.linkedin_url && (
                        <a
                          href={p.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                          LinkedIn
                        </a>
                      )}
                      <Link
                        href={`/dashboard/campaigns`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                      >
                        {p.status === "new"
                          ? "Marquer Invité"
                          : p.status === "invited"
                          ? "Vérifier"
                          : p.status === "connected"
                          ? "Envoyer message"
                          : "Profil"}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
