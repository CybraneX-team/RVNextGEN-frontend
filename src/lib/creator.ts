import { apiFetch } from "./client";
import type { Paginated } from "./content";

// The five pipeline stages, in dependency order. Mirrors backend CreatorStepKind.
export type StepKind = "STORY" | "SCREENPLAY" | "CHARACTER" | "SCENE" | "ANIMATION";
export type StepStatus = "DRAFT" | "GENERATING" | "READY" | "FAILED";
export type GenerationJobStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";

export type Project = { id: string; title: string; status: string; createdAt: string; updatedAt: string };

export type CreatorStep = {
  id: string;
  kind: StepKind;
  order: number;
  status: StepStatus;
  inputJson: { prompt?: string; effectivePrompt?: string; previousStepIds?: string[] } | null;
  outputJson: { text?: string } | null;
  model: string | null;
  creditsUsed: number;
  createdAt: string;
  updatedAt: string;
  generationJob: { id: string; status: GenerationJobStatus; outputUrl: string | null; errorCode: string | null } | null;
};

export type ProjectDetail = Project & { steps: CreatorStep[] };

// --- Derived UI view-model (computed from ProjectDetail.steps) ---
export type StageStatus = "LOCKED" | "AVAILABLE" | "GENERATING" | "READY" | "FAILED";
export type StageView = { kind: StepKind; status: StageStatus; step: CreatorStep | null; lockedReason?: string };

export type RunStepBody = { prompt: string; provider?: string; model?: string };

export type PublishBody = { title: string; slug: string; description?: string; isPremium?: boolean };
export type PublishResult = { contentId: string; slug: string; visibility: string; streamUid: string | null; nextStep: string };

// --- Projects ---
export const listProjects = (token: string, page = 1, limit = 20) =>
  apiFetch<Paginated<Project>>(`creator/projects?page=${page}&limit=${limit}`, { token });

export const createProject = (title: string, token: string) =>
  apiFetch<Project>("creator/projects", { method: "POST", body: { title }, token });

export const getProject = (id: string, token: string, signal?: AbortSignal) =>
  apiFetch<ProjectDetail>(`creator/projects/${id}`, { token, signal });

// --- Steps ---
export const runStep = (projectId: string, kind: StepKind, body: RunStepBody, token: string) =>
  apiFetch<CreatorStep>(`creator/projects/${projectId}/steps/${kind}`, { method: "POST", body, token });

export const editStep = (projectId: string, stepId: string, text: string, token: string) =>
  apiFetch<CreatorStep>(`creator/projects/${projectId}/steps/${stepId}`, { method: "PATCH", body: { text }, token });

// --- Credits ---
export const getCreditBalance = (token: string) =>
  apiFetch<{ balance: number }>("creator/credits?page=1&limit=1", { token });

// --- Publish (uses the final ANIMATION step's generationJob id) ---
export const publishJob = (jobId: string, body: PublishBody, token: string) =>
  apiFetch<PublishResult>(`creator/jobs/${jobId}/publish`, { method: "POST", body, token });
