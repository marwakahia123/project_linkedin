"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase";

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          router.replace("/dashboard");
        } else {
          router.replace("/login");
        }
      }).catch(() => {
        router.replace("/login");
      });
    } catch {
      router.replace("/login");
    }
  }, [mounted, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0B]">
      <p className="text-[#A1A1AA]">Chargement…</p>
    </div>
  );
}
