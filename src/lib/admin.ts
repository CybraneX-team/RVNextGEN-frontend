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

// --- Edit existing content ---
export type UpdateContentBody = {
  title?: string;
  description?: string;
  posterUrl?: string;
  rating?: number;
  tagline?: string;
  type?: ContentType;
  visibility?: "DRAFT" | "PRIVATE" | "PUBLISHED" | "ARCHIVED";
  categoryIds?: string[];
};
export const updateContent = (id: string, body: UpdateContentBody, token: string) =>
  apiFetch<ApiContent>(`content/${id}`, { method: "PATCH", body, token });

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

export type CreditRate = {
  id: string; provider: string; operation: "TEXT" | "IMAGE" | "VIDEO"; model: string;
  inrCostPaise: number; creditCost: number; isActive: boolean;
};
export const adminCreditRates = (token: string) =>
  apiFetch<Paginated<CreditRate>>("admin/credit-rates", { token });

function listQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const string = search.toString();
  return string ? `?${string}` : "";
}
