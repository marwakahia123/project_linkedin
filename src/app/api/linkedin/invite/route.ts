import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";
import { unipileClient, isUnipileConfigured } from "@/src/lib/unipile/client";
import { getDailyLimit } from "@/src/lib/linkedin/warmup";

export const maxDuration = 60;

function extractIdentifierFromUrl(linkedinUrl: string): string {
  const match = linkedinUrl?.match(/linkedin\.com\/in\/([^/?]+)/);
  return match ? match[1] : linkedinUrl;
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
        { error: "Unipile non configuré" },
        { status: 500 }
      );
    }

    const sessionRes = await supabase
      .from("linkedin_sessions")
      .select("unipile_account_id, status, account_restricted, first_invitation_at")
      .eq("user_id", user.id)
      .single();

    if (sessionRes.error || !sessionRes.data?.unipile_account_id || sessionRes.data.status !== "connected") {
      return NextResponse.json(
        { error: "Connectez votre compte LinkedIn dans Paramètres LinkedIn." },
        { status: 400 }
      );
    }

    if (sessionRes.data.account_restricted) {
      return NextResponse.json(
        { error: "Compte LinkedIn restreint. Vérifiez votre identité sur LinkedIn avant de continuer." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const prospectId = body.prospectId ?? body.prospect_id;
    if (!prospectId) {
      return NextResponse.json({ error: "prospectId requis" }, { status: 400 });
    }

    const { data: prospect, error: prospectError } = await supabase
      .from("prospects")
      .select("id, user_id, full_name, linkedin_url, status")
      .eq("id", prospectId)
      .eq("user_id", user.id)
      .single();

    if (prospectError || !prospect) {
      return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 });
    }

    if (prospect.status !== "new" && prospect.status !== "invited") {
      return NextResponse.json(
        { error: `Prospect déjà traité (statut: ${prospect.status})` },
        { status: 400 }
      );
    }

    const wasNew = prospect.status === "new";

    if (wasNew) {
      const today = new Date().toISOString().slice(0, 10);
      const limit = Number(process.env.INVITATION_DAILY_LIMIT) || getDailyLimit(sessionRes.data.first_invitation_at ?? null);
      const { data: invitedToday, error: countError } = await supabase
        .from("prospects")
        .select("id")
        .eq("user_id", user.id)
        .not("invited_at", "is", null)
        .gte("invited_at", `${today}T00:00:00Z`)
        .lte("invited_at", `${today}T23:59:59.999Z`);

      if (countError) {
        return NextResponse.json({ error: "Erreur lecture limite: " + countError.message }, { status: 500 });
      }
      if ((invitedToday?.length ?? 0) >= limit) {
        return NextResponse.json(
          { error: `Limite quotidienne atteinte (${limit} invitations/jour). Réessayez demain.` },
          { status: 429 }
        );
      }
    }

    if (!prospect.linkedin_url?.trim()) {
      return NextResponse.json({ error: "Prospect sans URL LinkedIn" }, { status: 400 });
    }

    const identifier = extractIdentifierFromUrl(prospect.linkedin_url.trim());
    const accountId = sessionRes.data.unipile_account_id;

    if (prospect.status === "invited") {
      // Vérifier via Unipile si l'invitation a été acceptée (présence dans les relations)
      let found = false;
      const slug = identifier.toLowerCase();

      try {
        let cursor: string | null = null;
        for (let page = 0; page < 5; page++) {
          const relationsRes = await unipileClient.users.getAllRelations({
            account_id: accountId,
            limit: 100,
            ...(cursor ? { cursor } : {}),
          });

          const items = (relationsRes as { items?: Array<{ public_identifier?: string }> }).items ?? [];
          found = items.some(
            (r) => (r.public_identifier ?? "").toLowerCase() === slug
          );
          if (found) break;

          cursor = (relationsRes as { cursor?: string | null }).cursor ?? null;
          if (!cursor) break;
        }
      } catch {
        // En cas d'erreur API Unipile, considérer comme toujours en attente
      }

      if (found) {
        await supabase
          .from("prospects")
          .update({ status: "connected" })
          .eq("id", prospect.id)
          .eq("user_id", user.id);

        return NextResponse.json({
          success: true,
          message: "Connecté",
          prospectId: prospect.id,
          fullName: prospect.full_name,
          alreadyConnected: true,
        });
      }

      return NextResponse.json({
        success: true,
        message: "Invitation encore en attente",
        prospectId: prospect.id,
        fullName: prospect.full_name,
        alreadyConnected: false,
      });
    }

    try {
      const profile = await unipileClient.users.getProfile({
        account_id: accountId,
        identifier,
      }) as { provider_id?: string };

      const providerId = profile.provider_id;
      if (!providerId) {
        return NextResponse.json(
          { error: "Impossible de récupérer l'identifiant du profil LinkedIn." },
          { status: 500 }
        );
      }

      await unipileClient.users.sendInvitation({
        account_id: accountId,
        provider_id: providerId,
        message: "",
      });

      const invitedAt = new Date().toISOString();
      await supabase
        .from("prospects")
        .update({
          status: "invited",
          invited_at: invitedAt,
        })
        .eq("id", prospect.id)
        .eq("user_id", user.id);

      if (!sessionRes.data.first_invitation_at) {
        await supabase
          .from("linkedin_sessions")
          .update({ first_invitation_at: invitedAt })
          .eq("user_id", user.id);
      }

      return NextResponse.json({
        success: true,
        message: "Invitation envoyée",
        prospectId: prospect.id,
        fullName: prospect.full_name,
        alreadyConnected: false,
      });
    } catch (inviteErr) {
      const err = inviteErr as { body?: { type?: string; status?: number } };
      const errorType = err?.body?.type;
      if (errorType === "errors/disconnected_account" || err?.body?.status === 403) {
        await supabase
          .from("linkedin_sessions")
          .update({ account_restricted: true })
          .eq("user_id", user.id);
        return NextResponse.json(
          { error: "Compte LinkedIn restreint. Vérifiez votre identité sur LinkedIn." },
          { status: 403 }
        );
      }
      const msg = inviteErr instanceof Error ? inviteErr.message : "Erreur inconnue";
      return NextResponse.json(
        { error: "Échec envoi invitation: " + msg },
        { status: 500 }
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json(
      { error: "Échec envoi invitation: " + message },
      { status: 500 }
    );
  }
}
