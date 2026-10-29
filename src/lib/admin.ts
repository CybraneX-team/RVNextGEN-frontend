import { apiFetch } from "./client";
import { authApi, type AuthUser } from "./api";
import type { ApiContent, ContentType, Paginated } from "./content";

// --- Admin bootstrap (through the same-origin auth proxy, which forwards the Bearer token) ---
export const grantAdmin = (email: string, adminPassword: string, token: string) =>
  authApi<{ user: AuthUser; promoted: boolean }>("admin-access", { email, adminPassword }, token);

// --- YouTube ingest ---
export type YoutubePreview = {
  youtubeId: string;
  title: string;
  description: string | null;
  posterUrl: string;
  durationSecs: number | null;
  channel: string | null;
};
export const youtubePreview = (url: string, token: string) =>
  apiFetch<YoutubePreview>("content/youtube/preview", { method: "POST", body: { url }, token });

export type CreateYoutubeBody = {
  url: string;
  title?: string;
  description?: string;
  posterUrl?: string;
  rating?: number;
  tagline?: string;
  type?: ContentType;
  visibility?: "DRAFT" | "PRIVATE" | "PUBLISHED" | "ARCHIVED";
  durationSecs?: number;
  categoryIds?: string[];
  seriesId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
};
export const createYoutube = (body: CreateYoutubeBody, token: string) =>
  apiFetch<ApiContent>("content/youtube", { method: "POST", body, token });

// --- Cloudflare Stream ingest ---
export type CreateCloudflareBody = {
  title: string;
  description?: string;
  posterUrl?: string;
  rating?: number;
  tagline?: string;
  type?: ContentType;
  isPremium?: boolean;
  /** A remote HTTPS video URL copied into Stream server-side. Omit to upload a file instead. */
  sourceUrl?: string;
  categoryIds?: string[];
  seriesId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
};
export const createCloudflare = (body: CreateCloudflareBody, token: string) =>
  apiFetch<ApiContent>("content/cloudflare", { method: "POST", body, token });

/** Request a one-time Cloudflare direct-upload URL for a draft, to upload a video file to. */
export const createUploadUrl = (contentId: string, token: string, name?: string) =>
  apiFetch<{ uploadUrl: string; expiresAt: string; contentId: string }>(
    `video/content/${contentId}/upload-url`,
    { method: "POST", body: { name }, token },
  );

export type StreamUrls = { uid: string; iframe: string; hls: string; dash: string };
export type VideoStatus = { ready: boolean; state: string; errorCode: string | null; urls: StreamUrls | null };
export const videoStatus = (contentId: string, token: string) =>
  apiFetch<VideoStatus>(`video/content/${contentId}/status`, { token });

/** Upload a video file directly to Cloudflare's one-time upload URL (browser → Cloudflare). */
export async function uploadVideoFile(uploadUrl: string, file: File): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(uploadUrl, { method: "POST", body: form });
  if (!res.ok) throw new Error("Cloudflare rejected the upload. Try again.");
}

// --- Edit existing content ---
export type UpdateContentBody = {
  title?: string;
  description?: string;
  posterUrl?: string;
  youtubeUrl?: string;
  rating?: number;
  tagline?: string;
  type?: ContentType;
  visibility?: "DRAFT" | "PRIVATE" | "PUBLISHED" | "ARCHIVED";
  categoryIds?: string[];
  seasonNumber?: number;
  episodeNumber?: number;
  /** Viewer Wallet: paid flag + optional per-episode coin price (null clears the override → duration-based). */
  isPremium?: boolean;
  priceCoinsOverride?: number | null;
  basePricePaise?: number | null;
};
export const updateContent = (id: string, body: UpdateContentBody, token: string) =>
  apiFetch<ApiContent>(`content/${id}`, { method: "PATCH", body, token });

export const uploadPoster = (file: File, token: string) => {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<{ url: string }>("content/poster-upload", { method: "POST", body: form, token });
};

