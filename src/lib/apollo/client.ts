/**
 * Client Apollo.io - Enrichissement de prospects (emails, infos).
 * Utilisé UNIQUEMENT pour l'enrichissement. L'envoi d'emails se fait via Unipile.
 */

const APOLLO_BASE = "https://api.apollo.io/api/v1";

function getApiKey(): string {
  return (process.env.APOLLO_API_KEY ?? "").trim();
}

export function isApolloConfigured(): boolean {
  return !!getApiKey();
}

/**
 * Nettoie le nom d'entreprise extrait de LinkedIn
 * (supprime "k abonnés", "followers", chiffres parasites, etc.)
 */
function cleanCompanyName(raw: string): string {
  return raw
    .replace(/\d+[\s,.]?\d*\s*k?\s*(abonnés|followers|abonné|follower)/gi, "")
    .replace(/\s*·\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export interface EnrichPersonInput {
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  linkedinUrl?: string;
}

export interface EnrichPersonResult {
  email: string | null;
  email_status: string | null;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  organization_name: string | null;
  linkedin_url: string | null;
  photo_url: string | null;
  id?: string;
  phone_numbers?: Array<{ raw_number: string }>;
}

interface ApolloPersonResponse {
  person?: {
    id?: string;
    email?: string | null;
    email_status?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    title?: string | null;
    organization_name?: string | null;
    linkedin_url?: string | null;
    photo_url?: string | null;
    phone_numbers?: Array<{ raw_number: string }>;
  };
}

export async function enrichPerson(input: EnrichPersonInput): Promise<EnrichPersonResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("APOLLO_API_KEY non configuré");
  }

  const cleaned: EnrichPersonInput = {
    ...input,
    organizationName: input.organizationName ? cleanCompanyName(input.organizationName) : undefined,
  };

  console.log("[Apollo] enrichPerson input:", JSON.stringify(cleaned));

  // 1. Essayer people/match
  const matchResult = await enrichViaMatch(apiKey, cleaned);
  if (matchResult?.email) {
    console.log("[Apollo] Match trouvé avec email:", matchResult.email, "status:", matchResult.email_status);
    return matchResult;
  }

  // 2. Fallback : mixed_people/search
  const searchResult = await enrichViaSearch(apiKey, cleaned);
  if (searchResult?.email) {
    console.log("[Apollo] Search trouvé avec email:", searchResult.email, "status:", searchResult.email_status);
    return searchResult;
  }

  console.log("[Apollo] Aucun email trouvé pour", cleaned.firstName, cleaned.lastName);
  return searchResult ?? matchResult;
}


