import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";
import { isHunterConfigured } from "@/src/lib/hunter/client";

const HUNTER_BASE = "https://api.hunter.io/v2";

const STATUS_LABELS: Record<string, string> = {
  valid: "Vérifié ✓",
  accept_all: "Accepter tout (serveur accepte tout)",
  unknown: "Impossible à vérifier",
  disposable: "Email jetable (non fiable)",
  webmail: "Webmail (Gmail, Outlook…)",
  invalid: "Invalide ✗",
};

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
      return NextResponse.json({ error: "Hunter.io non configuré" }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const { prospectId, email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    const apiKey = (process.env.HUNTER_API_KEY ?? "").trim();
    const url = `${HUNTER_BASE}/email-verifier?email=${encodeURIComponent(email)}&api_key=${apiKey}`;

    console.log("[Hunter] Vérification email:", email);

    const res = await fetch(url, {
      method: "GET",
      headers: { "Cache-Control": "no-cache" },
    });

    // 202 = vérification en cours, réessayer plus tard
    if (res.status === 202) {
      return NextResponse.json({
        status: "pending",
        statusLabel: "Vérification en cours, réessayez dans quelques secondes",
      });
    }

    if (res.status === 429) {
      return NextResponse.json({ error: "Limite Hunter atteinte, réessayez plus tard" }, { status: 429 });
    }
    if (res.status === 402) {
      return NextResponse.json({ error: "Crédits Hunter épuisés" }, { status: 402 });
    }

    const json = (await res.json().catch(() => ({}))) as {
      data?: {
        status?: string;
        result?: string;
        score?: number;
        email?: string;
      };
      errors?: Array<{ details?: string }>;
    };

    if (json.errors?.length) {
      return NextResponse.json({ error: json.errors[0]?.details ?? "Erreur Hunter" }, { status: 400 });
    }

    const status = json.data?.status ?? "unknown";
    const score = json.data?.score ?? 0;

    console.log("[Hunter] Vérification résultat:", email, "→", status, "score:", score);

    // Mapper le statut Hunter vers notre email_status
    let emailStatus = status;
    if (status === "valid") emailStatus = "valid";
    else if (status === "invalid") emailStatus = "invalid";

    // Mettre à jour le prospect en base
    if (prospectId) {
      await supabase
        .from("prospects")
        .update({ email_status: emailStatus })
        .eq("id", prospectId)
        .eq("user_id", user.id);
    }

    return NextResponse.json({
      status,
      statusLabel: STATUS_LABELS[status] ?? status,
      score,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