export type Genre = { id: string; name: string; slug: string };
export const createGenre = (name: string, token: string) =>
  apiFetch<Genre>("content/categories", { method: "POST", body: { name }, token });

// --- Genre management (admin CRUD) ---
export type AdminGenre = Genre & { contentCount: number };
export const listGenres = (token: string) =>
  apiFetch<AdminGenre[]>("content/categories", { token });
export const renameGenre = (id: string, name: string, token: string) =>
  apiFetch<Genre>(`content/categories/${id}`, { method: "PATCH", body: { name }, token });
export const deleteGenre = (id: string, token: string) =>
  apiFetch<void>(`content/categories/${id}`, { method: "DELETE", token });

// --- Delete a title (soft delete; a series also removes its episodes) ---
export const deleteContent = (id: string, token: string) =>
  apiFetch<void>(`content/${id}`, { method: "DELETE", token });

// --- Series builder (seasons → episodes) ---
export type AdminSeries = { id: string; title: string; posterUrl: string | null; visibility: string; createdAt: string; episodeCount: number };
export const listSeriesAdmin = (token: string) =>
  apiFetch<AdminSeries[]>("content/series", { token });

export type CreateSeriesBody = { title: string; description?: string; posterUrl?: string; rating?: number; tagline?: string; categoryIds?: string[] };
export const createSeries = (body: CreateSeriesBody, token: string) =>
  apiFetch<ApiContent>("content/series", { method: "POST", body, token });

export type SeriesTree = { series: ApiContent; seasons: { seasonNumber: number; episodes: ApiContent[] }[] };
export const seriesEpisodes = (seriesId: string, token: string) =>
  apiFetch<SeriesTree>(`content/${seriesId}/episodes`, { token });

// --- Dashboard reads ---
export type Overview = {
  metricDate: string;
  totals: { users: number; paidUsers: number; freeUsers: number; content: number; views: number; generations: number };
  metrics: Record<string, number>;
};
export const adminOverview = (token: string) => apiFetch<Overview>("admin/insights/overview", { token });

export type AdminUser = {
  id: string; email: string; role: "USER" | "CREATOR" | "ADMIN"; creditsBalance: number;
  emailVerifiedAt: string | null; createdAt: string;
  profile: { displayName: string | null; phoneNumber: string | null; countryCode: string | null } | null;
  /** Viewer Wallet (episode credit) balances, one per currency the user has used. */
  walletBalances?: { currency: string; balanceMinor: number }[];
};
export const adminUsers = (token: string, q?: string, status?: "paid" | "free") =>
  apiFetch<Paginated<AdminUser>>(`admin/users${listQuery({ q, status })}`, { token });

export type AdminUpload = {
  id: string; title: string; type: ContentType; posterUrl: string | null;
  source: "direct" | "generated"; videoSource: "CLOUDFLARE" | "YOUTUBE";
  youtubeId: string | null; visibility: string; creator: { id: string; email: string } | null;
  createdAt: string; updatedAt: string; streamUid: string | null; streamReady: boolean | null;
};
export const adminUploads = (token: string, q?: string, status?: "direct" | "generated") =>
  apiFetch<Paginated<AdminUpload>>(`admin/uploads${listQuery({ q, status })}`, { token });

// --- Grant credits to a user (testing without a payment system) ---
export const grantCredits = (userId: string, amount: number, reason: string, token: string) =>
  apiFetch<{ id: string; creditsBalance: number }>(`admin/users/${userId}/credits/grant`, {
    method: "POST",
    body: { amount, reason },
    token,
  });

