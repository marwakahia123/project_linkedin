import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export async function PATCH(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const proxyHost = "proxy_host" in body ? (body.proxy_host?.trim() || null) : undefined;
  const proxyPort = "proxy_port" in body ? (body.proxy_port != null ? Number(body.proxy_port) : null) : undefined;
  const proxyUsername = "proxy_username" in body ? (body.proxy_username?.trim() || null) : undefined;
  const proxyPassword = "proxy_password" in body ? (body.proxy_password?.trim() || null) : undefined;
  const resetRestricted = body.reset_account_restricted === true;

  const update: Record<string, unknown> = {};
  if (proxyHost !== undefined) update.proxy_host = proxyHost;
  if (proxyPort !== undefined) update.proxy_port = proxyPort;
  if (proxyUsername !== undefined) update.proxy_username = proxyUsername;
  if (proxyPassword !== undefined) update.proxy_password = proxyPassword;
  if (resetRestricted) update.account_restricted = false;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Aucune donnée à mettre à jour" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("linkedin_sessions")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json(
      { error: "Connectez d'abord votre compte LinkedIn pour configurer le proxy." },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("linkedin_sessions")
    .update(update)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
