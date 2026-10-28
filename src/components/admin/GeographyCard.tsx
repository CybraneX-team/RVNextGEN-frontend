"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { geoEqualEarth, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import world from "world-atlas/countries-110m.json";
import { analyticsGeography, type AnalyticsRange, type GeoCountry, type GeoTier, type GeographyAnalytics } from "@/lib/admin";
import { NAME_TO_ALPHA2, NUMERIC_TO_ALPHA2 } from "@/lib/geo/countryCodes";
import { countryName, flag, regionName } from "@/lib/geo/regions";

const WIDTH = 960;
const HEIGHT = 470;
const TIER_COLOR: Record<GeoTier, string> = { high: "#30d158", medium: "#ffd60a", low: "#ff453a" };
const TIER_LABEL: Record<GeoTier, string> = { high: "High", medium: "Medium", low: "Low" };
const NO_DATA = "#25282b";
const PREVIEW_ROWS = 10;

type Shape = { code: string; d: string };

// The world outline never changes, so project it once per page load (Antarctica is dropped to save space).
const SHAPES: Shape[] = (() => {
  const topology = world as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
  const collection = feature(topology, topology.objects.countries) as FeatureCollection<Geometry, { name: string }>;
  const features = collection.features.filter((f) => f.id !== "010");
  const path = geoPath(geoEqualEarth().fitSize([WIDTH, HEIGHT], { type: "FeatureCollection", features }));
  return features.flatMap((f: Feature<Geometry, { name: string }>) => {
    const code = (f.id !== undefined ? NUMERIC_TO_ALPHA2[String(f.id)] : undefined) ?? NAME_TO_ALPHA2[f.properties.name];
    const d = path(f);
    return code && d ? [{ code, d }] : [];
  });
})();

const number = (n: number) => n.toLocaleString();
const percent = (n: number) => `${(n * 100).toFixed(n > 0 && n < 0.1 ? 1 : 0)}%`;

function Change({ value }: { value: number | null }) {
  if (value === null) return <span className="text-white/30">New</span>;
  const tone = value > 0.005 ? "text-[#30d158]" : value < -0.005 ? "text-[#ff6961]" : "text-white/45";
  return <span className={tone}>{value > 0.005 ? "▲" : value < -0.005 ? "▼" : "•"} {percent(Math.abs(value))}</span>;
}

function ShareBar({ value, color = "#2f7d5b" }: { value: number; color?: string }) {
  return <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full" style={{ width: `${Math.max(2, value * 100)}%`, background: color }} /></div>;
}