// --- Per-user Creator Lab economics (admin drill-down) ---
export type UserEconomics = {
  user: { id: string; email: string; creditsBalance: number };
  inrPerCreditPaise: number;
  summary: {
    creditsBalance: number; creditsBought: number; creditsGranted: number; creditsRefunded: number; creditsConsumed: number;
    apiExpenditurePaise: number; revenuePaise: number; profitLossPaise: number; creditValuePaise: number;
  };
  byModel: Array<{ provider: string | null; operation: "TEXT" | "IMAGE" | "VIDEO" | null; model: string | null; generations: number; creditsConsumed: number; apiCostPaise: number; creditValuePaise: number; marginPaise: number }>;
};
export const userCreatorEconomics = (userId: string, token: string) =>
  apiFetch<UserEconomics>(`admin/users/${userId}/creator-economics`, { token });

// --- Credit rates (usage-metered cost per model) ---
export type CreditRateUnit = "PER_CALL" | "PER_TOKEN" | "PER_MEGAPIXEL" | "PER_SECOND";
export type CreditRate = {
  id: string; provider: string; operation: "TEXT" | "IMAGE" | "VIDEO"; model: string;
  inrCostPaise: number; creditCost: number; isActive: boolean;
  /** Metering unit + per-unit rates (paise). Only the field matching `unit` is used. */
  unit: CreditRateUnit;
  inputPaisePerMillion: number | null; outputPaisePerMillion: number | null;
  paisePerMegapixel: number | null; paisePerSecond: number | null;
  /** Per-model margin override (basis points); null = inherit the global default. */
  marginBps: number | null;
  /** Derived on list reads: effective margin + a representative example charge. */
  effectiveMarginBps?: number;
  exampleCostPaise?: number; exampleSellPaise?: number; exampleMc?: number;
  revenuePaise?: number; marginPaise?: number;
};
export const adminCreditRates = (token: string) =>
  apiFetch<Paginated<CreditRate> & { inrPerCreditPaise: number; marginBpsDefault: number }>("admin/credit-rates", { token });

export type CreateCreditRateBody = {
  provider: string;
  operation: "TEXT" | "IMAGE" | "VIDEO";
  model: string;
  inrCostPaise: number;
  /** Omit to let the server derive a break-even default from the global conversion rate. */
  creditCost?: number;
  /** Optional per-model margin (basis points); omit to inherit the global default. */
  marginBps?: number;
};
export const createCreditRate = (body: CreateCreditRateBody, token: string) =>
  apiFetch<CreditRate>("admin/credit-rates", { method: "POST", body, token });

export type UpdateCreditRateBody = { inrCostPaise?: number; creditCost?: number; marginBps?: number | null; isActive?: boolean };
export const updateCreditRate = (id: string, body: UpdateCreditRateBody, token: string) =>
  apiFetch<CreditRate>(`admin/credit-rates/${id}`, { method: "PATCH", body, token });

// --- Unified Creator Lab credit transaction history ---
export type CreditTxnKind = "PURCHASE" | "GRANT" | "USAGE" | "REFUND";
export type CreditTransaction = {
  id: string; occurredAt: string; kind: CreditTxnKind; credits: number;
  cashPaise: number | null; costPaise: number | null;
  provider: string | null; operation: "TEXT" | "IMAGE" | "VIDEO" | null; model: string | null;
  generationJobId: string | null; user: { id: string; email: string } | null; balanceAfter: number | null;
};
export const adminCreditTransactions = (
  token: string,
  opts: { page?: number; kind?: CreditTxnKind; userId?: string; from?: string; to?: string } = {},
) => {
  const qs = listQuery({ page: opts.page ? String(opts.page) : undefined, kind: opts.kind, userId: opts.userId, from: opts.from, to: opts.to });
  return apiFetch<Paginated<CreditTransaction>>(`admin/credit-transactions${qs}`, { token });
};

