import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";
import { unipileClient, isUnipileConfigured } from "@/src/lib/unipile/client";

export const maxDuration = 90;

interface UnipilePeopleItem {
  type?: string;
  id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  member_urn?: string;
  public_identifier?: string;
  public_profile_url?: string;
  profile_url?: string;
  profile_picture_url?: string;
  headline?: string;
  location?: string;
  current_positions?: Array<{ role?: string; company?: string }>;
}

interface ProspectResult {
  full_name: string;
  job_title: string;
  company: string;
  linkedin_url: string;
  profile_photo: string | null;
}

function extractSlugFromProfileUrl(url: string): string {
  const match = url?.match(/linkedin\.com\/in\/([^/?]+)/);
  return match ? match[1] : "";
}

function toProspectResult(item: UnipilePeopleItem): ProspectResult | null {
  const name = item.name ?? ([item.first_name, item.last_name].filter(Boolean).join(" ") || "Inconnu");
  const profileUrl = (item.public_profile_url ?? item.profile_url) ?? "";
  const slug = extractSlugFromProfileUrl(profileUrl);
  const linkedinUrl = slug ? `https://www.linkedin.com/in/${slug}/` : profileUrl;
  if (!linkedinUrl) return null;

  let jobTitle = "";
  let company = "";
  if (item.current_positions?.[0]) {
    jobTitle = item.current_positions[0].role ?? "";
    company = item.current_positions[0].company ?? "";
  }
  if (!jobTitle && item.headline) {
    const parts = item.headline.split(/\s*[·•@]\s*/);
    jobTitle = parts[0]?.trim() ?? "";
    company = parts[1]?.trim() ?? "";
  }

  return {
    full_name: name,
    job_title: jobTitle,
    company,
    linkedin_url: linkedinUrl,
    profile_photo: item.profile_picture_url ?? null,
  };
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    if (!isUnipileConfigured()) {
      return NextResponse.json(
        { error: "Unipile non configuré (UNIPILE_API_URL, UNIPILE_ACCESS_TOKEN)" },
        { status: 500 }
      );
    }

    const sessionRes = await supabase
      .from("linkedin_sessions")
      .select("unipile_account_id, status")
      .eq("user_id", user.id)
      .single();

    if (sessionRes.error || !sessionRes.data?.unipile_account_id || sessionRes.data.status !== "connected") {
      return NextResponse.json(
        { error: "Connectez d'abord votre compte LinkedIn dans Paramètres LinkedIn." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const jobTitle = (body.jobTitle ?? body.job_title ?? "").trim();
    const industryIds: number[] = body.industryIds ?? [];
    const locationIds: number[] = body.locationIds ?? [];

    const searchBody: Record<string, unknown> = {
      api: "classic",
      category: "people",
      keywords: jobTitle || " ",
    };

    if (industryIds.length > 0) {
      searchBody.industry = industryIds.map(String);
    }
    if (locationIds.length > 0) {
      searchBody.location = locationIds.map(String);
    }

    console.log("[LinkedIn search] Params:", JSON.stringify(searchBody));

    const response = await unipileClient.request.send({
      method: "POST",
      path: ["linkedin", "search"],
      parameters: { account_id: sessionRes.data.unipile_account_id, limit: "50", start: "0" },
      headers: { "Content-Type": "application/json" },
      body: searchBody,
      options: { validateRequestPayload: false },
    }) as { items?: UnipilePeopleItem[] };

    const items = response.items ?? [];
    const results: ProspectResult[] = items
      .filter((i) => i.type === "PEOPLE")
      .map(toProspectResult)
      .filter((r): r is ProspectResult => r !== null);

    const existing = await supabase
      .from("prospects")
      .select("linkedin_url")
      .eq("user_id", user.id);

    const existingUrls = new Set(
      (existing.data ?? []).map((p) => p.linkedin_url?.toLowerCase()).filter(Boolean)
    );

    const list = results.filter(
      (p) => p.linkedin_url && !existingUrls.has(p.linkedin_url.toLowerCase())
    );

    return NextResponse.json({
      prospects: list.slice(0, 50),
      debug: {
        scraped: results.length,
        afterDedupe: list.length,
      },
    });
  } catch (err) {
    console.error("[LinkedIn search] Erreur complète:", err);
    const unipileBody = (err as { body?: { message?: string; type?: string; title?: string } })?.body;
    const unipileMsg = unipileBody?.message ?? unipileBody?.type ?? unipileBody?.title;
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    const detail = unipileMsg ? `${message} (Unipile: ${unipileMsg})` : message;
    console.error("[LinkedIn search] Detail:", detail, "Body:", JSON.stringify(unipileBody));
    return NextResponse.json(
      { error: "Recherche échouée: " + detail },
      { status: 500 }
    );
  }
}
