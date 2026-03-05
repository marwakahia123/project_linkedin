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
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString();

  const [invitedResult, sessionResult, prospectsResult] = await Promise.all([
    supabase
      .from("prospects")
      .select("id")
      .eq("user_id", user.id)
      .not("invited_at", "is", null)
      .gte("invited_at", `${today}T00:00:00Z`)
      .lte("invited_at", `${today}T23:59:59.999Z`),
    supabase
      .from("linkedin_sessions")
      .select("first_invitation_at, account_restricted")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("prospects")
      .select("id, status, invited_at, first_message_sent_at")
      .eq("user_id", user.id),
  ]);

  let prospects = prospectsResult.data;
  if (prospectsResult.error && prospectsResult.error.message?.includes("first_message_sent_at")) {
    const fallback = await supabase
      .from("prospects")
      .select("id, status, invited_at")
      .eq("user_id", user.id);
    prospects = (fallback.data ?? []).map((p) => ({ ...p, first_message_sent_at: null }));
  }

  const invitedTodayRows = invitedResult.data;
  const session = sessionResult.data;

  const sentToday = invitedTodayRows?.length ?? 0;
  const limit = Number(process.env.INVITATION_DAILY_LIMIT) || getDailyLimit(session?.first_invitation_at ?? null);

  const list = prospects ?? [];
  const connectedThisWeek = list.filter(
    (p) => p.status === "connected" && p.invited_at && p.invited_at >= weekAgoStr
  ).length;
  const messagesSent = list.filter((p) => (p as { first_message_sent_at?: string | null }).first_message_sent_at).length;
  const totalConnected = list.filter((p) => p.status === "connected").length;
  const totalInvited = list.filter((p) => p.status === "invited" || p.status === "connected").length;

  const conversionRate = totalInvited > 0 ? Math.round((totalConnected / totalInvited) * 100) : 0;
  const responseRate = totalConnected > 0 ? Math.round((messagesSent / totalConnected) * 100) : 0;

  return NextResponse.json({
    invitationsToday: sentToday,
    invitationsLimit: limit,
    invitationsAcceptedThisWeek: connectedThisWeek,
    messagesSent,
    responseRate,
    conversionRate,
    accountRestricted: session?.account_restricted ?? false,
  });
}
