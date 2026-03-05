import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";
import { getAccount, isHunterConfigured } from "@/src/lib/hunter/client";

/**
 * Vérifie si Hunter.io est configuré et retourne les crédits restants.
 */
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
      return NextResponse.json({ configured: false, credits: null });
    }

    try {
      const account = await getAccount();
      if (!account.valid) {
        return NextResponse.json({ configured: false, credits: null });
      }

      const remaining = account.searches_available - account.searches_used;
      return NextResponse.json({
        configured: true,
        credits: remaining,
        plan: account.plan_name,
        resetDate: account.reset_date,
      });
    } catch {
      return NextResponse.json({ configured: true, credits: null });
    }
  } catch {
    return NextResponse.json({ configured: false, credits: null });
  }
}
