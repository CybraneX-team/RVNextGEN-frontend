"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../AuthProvider";
import { getCreditBalance } from "@/lib/creator";

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
    <header className="flex flex-wrap items-center gap-4 border-b border-white/8 px-6 py-4">
      <Link href="/creator" className="text-[18px] font-bold tracking-[-0.5px]"><span className="text-[#c8e0d5] italic">s</span> creator lab</Link>
      <span className="hidden text-[13px] text-white/45 sm:inline">{user?.email}</span>
      <div className="ml-auto flex items-center gap-3">
        <span className="rounded-full border border-[#2f7d5b]/40 bg-[#2f7d5b]/15 px-3 py-1.5 text-[13px] font-medium text-[#c8e0d5]" title="Your generation credits">
          {balance == null ? "…" : `${balance.toLocaleString()} credits`}
        </span>
        <Link href="/" className="rounded-lg border border-white/12 px-3 py-1.5 text-[13px] text-white/75 hover:bg-white/5">Back to app</Link>
        <button onClick={() => void signOut()} className="rounded-lg border border-white/12 px-3 py-1.5 text-[13px] text-white/75 hover:bg-white/5">Log out</button>
      </div>
    </header>
  );
}
