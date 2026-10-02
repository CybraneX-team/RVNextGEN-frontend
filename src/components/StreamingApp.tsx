"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { ChevronRightIcon, HomeIcon, LibraryIcon, PlayIcon, SearchIcon } from "./icons";

function subscribeLibrary(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("library-change", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("library-change", callback); };
}
function librarySnapshot() { try { return localStorage.getItem("streamline-library") || "[]"; } catch { return "[]"; } }

function subscribeMovie(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener("movie-change", callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener("movie-change", callback);
  };
}
function movieSnapshot() { return new URLSearchParams(window.location.search).get("movie") || ""; }
function closeMovie() {
  if (window.history.state?.streamlineMovie) window.history.back();
  else {
    const url = new URL(window.location.href);
    url.searchParams.delete("movie");
    window.history.replaceState(window.history.state, "", url);
    window.dispatchEvent(new Event("movie-change"));
  }
}

const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=85`;
const films = [
  { id: "furious", title: "The Furious", genre: "Action", year: "2026", rating: "4.5", image: photo("photo-1519608487953-e999c86e7455"), tagline: "No rules. No mercy. No way back.", description: "When everything is taken from him, one man enters a city's dangerous underworld. A relentless race for justice begins." },
  { id: "disclosure", title: "Disclosure Day", genre: "Sci-Fi", year: "2026", rating: "4.7", image: photo("photo-1534447677768-be436bb09401"), tagline: "The truth belongs to everyone.", description: "A mysterious signal changes everything we thought we knew about our place in the universe." },
  { id: "arctic", title: "Arctic to Antarctic", genre: "Documentary", year: "2026", rating: "4.8", image: photo("photo-1473448912268-2022ce9509d8"), tagline: "One planet. An extraordinary journey.", description: "Journey beyond the familiar into the wildest corners of our extraordinary planet." },
  { id: "salt", title: "Salt Mines", genre: "Thrill", year: "2026", rating: "4.2", image: photo("photo-1518837695005-2083093ee35b"), tagline: "Some secrets never surface.", description: "An isolated coastal town is hiding a secret. One detective is determined to bring it to the surface." },
  { id: "light", title: "The Last Light", genre: "Drama", year: "2026", rating: "4.6", image: photo("photo-1472214103451-9374bd1c798e"), tagline: "Every ending has a beginning.", description: "Returning to her childhood home, a photographer discovers the small moments that make a life." },
  { id: "orbit", title: "Beyond Orbit", genre: "Sci-Fi", year: "2026", rating: "4.4", image: photo("photo-1446776811953-b23d57bd21aa"), tagline: "There is more out there.", description: "Far from Earth, a lone crew follows a signal that could change the future of humanity." },
  { id: "dexter", title: "Dexter New Blood", genre: "Thrill", year: "2021", rating: "4.8", image: photo("photo-1472396961693-142e6e269027"), tagline: "Long time. No spree.", description: "Old instincts return in a quiet, snow-covered town. The past never stays buried for long." },
  { id: "city", title: "City on a Hill", genre: "Drama", year: "2022", rating: "4.6", image: photo("photo-1519501025264-65ba15a82390"), tagline: "Every city has a dark side.", description: "An unlikely alliance challenges a system built on corruption in a city at a crossroads." },
  { id: "midnight", title: "Midnight Static", genre: "Sci-Fi", year: "2025", rating: "4.7", image: photo("photo-1519608487953-e999c86e7455"), tagline: "Don't follow the signal.", description: "A late-night radio broadcast leads a group of strangers into an impossible mystery." },
  { id: "heist", title: "The Quiet Heist", genre: "Action", year: "2025", rating: "4.5", image: photo("photo-1480714378408-67cf0d13bc1b"), tagline: "Silence is the perfect disguise.", description: "One last job. An impossible plan. A crew with everything to lose." },
  { id: "yellowstone", title: "Yellowstone", genre: "Drama", year: "2024", rating: "4.9", image: photo("photo-1464822759023-fed622ff2c3b"), tagline: "This land is worth fighting for.", description: "Family, loyalty, and a legacy worth protecting, set against the breathtaking American West." },
];
type Film = typeof films[number];
const genres = ["Thrill", "Action", "Drama", "Sci-Fi", "Documentary"];
const navigation = [{ name: "Home", icon: HomeIcon }, { name: "Search", icon: SearchIcon }, { name: "Library", icon: LibraryIcon }];

function Art({ film, detail = false }: { film: Film; detail?: boolean }) {
  const titles: Record<string, string> = {
    furious: "inset-x-[-3%] top-[36%] rotate-[-17deg] scale-x-[.82] text-[44px] font-black text-[#ff2118]",
    disclosure: "inset-x-[3%] top-[43%] text-[24px] font-medium tracking-[1px] text-[#152823]",
    arctic: "inset-x-[5%] top-[65%] text-left text-[31px] font-black",
    salt: "inset-x-[8%] top-[60%] text-[31px] font-black tracking-[5px]",
    light: "inset-x-[8%] top-[25%] text-[30px] font-normal",
    orbit: "inset-x-[5%] top-[17%] text-[24px] font-black tracking-[4px]",
    dexter: "inset-x-[7%] top-[16%] text-[42px] font-black italic",
    city: "inset-x-[3%] top-[72%] text-[33px] font-black",
    midnight: "inset-x-[8%] top-[60%] text-[27px] font-black tracking-[2px] text-[#ddcaf2]",
    heist: "inset-x-[8%] top-[60%] text-[30px] font-black text-[#ecd8ac]",
    yellowstone: "inset-x-[8%] top-[60%] text-[23px] font-black tracking-[1px]",
  };
  return (
    <div
      className={`relative size-full overflow-hidden rounded-[inherit] bg-cover bg-center ${detail ? "[&>span]:hidden [&>div:last-of-type]:top-[17%] [&>div:last-of-type]:text-[72px] [&>div:last-of-type]:lg:text-[96px]" : ""} ${film.id === "furious" ? "bg-[#08695f] bg-blend-luminosity" : film.id === "disclosure" ? "bg-[#dce6df] bg-blend-luminosity" : film.id === "salt" ? "bg-[#046b78] bg-blend-luminosity" : film.id === "dexter" ? "bg-[#183d59] bg-blend-luminosity" : film.id === "city" ? "bg-[#19372f] grayscale" : "bg-[#19372f]"}`}
      style={{ backgroundImage: `url("${film.image}"), url("/art/${film.id}.svg")` }}
    >
      <div className={`absolute inset-0 ${film.id === "furious" ? "bg-[linear-gradient(155deg,#18a7a560,#01403b00_45%,#031712b0)]" : film.id === "disclosure" ? "bg-[linear-gradient(#e5eeeb99,#acc2bb88,#e3e8dfbb)]" : film.id === "dexter" ? "bg-[linear-gradient(#06142444,transparent,#05162966)]" : "bg-[linear-gradient(180deg,#0002,transparent_25%,#0003_55%,#000a)]"}`} />
      <span className={`absolute top-[8%] w-full px-2 text-center text-[6px] tracking-[2px] uppercase min-[1450px]:text-[7px] ${film.id === "furious" ? "hidden" : film.id === "disclosure" ? "text-[#243f38]" : "text-[#ffffffe0]"}`}>{film.tagline}</span>
      <div className={`absolute leading-[.98] uppercase ${film.id === "arctic" ? "text-left" : "text-center"} ${["disclosure", "salt", "orbit", "midnight", "yellowstone"].includes(film.id) ? "" : "tracking-[-1px]"} ${film.id === "light" ? "[font-family:Georgia,serif]" : "[font-family:Impact,'Arial_Narrow',sans-serif]"} ${["furious", "disclosure"].includes(film.id) ? "" : "[text-shadow:0_2px_15px_#0006]"} ${titles[film.id]}`}>
        {film.id === "furious" ? <><small className="text-[.5em]">THE</small> FURIOUS</> : film.id === "dexter" ? <>DEXTER<small className="block text-right text-[20px] tracking-[-1px]">NEW BLOOD</small></> : film.title}
      </div>
      <span className={`absolute bottom-[6%] w-full text-center text-[5px] tracking-[2px] ${film.id === "disclosure" ? "text-[#243f38]" : "text-[#ffffff90]"}`}>A STORY WORTH WATCHING</span>
    </div>
  );
}

function FeatureLabel({ children }: { children: React.ReactNode }) {
  return <span className="flex items-center gap-2 text-[10px] tracking-[2.2px] text-[#b9ccc4]">{children}</span>;
}

function ActionButton({ children, onClick, secondary = false }: { children: React.ReactNode; onClick: () => void; secondary?: boolean }) {
  return <button onClick={onClick} className={`inline-flex min-h-[43px] items-center justify-center gap-[9px] rounded-[7px] px-[21px] text-[13px] font-semibold [&>svg]:size-[19px] ${secondary ? "border border-[#ffffff18] bg-[#ffffff13] text-[#f1f3f2] hover:bg-[#ffffff25]" : "bg-white text-[#13201c] hover:bg-[#d5eae3]"}`}>{children}</button>;
}

function SectionHeading({ title, arrow = true, onNext }: { title: string; arrow?: boolean; onNext?: () => void }) {
  return <div className="flex h-7 items-center gap-[6px] px-[23px] text-white/60 lg:px-0">
    <h2 className="m-0 text-[24px] leading-7 font-semibold tracking-[-.04em]">{title}</h2>
    {arrow && <ChevronRightIcon className="h-7 w-[12.59px] shrink-0" />}
    {onNext && <button className="ml-auto hidden size-[25px] place-items-center rounded-full border border-[#ffffff15] bg-transparent text-[#a6b5ad] hover:bg-[#ffffff18] lg:grid" aria-label={`Scroll ${title}`} onClick={onNext}><ChevronRightIcon className="size-3" /></button>}
  </div>;
}

function FilmRow({ title, items, onSelect, first = false }: { title: string; items: Film[]; onSelect: (film: Film) => void; first?: boolean }) {
  const row = useRef<HTMLDivElement>(null);
  return <section className="mb-16 flex flex-col gap-[15px] lg:mb-[33px]">
    <SectionHeading title={title} arrow={!first} onNext={() => row.current?.scrollBy({ left: row.current.clientWidth * .8, behavior: "smooth" })} />
    <div className="flex snap-x snap-proximity scroll-px-[23px] gap-[10px] overflow-x-auto px-[23px] [scrollbar-width:none] lg:scroll-px-0 lg:px-0 [&::-webkit-scrollbar]:hidden" ref={row}>
      {items.map(film => <button className="group relative h-[317px] w-[236px] shrink-0 snap-start overflow-hidden rounded-lg bg-[#2a2a2a] p-0" key={film.id} onClick={() => onSelect(film)} aria-label={`View ${film.title}`}>
        <Art film={film} />
        <span className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 text-[12px] opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"><PlayIcon className="size-6" />View title</span>
      </button>)}
    </div>
  </section>;
}

function NavigationItems({ page, navigate }: { page: string; navigate: (page: string) => void }) {
  return <>{[...navigation, { name: "Profile", icon: null }].map(({ name, icon: Icon }) => <button
    key={name}
    className={`relative flex h-[70px] w-[60px] shrink-0 flex-col items-center justify-center gap-[10px] bg-transparent p-0 text-[12px] leading-[14px] font-medium tracking-[-.04em] lg:h-[45px] lg:w-auto lg:flex-row lg:justify-start lg:gap-[13px] lg:rounded-[7px] lg:px-[13px] lg:hover:bg-[#ffffff05] lg:hover:text-white ${page === name ? "text-white lg:bg-[#ffffff07] lg:before:absolute lg:before:left-[-24px] lg:before:h-5 lg:before:w-[2px] lg:before:rounded-[2px] lg:before:bg-[#c0d8cc] lg:before:content-['']" : "text-[#7d7d7d]"} ${name === "Profile" ? "lg:mt-[14px] lg:h-[60px] lg:rounded-none lg:border-t lg:border-white/4 lg:pt-[15px]" : ""}`}
    onClick={() => navigate(name)} aria-current={page === name ? "page" : undefined}
  >
    {Icon ? <Icon className="size-8 shrink-0 stroke-[1.5] lg:size-[21px]" /> : <span className="grid size-[38px] place-items-center rounded-full bg-[#430d36] text-[20px] leading-[23px] font-medium text-[#7d7d7d]">S</span>}
    <span>{name}</span>
  </button>)}</>;
}

