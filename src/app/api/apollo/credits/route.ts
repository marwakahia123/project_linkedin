import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";
import { getAccount, isHunterConfigured } from "@/src/lib/hunter/client";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    if (!isHunterConfigured()) {
      return NextResponse.json({
        configured: false,
        credits: null,
        plan: null,
      });
    }

    const account = await getAccount();
    const remaining = account.searches_available - account.searches_used;

    return NextResponse.json({
      configured: account.valid,
      credits: remaining,
      plan: account.plan_name ?? null,
      valid: account.valid,
    });
  } catch {
    return NextResponse.json({
      configured: true,
      credits: null,
      plan: null,
      valid: false,
    });
  }
}
