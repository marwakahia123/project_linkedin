"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body>
        <div style={{ padding: "2rem", textAlign: "center", fontFamily: "system-ui" }}>
          <h1>Erreur</h1>
          <p>{error.message || "Une erreur interne s'est produite."}</p>
          <button type="button" onClick={reset} style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
