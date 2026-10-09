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
};
export const adminUsers = (token: string, q?: string, status?: "paid" | "free") =>
  apiFetch<Paginated<AdminUser>>(`admin/users${listQuery({ q, status })}`, { token });

export type AdminUpload = {
  id: string; title: string; source: "direct" | "generated"; videoSource: "CLOUDFLARE" | "YOUTUBE";
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

// --- Credit rates (cost per model) ---
export type CreditRate = {
  id: string; provider: string; operation: "TEXT" | "IMAGE" | "VIDEO"; model: string;
  inrCostPaise: number; creditCost: number; isActive: boolean;
};
export const adminCreditRates = (token: string) =>
  apiFetch<Paginated<CreditRate>>("admin/credit-rates", { token });

export type CreateCreditRateBody = {
  provider: string;
  operation: "TEXT" | "IMAGE" | "VIDEO";
  model: string;
  inrCostPaise: number;
  creditCost: number;
};
export const createCreditRate = (body: CreateCreditRateBody, token: string) =>
  apiFetch<CreditRate>("admin/credit-rates", { method: "POST", body, token });

export type UpdateCreditRateBody = { inrCostPaise?: number; creditCost?: number; isActive?: boolean };
export const updateCreditRate = (id: string, body: UpdateCreditRateBody, token: string) =>
  apiFetch<CreditRate>(`admin/credit-rates/${id}`, { method: "PATCH", body, token });

function listQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const string = search.toString();
  return string ? `?${string}` : "";
}
