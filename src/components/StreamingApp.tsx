"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronRightIcon, HomeIcon, LibraryIcon, PlayIcon, SearchIcon } from "./icons";

function subscribeLibrary(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("library-change", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("library-change", callback); };
}
function librarySnapshot() { try { return localStorage.getItem("streamline-library") || "[]"; } catch { return "[]"; } }

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

function Art({ film }: { film: Film }) {
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
      className={`relative size-full overflow-hidden rounded-[inherit] bg-cover bg-center ${film.id === "furious" ? "bg-[#08695f] bg-blend-luminosity" : film.id === "disclosure" ? "bg-[#dce6df] bg-blend-luminosity" : film.id === "salt" ? "bg-[#046b78] bg-blend-luminosity" : film.id === "dexter" ? "bg-[#183d59] bg-blend-luminosity" : film.id === "city" ? "bg-[#19372f] grayscale" : "bg-[#19372f]"}`}
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
    {Icon ? <Icon className="size-8 shrink-0 stroke-[1.5] lg:size-[21px]" /> : <span className="grid size-[38px] place-items-center rounded-full bg-[#430d36] text-[20px] leading-[23px] font-medium text-[#7d7d7d]">H</span>}
    <span>{name}</span>
  </button>)}</>;
}

export default function StreamingApp() {
  const [page, setPage] = useState("Home");
  const [genre, setGenre] = useState("Thrill");
  const [hero, setHero] = useState(0);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Film | null>(null);
  const library = useSyncExternalStore(subscribeLibrary, librarySnapshot, () => "[]");
  let saved: string[] = [];
  try { const parsed = JSON.parse(library); if (Array.isArray(parsed)) saved = parsed.filter((id): id is string => typeof id === "string"); } catch { }
  const [playing, setPlaying] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
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
  }, [genre, featured.length, page]);
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
    if (selected) { dialog.current?.showModal(); document.body.style.overflow = "hidden"; }
    else { dialog.current?.close(); document.body.style.overflow = ""; }
    return () => { document.body.style.overflow = ""; };
  }, [selected]);
  function toggleSave(film: Film) {
    const next = saved.includes(film.id) ? saved.filter(id => id !== film.id) : [...saved, film.id];
    try { localStorage.setItem("streamline-library", JSON.stringify(next)); window.dispatchEvent(new Event("library-change")); } catch { }
  }
  function open(film: Film) { setPlaying(false); setSelected(film); }
  function navigate(name: string) { setPage(name); window.scrollTo({ top: 0, behavior: "smooth" }); }

  return <div className="min-h-screen bg-[radial-gradient(ellipse_at_35%_0%,#09231f_0%,#0b1715_22%,#0c0c0d_52%)] lg:bg-[radial-gradient(ellipse_at_65%_0%,#122823_0,#101917_25%,#0c0d0e_65%)]">
    <aside className="fixed inset-y-0 left-0 z-[25] hidden w-[200px] flex-col border-r border-[#ffffff07] bg-[#0c100fee] px-6 py-[37px] lg:flex min-[1450px]:w-[220px] min-[1450px]:px-7">
      <button className="flex items-center bg-transparent p-0 text-left text-[22px] font-bold tracking-[-1px]" onClick={() => navigate("Home")} aria-label="Streamline home"><span className="mr-2 text-[33px] leading-none text-[#c8e0d5] italic">s</span>streamline<span className="text-[#a3cdb9]">.</span></button>
      <span className="mt-[62px] mb-[22px] ml-3 text-[8px] tracking-[2px] text-[#56615b]">YOUR SPACE</span>
      <nav className="flex flex-col gap-[10px]"><NavigationItems page={page} navigate={navigate} /></nav>
      <div className="mt-auto text-[9px] leading-loose text-[#6d7871]"><span className="mr-[5px] inline-block size-1 rounded-full bg-[#91b09e]" /> A little escape. Anytime.<small className="mt-[15px] block text-[9px] text-[#424d46]">© 2026 Streamline</small></div>
    </aside>
    <main className="overflow-hidden pt-[19px] pb-40 lg:ml-[200px] lg:max-w-[1900px] lg:px-[42px] lg:pt-0 lg:pb-[30px] min-[1450px]:ml-[220px] min-[1450px]:px-[60px]">
      <header className="hidden h-[101px] items-center justify-between text-[13px] text-[#778b81] lg:flex">
        <div>Discover your next <span className="text-[#c4cec8]">great watch.</span></div>
        <div className="flex items-center gap-[23px]"><button className="bg-transparent text-[#c3cbc7]" aria-label="Search movies and shows" onClick={() => navigate("Search")}><SearchIcon className="size-5" /></button><span className="h-[19px] w-px bg-[#ffffff14]" /><button className="grid size-8 place-items-center rounded-full bg-[#4f173d] text-[14px] font-semibold text-[#b7669b]" aria-label="Open profile" onClick={() => navigate("Profile")}>H</button></div>
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
        <div className="flex flex-col items-center py-[70px] text-center lg:pt-[50px]"><span className="mb-[30px] grid size-20 place-items-center rounded-full bg-[#4f173d] text-[35px] font-semibold text-[#b7669b]">H</span><FeatureLabel>YOUR PERSONAL SCREENING ROOM</FeatureLabel><h1 className="mt-5 mb-2 text-[28px] tracking-[-1px] lg:text-[38px]">Hello, movie lover.</h1><p className="mb-[30px] text-[#9caaa3]">Your stories, all in one place.</p><ActionButton onClick={() => navigate("Library")}><LibraryIcon />My library · {saved.length}</ActionButton></div>
      </section> : <section className="min-h-[75vh] px-[23px] py-[30px] lg:px-0 lg:py-10">
        <FeatureLabel>{page === "Search" ? "FIND YOUR NEXT FAVORITE" : "SAVED FOR A GOOD NIGHT"}</FeatureLabel>
        <h1 className="mt-5 mb-7 text-[28px] tracking-[-1px] lg:text-[38px]">{page === "Search" ? "What are you looking for?" : "Your library"}</h1>
        {page === "Search" && <label className="mb-[30px] flex items-center gap-3 rounded-[9px] border border-[#ffffff20] bg-[#ffffff05] p-[14px] lg:max-w-[660px]"><SearchIcon className="size-6 shrink-0" /><input className="min-w-0 w-full border-0 bg-transparent text-[14px] text-white" aria-label="Search movies, shows, and genres" autoFocus placeholder="Search movies, shows, and genres" value={query} onChange={e => setQuery(e.target.value)} /><button className="bg-transparent text-[22px] text-[#9aaba4]" onClick={() => setQuery("")} aria-label="Clear search">×</button></label>}
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 lg:grid-cols-5 lg:gap-x-4 lg:gap-y-7">
          {films.filter(f => page === "Library" ? saved.includes(f.id) : `${f.title} ${f.genre}`.toLowerCase().includes(query.toLowerCase())).map(f => <button className="min-w-0 bg-transparent p-0 text-left" key={f.id} onClick={() => open(f)}><div className="aspect-[236/317] rounded-lg"><Art film={f} /></div><h3 className="mt-[9px] mb-[5px] text-[16px] leading-[19px] font-medium tracking-[-.04em]">{f.title}</h3><p className="text-[14px] leading-4 font-normal text-white/50">{f.year} · {f.genre}</p></button>)}
        </div>
        {page === "Library" && !saved.length && <div className="py-[55px] text-center text-[#a1aba6]"><LibraryIcon className="m-auto size-10" /><h2 className="text-[20px] text-white">A good story is worth saving.</h2><p className="mt-[14px] mb-[25px] text-[14px]">Add titles to your list to find them here.</p><ActionButton onClick={() => navigate("Home")}>Explore titles</ActionButton></div>}
        {page === "Search" && !films.some(f => `${f.title} ${f.genre}`.toLowerCase().includes(query.toLowerCase())) && <p className="py-[55px] text-center text-[#a1aba6]">No titles found. Try another title or genre.</p>}
      </section>}
    </main>
    <nav className="fixed inset-x-0 bottom-0 z-20 flex h-[121px] items-center justify-center gap-[clamp(12px,calc((100vw-272px)/3),43px)] bg-[linear-gradient(180deg,rgba(14,13,15,0)_0%,#0E0D0F_41.74%)] px-4 pt-[26px] pb-[25px] lg:hidden" aria-label="Main navigation"><NavigationItems page={page} navigate={navigate} /></nav>
    <dialog ref={dialog} aria-label={selected ? `${selected.title} details` : "Title details"} className="m-auto max-h-[90vh] w-[min(550px,calc(100%-32px))] overflow-auto rounded-2xl border border-[#ffffff20] bg-[#121917] p-0 text-white backdrop:bg-[#000b] backdrop:backdrop-blur-[9px]" onCancel={() => setSelected(null)} onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
      {selected && <>
        <button className="absolute top-[14px] right-[14px] z-[3] size-[34px] rounded-full bg-[#0b161aaa] text-[25px]" onClick={() => setSelected(null)} aria-label="Close title details">×</button>
        <div className="grid h-[220px] place-items-center bg-cover bg-center shadow-[inset_0_-40px_45px_#121917]" style={{ backgroundImage: `url("${selected.image}"), url("/art/${selected.id}.svg")` }}><PlayIcon className="size-12 drop-shadow-[0_0_15px_#000]" /></div>
        <div className="px-[26px] pt-[22px] pb-8"><FeatureLabel>{playing ? "PREVIEW" : "FEATURED TITLE"}</FeatureLabel><h2 className="my-[15px] text-[32px]">{selected.title}</h2><p className="text-[14px] leading-[1.7] text-[#a3afa8]">{selected.year} · {selected.genre} · <span className="text-[#e5b966]">★ {selected.rating}</span></p><p className="text-[14px] leading-[1.7] text-[#a3afa8]">{playing ? "You're all set. This is a UI preview — full-length video will be available when a streaming source is connected." : selected.description}</p><div className="mt-[25px] flex flex-wrap gap-[11px]"><ActionButton onClick={() => setPlaying(!playing)}><PlayIcon />{playing ? "Back to details" : "Play preview"}</ActionButton><ActionButton secondary onClick={() => toggleSave(selected)}>{saved.includes(selected.id) ? "✓ Saved to library" : "+ Add to my list"}</ActionButton></div></div>
      </>}
    </dialog>
  </div>;
}
