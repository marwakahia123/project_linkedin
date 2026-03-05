"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

interface LinkedInParam {
  id: string;
  title: string;
}

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const INDUSTRY_HINTS: Record<string, string[]> = {
  "publicité": ["advertising"],
  "publicitaire": ["advertising"],
  "objet publicitaire": ["advertising", "promotional"],
  "marketing": ["marketing"],
  "tech": ["technology", "software"],
  "technologie": ["technology"],
  "informatique": ["information technology", "software", "computer"],
  "santé": ["health", "hospital", "medical"],
  "finance": ["financial", "banking"],
  "banque": ["banking"],
  "immobilier": ["real estate"],
  "éducation": ["education"],
  "automobile": ["automotive"],
  "mode": ["fashion", "apparel"],
  "luxe": ["luxury", "fashion"],
  "restauration": ["food", "restaurant"],
  "construction": ["construction"],
  "transport": ["transportation"],
  "énergie": ["energy", "oil"],
  "juridique": ["legal", "law"],
  "assurance": ["insurance"],
  "conseil": ["consulting"],
  "commerce": ["retail", "wholesale"],
  "média": ["media", "broadcast"],
  "telecom": ["telecommunications"],
  "agriculture": ["farming", "agriculture"],
  "industrie": ["manufacturing", "industrial"],
  "pharmaceutique": ["pharmaceutical"],
  "aéronautique": ["aviation", "aerospace"],
  "sport": ["sports"],
  "hôtellerie": ["hospitality", "hotel"],
  "tourisme": ["travel", "tourism"],
};

