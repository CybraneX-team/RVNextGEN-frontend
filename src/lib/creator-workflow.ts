import type { CreatorStep, StageView, StepKind } from "./creator";

export const WORKFLOW_ORDER: StepKind[] = ["STORY", "SCREENPLAY", "CHARACTER", "SCENE", "ANIMATION"];

export const WORKFLOW_COPY: Record<StepKind, { label: string; title: string; hint: string; placeholder: string }> = {
  STORY: { label: "Story", title: "Every great film starts with an idea.", hint: "Tell us about your world, who lives in it, and what changes their life.", placeholder: "A young traveller finds an unlikely friend in the desert…" },
  SCREENPLAY: { label: "Screenplay", title: "Give your story a voice.", hint: "Turn your story into scenes and dialogue. Describe the pacing, tone, and moments you want to bring to life.", placeholder: "Turn this story into a screenplay with intimate dialogue and a cinematic opening…" },
  CHARACTER: { label: "Character", title: "Meet your main character.", hint: "Your screenplay is ready. Describe your character’s appearance, clothing, personality, and visual style.", placeholder: "Design the lead character from this screenplay. Describe their look and visual style…" },
  SCENE: { label: "Scene", title: "Build the world around them.", hint: "Set the location, lighting, atmosphere, and camera composition for your scene.", placeholder: "A sweeping desert at golden hour, warm light, distant dunes…" },
  ANIMATION: { label: "Film", title: "Bring it all into motion.", hint: "Describe the action, camera movement, and mood of your film using the characters and scene you’ve created.", placeholder: "A slow tracking shot follows the character across the dunes…" },
};

export function latestByKind(steps: CreatorStep[]): Partial<Record<StepKind, CreatorStep>> {
  const result: Partial<Record<StepKind, CreatorStep>> = {};
  for (const step of steps) {
    const previous = result[step.kind];
    if (!previous || step.order > previous.order || (step.order === previous.order && step.updatedAt > previous.updatedAt)) result[step.kind] = step;
  }
  return result;
}

export function deriveStage(kind: StepKind, latest: Partial<Record<StepKind, CreatorStep>>): StageView {
  const step = latest[kind] ?? null;
  if (step) return { kind, step, status: step.status === "READY" ? "READY" : step.status === "FAILED" ? "FAILED" : "GENERATING" };
  const missing = WORKFLOW_ORDER.slice(0, WORKFLOW_ORDER.indexOf(kind)).find((required) => latest[required]?.status !== "READY");
  return missing
    ? { kind, step: null, status: "LOCKED", lockedReason: `Complete ${WORKFLOW_COPY[missing].label.toLowerCase()} first.` }
    : { kind, step: null, status: "AVAILABLE" };
}

export function guidedWorkflow(steps: CreatorStep[], selectedKind: StepKind | null = null) {
  const latest = latestByKind(steps);
  const completed = WORKFLOW_ORDER.filter((kind) => latest[kind]?.status === "READY");
  const next = WORKFLOW_ORDER.find((kind) => latest[kind]?.status !== "READY") ?? null;
  const preview = selectedKind && latest[selectedKind]?.status === "READY" ? selectedKind : completed.at(-1) ?? null;
  return { latest, completed, next, preview };
}
