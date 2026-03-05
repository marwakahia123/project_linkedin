import Link from "next/link";

export default function DashboardSettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gérez votre compte et vos préférences
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-medium text-slate-900">Connexion LinkedIn</h2>
        <p className="mt-1 text-sm text-slate-600">
          Connectez ou déconnectez votre compte LinkedIn pour la prospection.
        </p>
        <Link
          href="/dashboard/linkedin"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#EA580C] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#c2410c]"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
          Gérer la connexion
        </Link>
      </div>
    </div>
  );
}
