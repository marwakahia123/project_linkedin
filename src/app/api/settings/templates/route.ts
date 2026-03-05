import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

const TEMPLATE_TYPES = ["premier_contact", "relance", "remerciement", "cloture", "autre"] as const;
const TYPE_LABELS: Record<string, string> = {
  premier_contact: "Premier contact (invitation acceptée)",
  relance: "Relance",
  remerciement: "Remerciement",
  cloture: "Clôture",
  autre: "Autre",
};

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("message_templates")
    .select("id, type, label, body, is_default, created_at, updated_at")
    .eq("user_id", user.id)
    .order("type")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    templates: data ?? [],
    typeLabels: TYPE_LABELS,
    types: TEMPLATE_TYPES,
  });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const type = body.type?.trim();
  const label = body.label?.trim() || null;
  const templateBody = body.body?.trim();
  const isDefault = !!body.is_default;

  if (!type || !TEMPLATE_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `Type invalide. Valeurs acceptées: ${TEMPLATE_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  if (!templateBody) {
    return NextResponse.json({ error: "Le contenu du template est requis." }, { status: 400 });
  }

  if (isDefault) {
    await supabase
      .from("message_templates")
      .update({ is_default: false })
      .eq("user_id", user.id)
      .eq("type", type);
  }

  const { data, error } = await supabase
    .from("message_templates")
    .insert({
      user_id: user.id,
      type,
      label,
      body: templateBody,
      is_default: isDefault,
    })
    .select("id, type, label, body, is_default, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
