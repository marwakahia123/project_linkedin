import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  // Essayer progressivement des selects de plus en plus simples
  const selects = [
    "id, full_name, job_title, company, linkedin_url, profile_photo, status, invited_at, created_at, email, email_status, enriched_at, phone, apollo_id, first_message_sent_at, email_sent_at",
    "id, full_name, job_title, company, linkedin_url, profile_photo, status, invited_at, created_at, email, email_status, enriched_at, phone, apollo_id, first_message_sent_at",
    "id, full_name, job_title, company, linkedin_url, profile_photo, status, invited_at, created_at, email, email_status, enriched_at",
    "id, full_name, job_title, company, linkedin_url, profile_photo, status, invited_at, created_at",
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any[] | null = null;
  let error: { message: string } | null = null;

  for (const sel of selects) {
    let query = supabase
      .from("prospects")
      .select(sel)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);
    const result = await query;
    if (!result.error) {
      data = result.data;
      error = null;
      break;
    }
    error = result.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ prospects: data ?? [] });
}
