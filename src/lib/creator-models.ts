import type { StepKind } from "./creator";

/**
 * Curated model catalog for the Creator Lab, grouped by stage.
 *
 * IMPORTANT: each entry MUST correspond to an active CreditRate row on the backend
 * (provider + operation + model) AND the provider's API key must be set, or the run
 * returns 400 "No active credit rate configured" / "<provider> is not configured".
 * The `credits` here is a display hint only — the backend charges the live CreditRate,
 * which admins change in the Cost tab. Keep this list aligned with backend seeds.
 *
 * Seeded today (backend/src/data/data.service.ts):
 *   TEXT   openai / gpt-4o-mini                              → 1 credit
 *   IMAGE  fal    / fal-ai/flux/dev                          → 5 credits
 *   VIDEO  higgsfield / bytedance/seedance-2.5-text-to-video → 50 credits
 */
export type ModelOption = {
  provider: string;
  model: string;
  label: string;
  /** Display-only estimate; the backend charges the live admin-set rate. */
  credits: number;
};

const TEXT_MODELS: ModelOption[] = [
  { provider: "openai", model: "gpt-4o-mini", label: "OpenAI · GPT-4o mini", credits: 1 },
  { provider: "openai", model: "gpt-4o", label: "OpenAI · GPT-4o", credits: 5 },
  { provider: "anthropic", model: "claude-haiku-4-5", label: "Anthropic · Claude Haiku 4.5", credits: 2 },
  { provider: "anthropic", model: "claude-sonnet-4-5", label: "Anthropic · Claude Sonnet 4.5", credits: 6 },
  { provider: "xai", model: "grok-3", label: "xAI · Grok 3", credits: 3 },
  { provider: "groq", model: "openai/gpt-oss-20b", label: "Groq · GPT-OSS 20B", credits: 1 },
  { provider: "openrouter", model: "openai/gpt-4o-mini", label: "OpenRouter · GPT-4o mini", credits: 1 },
];

const IMAGE_MODELS: ModelOption[] = [
  { provider: "fal", model: "fal-ai/flux/dev", label: "fal · FLUX.1 [dev]", credits: 5 },
  { provider: "fal", model: "fal-ai/flux/schnell", label: "fal · FLUX.1 [schnell] (fast)", credits: 2 },
];

const VIDEO_MODELS: ModelOption[] = [
  // fal Seedance works today with the existing FAL_KEY. Listed first = default.
  { provider: "fal", model: "fal-ai/bytedance/seedance/v1/pro/text-to-video", label: "fal · Seedance 1 Pro", credits: 40 },
  // Higgsfield options require HIGGSFIELD_API_URL to be set on the backend.
  { provider: "higgsfield", model: "bytedance/seedance-2.5-text-to-video", label: "Higgsfield · Seedance 2.5", credits: 50 },
  { provider: "higgsfield", model: "default", label: "Higgsfield · Default", credits: 50 },
];

/** Models offered for a given stage. Text stages also allow the backend default (no model). */
export function modelsForKind(kind: StepKind): ModelOption[] {
  switch (kind) {
    case "STORY":
    case "SCREENPLAY":
      return TEXT_MODELS;
    case "CHARACTER":
    case "SCENE":
      return IMAGE_MODELS;
    case "ANIMATION":
      return VIDEO_MODELS;
  }
}

export const STAGE_META: Record<StepKind, { label: string; operation: "TEXT" | "IMAGE" | "VIDEO" }> = {
  STORY: { label: "Story", operation: "TEXT" },
  SCREENPLAY: { label: "Screenplay", operation: "TEXT" },
  CHARACTER: { label: "Characters", operation: "IMAGE" },
  SCENE: { label: "Scenes", operation: "IMAGE" },
  ANIMATION: { label: "Animation", operation: "VIDEO" },
};