// --- Viewer Wallet packs (admin CRUD) ---
export type WalletPack = { id: string; name: string; creditAmountMinor: number; pricePaise: number; currency: "INR" | "USD" | "AED"; isActive: boolean };
export const adminWalletPacks = (token: string) => apiFetch<Paginated<WalletPack>>("admin/wallet-packs?limit=100", { token });
export type CreateWalletPackBody = { name: string; creditAmountMinor: number; pricePaise: number; currency: "INR" | "USD" | "AED" };
export const createWalletPack = (body: CreateWalletPackBody, token: string) => apiFetch<WalletPack>("admin/wallet-packs", { method: "POST", body, token });
export type UpdateWalletPackBody = { name?: string; creditAmountMinor?: number; pricePaise?: number; isActive?: boolean };
export const updateWalletPack = (id: string, body: UpdateWalletPackBody, token: string) => apiFetch<WalletPack>(`admin/wallet-packs/${id}`, { method: "PATCH", body, token });

// --- Creator Lab credit packs (sold at /creator/credits) ---
export type CreditPack = { id: string; name: string; creditCount: number; pricePaise: number; currency: "INR" | "USD" | "AED"; isActive: boolean };
export const adminCreditPacks = (token: string) => apiFetch<Paginated<CreditPack>>("admin/credit-packs?limit=100", { token });
export type CreateCreditPackBody = { name: string; creditCount: number; pricePaise: number; currency: "INR" | "USD" | "AED" };
export const createCreditPack = (body: CreateCreditPackBody, token: string) => apiFetch<CreditPack>("admin/credit-packs", { method: "POST", body, token });
export type UpdateCreditPackBody = { name?: string; creditCount?: number; pricePaise?: number; isActive?: boolean };
export const updateCreditPack = (id: string, body: UpdateCreditPackBody, token: string) => apiFetch<CreditPack>(`admin/credit-packs/${id}`, { method: "PATCH", body, token });
export type CreditPackPurchase = { id: string; provider: string; amountPaise: number; currency: string; status: string; createdAt: string; user: { id: string; email: string } | null; pack: { id: string; name: string; creditCount: number } | null };
export const adminCreditPackPurchases = (token: string) => apiFetch<Paginated<CreditPackPurchase>>("admin/credit-pack-purchases?limit=20", { token });

export type WalletPurchase = { id: string; provider: string; amountPaise: number; currency: string; amountCreditedMinor: number | null; status: string; createdAt: string; user: { id: string; email: string } | null; pack: { id: string; name: string } | null };
export const adminWalletPurchases = (token: string, status?: string) => apiFetch<Paginated<WalletPurchase>>(`admin/wallet-purchases${listQuery({ status })}`, { token });
export const adjustWallet = (userId: string, amountMinor: number, currency: "INR" | "USD" | "AED", reason: string, token: string) =>
  apiFetch<{ userId: string; balanceMinor: number }>(`admin/users/${userId}/wallet/adjust`, { method: "POST", body: { amountMinor, currency, reason }, token });
export type RegionalPriceResponse = { id: string; type: string; basePricePaise: number | null; durationSecs: number | null; regionalPrices: { countryCode: string; currency: string; amountMinor: number }[] };
export const adminRegionalPrices = (episodeId: string, token: string) => apiFetch<RegionalPriceResponse>(`admin/content/${episodeId}/regional-prices`, { token });
export const setAdminRegionalPrice = (episodeId: string, country: "US" | "AE", amountMinor: number | null, token: string) => apiFetch(`admin/content/${episodeId}/regional-prices/${country}`, { method: "PUT", body: { amountMinor }, token });

// --- Analytics dashboard (sections A–E) ---
export type AnalyticsRange = { from?: string; to?: string; seriesId?: string };
const rangeQuery = (r: AnalyticsRange) => listQuery({ from: r.from, to: r.to, seriesId: r.seriesId });

export type UsersAnalytics = {
  range: { start: string; end: string };
  totals: { totalUsers: number; newUsers: number; activeInRange: number; dau: number; wau: number; mau: number; returningUsers: number; newActiveUsers: number };
  device: { key: string | null; count: number }[]; os: { key: string | null; count: number }[]; browser: { key: string | null; count: number }[]; source: { key: string | null; count: number }[];
  geo: { country: string; events: number }[];
  trend: { day: string; newUsers: number }[];
};
export const analyticsUsers = (token: string, r: AnalyticsRange = {}) => apiFetch<UsersAnalytics>(`admin/analytics/users${rangeQuery(r)}`, { token });

