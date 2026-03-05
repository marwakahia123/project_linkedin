import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";
import { findEmail, isHunterConfigured } from "@/src/lib/hunter/client";

function parseFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  const lastName = parts.pop() ?? "";
  const firstName = parts.join(" ");
  return { firstName, lastName };
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

    if (!isHunterConfigured()) {
      return NextResponse.json(
        { error: "Hunter.io non configuré (HUNTER_API_KEY manquant dans .env.local)" },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const prospectId = body.prospectId ?? body.prospect_id;
    if (!prospectId) {
      return NextResponse.json({ error: "prospectId requis" }, { status: 400 });
    }

    const { data: prospect, error: prospectError } = await supabase
      .from("prospects")
      .select("id, user_id, full_name, job_title, company, linkedin_url")
      .eq("id", prospectId)
      .eq("user_id", user.id)
      .single();

    if (prospectError || !prospect) {
      return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 });
    }

    const { firstName, lastName } = parseFullName(prospect.full_name ?? "");

    const result = await findEmail({
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      company: prospect.company ?? undefined,
      linkedinUrl: prospect.linkedin_url ?? undefined,
    });

    const enrichedAt = new Date().toISOString();
    const updateData: Record<string, unknown> = {
      enriched_at: enrichedAt,
    };

    if (result?.email) {
      updateData.email = result.email;
      updateData.email_status = result.verification_status ?? "found";
      updateData.phone = result.phone_number ?? null;
    }

    await supabase
      .from("prospects")
      .update(updateData)
      .eq("id", prospect.id)
      .eq("user_id", user.id);

    const enriched = !!result?.email;
    const emailStatus = result?.verification_status ?? null;

    return NextResponse.json({
      success: true,
      enriched,
      guessed: false,
      emailStatus,
      score: result?.score ?? null,
      person: result ? {
        email: result.email,
        email_status: emailStatus,
        position: result.position,
        company: result.company,
        domain: result.domain,
        linkedin_url: result.linkedin_url,
        phone_number: result.phone_number,
      } : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json(
      { error: "Enrichissement échoué: " + message },
      { status: 500 }
    );
  }
}
