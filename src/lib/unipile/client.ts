import { UnipileClient } from "unipile-node-sdk";

const apiUrl = (process.env.UNIPILE_API_URL ?? "").trim();
const accessToken = (
  process.env.UNIPILE_ACCESS_TOKEN ??
  process.env.UNIPILE_API_KEY ??
  ""
).trim();

// Debug: vérification des variables d'environnement au chargement
if (process.env.NODE_ENV === "development") {
  console.log("[Unipile] Config chargée:", {
    UNIPILE_API_URL: apiUrl ? `${apiUrl.substring(0, 35)}...` : "(vide)",
    token: accessToken ? `${accessToken.substring(0, 12)}...` : "(vide)",
    configured: !!(apiUrl && accessToken),
  });
}
if (!apiUrl || !accessToken) {
  console.warn(
    "[Unipile] UNIPILE_API_URL et UNIPILE_ACCESS_TOKEN (ou UNIPILE_API_KEY) doivent être définis dans .env.local"
  );
}

/**
 * Client Unipile réutilisable pour toutes les opérations LinkedIn.
 * Utilise UNIPILE_API_URL (ex: https://api15.unipile.com:14588) et UNIPILE_ACCESS_TOKEN.
 */
export const unipileClient = new UnipileClient(
  apiUrl || "https://api1.unipile.com:13111",
  accessToken || ""
);

export function isUnipileConfigured(): boolean {
  return !!(apiUrl && accessToken);
}
