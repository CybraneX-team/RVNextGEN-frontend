export interface PosterItem {
  id: string;
  title: string;
  genre: string;
  rating?: number;
  gradient: string;
  textClass?: string;
}

export interface WideItem {
  id: string;
  title: string;
  subtitle: string;
  duration: string;
  gradient: string;
}

export const genres: string[] = ["Thrill", "Action", "Drama", "Sci-Fi", "Documentary"];

export const featured: PosterItem = {
  id: "the-furious",
  title: "The Furious",
  genre: "Action",
  rating: 4.5,
  gradient: "from-teal-800 via-slate-950 to-black",
};

export const heroCarouselItems: PosterItem[] = [
  featured,
  {
    id: "night-vultures",
    title: "Night Vultures",
    genre: "Sci-Fi",
    rating: 4.2,
    gradient: "from-indigo-700 via-slate-950 to-black",
  },
  {
    id: "crimson-hour",
    title: "Crimson Hour",
    genre: "Thrill",
    rating: 4.7,
    gradient: "from-rose-700 via-zinc-950 to-black",
  },
];

export const newReleases: PosterItem[] = [
  {
    id: "disclosure-day",
    title: "Disclosure Day",
    genre: "Sci-Fi",
    gradient: "from-stone-200 via-stone-300 to-stone-500",
  },
  {
    id: "arctic-town",
    title: "Arctic Town",
    genre: "Documentary",
    gradient: "from-amber-500 via-orange-800 to-zinc-950",
  },
  {
    id: "salt-mines",
    title: "Salt Mines",
    genre: "Thrill",
    gradient: "from-cyan-700 via-slate-900 to-black",
  },
  {
    id: "the-last-light",
    title: "The Last Light",
    genre: "Drama",
    gradient: "from-rose-800 via-zinc-900 to-black",
  },
];

export const top10: PosterItem[] = [
  {
    id: "dexter-new-blood",
    title: "Dexter New Blood",
    genre: "Thrill",
    gradient: "from-sky-200 via-slate-500 to-slate-950",
  },
  {
    id: "city-on-a-hill",
    title: "City On A Hill",
    genre: "Drama",
    gradient: "from-zinc-500 via-zinc-800 to-black",
  },
  {
    id: "midnight-static",
    title: "Midnight Static",
    genre: "Sci-Fi",
    gradient: "from-violet-700 via-slate-900 to-black",
  },
  {
    id: "the-quiet-heist",
    title: "The Quiet Heist",
    genre: "Action",
    gradient: "from-emerald-700 via-zinc-900 to-black",
  },
];

export const yellowstoneRow: WideItem[] = [
  {
    id: "yellowstone-1",
    title: "Best of The Duttons vs. Everyone | Yellowstone",
    subtitle: "S2 EP | 10",
    duration: "5:10",
    gradient: "from-amber-400 via-amber-700 to-zinc-950",
  },
  {
    id: "yellowstone-2",
    title: "Best of The Duttons | Yellowstone",
    subtitle: "S2 EP | 11",
    duration: "6:42",
    gradient: "from-amber-900 via-zinc-900 to-black",
  },
  {
    id: "yellowstone-3",
    title: "Rip's Revenge | Yellowstone",
    subtitle: "S3 EP | 4",
    duration: "4:58",
    gradient: "from-zinc-600 via-zinc-900 to-black",
  },
];