/** World map of visitors by country, coloured by traffic tier, with ranked country and state lists. */
export default function GeographyCard({ token, range }: { token: string; range: AnalyticsRange }) {
  const [data, setData] = useState<GeographyAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState<{ code: string; x: number; y: number; flip: boolean } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [allCountries, setAllCountries] = useState(false);
  const [allRegions, setAllRegions] = useState(false);

  useEffect(() => {
    let live = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag for the range fetch below
    setLoading(true); setError(null);
    analyticsGeography(token, range)
      .then((result) => { if (live) setData(result); })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : "Failed to load"); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [token, range.from, range.to]); // eslint-disable-line react-hooks/exhaustive-deps

  const byCode = useMemo(() => new Map((data?.countries ?? []).map((c) => [c.country, c])), [data]);
  const regions = useMemo(() => (data?.regions ?? []).filter((r) => !selected || r.country === selected), [data, selected]);
  const hovered = hover ? byCode.get(hover.code) : undefined;
  const countries = data?.countries ?? [];
  const shownCountries = allCountries ? countries : countries.slice(0, PREVIEW_ROWS);
  const shownRegions = allRegions ? regions : regions.slice(0, PREVIEW_ROWS);

  function track(event: MouseEvent<SVGPathElement>, code: string) {
    const box = event.currentTarget.ownerSVGElement?.parentElement?.getBoundingClientRect();
    if (!box) return;
    const x = event.clientX - box.left;
    // Keep the tooltip inside the map: flip it to the left of the cursor on the right side.
    setHover({ code, x, y: event.clientY - box.top, flip: x > box.width * 0.6 });
  }
  const toggle = (code: string) => { setSelected((current) => current === code ? null : code); setAllRegions(false); };

  return (
    <section aria-labelledby="geography-heading" className="rounded-xl border border-white/8 p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h4 id="geography-heading" className="text-[13px] font-semibold text-white/70">Geography</h4>
          <p className="mt-0.5 text-[12px] text-white/40">Where visitors are coming from in this range. Click a country to see its states.</p>
        </div>
        {data && <p className="text-[12px] text-white/50">{number(data.totals.countries)} countries · {number(data.totals.visitors)} visitors{data.totals.unknownVisitors ? ` · ${number(data.totals.unknownVisitors)} unlocated` : ""}</p>}
      </div>

      {loading && !data ? <p className="text-[13px] text-white/40">Loading…</p> : error ? <p role="alert" className="text-[13px] text-[#ff8f8f]">{error}</p> : data && (
        <>
          <div className="relative overflow-hidden rounded-lg bg-[#121416]" onMouseLeave={() => setHover(null)}>
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className={`block h-auto w-full transition-opacity ${loading ? "opacity-50" : ""}`} role="img" aria-label={countries.length ? `World map. Most visitors from ${countries.slice(0, 3).map((c) => countryName(c.country)).join(", ")}.` : "World map with no located visitors yet."}>
              {SHAPES.map((shape, index) => {
                const entry = byCode.get(shape.code);
                const active = selected === shape.code || hover?.code === shape.code;
                return <path key={`${shape.code}-${index}`} d={shape.d} fill={entry ? TIER_COLOR[entry.tier] : NO_DATA} fillOpacity={entry ? (selected && selected !== shape.code ? 0.35 : 0.85) : 1}
                  stroke={active ? "#ffffff" : "#0b0c0d"} strokeWidth={active ? 1.2 : 0.5} className={entry ? "cursor-pointer" : undefined}
                  onMouseMove={(event) => track(event, shape.code)} onClick={() => { if (entry) toggle(shape.code); }} />;
              })}
            </svg>
            {hover && <div className="pointer-events-none absolute z-10 min-w-40 rounded-lg border border-white/10 bg-black/85 px-3 py-2 text-[12px] text-white shadow-xl backdrop-blur" style={{ left: hover.x + 14, top: hover.y + 14, transform: hover.flip ? "translateX(calc(-100% - 28px))" : undefined }}>
              <p className="font-semibold">{flag(hover.code)} {countryName(hover.code)}</p>
              {hovered ? <>
                <p className="mt-1 text-white/70">{number(hovered.visitors)} visitors · {number(hovered.events)} events</p>
                <p className="text-white/50">{percent(hovered.share)} of located visitors · <Change value={hovered.change} /></p>
              </> : <p className="mt-1 text-white/45">No visitors in this range</p>}
            </div>}
            <div className="absolute bottom-2 left-2 flex flex-wrap items-center gap-3 rounded-md bg-black/50 px-2.5 py-1.5 text-[11px] text-white/65 backdrop-blur">
              {(Object.keys(TIER_COLOR) as GeoTier[]).map((tier) => <span key={tier} className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: TIER_COLOR[tier] }} />{TIER_LABEL[tier]}</span>)}
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm border border-white/15" style={{ background: NO_DATA }} />None</span>
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-white/35">Traffic level is relative to the top country: high is at least half its visitors, medium at least 15%, low anything less.</p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <h5 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-white/40">Countries</h5>
              {countries.length === 0 ? <p className="text-[13px] text-white/40">No located visitors in this range.</p> : (
                <div className="overflow-x-auto rounded-lg border border-white/8">
                  <table className="w-full border-collapse text-[13px]">
                    <thead className="bg-white/[0.03] text-[11px] uppercase tracking-wide text-white/40"><tr><th className="px-3 py-2 text-left font-semibold">Country</th><th className="px-3 py-2 text-right font-semibold">Visitors</th><th className="w-24 px-3 py-2 font-semibold"><span className="sr-only">Share</span></th><th className="px-3 py-2 text-right font-semibold">Events</th><th className="px-3 py-2 text-right font-semibold">Change</th></tr></thead>
                    <tbody>{shownCountries.map((c: GeoCountry) => (
                      <tr key={c.country} className={`border-t border-white/5 ${selected === c.country ? "bg-white/[0.06]" : ""}`}>
                        <td className="px-3 py-2"><button type="button" onClick={() => toggle(c.country)} aria-pressed={selected === c.country} className="flex items-center gap-2 text-left text-white/85 hover:text-white">
                          <span className="size-2 shrink-0 rounded-full" style={{ background: TIER_COLOR[c.tier] }} aria-hidden="true" /><span aria-hidden="true">{flag(c.country)}</span>{countryName(c.country)}
                        </button></td>
                        <td className="px-3 py-2 text-right tabular-nums text-white/80">{number(c.visitors)}</td>
                        <td className="px-3 py-2"><ShareBar value={c.share} color={TIER_COLOR[c.tier]} /></td>
                        <td className="px-3 py-2 text-right tabular-nums text-white/55">{number(c.events)}</td>
                        <td className="px-3 py-2 text-right tabular-nums"><Change value={c.change} /></td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {countries.length > PREVIEW_ROWS && <button type="button" onClick={() => setAllCountries((v) => !v)} className="w-full border-t border-white/5 px-3 py-2 text-[12px] text-white/55 hover:bg-white/[0.03]">{allCountries ? "Show fewer" : `Show all ${countries.length} countries`}</button>}
                </div>
              )}
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h5 className="text-[12px] font-semibold uppercase tracking-wide text-white/40">States & regions</h5>
                {selected && <button type="button" onClick={() => setSelected(null)} className="rounded-full border border-white/12 px-2.5 py-0.5 text-[11px] text-white/70 hover:bg-white/5">{flag(selected)} {countryName(selected)} ✕</button>}
              </div>
              {regions.length === 0 ? <p className="text-[13px] text-white/40">{selected ? `No state data for ${countryName(selected)} in this range.` : "No state data in this range yet."} States are recorded for new visits only.</p> : (
                <div className="overflow-x-auto rounded-lg border border-white/8">
                  <table className="w-full border-collapse text-[13px]">
                    <thead className="bg-white/[0.03] text-[11px] uppercase tracking-wide text-white/40"><tr><th className="px-3 py-2 text-left font-semibold">State / region</th><th className="px-3 py-2 text-right font-semibold">Visitors</th><th className="w-24 px-3 py-2 font-semibold"><span className="sr-only">Share of country</span></th><th className="px-3 py-2 text-right font-semibold">Events</th></tr></thead>
                    <tbody>{shownRegions.map((r) => (
                      <tr key={`${r.country}-${r.region}`} className="border-t border-white/5">
                        <td className="px-3 py-2 text-white/85"><span aria-hidden="true">{flag(r.country)} </span>{regionName(r.country, r.region)}{!selected && <span className="text-white/35"> · {r.country}</span>}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-white/80">{number(r.visitors)}</td>
                        <td className="px-3 py-2" title={`${percent(r.shareOfCountry)} of ${countryName(r.country)}`}><ShareBar value={r.shareOfCountry} /></td>
                        <td className="px-3 py-2 text-right tabular-nums text-white/55">{number(r.events)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {regions.length > PREVIEW_ROWS && <button type="button" onClick={() => setAllRegions((v) => !v)} className="w-full border-t border-white/5 px-3 py-2 text-[12px] text-white/55 hover:bg-white/[0.03]">{allRegions ? "Show fewer" : `Show all ${regions.length}`}</button>}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
