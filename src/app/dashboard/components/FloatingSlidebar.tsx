"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function FloatingSlidebar() {
  const router = useRouter();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [tooltip, setTooltip] = useState(false);
  const draggingRef = useRef(false);
  const hasMovedRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0, mx: 0, my: 0 });

  const updatePos = useCallback((x: number, y: number) => {
    if (typeof window === "undefined") return;
    const maxX = window.innerWidth - 56;
    const maxY = window.innerHeight - 56;
    setPos({
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY)),
    });
  }, []);

  useEffect(() => {
    const stored = localStorage?.getItem("floating-slidebar-pos");
    if (stored) {
      try {
        const { x, y } = JSON.parse(stored);
        setPos({ x: Math.max(0, x), y: Math.max(0, y) });
      } catch {
        setPos({ x: window.innerWidth - 60, y: window.innerHeight / 2 - 28 });
      }
    } else if (typeof window !== "undefined") {
      setPos({ x: window.innerWidth - 60, y: window.innerHeight / 2 - 28 });
    }
  }, []);

  useEffect(() => {
    if (pos) {
      localStorage?.setItem("floating-slidebar-pos", JSON.stringify(pos));
    }
  }, [pos]);

  useEffect(() => {
    if (!pos) return;
    const onMove = (e: MouseEvent) => {
      if (draggingRef.current) {
        const dx = e.clientX - startRef.current.mx;
        const dy = e.clientY - startRef.current.my;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMovedRef.current = true;
        updatePos(startRef.current.x + dx, startRef.current.y + dy);
      }
    };
    const onUp = () => {
      draggingRef.current = false;
      setTimeout(() => { hasMovedRef.current = false; }, 50);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [pos, updatePos]);

  useEffect(() => {
    if (!pos) return;
    const onTouchMove = (e: TouchEvent) => {
      if (draggingRef.current && e.touches[0]) {
        const t = e.touches[0];
        const dx = t.clientX - startRef.current.mx;
        const dy = t.clientY - startRef.current.my;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMovedRef.current = true;
        updatePos(startRef.current.x + dx, startRef.current.y + dy);
      }
    };
    const onTouchEnd = () => {
      draggingRef.current = false;
      setTimeout(() => { hasMovedRef.current = false; }, 50);
    };
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pos, updatePos]);

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    draggingRef.current = true;
    startRef.current = {
      x: pos?.x ?? 0,
      y: pos?.y ?? 0,
      mx: clientX,
      my: clientY,
    };
  };

  const handleClick = (e: React.MouseEvent) => {
    if (hasMovedRef.current) {
      e.preventDefault();
      return;
    }
    router.push("/dashboard/prospects");
  };

  if (!pos) return null;

  return (
    <div
      className="fixed z-50"
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
    >
      {tooltip && (
        <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-lg whitespace-nowrap">
          Glissez pour déplacer
        </div>
      )}
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setTooltip(true)}
        onMouseLeave={() => setTooltip(false)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#C2410C] text-white shadow-[0_0_24px_rgba(234,88,12,0.5)] transition hover:bg-[#EA580C] hover:shadow-[0_0_32px_rgba(234,88,12,0.6)] active:scale-95"
        style={{ touchAction: "none" }}
        aria-label="Recherche prospect"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" strokeWidth={2} />
          <path strokeLinecap="round" strokeWidth={2} d="m21 21-4.35-4.35" />
        </svg>
      </button>
    </div>
  );
}
