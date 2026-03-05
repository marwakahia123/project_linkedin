import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";
import { getDailyLimit } from "@/src/lib/linkedin/warmup";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: rows, error }, { data: session }] = await Promise.all([
    supabase
      .from("prospects")
      .select("id")
      .eq("user_id", user.id)
      .not("invited_at", "is", null)
      .gte("invited_at", `${today}T00:00:00Z`)
      .lte("invited_at", `${today}T23:59:59.999Z`),
    supabase.from("linkedin_sessions").select("first_invitation_at, account_restricted").eq("user_id", user.id).single(),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sentToday = rows?.length ?? 0;
  const limit = Number(process.env.INVITATION_DAILY_LIMIT) || getDailyLimit(session?.first_invitation_at ?? null);

  return NextResponse.json({
    sentToday,
    limit,
    remaining: Math.max(0, limit - sentToday),
    account_restricted: session?.account_restricted ?? false,
  });
}
