"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/src/app/components/LogoutButton";
import { FloatingSlidebar } from "./FloatingSlidebar";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "layout-dashboard" },
  { href: "/dashboard/prospects", label: "Recherche prospect", icon: "search" },
  { href: "/dashboard/campaigns", label: "Campagne d'invitation", icon: "users" },
  { href: "/dashboard/email-campaigns", label: "Campagne d'email", icon: "mail" },
  { href: "/dashboard/inbox", label: "Messages", icon: "message-circle" },
  { href: "/dashboard/templates", label: "Templates de message", icon: "file-text" },
  { href: "/dashboard/settings", label: "Configuration", icon: "settings" },
];

function NavIcon({ name }: { name: string }) {
  const cls = "h-5 w-5 flex-shrink-0";
  if (name === "layout-dashboard")
    return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1" strokeWidth="2"/><rect x="14" y="3" width="7" height="5" rx="1" strokeWidth="2"/><rect x="14" y="12" width="7" height="9" rx="1" strokeWidth="2"/><rect x="3" y="16" width="7" height="5" rx="1" strokeWidth="2"/></svg>;
  if (name === "search")
    return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" strokeWidth="2"/><path strokeLinecap="round" strokeWidth="2" d="m21 21-4.35-4.35"/></svg>;
  if (name === "users")
    return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>;
  if (name === "message-circle")
    return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>;
  if (name === "settings")
    return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>;
  if (name === "link")
    return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>;
  if (name === "mail")
    return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2" strokeWidth="2"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>;
  if (name === "file-text")
    return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>;
  return null;
}

interface DashboardShellProps {
  children: React.ReactNode;
  user: { email?: string | null };
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - blanc */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white border-r border-slate-200 transition-transform duration-200 ease-out lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-4">
            <Image src="/logo_HALLIA.jpeg" alt="Logo HALLIA" width={48} height={48} className="flex-shrink-0 rounded" />
            <Link href="/dashboard" className="block font-semibold text-slate-900">
              HALL PROSPECT
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="ml-auto rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden"
              aria-label="Fermer le menu"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="flex-1 space-y-0.5 p-3">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "border-l-4 border-[#EA580C] bg-orange-50 pl-[11px] text-slate-900"
                      : "border-l-4 border-transparent pl-3 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <NavIcon name={item.icon} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main content - light theme */}
      <div className="flex flex-1 flex-col min-w-0 bg-[#FFF7ED]">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#EA580C] text-sm font-medium text-white">
              {(user?.email ?? "U").charAt(0).toUpperCase()}
            </div>
            <LogoutButton />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>

      <FloatingSlidebar />
    </div>
  );
}
