"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/src/lib/supabase";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      setMessage({
        type: "success",
        text: "Un email de réinitialisation a été envoyé. Vérifiez votre boîte de réception.",
      });
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Une erreur est survenue.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0B] px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-[#27272A] bg-[#18181B] p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#FAFAFA]">
            Réinitialiser le mot de passe
          </h1>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            Saisissez l’email de votre compte pour recevoir un lien.
          </p>
        </div>

        {sent ? (
          <div className="space-y-4">
            {message && (
              <p className="rounded-lg border border-[#22C55E]/50 bg-[#22C55E]/10 px-3 py-2 text-sm text-[#22C55E]">
                {message.text}
              </p>
            )}
            <Link
              href="/login"
              className="block w-full rounded-lg bg-[#3B82F6] py-2.5 text-center font-medium text-white transition hover:bg-[#2563EB]"
            >
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-[#A1A1AA]">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                placeholder="vous@exemple.com"
              />
            </div>

            {message && message.type === "error" && (
              <p className="rounded-lg border border-[#EF4444]/50 bg-[#EF4444]/10 px-3 py-2 text-sm text-[#EF4444]">
                {message.text}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#3B82F6] py-2.5 font-medium text-white transition hover:bg-[#2563EB] disabled:opacity-50"
            >
              {loading ? "Envoi…" : "Envoyer le lien"}
            </button>
          </form>
        )}

        <p className="text-center">
          <Link href="/login" className="text-sm text-[#A1A1AA] transition hover:text-[#FAFAFA]">
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
