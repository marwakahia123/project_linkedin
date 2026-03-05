import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

const TEMPLATE_TYPES = ["premier_contact", "relance", "remerciement", "cloture", "autre"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.label !== undefined) updates.label = body.label?.trim() || null;
  if (body.body !== undefined) {
    const b = body.body?.trim();
    if (!b) return NextResponse.json({ error: "Le contenu ne peut pas être vide." }, { status: 400 });
    updates.body = b;
  }
  if (body.is_default !== undefined) updates.is_default = !!body.is_default;
  if (body.type !== undefined) {
    if (!TEMPLATE_TYPES.includes(body.type)) {
      return NextResponse.json({ error: "Type invalide." }, { status: 400 });
    }
    updates.type = body.type;
  }

  if (Object.keys(updates).length <= 1) {
    return NextResponse.json({ error: "Aucune modification fournie." }, { status: 400 });
  }

  if (updates.is_default && updates.type) {
    await supabase
      .from("message_templates")
      .update({ is_default: false })
      .eq("user_id", user.id)
      .eq("type", updates.type);
  } else if (updates.is_default) {
    const { data: existing } = await supabase
      .from("message_templates")
      .select("type")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (existing?.type) {
      await supabase
        .from("message_templates")
        .update({ is_default: false })
        .eq("user_id", user.id)
        .eq("type", existing.type);
    }
  }

  const { data, error } = await supabase
    .from("message_templates")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, type, label, body, is_default, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Template introuvable." }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;

  const { error } = await supabase
    .from("message_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
