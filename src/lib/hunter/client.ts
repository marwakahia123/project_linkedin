/**
 * Client Hunter.io - Recherche d'emails professionnels.
 * Forfait gratuit : 25 recherches/mois avec accès API complet.
 * Doc : https://hunter.io/api-documentation
 */

const HUNTER_BASE = "https://api.hunter.io/v2";

function getApiKey(): string {
  return (process.env.HUNTER_API_KEY ?? "").trim();
}

export function isHunterConfigured(): boolean {
  return !!getApiKey();
}

function extractLinkedinSlug(url: string): string | null {
  const match = url.match(/linkedin\.com\/in\/([^/?\s]+)/);
  return match ? match[1] : null;
}

function cleanCompanyName(raw: string): string {
  return raw
    .replace(/\d+[\s,.]?\d*\s*k?\s*(abonnés|followers|abonné|follower)/gi, "")
    .replace(/\s*·\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ──────────────────── Email Finder ────────────────────

export interface FindEmailInput {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  company?: string;
  domain?: string;
  linkedinUrl?: string;
}

export interface FindEmailResult {
  email: string | null;
  score: number;
  position: string | null;
  company: string | null;
  domain: string | null;
  linkedin_url: string | null;
  phone_number: string | null;
  verification_status: string | null;
  sources_count: number;
}

export async function findEmail(input: FindEmailInput): Promise<FindEmailResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("HUNTER_API_KEY non configuré");

  const linkedinSlug = input.linkedinUrl ? extractLinkedinSlug(input.linkedinUrl) : null;
  const company = input.company ? cleanCompanyName(input.company) : null;

  const hasName = (input.firstName?.trim() && input.lastName?.trim()) || input.fullName?.trim();
  if (!hasName) {
    console.log("[Hunter] Pas de nom suffisant pour la recherche");
    return null;
  }

  // Construire les stratégies de recherche par ordre de priorité
  const strategies: Array<{ label: string; identifier: Record<string, string> }> = [];

  if (input.domain?.trim()) {
    strategies.push({ label: "domain", identifier: { domain: input.domain.trim() } });
  }
  if (company) {
    strategies.push({ label: "company", identifier: { company } });
  }
  if (linkedinSlug) {
    strategies.push({ label: "linkedin", identifier: { linkedin_handle: linkedinSlug } });
  }

  if (strategies.length === 0) {
    console.log("[Hunter] Aucun identifiant (domain, company, linkedin) disponible");
    return null;
  }

  // Essayer chaque stratégie
  for (const strategy of strategies) {
    const result = await tryFindEmail(apiKey, input, strategy.identifier, strategy.label);
    if (result) return result;
  }

  console.log("[Hunter] Aucun email trouvé après toutes les stratégies");
  return null;
}

async function tryFindEmail(
  apiKey: string,
  input: FindEmailInput,
  identifier: Record<string, string>,
  label: string,
): Promise<FindEmailResult | null> {
  const params = new URLSearchParams();
  params.set("api_key", apiKey);

  for (const [k, v] of Object.entries(identifier)) {
    params.set(k, v);
  }

  if (input.firstName?.trim()) params.set("first_name", input.firstName.trim());
  if (input.lastName?.trim()) params.set("last_name", input.lastName.trim());
  if (!input.firstName && !input.lastName && input.fullName?.trim()) {
    params.set("full_name", input.fullName.trim());
  }

  const url = `${HUNTER_BASE}/email-finder?${params.toString()}`;
  console.log(`[Hunter] Essai "${label}":`, url.replace(apiKey, "***"));

  const res = await fetch(url, {
    method: "GET",
    headers: { "Cache-Control": "no-cache" },
  });

  console.log(`[Hunter] "${label}" status:`, res.status);

  if (res.status === 429) {
    throw new Error("Limite de requêtes Hunter atteinte. Réessayez plus tard.");
  }
  if (res.status === 402) {
    throw new Error("Crédits Hunter épuisés pour ce mois.");
  }

  const json = (await res.json().catch(() => ({}))) as {
    data?: {
      email?: string | null;
      score?: number;
      position?: string | null;
      company?: string | null;
      domain?: string | null;
      linkedin_url?: string | null;
      phone_number?: string | null;
      sources?: Array<unknown>;
      verification?: { status?: string };
    };
    errors?: Array<{ id?: string; code?: number; details?: string }>;
  };

  // 404 ou erreur = cette stratégie n'a pas marché, on passe à la suivante
  if (json.errors?.length) {
    console.log(`[Hunter] "${label}" erreur:`, json.errors[0]?.details ?? JSON.stringify(json.errors));
    return null;
  }

  if (!res.ok || !json.data) {
    console.log(`[Hunter] "${label}" pas de résultat`);
    return null;
  }

  const d = json.data;

  // Si pas d'email trouvé, pas la peine de retourner
  if (!d.email) {
    console.log(`[Hunter] "${label}" résultat sans email`);
    return null;
  }

  console.log(`[Hunter] "${label}" email trouvé:`, d.email, "score:", d.score, "verif:", d.verification?.status);

  return {
    email: d.email,
    score: d.score ?? 0,
    position: d.position ?? null,
    company: d.company ?? null,
    domain: d.domain ?? null,
    linkedin_url: d.linkedin_url ?? null,
    phone_number: d.phone_number ?? null,
    verification_status: d.verification?.status ?? null,
    sources_count: d.sources?.length ?? 0,
  };
}

// ──────────────────── Account / Credits ────────────────────

export interface HunterAccountResult {
  credits_used: number;
  credits_available: number;
  searches_used: number;
  searches_available: number;
  verifications_used: number;
  verifications_available: number;
  plan_name: string;
  reset_date: string | null;
  valid: boolean;
}

export async function getAccount(): Promise<HunterAccountResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      credits_used: 0, credits_available: 0,
      searches_used: 0, searches_available: 0,
      verifications_used: 0, verifications_available: 0,
      plan_name: "", reset_date: null, valid: false,
    };
  }

  const res = await fetch(`${HUNTER_BASE}/account?api_key=${apiKey}`, {
    method: "GET",
    headers: { "Cache-Control": "no-cache" },
  });

  const json = (await res.json().catch(() => ({}))) as {
    data?: {
      plan_name?: string;
      reset_date?: string;
      requests?: {
        credits?: { used?: number; available?: number };
        searches?: { used?: number; available?: number };
        verifications?: { used?: number; available?: number };
      };
    };
  };

  const d = json.data;
  if (!res.ok || !d) {
    return {
      credits_used: 0, credits_available: 0,
      searches_used: 0, searches_available: 0,
      verifications_used: 0, verifications_available: 0,
      plan_name: "", reset_date: null, valid: false,
    };
  }

  return {
    credits_used: d.requests?.credits?.used ?? 0,
    credits_available: d.requests?.credits?.available ?? 0,
    searches_used: d.requests?.searches?.used ?? 0,
    searches_available: d.requests?.searches?.available ?? 0,
    verifications_used: d.requests?.verifications?.used ?? 0,
    verifications_available: d.requests?.verifications?.available ?? 0,
    plan_name: d.plan_name ?? "",
    reset_date: d.reset_date ?? null,
    valid: true,
  };
}