const castByFilm: Record<string, string[]> = {
  dexter: ["Michael C. Hall", "Julia Jones", "Jack Alcott"],
  city: ["Kevin Bacon", "Aldis Hodge", "Jill Hennessy"],
  yellowstone: ["Kevin Costner", "Kelly Reilly", "Luke Grimes"],
};

const seriesSeasons: Record<string, number[]> = {
  yellowstone: [9, 10, 10, 10, 14],
  dexter: [10],
  city: [10, 8, 8],
};

function SeasonPicker({ value, count, onChange }: { value: number; count: number; onChange: (season: number) => void }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const options = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    options.current[value - 1]?.focus();
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open, value]);

  return <div ref={root} className="relative inline-block" onBlur={() => {
    requestAnimationFrame(() => {
      if (!root.current?.contains(document.activeElement)) setOpen(false);
    });
  }} onKeyDown={event => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
    }
  }}>
    <button ref={trigger} type="button" aria-label={`Select season, Season ${value}`} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(current => !current)} onKeyDown={event => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); }
    }} className="flex h-11 items-center gap-4 rounded-full border border-white/15 bg-white/8 px-5 text-[16px] font-medium tracking-[-.04em] text-white backdrop-blur-sm transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/50">
      Season {value}<ChevronRightIcon className={`size-4 text-white/65 transition-transform ${open ? "-rotate-90" : "rotate-90"}`} />
    </button>
    {open && <div id={id} role="menu" aria-label="Select season" className="absolute top-full left-0 z-30 mt-2 min-w-[180px] overflow-hidden rounded-2xl border border-white/10 bg-[#202121]/95 p-1.5 shadow-[0_12px_36px_#0008] backdrop-blur-xl">
      {Array.from({ length: count }, (_, index) => <button key={index} ref={element => { options.current[index] = element; }} type="button" role="menuitemradio" aria-checked={value === index + 1} tabIndex={-1} onClick={() => { onChange(index + 1); setOpen(false); trigger.current?.focus(); }} onKeyDown={event => {
        let next: number | undefined;
        if (event.key === "ArrowDown") next = (index + 1) % count;
        if (event.key === "ArrowUp") next = (index - 1 + count) % count;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = count - 1;
        if (next !== undefined) { event.preventDefault(); options.current[next]?.focus(); }
      }} className={`flex min-h-11 w-full items-center justify-between gap-6 rounded-xl px-3.5 text-left text-[16px] tracking-[-.04em] outline-none transition-colors hover:bg-white/10 focus-visible:bg-white/15 ${value === index + 1 ? "bg-white/10 font-medium text-white" : "text-white/60"}`}>
        Season {index + 1}
        {value === index + 1 && <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4 text-[#c0d8cc]"><path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </button>)}
    </div>}
  </div>;
}

function SeriesEpisodes({ film }: { film: Film }) {
  const seasons = seriesSeasons[film.id];
  const [season, setSeason] = useState(film.id === "yellowstone" ? 2 : 1);
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);
  return <section aria-label="Episodes" className="px-[23px] lg:px-0">
    <SeasonPicker value={season} count={seasons.length} onChange={value => { setSeason(value); setSelectedEpisode(null); }} />
    <div className="mt-9 grid gap-5 lg:grid-cols-2 lg:gap-x-10">
      {Array.from({ length: seasons[season - 1] }, (_, index) => <div key={`${season}-${index}`}>
        <button onClick={() => setSelectedEpisode(index)} className="group flex w-full items-start gap-3 text-left" aria-label={`Play ${film.title}, season ${season}, episode ${index + 1}`}>
          <span className={`relative h-[80px] w-[124px] shrink-0 overflow-hidden rounded-[7px] bg-cover bg-center lg:h-[110px] lg:w-[170px] ${film.id === "yellowstone" ? "bg-[#c99a20] bg-blend-luminosity" : "bg-[#26342e]"}`} style={{ backgroundImage: `url("${film.image}"), url("/art/${film.id}.svg")` }}>
            <span className="absolute inset-0 grid place-items-center bg-black/10 transition-colors group-hover:bg-black/35"><PlayIcon className="size-6 text-white/80" /></span>
            <span className="absolute right-1 bottom-1 rounded bg-black/60 px-1.5 py-0.5 text-[12px] leading-[14px]">{film.id === "yellowstone" ? "5:10" : "Preview"}</span>
          </span>
          <span className="min-w-0 pt-0.5">
            <span className="line-clamp-3 text-[16px] leading-[19px] font-medium tracking-[-.04em]">{film.id === "yellowstone" ? "Best of The Duttons vs. Everyone | Yellowstone | Paramount Network" : `${film.title} | Episode ${index + 1}`}</span>
            <span className="mt-1 block text-[14px] leading-4 text-white/50">S{season} EP {String(index + 1).padStart(2, "0")}</span>
          </span>
        </button>
        {selectedEpisode === index && <p role="status" className="mt-2 text-[13px] text-white/60">Episode playback isn’t available yet.</p>}
      </div>)}
    </div>
  </section>;
}

function MovieDetail({ film, saved, onSave, onSelect, onNavigate }: {
  film: Film;
  saved: boolean;
  onSave: () => void;
  onSelect: (film: Film) => void;
  onNavigate: (page: string) => void;
}) {
  const [previewRequested, setPreviewRequested] = useState(false);
  const isSeries = film.id in seriesSeasons;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") closeMovie(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  const recommendations = films.filter(item => item.id !== film.id);
  const similar = [...recommendations.filter(item => item.genre === film.genre), ...recommendations.filter(item => item.genre !== film.genre)].slice(0, 6);
  const explore = [...recommendations].reverse().slice(0, 6);
  const cast = castByFilm[film.id];
  return <main className="relative isolate min-h-screen overflow-hidden bg-[#0e0d0f] pb-1 text-white">
    <section className="relative mx-auto max-w-[1440px]">
      <div aria-hidden="true" className={`absolute inset-x-0 top-0 overflow-hidden lg:left-[34%] lg:h-[660px] ${isSeries ? "h-[370px]" : "h-[520px]"}`}>
        {isSeries ? <div className="size-full bg-cover bg-center" style={{ backgroundImage: `url("${film.image}"), url("/art/${film.id}.svg")` }} /> : <Art film={film} detail />}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_25%,#0e0d0f_100%)]" />
        <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,#0e0d0f_0%,transparent_50%),linear-gradient(180deg,transparent_35%,#0e0d0f_100%)] lg:block" />
      </div>
      <button onClick={closeMovie} aria-label="Back to browse" className="absolute top-5 left-[23px] z-10 grid size-9 place-items-center rounded-full bg-black/25 text-white/85 backdrop-blur-sm hover:bg-white/15 lg:top-8 lg:left-[60px]"><ChevronRightIcon className="size-5 rotate-180" /></button>
      <div className={`relative px-[23px] lg:max-w-[660px] lg:px-[60px] lg:pt-[210px] ${isSeries ? "pt-[200px]" : "pt-[300px]"}`}>
        <div className="flex h-[60px] items-center gap-[10px]">
          <button aria-label={`Play ${film.title}`} onClick={() => setPreviewRequested(true)} className="grid size-[60px] place-items-center rounded-full bg-black/25 text-white/85 backdrop-blur-sm hover:bg-white/15"><PlayIcon className="size-[27px]" /></button>
          <button aria-label={saved ? `Remove ${film.title} from library` : `Save ${film.title} to library`} aria-pressed={saved} onClick={onSave} className="grid size-11 place-items-center rounded-full text-white hover:bg-white/10">
            {saved ? <svg className="size-[27px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="m7.5 12 3 3 6-6" fill="none" stroke="#17332d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> : <svg className="size-[27px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v10M7 12h10" strokeLinecap="round" /></svg>}
          </button>
          <span className="ml-2 hidden text-[13px] text-white/50 lg:inline">{film.year} <span className="mx-2">·</span> ★ {film.rating}</span>
        </div>
        <h1 ref={heading} tabIndex={-1} className="mt-[22px] text-[26px] leading-8 font-medium tracking-[-.04em] outline-none lg:text-[48px] lg:leading-[1.1]">{film.id === "dexter" ? "Dexter - New Blood" : film.title}</h1>
        <p className="mt-[10px] max-w-[370px] text-[14px] leading-5 font-normal tracking-[-.02em] text-white/55 lg:max-w-[470px] lg:text-[16px] lg:leading-6">{film.id === "dexter" ? "Dexter Morgan has built a quiet new life in the small town of Iron Lake. But when his past returns, the dark instincts he thought he had left behind begin to surface." : film.description}</p>
        {previewRequested && <div role="status" className="mt-4 flex max-w-[470px] items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-[13px] leading-5 text-white/70"><span>Playback isn’t available for this title yet.</span><button aria-label="Dismiss playback message" className="ml-auto px-2 text-xl" onClick={() => setPreviewRequested(false)}>×</button></div>}
        <p className="mt-9 text-[14px] leading-5 text-white/55">{film.genre}{film.id === "dexter" ? " & Mystery" : ""}</p>
        <div aria-label={cast ? "Cast" : "Title information"} className="mt-4 flex max-w-[345px] flex-wrap gap-2 lg:max-w-none">
          {(cast || [film.year, film.genre, `★ ${film.rating}`]).map(label => <span key={label} className="rounded-full bg-white/8 px-[13px] py-[7px] text-[14px] leading-[18px] tracking-[-.02em] text-white/65">{label}</span>)}
        </div>
      </div>
    </section>
    <div className="relative mx-auto mt-[80px] max-w-[1440px] pb-40 lg:mt-[90px] lg:px-[60px] lg:pb-0">
      {isSeries ? <>
        <SeriesEpisodes film={film} />
        <div className="mt-12 border-t border-white/5 pt-12"><FilmRow title="Related Series" items={recommendations.filter(item => item.id in seriesSeasons)} onSelect={onSelect} /></div>
      </> : <>
        <FilmRow title={`More ${film.genre} Films`} items={similar} onSelect={onSelect} />
        <FilmRow title="Explore Other Films" items={explore} onSelect={onSelect} />
      </>}
    </div>
    <nav className="fixed inset-x-0 bottom-0 z-20 flex h-[121px] items-center justify-center gap-[clamp(12px,calc((100vw-272px)/3),43px)] bg-[linear-gradient(180deg,rgba(14,13,15,0)_0%,#0E0D0F_41.74%)] px-4 pt-[26px] pb-[25px] backdrop-blur-[2px] lg:hidden" aria-label="Main navigation">
      <NavigationItems page="" navigate={onNavigate} />
    </nav>
  </main>;
}

export default function StreamingApp() {
  const [page, setPage] = useState("Home");
  const [genre, setGenre] = useState("Thrill");
  const [hero, setHero] = useState(0);
  const [query, setQuery] = useState("");
  const selectedId = useSyncExternalStore(subscribeMovie, movieSnapshot, () => "");
  const selected = films.find(film => film.id === selectedId) || null;
  const browseScroll = useRef(0);
  const library = useSyncExternalStore(subscribeLibrary, librarySnapshot, () => "[]");
  let saved: string[] = [];
  try { const parsed = JSON.parse(library); if (Array.isArray(parsed)) saved = parsed.filter((id): id is string => typeof id === "string"); } catch { }
  const carousel = useRef<HTMLDivElement>(null);
  const featured = genre === "Thrill" ? [films[0], films[1], films[6]] : films.filter(f => f.genre === genre);
  const current = featured[Math.min(hero, featured.length - 1)];

  function centerSlide(track: HTMLDivElement, slide: Element, behavior: ScrollBehavior) {
    const element = slide as HTMLElement;
    track.scrollTo({ left: element.offsetLeft - (track.clientWidth - element.offsetWidth) / 2, behavior });
  }
  useEffect(() => {
    const track = carousel.current;
    if (!track) return;
    const frame = requestAnimationFrame(() => {
      const middleSlide = track.children[featured.length];
      if (middleSlide) centerSlide(track, middleSlide, "auto");
    });
    return () => cancelAnimationFrame(frame);
  }, [genre, featured.length, page, selectedId]);
  useEffect(() => {
    if (page !== "Home" || selected || featured.length < 2) return;
    const timer = window.setInterval(() => {
      setHero(index => {
        const next = (index + 1) % featured.length;
        const track = carousel.current;
        const nextSlide = track?.children[featured.length + index + 1];
        if (track && nextSlide && track.clientWidth > 0) centerSlide(track, nextSlide, "smooth");
        return next;
      });
    }, 5500);
    return () => window.clearInterval(timer);
  }, [genre, featured.length, page, selected]);
  useEffect(() => {
    window.scrollTo({ top: selectedId ? 0 : browseScroll.current, behavior: "instant" });
  }, [selectedId]);
  function toggleSave(film: Film) {
    const next = saved.includes(film.id) ? saved.filter(id => id !== film.id) : [...saved, film.id];
    try { localStorage.setItem("streamline-library", JSON.stringify(next)); window.dispatchEvent(new Event("library-change")); } catch { }
  }
  function open(film: Film) {
    if (!selected) browseScroll.current = window.scrollY;
    const url = new URL(window.location.href);
    url.searchParams.set("movie", film.id);
    window.history.pushState({ ...window.history.state, streamlineMovie: true }, "", url);
    window.dispatchEvent(new Event("movie-change"));
  }
  function navigate(name: string) { setPage(name); window.scrollTo({ top: 0, behavior: "smooth" }); }

  if (selected) return <MovieDetail key={selected.id} film={selected} saved={saved.includes(selected.id)} onSave={() => toggleSave(selected)} onSelect={open} onNavigate={(destination) => { closeMovie(); navigate(destination); }} />;

  return <div className="min-h-screen bg-[radial-gradient(ellipse_at_35%_0%,#09231f_0%,#0b1715_22%,#0c0c0d_52%)] lg:bg-[radial-gradient(ellipse_at_65%_0%,#122823_0,#101917_25%,#0c0d0e_65%)]">
    <aside className="fixed inset-y-0 left-0 z-[25] hidden w-[200px] flex-col border-r border-[#ffffff07] bg-[#0c100fee] px-6 py-[37px] shadow-[inset_-1px_0_0_#ffffff06,8px_0_40px_#09231f12] backdrop-blur-xl lg:flex min-[1450px]:w-[220px] min-[1450px]:px-7">
      <button className="flex items-center bg-transparent p-0 text-left text-[22px] font-bold tracking-[-1px]" onClick={() => navigate("Home")} aria-label="Streamline home"><span className="mr-2 text-[33px] leading-none text-[#c8e0d5] italic">s</span>streamline<span className="text-[#a3cdb9]">.</span></button>
      <span className="mt-[62px] mb-[22px] ml-3 text-[8px] tracking-[2px] text-[#56615b]">YOUR SPACE</span>
      <nav className="flex flex-col gap-[10px]"><NavigationItems page={page} navigate={navigate} /></nav>
      <div className="mt-auto text-[9px] leading-loose text-[#6d7871]"><span className="mr-[5px] inline-block size-1 rounded-full bg-[#91b09e]" /> A little escape. Anytime.<small className="mt-[15px] block text-[9px] text-[#424d46]">© 2026 Streamline</small></div>
    </aside>
    <main className="overflow-hidden pt-[19px] pb-40 lg:ml-[200px] lg:max-w-[1900px] lg:px-[42px] lg:pt-0 lg:pb-[30px] min-[1450px]:ml-[220px] min-[1450px]:px-[60px]">
      <header className="hidden h-[101px] items-center justify-between text-[13px] text-[#778b81] lg:flex">
        <div>Discover your next <span className="text-[#c4cec8]">great watch.</span></div>
        <div className="flex items-center gap-[23px]"><button className="bg-transparent text-[#c3cbc7]" aria-label="Search movies and shows" onClick={() => navigate("Search")}><SearchIcon className="size-5" /></button><span className="h-[19px] w-px bg-[#ffffff14]" /><button className="grid size-8 place-items-center rounded-full bg-[#4f173d] text-[14px] font-semibold text-[#b7669b]" aria-label="Open profile" onClick={() => navigate("Profile")}>S</button></div>
      </header>
      {page === "Home" ? <>
        <div className="flex items-center gap-2 overflow-x-auto px-[23px] [scrollbar-width:none] lg:mb-[25px] lg:px-0 [&::-webkit-scrollbar]:hidden" aria-label="Browse genres">
          {genres.map(g => <button key={g} aria-pressed={genre === g} className={`flex h-[38px] shrink-0 items-center justify-center gap-[10px] rounded-[60px] px-[18px] py-2 text-[16px] leading-[1.4] font-normal tracking-[-.04em] whitespace-nowrap ${genre === g ? "bg-white text-black" : "bg-white/8 text-[#d8d8d8] hover:bg-white/15"}`} onClick={() => { setGenre(g); setHero(0); }}>{g}</button>)}
          <span className="ml-auto hidden whitespace-nowrap text-[8px] tracking-[2px] text-[#61786c] lg:block">HANDPICKED FOR YOU</span>
        </div>
        <section className="relative mb-[37px] hidden h-[405px] overflow-hidden rounded-[13px] border border-[#ffffff0b] bg-[#0a302b] lg:block min-[1450px]:h-[440px]" aria-label="Featured title">
          <div className={`absolute inset-0 bg-cover bg-[position:center_55%] opacity-55 saturate-[.6] ${current.id === "furious" ? "bg-[#08695f] bg-blend-luminosity" : ""}`} style={{ backgroundImage: `url("${current.image}"), url("/art/${current.id}.svg")` }} />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#081c19_3%,#0a201bd9_30%,#0e282052_70%,#142e2466),linear-gradient(0deg,#081a18a0,transparent_35%)]" />
          <div className="relative z-[2] w-[62%] max-w-[630px] px-[38px] py-[47px] min-[1450px]:px-12 min-[1450px]:py-[55px]">
            <FeatureLabel><span className="size-[5px] rounded-full bg-[#abc7b9]" />IN THE SPOTLIGHT</FeatureLabel>
            <h1 className="mt-[23px] mb-[18px] text-[60px] leading-[1.02] font-bold tracking-[-2.8px] min-[1450px]:text-[70px]">{current.title}</h1>
            <div className="flex items-center gap-[14px] text-[11px] text-[#bdc8c1]"><span>{current.genre}</span><span>{current.year}</span><span className="rounded-[3px] border border-[#81958a70] px-[5px] py-px text-[9px]">16+</span><span className="text-[#e1b671]">★ <b className="font-normal text-[#d4dcd7]">{current.rating}</b></span></div>
            <p className="mt-[17px] mb-6 max-w-[335px] text-[12px] leading-[1.85] text-[#9cb0a4] min-[1450px]:max-w-[390px] min-[1450px]:text-[13px]">{current.description}</p>
            <div className="flex gap-[11px]"><ActionButton onClick={() => open(current)}><PlayIcon />Watch now</ActionButton><ActionButton secondary onClick={() => toggleSave(current)}><span className="text-[24px] font-light">{saved.includes(current.id) ? "✓" : "+"}</span>{saved.includes(current.id) ? "In my list" : "My list"}</ActionButton></div>
          </div>
          <div className="absolute top-7 right-[8%] h-[315px] w-[235px] rotate-[9deg] rounded-[10px] shadow-[0_20px_60px_#0008] min-[1450px]:top-[30px] min-[1450px]:right-[12%] min-[1450px]:h-[350px] min-[1450px]:w-[260px]"><Art film={current} /></div>
          <div className="absolute right-[30px] bottom-5 flex items-center gap-[6px]">{featured.map((f, i) => <button key={f.id} className={`h-1 rounded-[10px] p-0 ${hero === i ? "w-[23px] bg-[#e2ebe6]" : "w-[5px] bg-[#b8c6be55]"}`} aria-label={`Feature ${f.title}`} onClick={() => setHero(i)} />)}<span className="ml-[10px] text-[9px] tracking-[1px] text-[#9bad9f]">{String(hero + 1).padStart(2, "0")} / {String(featured.length).padStart(2, "0")}</span></div>
        </section>
        <section className="mt-10 mb-[84px] lg:hidden">
          <div className="relative flex snap-x snap-mandatory scroll-px-[calc((100%-282px)/2)] gap-[22px] overflow-x-auto px-[calc((100%-282px)/2)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" ref={carousel} onScroll={e => {
            const track = e.currentTarget;
            const center = track.scrollLeft + track.clientWidth / 2;
            const slides = Array.from(track.children) as HTMLElement[];
            const nearest = slides.reduce((best, slide) => Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - center) < Math.abs(best.offsetLeft + best.offsetWidth / 2 - center) ? slide : best, slides[0]);
            if (!nearest) return;
            const index = slides.indexOf(nearest);
            setHero(index % featured.length);
            const equivalent = index < featured.length ? index + featured.length : index >= featured.length * 2 ? index - featured.length : -1;
            if (equivalent >= 0) track.scrollTo({ left: track.scrollLeft + slides[equivalent].offsetLeft - nearest.offsetLeft, behavior: "auto" });
          }}>
            {Array.from({ length: featured.length * 3 }, (_, i) => {
              const film = featured[i % featured.length];
              return <button key={`${i}-${film.id}`} className={`relative h-[378px] w-[282px] shrink-0 origin-center snap-center rounded-[20px] bg-[#2a2a2a] p-0 transition-[transform,opacity] duration-300 motion-reduce:transition-none ${hero === i % featured.length ? "scale-100 opacity-100" : "scale-[.86] opacity-25"}`} onClick={() => open(film)} aria-label={`Watch ${film.title}`}>
                <Art film={film} /><span className="absolute top-[9px] left-[11px] flex size-[47px] items-center justify-center gap-[10px] rounded-[84px] bg-white/14 text-white/60"><PlayIcon className="size-[20px]" /></span>
              </button>;
            })}
          </div>
          <h1 className="mt-[18px] mb-1 text-center text-[16px] leading-[19px] font-medium tracking-[-.04em] text-white">{current.title}</h1>
          <div className="flex justify-center gap-[6px] text-[14px] leading-4 font-normal tracking-[-.04em] text-white/50">{current.genre}<span>{current.rating} <b className="font-normal text-[#ffc346]">★</b></span></div>
        </section>
        <FilmRow title="New Releases" first items={genre === "Thrill" ? films.slice(1, 6) : films.filter(f => f.genre === genre)} onSelect={open} />
        <FilmRow title="Top 10 IMDB This Week" items={[films[6], films[7], films[8], films[9], films[10], films[0], films[1], films[2], films[3], films[4]]} onSelect={open} />
        <section className="mb-16 flex flex-col gap-[18px] lg:mb-[33px]">
          <SectionHeading title="Watch Yellowstone" />
          <div className="flex snap-x snap-proximity scroll-px-[23px] gap-[10px] overflow-x-auto px-[23px] [scrollbar-width:none] lg:scroll-px-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
            {["Best of The Duttons vs. Everyone | Yellowstone", "Best of The Duttons | Yellowstone", "The land. The legacy. | Yellowstone"].map((title, i) => <button className="flex w-[275px] shrink-0 snap-start flex-col gap-[7px] bg-transparent p-0 text-left" key={title} onClick={() => open(films[10])}>
              <div className={`relative h-[179px] w-[275px] overflow-hidden rounded-[7px] bg-cover bg-center before:absolute before:inset-0 before:content-[''] ${i === 0 ? "bg-[#e6b300] bg-blend-luminosity before:bg-[linear-gradient(transparent_20%,#d59e00b0)]" : "bg-[#6f7660] before:bg-[linear-gradient(transparent,#0009)]"}`} style={{ backgroundImage: `url("${[films[10].image, photo("photo-1519681393784-d120267933ba"), photo("photo-1472396961693-142e6e269027")][i]}"), url("/art/yellowstone.svg")` }}>
                <span className="absolute bottom-6 left-[14px] text-[22px] font-bold tracking-[1px] [font-family:Georgia,serif]">{i === 0 ? "THE DUTTONS" : "YELLOWSTONE"}</span>
                <span className="absolute right-[10px] bottom-[7px] flex h-5 min-w-11 items-center justify-center rounded-[6px] bg-black/50 px-[10px] py-[3px] text-[12px] leading-[14px] font-normal tracking-[-.04em]">{["5:10", "6:42", "4:58"][i]}</span>
              </div>
              <div className="flex w-full flex-col gap-px"><h3 className="w-full truncate text-[16px] leading-[19px] font-medium tracking-[-.04em] text-white">{title}</h3><p className="text-[14px] leading-4 font-normal tracking-[-.04em] text-white/50">S2 EP | {10 + i}</p></div>
            </button>)}
          </div>
        </section>
        <footer className="mt-[45px] hidden items-center justify-between border-t border-[#ffffff08] pt-[25px] text-[10px] text-[#48544d] lg:flex"><span className="text-[15px] font-bold tracking-[-1px] text-[#74847a]">streamline.</span><span>Your next story starts here.</span><span>Made for movie nights.</span></footer>
      </> : page === "Profile" ? <section className="min-h-[75vh] px-[23px] py-[30px] lg:px-0 lg:py-10">
        <div className="flex flex-col items-center py-[70px] text-center lg:pt-[50px]"><span className="mb-[30px] grid size-20 place-items-center rounded-full bg-[#4f173d] text-[35px] font-semibold text-[#b7669b]">S</span><FeatureLabel>YOUR PERSONAL SCREENING ROOM</FeatureLabel><h1 className="mt-5 mb-2 text-[28px] tracking-[-1px] lg:text-[38px]">Hello, movie lover.</h1><p className="mb-[30px] text-[#9caaa3]">Your stories, all in one place.</p><ActionButton onClick={() => navigate("Library")}><LibraryIcon />My library · {saved.length}</ActionButton></div>
      </section> : <section className="min-h-[75vh] px-[23px] py-[30px] lg:px-0 lg:py-10">
        {/* <FeatureLabel>{page === "Search" ? "FIND YOUR NEXT FAVORITE" : "SAVED FOR A GOOD NIGHT"}</FeatureLabel> */}
        <h1 className="mt-5 mb-7 text-[28px] tracking-[-1px] lg:text-[38px]">{page === "Search" ? "What are you looking for?" : "Your library"}</h1>
        {page === "Search" && <label className="mb-[30px] flex h-[60px] w-full max-w-full items-center justify-between gap-[19px] rounded-[50px] bg-white/15 px-[18px] py-[14px] focus-within:ring-1 focus-within:ring-white/30"><input className="min-w-0 flex-1 border-0 bg-transparent text-[18px] leading-[21px] font-medium tracking-[-.04em] text-white outline-none placeholder:text-white/50" aria-label="Search movies, shows, and genres" autoFocus placeholder="Search for your Favourite Movie" value={query} onChange={e => setQuery(e.target.value)} /><SearchIcon className="size-8 shrink-0 text-white/50" /></label>}
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 lg:grid-cols-5 lg:gap-x-4 lg:gap-y-7">
          {films.filter(f => page === "Library" ? saved.includes(f.id) : `${f.title} ${f.genre}`.toLowerCase().includes(query.toLowerCase())).map(f => <button className="min-w-0 bg-transparent p-0 text-left" key={f.id} onClick={() => open(f)}><div className="aspect-[236/317] rounded-lg"><Art film={f} /></div><h3 className="mt-[9px] mb-[5px] text-[16px] leading-[19px] font-medium tracking-[-.04em]">{f.title}</h3><p className="text-[14px] leading-4 font-normal text-white/50">{f.year} · {f.genre}</p></button>)}
        </div>
        {page === "Library" && !saved.length && <div className="py-[55px] text-center text-[#a1aba6]"><LibraryIcon className="m-auto size-10" /><h2 className="text-[20px] text-white">A good story is worth saving.</h2><p className="mt-[14px] mb-[25px] text-[14px]">Add titles to your list to find them here.</p><ActionButton onClick={() => navigate("Home")}>Explore titles</ActionButton></div>}
        {page === "Search" && !films.some(f => `${f.title} ${f.genre}`.toLowerCase().includes(query.toLowerCase())) && <p className="py-[55px] text-center text-[#a1aba6]">No titles found. Try another title or genre.</p>}
      </section>}
    </main>
    <nav className="fixed inset-x-0 bottom-0 z-20 flex h-[121px] items-center justify-center gap-[clamp(12px,calc((100vw-272px)/3),43px)] bg-[linear-gradient(180deg,rgba(14,13,15,0)_0%,#0E0D0F_41.74%)] px-4 pt-[26px] pb-[25px] backdrop-blur-[2px] lg:hidden" aria-label="Main navigation"><NavigationItems page={page} navigate={navigate} /></nav>

  </div>;
}