export type ContentAnalytics = {
  range: { start: string; end: string }; totalViews: number;
  items: { id: string; title: string; type: string; durationSecs: number | null; uniqueViewers: number; starts: number; completes: number; completionRate: number; avgPercentComplete: number | null }[];
};
export type GeoTier = "high" | "medium" | "low";
export type GeoCountry = { country: string; visitors: number; events: number; share: number; change: number | null; tier: GeoTier };
export type GeoRegion = { country: string; region: string; visitors: number; events: number; shareOfCountry: number };
export type GeographyAnalytics = {
  range: { start: string; end: string };
  totals: { visitors: number; events: number; unknownVisitors: number; unknownEvents: number; countries: number; regions: number };
  countries: GeoCountry[];
  regions: GeoRegion[];
};
export const analyticsGeography = (token: string, r: AnalyticsRange = {}) => apiFetch<GeographyAnalytics>(`admin/analytics/geography${rangeQuery(r)}`, { token });
export const analyticsContent = (token: string, r: AnalyticsRange = {}) => apiFetch<ContentAnalytics>(`admin/analytics/content${rangeQuery(r)}`, { token });
export type Dropoff = { episodeId: string; buckets: { decile: number; label: string; viewers: number }[] };
export const analyticsDropoff = (token: string, episodeId: string, r: AnalyticsRange = {}) => apiFetch<Dropoff>(`admin/analytics/content/${episodeId}/dropoff${rangeQuery(r)}`, { token });

export type RevenueAnalytics = {
  range: { start: string; end: string }; totalRevenuePaise: number;
  byStream: { walletPaise: number; creditPaise: number; packagePaise: number };
  successfulPayments: number; failedPayments: number; episodeUnlocks: number;
  foreignWalletRevenue: { currency: string; amountMinor: number }[];
  walletSpentByCurrency: { currency: string; amountMinor: number }[];
  payingUsers: number; arppuPaise: number; registrationToPayment: number;
};
export const analyticsRevenue = (token: string, r: AnalyticsRange = {}) => apiFetch<RevenueAnalytics>(`admin/analytics/revenue${rangeQuery(r)}`, { token });

export type FunnelAnalytics = { range: { start: string; end: string }; stages: { stage: string; users: number }[] };
export const analyticsFunnel = (token: string, r: AnalyticsRange = {}) => apiFetch<FunnelAnalytics>(`admin/analytics/funnel${rangeQuery(r)}`, { token });

export type CreatorAnalytics = {
  range: { start: string; end: string };
  totals: { generations: number; succeeded: number; failed: number; failureRate: number };
  models: { provider: string; model: string | null; operation: string; generations: number; succeeded: number; failed: number; creditsUsed: number; apiCostPaise: number; revenuePaise: number; avgLatencyMs: number | null; failureRate: number; marginPaise: number }[];
};
export const analyticsCreator = (token: string, r: AnalyticsRange = {}) => apiFetch<CreatorAnalytics>(`admin/analytics/creator${rangeQuery(r)}`, { token });

// --- Platform settings (Creator Lab conversion rate, Viewer pricing, ...) ---
export type PlatformSettingItem = { key: string; value: unknown };
export const adminSettings = (token: string) =>
  apiFetch<{ items: PlatformSettingItem[] }>("admin/settings", { token });
export const updateSetting = (key: string, value: unknown, token: string) =>
  apiFetch<{ key: string; value: unknown }>(`admin/settings/${key}`, { method: "PUT", body: { value }, token });

function listQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const string = search.toString();
  return string ? `?${string}` : "";
}
