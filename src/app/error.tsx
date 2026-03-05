"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 p-4 dark:bg-zinc-950">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Erreur
      </h1>
      <p className="max-w-md text-center text-sm text-zinc-600 dark:text-zinc-400">
        {error.message || "Une erreur interne s&apos;est produite."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Réessayer
      </button>
    </div>
  );
}
