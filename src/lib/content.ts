import { apiFetch } from "./client";

export type Taxon = { id: string; name: string; slug: string; code: string };

export type ContentType = "MOVIE" | "SERIES" | "EPISODE" | "SHORT";
export type VideoSource = "CLOUDFLARE" | "YOUTUBE";

/** Shape returned by the backend content serializer. */
export type ApiContent = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  type: ContentType;
  visibility: "DRAFT" | "PRIVATE" | "PUBLISHED" | "ARCHIVED";
  isPremium: boolean;
  isAiGenerated: boolean;
  durationSecs: number | null;
  releaseDate: string | null;
  createdAt: string;
  seriesId: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  source: VideoSource;
  youtubeId: string | null;
  posterUrl: string | null;
  rating: number | null;
  tagline: string | null;
  creator: { id: string; email: string } | null;
  categories: Taxon[];
  languages: Taxon[];
  regions: Taxon[];
};

export type Paginated<T> = { items: T[]; page: number; limit: number; total: number; totalPages: number };
export type Taxonomy = { categories: Taxon[]; languages: Taxon[]; regions: Taxon[] };

export type DiscoverParams = {
  q?: string;
  type?: ContentType;
  category?: string;
  language?: string;
  region?: string;
  premium?: boolean;
  limit?: number;
  cursor?: string;
};

export type Playback =
  | { source: "YOUTUBE"; youtubeId: string; playerUrl: string; embedUrl: string }
  | { sessionId: string; expiresAt: string; playerUrl: string; hlsManifestUrl: string; dashManifestUrl: string };

function query(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== "") search.set(key, String(value));
  const string = search.toString();
  return string ? `?${string}` : "";
}

// --- Public reads ---
export const getFeatured = (signal?: AbortSignal) => apiFetch<ApiContent[]>("content/featured", { signal });
export const getTaxonomy = (signal?: AbortSignal) => apiFetch<Taxonomy>("content/taxonomy", { signal });
export const discover = (params: DiscoverParams = {}, signal?: AbortSignal) =>
  apiFetch<{ items: ApiContent[]; nextCursor: string | null }>(`content${query(params)}`, { signal });
export const getContent = (id: string, token?: string | null, signal?: AbortSignal) =>
  apiFetch<ApiContent>(`content/${id}`, { token, signal });

// --- Watchlist ("My list") ---
export const getWatchlist = (token: string, signal?: AbortSignal) =>
  apiFetch<Paginated<ApiContent & { addedAt: string }>>("content/me/watchlist", { token, signal });
export const addToWatchlist = (id: string, token: string) =>
  apiFetch<{ contentId: string; saved: true }>(`content/${id}/watchlist`, { method: "POST", token });
export const removeFromWatchlist = (id: string, token: string) =>
  apiFetch<void>(`content/${id}/watchlist`, { method: "DELETE", token });

// --- Playback ---
export const createPlayback = (id: string, token: string, deviceId: string) =>
  apiFetch<Playback>(`video/content/${id}/playback`, { method: "POST", token, deviceId });

// --- Display helpers ---
export const contentYear = (c: ApiContent): string =>
  (c.releaseDate ? new Date(c.releaseDate) : new Date(c.createdAt)).getFullYear().toString();
export const contentGenre = (c: ApiContent): string =>
  c.categories[0]?.name ?? { MOVIE: "Movie", SERIES: "Series", EPISODE: "Episode", SHORT: "Short" }[c.type];
export const ratingLabel = (c: ApiContent): string | null => (c.rating == null ? null : c.rating.toFixed(1));
