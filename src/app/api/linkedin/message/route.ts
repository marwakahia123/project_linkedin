import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";
import { unipileClient, isUnipileConfigured } from "@/src/lib/unipile/client";
import OpenAI from "openai";

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
      .select("unipile_account_id, status")
      .eq("user_id", user.id)
      .single();

    if (sessionRes.error || !sessionRes.data?.unipile_account_id || sessionRes.data.status !== "connected") {
      return NextResponse.json(
        { error: "Connectez votre compte LinkedIn." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const prospectId = body.prospectId ?? body.prospect_id;
    const customMessage = body.message?.trim();

    if (!prospectId) {
      return NextResponse.json({ error: "prospectId requis" }, { status: 400 });
    }

    const { data: prospect, error: prospectError } = await supabase
      .from("prospects")
      .select("id, user_id, full_name, linkedin_url, job_title, company, status")
      .eq("id", prospectId)
      .eq("user_id", user.id)
      .single();

    if (prospectError || !prospect) {
      return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 });
    }

    if (prospect.status !== "connected") {
      return NextResponse.json(
        { error: "Le prospect doit avoir accepté l'invitation (statut connecté) pour envoyer un message." },
        { status: 400 }
      );
    }

    if (!prospect.linkedin_url?.trim()) {
      return NextResponse.json({ error: "Prospect sans URL LinkedIn" }, { status: 400 });
    }

    const identifier = extractIdentifierFromUrl(prospect.linkedin_url.trim());
    const accountId = sessionRes.data.unipile_account_id;

    let messageText = customMessage;
    if (!messageText) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "OPENAI_API_KEY requis pour générer un message personnalisé." },
          { status: 500 }
        );
      }
      const openai = new OpenAI({ apiKey });
      const prompt = `Tu es un professionnel qui envoie un premier message LinkedIn après qu'un prospect a accepté son invitation. 
Génère un message court (2-4 phrases max), personnalisé, professionnel et chaleureux.
Prospect: ${prospect.full_name}${prospect.job_title ? `, ${prospect.job_title}` : ""}${prospect.company ? ` chez ${prospect.company}` : ""}.
Ne mets pas de guillemets autour du message. Réponds uniquement avec le texte du message.`;
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 256,
        messages: [{ role: "user", content: prompt }],
      });
      const content = response.choices[0]?.message?.content;
      messageText = content?.trim() ?? "";
    }

    if (!messageText) {
      return NextResponse.json({ error: "Impossible de générer le message." }, { status: 500 });
    }

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

    const chat = await unipileClient.messaging.startNewChat({
      account_id: accountId,
      attendees_ids: [providerId],
      text: messageText,
    });

    const chatId = (chat as { chat_id?: string }).chat_id ?? (chat as { id?: string }).id;
    if (!chatId) {
      return NextResponse.json({ error: "Chat créé mais ID non retourné par Unipile" }, { status: 500 });
    }

    // Marquer first_message_sent_at + unipile_chat_id pour afficher dans l'inbox
    const { error: updateError } = await supabase
      .from("prospects")
      .update({
        first_message_sent_at: new Date().toISOString(),
        unipile_chat_id: chatId,
      })
      .eq("id", prospectId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[LinkedIn message] Erreur update:", updateError);
      return NextResponse.json(
        { error: `Message envoyé mais erreur base de données: ${updateError.message}. Exécutez les migrations Supabase.` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Message envoyé",
      chat_id: chatId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json(
      { error: "Échec envoi message: " + message },
      { status: 500 }
    );
  }
}
