"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../AuthProvider";
import { getCreditBalance } from "@/lib/creator";
import { LiquidGlassSurface } from "../LiquidGlassSurface";

/** Shared Creator Lab header: brand, credits balance, nav back to app / logout.
 *  Pass `balance` to display a parent-owned value (so stage gating and the header agree);
 *  otherwise the header self-fetches and `reloadKey` bumps force a refetch. */
export default function CreatorHeader({ reloadKey = 0, balance: externalBalance }: { reloadKey?: number; balance?: number | null }) {
  const { user, accessToken, signOut } = useAuth();
  const [selfBalance, setSelfBalance] = useState<number | null>(null);
  const balance = externalBalance !== undefined ? externalBalance : selfBalance;

  useEffect(() => {
    if (externalBalance !== undefined || !accessToken) return;
    let live = true;
    getCreditBalance(accessToken).then((r) => { if (live) setSelfBalance(r.balance); }).catch(() => { if (live) setSelfBalance(null); });
    return () => { live = false; };
  }, [accessToken, reloadKey, externalBalance]);

  return (
    <LiquidGlassSurface regular className="sticky top-0 z-20"><header className="px-4 py-3 sm:px-6 sm:py-4">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2">
        <Link href="/creator" className="inline-flex items-center gap-2 text-[16px] font-semibold tracking-[-.35px] sm:text-[18px]"><span className="grid size-8 place-items-center rounded-xl border border-[#e5b27f]/20 bg-[#e5b27f]/[.08] font-serif text-[18px] italic text-[#e5b27f]">s</span><span>creator <span className="font-normal text-white/55">lab</span></span></Link>
        <span className="hidden truncate text-[12px] text-white/40 md:inline">{user?.email}</span>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <span className="rounded-full border border-[#e5b27f]/20 bg-[#e5b27f]/[.07] px-2.5 py-1.5 text-[11px] font-medium text-[#e7bd94] sm:px-3 sm:text-[12px]" title="Your generation credits">
            {balance == null ? "…" : `${(balance / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} credits`}
          </span>
          <Link href="/creator/credits" className="rounded-lg border border-[#e5b27f]/25 bg-[#e5b27f]/[.08] px-2.5 py-1.5 text-[11px] font-medium text-[#e7bd94] transition-colors hover:bg-[#e5b27f]/[.14] sm:px-3 sm:text-[12px]">Buy credits</Link>
          <Link href="/" className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-white/65 transition-colors hover:border-white/20 hover:bg-white/5 sm:px-3 sm:text-[12px]">Back to app</Link>
        </div>
      </div>
    </header></LiquidGlassSurface>
  );
}
