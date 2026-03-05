import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";
import { searchPeople, isApolloConfigured } from "@/src/lib/apollo/client";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    if (!isApolloConfigured()) {
      return NextResponse.json(
        { error: "Apollo non configuré (APOLLO_API_KEY manquant)" },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const titles = Array.isArray(body.titles) ? body.titles : body.titles ? [body.titles] : [];
    const locations = Array.isArray(body.locations) ? body.locations : body.locations ? [body.locations] : [];
    const companies = Array.isArray(body.companies) ? body.companies : body.companies ? [body.companies] : [];
    const page = Number(body.page) || 1;

    const result = await searchPeople({
      personTitles: titles.filter(Boolean),
      personLocations: locations.filter(Boolean),
      organizationNames: companies.filter(Boolean),
      page,
      perPage: 25,
    });

    return NextResponse.json({
      success: true,
      people: result.people,
      pagination: result.pagination,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json(
      { error: "Recherche Apollo échouée: " + message },
      { status: 500 }
    );
  }
}
