"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({
          type: "success",
          text: "Compte créé. Vérifiez votre email pour confirmer (si la confirmation est activée).",
        });
        setPassword("");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
        router.refresh();
      }
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
            {mode === "signin" ? "Connexion" : "Inscription"}
          </h1>
          <p className="mt-1 text-sm text-[#A1A1AA]">Prospection LinkedIn</p>
        </div>

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
              className="w-full rounded-lg border border-[#27272A] bg-[#0A0A0B] px-3 py-2 text-[#FAFAFA] placeholder-[#71717A] focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
              placeholder="vous@exemple.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-[#A1A1AA]">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              minLength={6}
              className="w-full rounded-lg border border-[#27272A] bg-[#0A0A0B] px-3 py-2 text-[#FAFAFA] placeholder-[#71717A] focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
              placeholder="••••••••"
            />
            {mode === "signin" && (
              <p className="mt-1.5 text-right text-sm">
                <Link
                  href="/reset-password"
                  className="text-[#A1A1AA] transition hover:text-[#3B82F6]"
                >
                  Mot de passe oublié ?
                </Link>
              </p>
            )}
          </div>

          {message && (
            <p
              className={`rounded-lg px-3 py-2 text-sm ${
                message.type === "success"
                  ? "border border-[#22C55E]/50 bg-[#22C55E]/10 text-[#22C55E]"
                  : "border border-[#EF4444]/50 bg-[#EF4444]/10 text-[#EF4444]"
              }`}
            >
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#3B82F6] py-2.5 font-medium text-white transition hover:bg-[#2563EB] disabled:opacity-50"
          >
            {loading ? "Chargement…" : mode === "signin" ? "Se connecter" : "Créer le compte"}
          </button>
        </form>

        <p className="text-center text-sm text-[#A1A1AA]">
          {mode === "signin" ? (
            <>
              Pas encore de compte ?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setMessage(null);
                }}
                className="font-medium text-[#3B82F6] transition hover:text-[#60A5FA]"
              >
                S&apos;inscrire
              </button>
            </>
          ) : (
            <>
              Déjà un compte ?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setMessage(null);
                }}
                className="font-medium text-[#3B82F6] transition hover:text-[#60A5FA]"
              >
                Se connecter
              </button>
            </>
          )}
        </p>

        <p className="text-center">
          <Link href="/" className="text-sm text-[#A1A1AA] transition hover:text-[#FAFAFA]">
            ← Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    </div>
  );
}
