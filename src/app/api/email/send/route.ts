import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";
import { isUnipileConfigured } from "@/src/lib/unipile/client";
import { sendEmail } from "@/src/lib/unipile/email";

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

    const body = await request.json().catch(() => ({}));
    const { prospectId, subject, emailBody } = body;

    if (!prospectId || !subject || !emailBody) {
      return NextResponse.json(
        { error: "prospectId, subject et emailBody sont requis" },
        { status: 400 }
      );
    }

    const { data: prospect, error: prospectError } = await supabase
      .from("prospects")
      .select("id, user_id, full_name, email, email_status")
      .eq("id", prospectId)
      .eq("user_id", user.id)
      .single();

    if (prospectError || !prospect) {
      return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 });
    }

    if (!prospect.email) {
      return NextResponse.json(
        { error: "Ce prospect n'a pas d'email. Enrichissez-le d'abord via Apollo." },
        { status: 400 }
      );
    }

    const sessionRes = await supabase
      .from("linkedin_sessions")
      .select("unipile_account_id, status")
      .eq("user_id", user.id)
      .single();

    if (
      sessionRes.error ||
      !sessionRes.data?.unipile_account_id ||
      sessionRes.data.status !== "connected"
    ) {
      return NextResponse.json(
        { error: "Connectez votre compte LinkedIn/Email dans les paramètres." },
        { status: 400 }
      );
    }

    const result = await sendEmail({
      accountId: sessionRes.data.unipile_account_id,
      to: prospect.email,
      toName: prospect.full_name,
      subject,
      body: emailBody,
    });

    await supabase
      .from("prospects")
      .update({ email_sent_at: new Date().toISOString() })
      .eq("id", prospect.id)
      .eq("user_id", user.id);

    return NextResponse.json({
      success: true,
      trackingId: result.trackingId,
      message: `Email envoyé à ${prospect.full_name} (${prospect.email})`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[Email send] Erreur:", err);
    return NextResponse.json(
      { error: "Échec envoi email: " + message },
      { status: 500 }
    );
  }
}