async function enrichViaMatch(apiKey: string, input: EnrichPersonInput): Promise<EnrichPersonResult | null> {
  const body: Record<string, unknown> = {};
  if (input.linkedinUrl?.trim()) body.linkedin_url = input.linkedinUrl.trim();
  if (input.firstName?.trim()) body.first_name = input.firstName.trim();
  if (input.lastName?.trim()) body.last_name = input.lastName.trim();
  if (input.organizationName?.trim()) body.organization_name = input.organizationName.trim();

  body.reveal_personal_emails = true;

  if (!input.linkedinUrl && !input.firstName && !input.lastName) return null;

  try {
    console.log("[Apollo] people/match body:", JSON.stringify(body));

    const res = await fetch(`${APOLLO_BASE}/people/match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    console.log("[Apollo] people/match status:", res.status);

    if (res.status === 429) {
      throw new Error("Limite de requêtes Apollo atteinte. Réessayez dans quelques secondes.");
    }
    if (res.status === 402) {
      throw new Error("Crédits Apollo épuisés.");
    }
    if (res.status === 403 || res.status === 401) {
      console.log("[Apollo] people/match accès refusé (403/401), fallback vers search");
      return null;
    }

    const data = (await res.json().catch(() => ({}))) as ApolloPersonResponse & { error?: string };
    console.log("[Apollo] people/match response:", JSON.stringify({
      hasPersonObject: !!data.person,
      email: data.person?.email ?? null,
      email_status: data.person?.email_status ?? null,
      name: data.person ? `${data.person.first_name} ${data.person.last_name}` : null,
      error: data.error,
    }));

    if (!res.ok) return null;

    const person = data.person;
    if (!person) return null;

    return {
      email: person.email ?? null,
      email_status: person.email_status ?? null,
      first_name: person.first_name ?? null,
      last_name: person.last_name ?? null,
      title: person.title ?? null,
      organization_name: person.organization_name ?? null,
      linkedin_url: person.linkedin_url ?? null,
      photo_url: person.photo_url ?? null,
      id: person.id,
      phone_numbers: person.phone_numbers,
    };
  } catch (err) {
    console.error("[Apollo] people/match error:", err);
    if (err instanceof Error && /limite|rate|crédit/i.test(err.message)) throw err;
    return null;
  }
}

async function enrichViaSearch(apiKey: string, input: EnrichPersonInput): Promise<EnrichPersonResult | null> {
  const fullName = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();
  if (!fullName) return null;

  // Essai 1 : avec nom de la personne (sans filtrer par entreprise pour maximiser les chances)
  const body: Record<string, unknown> = {
    q_keywords: fullName,
    page: 1,
    per_page: 5,
    reveal_personal_emails: true,
  };

  // Ajouter l'entreprise comme filtre si disponible
  if (input.organizationName?.trim()) {
    body.q_organization_name = input.organizationName.trim();
  }

  console.log("[Apollo] mixed_people/search body:", JSON.stringify(body));

  let res = await fetch(`${APOLLO_BASE}/mixed_people/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  console.log("[Apollo] mixed_people/search status:", res.status);

  // Si 403, essayer sans reveal_personal_emails
  if (res.status === 403) {
    console.log("[Apollo] 403 avec reveal_personal_emails, retry sans...");
    delete body.reveal_personal_emails;
    res = await fetch(`${APOLLO_BASE}/mixed_people/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });
    console.log("[Apollo] mixed_people/search (sans reveal) status:", res.status);
  }

  if (res.status === 429) {
    throw new Error("Limite de requêtes Apollo atteinte.");
  }
  if (res.status === 402) {
    throw new Error("Crédits Apollo épuisés.");
  }
  if (res.status === 403 || res.status === 401) {
    console.log("[Apollo] search aussi refusé, l'API n'est pas accessible sur ce plan");
    return null;
  }

  const data = (await res.json().catch(() => ({}))) as {
    people?: Array<{
      id?: string;
      email?: string | null;
      email_status?: string | null;
      first_name?: string;
      last_name?: string;
      title?: string | null;
      organization?: { name?: string | null };
      linkedin_url?: string | null;
      photo_url?: string | null;
      phone_numbers?: Array<{ raw_number: string }>;
    }>;
  };

  console.log("[Apollo] mixed_people/search résultats:", data.people?.length ?? 0, "personnes trouvées");
  if (data.people?.length) {
    data.people.forEach((p, i) => {
      console.log(`[Apollo]   [${i}] ${p.first_name} ${p.last_name} - email: ${p.email ?? "null"} (${p.email_status ?? "null"}) - linkedin: ${p.linkedin_url ?? "null"}`);
    });
  }

  if (!res.ok || !data.people?.length) return null;

  const nameLC = fullName.toLowerCase();
  const linkedinSlug = input.linkedinUrl
    ? input.linkedinUrl.toLowerCase().match(/linkedin\.com\/in\/([^/?\s]+)/)?.[1] ?? ""
    : "";

  let best = data.people[0];
  for (const p of data.people) {
    const pName = `${p.first_name ?? ""} ${p.last_name ?? ""}`.toLowerCase().trim();
    const pSlug = p.linkedin_url
      ? p.linkedin_url.toLowerCase().match(/linkedin\.com\/in\/([^/?\s]+)/)?.[1] ?? ""
      : "";

    if (linkedinSlug && pSlug === linkedinSlug) { best = p; break; }
    if (pName === nameLC) { best = p; break; }
  }

  console.log("[Apollo] Best match:", best.first_name, best.last_name, "email:", best.email);

  return {
    email: best.email ?? null,
    email_status: best.email_status ?? null,
    first_name: best.first_name ?? null,
    last_name: best.last_name ?? null,
    title: best.title ?? null,
    organization_name: best.organization?.name ?? null,
    linkedin_url: best.linkedin_url ?? null,
    photo_url: best.photo_url ?? null,
    id: best.id,
    phone_numbers: best.phone_numbers,
  };
}

export interface SearchPeopleInput {
  personTitles?: string[];
  personLocations?: string[];
  organizationNames?: string[];
  page?: number;
  perPage?: number;
}

export interface SearchPeopleItem {
  id: string;
  email: string | null;
  email_status: string | null;
  first_name: string;
  last_name: string;
  title: string | null;
  organization_name: string | null;
  linkedin_url: string | null;
  photo_url: string | null;
}

export interface SearchPeopleResult {
  people: SearchPeopleItem[];
  pagination: { page: number; per_page: number; total_entries: number };
}

export async function searchPeople(input: SearchPeopleInput): Promise<SearchPeopleResult> {
  const apiKeySearch = getApiKey();
  if (!apiKeySearch) {
    throw new Error("APOLLO_API_KEY non configuré");
  }

  const body: Record<string, unknown> = {
    person_titles: input.personTitles ?? [],
    person_locations: input.personLocations ?? [],
    q_organization_domains: (input.organizationNames ?? []).map((n) =>
      n.includes(".") ? n : `${n}.com`
    ),
    page: input.page ?? 1,
    per_page: input.perPage ?? 25,
  };

  const res = await fetch(`${APOLLO_BASE}/mixed_people/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "x-api-key": apiKeySearch,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    throw new Error("Limite de requêtes Apollo atteinte.");
  }
  if (res.status === 402) {
    throw new Error("Crédits Apollo épuisés.");
  }

  const data = (await res.json().catch(() => ({}))) as {
    people?: Array<{
      id?: string;
      email?: string | null;
      email_status?: string | null;
      first_name?: string;
      last_name?: string;
      title?: string | null;
      organization?: { name?: string | null };
      linkedin_url?: string | null;
      photo_url?: string | null;
    }>;
    pagination?: { page?: number; per_page?: number; total_entries?: number };
  };

  const people = (data.people ?? []).map((p) => ({
    id: p.id ?? "",
    email: p.email ?? null,
    email_status: p.email_status ?? null,
    first_name: p.first_name ?? "",
    last_name: p.last_name ?? "",
    title: p.title ?? null,
    organization_name: p.organization?.name ?? null,
    linkedin_url: p.linkedin_url ?? null,
    photo_url: p.photo_url ?? null,
  }));

  return {
    people,
    pagination: {
      page: data.pagination?.page ?? 1,
      per_page: data.pagination?.per_page ?? 25,
      total_entries: data.pagination?.total_entries ?? 0,
    },
  };
}

export interface ApolloCreditsResult {
  credits?: number;
  plan?: string;
  valid?: boolean;
}

export async function getCredits(): Promise<ApolloCreditsResult> {
  const apiKeyCredits = getApiKey();
  if (!apiKeyCredits) {
    return { valid: false };
  }

  const res = await fetch(`${APOLLO_BASE}/auth/health`, {
    method: "GET",
    headers: {
      "Cache-Control": "no-cache",
      "x-api-key": apiKeyCredits,
    },
  });

  const data = (await res.json().catch(() => ({}))) as {
    credits?: number;
    plan?: string;
    valid?: boolean;
  };

  return {
    credits: data.credits,
    plan: data.plan,
    valid: res.ok && data.valid !== false,
  };
}
