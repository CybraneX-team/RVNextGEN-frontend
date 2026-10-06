"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../AuthProvider";
import { createGenre } from "@/lib/admin";
import { getTaxonomy, type Taxon } from "@/lib/content";

/** Toggle-pill multi-select of the backend's categories (genres). Controlled via categoryIds. */
export default function GenrePicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const { accessToken } = useAuth();
  const [cats, setCats] = useState<Taxon[]>([]);
  const [newGenre, setNewGenre] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    getTaxonomy().then((t) => { if (live) setCats(t.categories); }).catch(() => undefined);
    return () => { live = false; };
  }, []);
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  async function addGenre() {
    const name = newGenre.trim();
    if (!name || !accessToken || adding) return;
    setAdding(true); setError(null);
    try {
      const genre = await createGenre(name, accessToken);
      setCats((current) => current.some((category) => category.id === genre.id) ? current : [...current, genre as Taxon].sort((a, b) => a.name.localeCompare(b.name)));
      if (!value.includes(genre.id)) onChange([...value, genre.id]);
      setNewGenre("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create genre.");
    } finally {
      setAdding(false);
    }
  }
  if (!cats.length) return <p className="text-[12px] text-white/35">Loading genres…</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {cats.map((c) => (
        <button key={c.id} type="button" onClick={() => toggle(c.id)} aria-pressed={value.includes(c.id)}
          className={`rounded-full px-3 py-1.5 text-[13px] transition-colors ${value.includes(c.id) ? "bg-white text-black" : "bg-white/8 text-white/70 hover:bg-white/15"}`}>
          {c.name}
        </button>
      ))}
      <div className="flex w-full flex-wrap items-center gap-2 pt-1">
        <input value={newGenre} onChange={(e) => setNewGenre(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addGenre(); } }} maxLength={80} placeholder="Add a new genre" className="h-9 min-w-[160px] flex-1 rounded-full border border-white/12 bg-white/[0.04] px-3 text-[13px] text-white outline-none placeholder:text-white/35 focus:border-white/30" />
        <button type="button" onClick={() => void addGenre()} disabled={!newGenre.trim() || adding} className="h-9 rounded-full border border-[#63b58b]/50 bg-[#2f7d5b]/20 px-4 text-[13px] font-medium text-[#a9e2be] hover:bg-[#2f7d5b]/35 disabled:cursor-not-allowed disabled:opacity-50">{adding ? "Adding…" : "+ Add genre"}</button>
        {error && <p role="alert" className="w-full text-[12px] text-[#ff8f8f]">{error}</p>}
      </div>
    </div>
  );
}