function ParamAutocomplete({
  label,
  placeholder,
  type,
  selected,
  onSelect,
  onClear,
  onTextChange,
}: {
  label: string;
  placeholder: string;
  type: "INDUSTRY" | "LOCATION";
  selected: LinkedInParam | null;
  onSelect: (item: LinkedInParam) => void;
  onClear: () => void;
  onTextChange?: (text: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LinkedInParam[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [searched, setSearched] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounced = useDebounce(query, 400);

  useEffect(() => {
    if (!debounced || debounced.length < 2) {
      setSuggestions([]);
      setSearched(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setSearched(false);
      try {
        const allItems: LinkedInParam[] = [];
        const seen = new Set<string>();

        const res = await fetch(
          `/api/linkedin/search-params?type=${type}&keywords=${encodeURIComponent(debounced)}&limit=8`
        );
        const data = await res.json().catch(() => ({}));
        for (const item of data.items ?? []) {
          if (!seen.has(item.id)) { seen.add(item.id); allItems.push(item); }
        }

        if (type === "INDUSTRY" && allItems.length === 0) {
          const lc = debounced.toLowerCase().trim();
          const englishTerms = INDUSTRY_HINTS[lc] ?? [];
          for (const term of englishTerms) {
            if (cancelled) break;
            const r2 = await fetch(
              `/api/linkedin/search-params?type=INDUSTRY&keywords=${encodeURIComponent(term)}&limit=5`
            );
            const d2 = await r2.json().catch(() => ({}));
            for (const item of d2.items ?? []) {
              if (!seen.has(item.id)) { seen.add(item.id); allItems.push(item); }
            }
          }
        }

        if (!cancelled) { setSuggestions(allItems); setSearched(true); }
      } catch {
        if (!cancelled) { setSuggestions([]); setSearched(true); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [debounced, type]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (selected) {
    return (
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-600">{label}</label>
        <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2">
          <svg className="h-4 w-4 flex-shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="flex-1 truncate text-sm font-medium text-slate-800">{selected.title}</span>
          <button type="button" onClick={() => { onClear(); onTextChange?.(""); }}
            className="rounded p-0.5 text-slate-400 transition hover:bg-white hover:text-slate-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <label className="mb-1 block text-sm font-medium text-slate-600">{label}</label>
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); onTextChange?.(e.target.value); }}
        onFocus={() => { if (suggestions.length > 0 || searched) setOpen(true); }}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-[#EA580C] focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
      />
      {loading && (
        <div className="absolute right-3 top-9">
          <svg className="h-4 w-4 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}
      {open && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
          <p className="border-b border-slate-100 px-3 py-1.5 text-xs text-slate-400">
            Sélectionnez pour filtrer strictement
          </p>
          <ul className="max-h-48 overflow-auto">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button type="button"
                  onClick={() => { onSelect(s); setQuery(""); setOpen(false); setSuggestions([]); onTextChange?.(""); }}
                  className="w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-orange-50 hover:text-[#EA580C]">
                  {s.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {open && !loading && searched && suggestions.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 shadow-lg">
          <p className="text-sm text-amber-800">Aucune catégorie LinkedIn pour &laquo;&nbsp;{debounced}&nbsp;&raquo;</p>
          <p className="mt-1 text-xs text-amber-600">
            {type === "INDUSTRY"
              ? "Essayez en anglais : advertising, marketing, software, consulting…"
              : "Essayez : Paris, Lyon, France, Île-de-France…"}
          </p>
        </div>
      )}
    </div>
  );
}

interface SearchProspect {
  full_name: string;
  job_title: string;
  company: string;
  linkedin_url: string;
  profile_photo: string | null;
}

interface SavedProspect {
  id: string;
  full_name: string;
  job_title: string | null;
  company: string | null;
  linkedin_url: string | null;
  profile_photo: string | null;
  status: string;
  email: string | null;
  email_status: string | null;
  enriched_at: string | null;
}

export default function DashboardProspectsPage() {
  const [jobTitle, setJobTitle] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<LinkedInParam | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LinkedInParam | null>(null);
  const [industryText, setIndustryText] = useState("");
  const [locationText, setLocationText] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [prospects, setProspects] = useState<SearchProspect[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [savedProspects, setSavedProspects] = useState<SavedProspect[]>([]);
  const [apolloStatus, setApolloStatus] = useState<{ configured: boolean; credits: number | null } | null>(null);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [enrichAllLoading, setEnrichAllLoading] = useState(false);
  const [syncingInvites, setSyncingInvites] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [autoEnriching, setAutoEnriching] = useState(false);

  const fetchSavedProspects = async () => {
    try {
      const res = await fetch("/api/prospects/list");
      const data = await res.json().catch(() => ({}));
      if (res.ok) setSavedProspects(data.prospects ?? []);
    } catch {
      setSavedProspects([]);
    }
  };

  const fetchApolloStatus = async () => {
    try {
      const res = await fetch("/api/apollo/status");
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setApolloStatus({
          configured: data.configured === true,
          credits: data.credits ?? null,
        });
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchSavedProspects();
    fetchApolloStatus();

    // Sync invitations au chargement
    fetch("/api/linkedin/invite/sync-status", { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if ((data.updated ?? 0) > 0) {
          fetchSavedProspects();
          setMessage({ type: "success", text: `${data.updated} invitation(s) acceptée(s) détectée(s).` });
        }
      })
      .catch(() => {});

    // Sync auto des invitations toutes les 5 minutes
    const syncInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/linkedin/invite/sync-status", { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (res.ok && (data.updated ?? 0) > 0) {
          await fetchSavedProspects();
          setMessage({ type: "success", text: `${data.updated} invitation(s) acceptée(s) détectée(s) (sync auto).` });
        }
      } catch {
        // silencieux
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(syncInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchLoading(true);
    setMessage(null);
    setProspects([]);
    setSelected(new Set());

    try {
      const hasIndustryId = !!selectedIndustry;
      const hasLocationId = !!selectedLocation;

      const keywordParts = [jobTitle.trim()];
      if (!hasIndustryId && industryText.trim()) keywordParts.push(industryText.trim());
      if (!hasLocationId && locationText.trim()) keywordParts.push(locationText.trim());
      const keywords = keywordParts.filter(Boolean).join(" ");

      const res = await fetch("/api/linkedin/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: keywords || undefined,
          industryIds: hasIndustryId ? [Number(selectedIndustry.id)] : [],
          locationIds: hasLocationId ? [Number(selectedLocation.id)] : [],
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error || "La recherche a échoué.",
        });
        return;
      }

      setProspects(data.prospects ?? []);
      if ((data.prospects ?? []).length === 0) {
        const dbg = data.debug;
        let text = "Aucun nouveau prospect trouvé (ou déjà en base).";
        if (dbg && typeof dbg.scraped === "number") {
          if (dbg.scraped === 0) {
            text = "LinkedIn n'a renvoyé aucun résultat (vérifiez la connexion LinkedIn ou réessayez).";
          } else if (dbg.afterDedupe === 0) {
            text = "Tous les prospects trouvés sont déjà en base.";
          }
        }
        setMessage({ type: "success", text });
      }
    } catch {
      setMessage({ type: "error", text: "Erreur réseau ou serveur." });
    } finally {
      setSearchLoading(false);
    }
  };

  const toggleSelect = (url: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === prospects.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(prospects.map((p) => p.linkedin_url)));
    }
  };

  const handleSaveSelection = async () => {
    if (selected.size === 0) {
      setMessage({ type: "error", text: "Sélectionnez au moins un prospect." });
      return;
    }
    setSaveLoading(true);
    setMessage(null);

    const toSave = prospects.filter((p) => selected.has(p.linkedin_url));
    try {
      const res = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospects: toSave }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error || "Erreur lors de la sauvegarde.",
        });
        return;
      }

      const savedUrls = new Set(toSave.map((p) => p.linkedin_url));
      setSelected(new Set());
      setProspects((prev) => prev.filter((p) => !savedUrls.has(p.linkedin_url)));
      await fetchSavedProspects();

      // Enrichissement automatique après sauvegarde
      if (apolloStatus?.configured && data.ids?.length) {
        setAutoEnriching(true);
        setMessage({ type: "success", text: `${data.saved ?? toSave.length} prospect(s) sauvegardé(s). Recherche d'emails en cours…` });
        let found = 0;
        for (const id of data.ids as string[]) {
          try {
            const enrichRes = await fetch("/api/apollo/enrich", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prospectId: id }),
            });
            const enrichData = await enrichRes.json().catch(() => ({}));
            if (enrichData.enriched) found++;
          } catch {
            // ignore
          }
          await new Promise((r) => setTimeout(r, 500));
        }
        await fetchSavedProspects();
        await fetchApolloStatus();
        setAutoEnriching(false);
        setMessage({ type: "success", text: `${data.saved ?? toSave.length} prospect(s) sauvegardé(s), ${found} email(s) trouvé(s).` });
      } else {
        setMessage({
          type: "success",
          text: `${data.saved ?? toSave.length} prospect(s) sauvegardé(s).`,
        });
      }
    } catch {
      setMessage({ type: "error", text: "Erreur réseau ou serveur." });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleEnrich = async (prospectId: string) => {
    setEnrichingId(prospectId);
    setMessage(null);
    try {
      const res = await fetch("/api/apollo/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        await fetchSavedProspects();
        await fetchApolloStatus();
        setMessage({
          type: data.enriched ? "success" : "error",
          text: data.enriched
            ? `Email trouvé : ${data.person?.email} (${data.emailStatus ?? "trouvé"}, score: ${data.score ?? "?"})`
            : "Aucun email trouvé. Vérifiez que le prospect a un nom et une entreprise, ou vos crédits sur hunter.io.",
        });
      } else {
        setMessage({ type: "error", text: data.error || "Enrichissement échoué." });
      }
    } catch {
      setMessage({ type: "error", text: "Erreur lors de l'enrichissement." });
    } finally {
      setEnrichingId(null);
    }
  };

  const handleEnrichAll = async () => {
    const toEnrich = savedProspects.filter((p) => !p.email);
    if (toEnrich.length === 0) {
      setMessage({ type: "success", text: "Tous les prospects ont déjà un email." });
      return;
    }
    setEnrichAllLoading(true);
    setMessage(null);
    let done = 0;
    let errors = 0;
    for (const p of toEnrich) {
      try {
        const res = await fetch("/api/apollo/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prospectId: p.id }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.enriched) done++;
        else errors++;
      } catch {
        errors++;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    await fetchSavedProspects();
    await fetchApolloStatus();
    setMessage({
      type: errors === toEnrich.length ? "error" : "success",
      text: `${done} email(s) trouvé(s).${errors > 0 ? ` ${errors} échec(s).` : ""}`,
    });
    setEnrichAllLoading(false);
  };

  const handleSyncInvites = async () => {
    setSyncingInvites(true);
    setMessage(null);
    try {
      const res = await fetch("/api/linkedin/invite/sync-status", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const updated = data.updated ?? 0;
        await fetchSavedProspects();
        setMessage({
          type: "success",
          text: updated > 0
            ? `${updated} invitation(s) acceptée(s) détectée(s).`
            : "Aucune nouvelle invitation acceptée.",
        });
      } else {
        setMessage({ type: "error", text: data.error || "Erreur de synchronisation" });
      }
    } catch {
      setMessage({ type: "error", text: "Erreur réseau" });
    } finally {
      setSyncingInvites(false);
    }
  };

  const handleVerifyEmail = async (prospectId: string, email: string) => {
    setVerifyingId(prospectId);
    setMessage(null);
    try {
      const res = await fetch("/api/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        await fetchSavedProspects();
        setMessage({
          type: data.status === "valid" ? "success" : "error",
          text: `Email ${email} : ${data.statusLabel ?? data.status}`,
        });
      } else {
        setMessage({ type: "error", text: data.error || "Erreur de vérification" });
      }
    } catch {
      setMessage({ type: "error", text: "Erreur réseau" });
    } finally {
      setVerifyingId(null);
    }
  };

  const getEmailStatusBadge = (status: string | null) => {
    if (!status) return null;
    if (status === "verified" || status === "valid") return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Vérifié</span>;
    if (status === "accept_all") return <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">Accepte tout</span>;
    if (status === "found") return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Trouvé</span>;
    if (status === "unknown") return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">Non vérifié</span>;
    if (status === "guessed") return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">Probable</span>;
    return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{status}</span>;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Recherche de prospects</h1>
        <p className="mt-1 text-sm text-slate-500">
          Utilisez les filtres puis lancez la recherche. Sélectionnez les prospects à enregistrer.
        </p>
      </div>

      <form
        onSubmit={handleSearch}
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="jobTitle" className="mb-1 block text-sm font-medium text-slate-600">
              Poste / Titre
            </label>
            <input
              id="jobTitle"
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="ex: Responsable commercial"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-[#EA580C] focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
            />
          </div>
          <ParamAutocomplete
            label="Secteur d'activité"
            placeholder="ex: Publicité, Tech, Santé…"
            type="INDUSTRY"
            selected={selectedIndustry}
            onSelect={setSelectedIndustry}
            onClear={() => setSelectedIndustry(null)}
            onTextChange={setIndustryText}
          />
          <ParamAutocomplete
            label="Localisation"
            placeholder="ex: Paris, France…"
            type="LOCATION"
            selected={selectedLocation}
            onSelect={setSelectedLocation}
            onClear={() => setSelectedLocation(null)}
            onTextChange={setLocationText}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {autoEnriching && (
            <span className="flex items-center gap-2 text-sm text-[#EA580C]">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Recherche d&apos;emails en cours…
            </span>
          )}
          <button
            type="submit"
            disabled={searchLoading || saveLoading || autoEnriching}
            className="rounded-lg bg-[#EA580C] px-6 py-2.5 font-medium text-white transition hover:bg-[#C2410C] disabled:opacity-50"
          >
            {searchLoading ? "Recherche en cours…" : "Lancer la recherche"}
          </button>
          {(selectedIndustry || selectedLocation) && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500">Filtres actifs :</span>
              {selectedIndustry && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">
                  Secteur : {selectedIndustry.title}
                </span>
              )}
              {selectedLocation && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">
                  Lieu : {selectedLocation.title}
                </span>
              )}
            </div>
          )}
          {!selectedIndustry && !selectedLocation && (industryText.trim() || locationText.trim()) && (
            <p className="text-xs text-amber-600">
              Aucun filtre LinkedIn sélectionné — la recherche utilisera les termes comme mots-clés simples.
              Pour un filtrage strict, sélectionnez une suggestion dans les listes déroulantes.
            </p>
          )}
        </div>
      </form>

      {apolloStatus !== null && !apolloStatus.configured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">
            Hunter.io non configuré. Ajoutez <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">HUNTER_API_KEY</code> dans <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">.env.local</code> pour activer l&apos;enrichissement des emails (25 recherches/mois gratuites).
          </p>
        </div>
      )}

      {message && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            message.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </p>
      )}

      {prospects.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600">
              <input
                type="checkbox"
                checked={selected.size === prospects.length}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-slate-300 text-[#EA580C] focus:ring-[#EA580C]"
              />
              Tout sélectionner
            </label>
            <button
              type="button"
              onClick={handleSaveSelection}
              disabled={saveLoading || selected.size === 0}
              className="rounded-lg bg-[#EA580C] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#C2410C] disabled:opacity-50"
            >
              {saveLoading ? "Sauvegarde…" : `Sauvegarder la sélection (${selected.size})`}
            </button>
          </div>
          <ul className="divide-y divide-slate-200">
            {prospects.map((p) => (
              <li
                key={p.linkedin_url}
                className="flex items-center gap-4 px-4 py-3 transition hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selected.has(p.linkedin_url)}
                  onChange={() => toggleSelect(p.linkedin_url)}
                  className="h-4 w-4 rounded border-slate-300 text-[#EA580C] focus:ring-[#EA580C]"
                />
                {p.profile_photo ? (
                  <img
                    src={p.profile_photo}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                    width={48}
                    height={48}
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-lg font-medium text-slate-600">
                    {p.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{p.full_name}</p>
                  <p className="text-sm text-slate-600">
                    <span className="text-slate-500">Poste :</span> {p.job_title || "—"}
                  </p>
                  <p className="text-sm text-slate-600">
                    <span className="text-slate-500">Entreprise :</span> {p.company || "—"}
                  </p>
                </div>
                <a
                  href={p.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-[#EA580C] transition hover:underline"
                >
                  Voir le profil
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-900">Mes prospects sauvegardés</h2>
          <div className="flex items-center gap-4">
            {apolloStatus?.configured && apolloStatus.credits !== null && (
              <span className="text-sm text-slate-600">
                Crédits Hunter : <strong>{apolloStatus.credits}</strong>
              </span>
            )}
            {savedProspects.some((p) => p.email_status === "guessed") && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch("/api/prospects/clear-guessed", { method: "POST" });
                    const data = await res.json().catch(() => ({}));
                    if (res.ok) {
                      setMessage({ type: "success", text: `${data.cleared} email(s) deviné(s) supprimé(s).` });
                      await fetchSavedProspects();
                    } else {
                      setMessage({ type: "error", text: data.error || "Erreur lors de la suppression" });
                    }
                  } catch {
                    setMessage({ type: "error", text: "Erreur réseau" });
                  }
                }}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
              >
                Supprimer emails devinés
              </button>
            )}
            <button
              type="button"
              onClick={handleSyncInvites}
              disabled={syncingInvites}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {syncingInvites ? "Sync…" : "Sync invitations"}
            </button>
            <button
              type="button"
              onClick={handleEnrichAll}
              disabled={!apolloStatus?.configured || enrichAllLoading || savedProspects.filter((p) => !p.email && !p.enriched_at).length === 0}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {enrichAllLoading ? "Enrichissement…" : "Enrichir tout"}
            </button>
            <Link
              href="/dashboard/campaigns"
              className="text-sm font-medium text-[#EA580C] transition hover:underline"
            >
              Campagnes
            </Link>
          </div>
        </div>
        {savedProspects.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">
            Aucun prospect sauvegardé.{" "}
            <span className="font-medium">Lancez une recherche</span> puis sauvegardez des prospects.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {savedProspects.map((p) => (
              <li key={p.id} className="flex items-center gap-4 px-4 py-3 transition hover:bg-slate-50">
                {p.profile_photo ? (
                  <img
                    src={p.profile_photo}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                    width={48}
                    height={48}
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-lg font-medium text-slate-600">
                    {p.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{p.full_name}</p>
                  <p className="text-sm text-slate-600">
                    {p.job_title || "—"} {p.company ? `· ${p.company}` : ""}
                  </p>
                  {p.email && (
                    <p className="mt-0.5 text-sm text-slate-600">
                      <span className="text-slate-500">Email :</span> {p.email}
                      <span className="ml-2">{getEmailStatusBadge(p.email_status)}</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {p.email && !["valid", "verified", "accept_all", "invalid", "unknown", "disposable", "webmail"].includes(p.email_status ?? "") && (
                    <button
                      type="button"
                      onClick={() => handleVerifyEmail(p.id, p.email!)}
                      disabled={verifyingId !== null}
                      className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                    >
                      {verifyingId === p.id ? "…" : "Vérifier"}
                    </button>
                  )}
                  {!p.email && !p.enriched_at && (
                    <button
                      type="button"
                      onClick={() => handleEnrich(p.id)}
                      disabled={!apolloStatus?.configured || enrichingId !== null || enrichAllLoading}
                      className="rounded-lg bg-[#EA580C] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#C2410C] disabled:opacity-50"
                    >
                      {enrichingId === p.id ? "…" : "Enrichir"}
                    </button>
                  )}
                  {!p.email && p.enriched_at && (
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">Non trouvé</span>
                  )}
                  {p.linkedin_url && (
                    <a
                      href={p.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-[#EA580C] hover:underline"
                    >
                      Profil
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
