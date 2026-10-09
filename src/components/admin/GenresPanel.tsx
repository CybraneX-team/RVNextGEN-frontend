"use client";

import { useEffect, useState } from "react";
import { createGenre, deleteGenre, listGenres, renameGenre, type AdminGenre } from "@/lib/admin";

const th = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white/40";
const td = "px-3 py-2 text-[13px] text-white/80";
const smallInput = "h-9 w-full rounded-md border border-white/12 bg-white/[0.04] px-2 text-[13px] text-white outline-none focus:border-white/30";

/** One genre row: shows name + usage, with inline rename and a two-click delete. */
function GenreRow({ genre, token, onChanged }: { genre: AdminGenre; token: string; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(genre.name);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rename() {
    const value = name.trim();
    if (!value) { setError("Name is required"); return; }
    setBusy(true); setError(null);
    try { await renameGenre(genre.id, value, token); setEditing(false); onChanged(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not rename"); }
    finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true); setError(null);
    try { await deleteGenre(genre.id, token); onChanged(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not delete"); setBusy(false); setConfirming(false); }
  }

  return (
    <tr className="border-t border-white/5">
      <td className={td}>
        {editing
          ? <input className={smallInput} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus />
          : genre.name}
      </td>
      <td className={td}>{genre.contentCount}</td>
      <td className={td}>
        <div className="flex gap-1.5">
          {editing ? (
            <>
              <button onClick={rename} disabled={busy} className="rounded-md bg-[#2f7d5b] px-3 py-1 text-[12px] font-medium text-white hover:bg-[#2a704f] disabled:opacity-50">{busy ? "…" : "Save"}</button>
              <button onClick={() => { setEditing(false); setName(genre.name); setError(null); }} className="rounded-md border border-white/15 px-3 py-1 text-[12px] text-white/70 hover:bg-white/10">Cancel</button>
            </>
          ) : confirming ? (
            <>
              <button onClick={remove} disabled={busy} className="rounded-md bg-[#8f2f2f] px-3 py-1 text-[12px] font-medium text-white hover:bg-[#7a2929] disabled:opacity-50">{busy ? "…" : "Confirm delete"}</button>
              <button onClick={() => setConfirming(false)} className="rounded-md border border-white/15 px-3 py-1 text-[12px] text-white/70 hover:bg-white/10">Cancel</button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="rounded-md border border-white/15 px-3 py-1 text-[12px] text-white/80 hover:bg-white/10">Rename</button>
              <button onClick={() => setConfirming(true)} className="rounded-md border border-[#8f2f2f]/50 px-3 py-1 text-[12px] text-[#ff9f9f] hover:bg-[#8f2f2f]/20">Delete</button>
            </>
          )}
        </div>
        {error && <p role="alert" className="mt-1 text-[11px] text-[#ff8f8f]">{error}</p>}
        {confirming && !error && <p className="mt-1 text-[11px] text-white/45">{genre.contentCount > 0 ? `Used by ${genre.contentCount} title(s) — they stay, just lose this genre.` : "This genre is unused."}</p>}
      </td>
    </tr>
  );
}

export default function GenresPanel({ token }: { token: string }) {
  const [genres, setGenres] = useState<AdminGenre[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  function reload() {
    listGenres(token).then(setGenres).catch((e) => setError(e instanceof Error ? e.message : "Failed to load genres"));
  }
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function add() {
    const name = newName.trim();
    if (!name || adding) return;
    setAdding(true); setAddError(null);
    try { await createGenre(name, token); setNewName(""); reload(); }
    catch (e) { setAddError(e instanceof Error ? e.message : "Could not add genre"); }
    finally { setAdding(false); }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void add(); } }} maxLength={80} placeholder="New genre name" className="h-10 min-w-[200px] flex-1 rounded-lg border border-white/12 bg-white/[0.04] px-3 text-[13px] text-white outline-none placeholder:text-white/35 focus:border-white/30" />
        <button onClick={add} disabled={!newName.trim() || adding} className="h-10 rounded-lg bg-[#2f7d5b] px-4 text-[13px] font-semibold text-white hover:bg-[#2a704f] disabled:opacity-50">{adding ? "Adding…" : "+ Add genre"}</button>
      </div>
      {addError && <p role="alert" className="mb-3 text-[13px] text-[#ff8f8f]">{addError}</p>}
      {error ? <p role="alert" className="text-[13px] text-[#ff8f8f]">{error}</p>
        : !genres ? <p className="text-[13px] text-white/40">Loading…</p>
        : (
          <div className="overflow-x-auto rounded-xl border border-white/8">
            <table className="w-full border-collapse">
              <thead className="bg-white/[0.03]"><tr><th className={th}>Genre</th><th className={th}>Titles</th><th className={th}></th></tr></thead>
              <tbody>{genres.map((g) => <GenreRow key={g.id} genre={g} token={token} onChanged={reload} />)}</tbody>
            </table>
            {genres.length === 0 && <p className="p-4 text-[13px] text-white/40">No genres yet. Add one above.</p>}
          </div>
        )}
    </div>
  );
}
