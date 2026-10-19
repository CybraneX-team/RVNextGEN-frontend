import assert from "node:assert/strict";
import { test } from "node:test";
import type { CreatorStep, StepKind } from "./creator";
// Node's type stripping runs this test without a separate test framework.
// @ts-expect-error TypeScript emits extensionless imports; Node's test runner reads this source directly.
import { deriveStage, guidedWorkflow } from "./creator-workflow.ts";

function step(kind: StepKind, status: CreatorStep["status"] = "READY", order = 1): CreatorStep {
  return { id: `${kind}-${order}`, kind, status, order, inputJson: { prompt: "A cinematic story" }, outputJson: { text: "Generated result" }, model: null, creditsUsed: 0, inrCostPaise: null, revenuePaise: null, createdAt: "2026-10-19", updatedAt: "2026-10-19", generationJob: null };
}

test("a new project presents only Story and has no preview or completed prompts", () => {
  const flow = guidedWorkflow([]);
  assert.equal(flow.next, "STORY");
  assert.equal(flow.preview, null);
  assert.deepEqual(flow.completed, []);
  assert.equal(deriveStage("SCREENPLAY", flow.latest).status, "LOCKED");
});

test("successful steps advance through screenplay, character, scene, then film", () => {
  const steps: CreatorStep[] = [];
  const order: StepKind[] = ["STORY", "SCREENPLAY", "CHARACTER", "SCENE", "ANIMATION"];
  for (let index = 0; index < order.length; index += 1) {
    steps.push(step(order[index]));
    const flow = guidedWorkflow(steps);
    assert.equal(flow.preview, order[index]);
    assert.equal(flow.next, order[index + 1] ?? null);
    assert.equal(flow.completed.length, index + 1);
  }
});

test("pending and failed screenplay keep Story visible and do not unlock Character", () => {
  for (const status of ["DRAFT", "GENERATING", "FAILED"] as const) {
    const flow = guidedWorkflow([step("STORY"), step("SCREENPLAY", status)]);
    assert.equal(flow.next, "SCREENPLAY");
    assert.equal(flow.preview, "STORY");
    assert.deepEqual(flow.completed, ["STORY"]);
    assert.equal(deriveStage("CHARACTER", flow.latest).status, "LOCKED");
  }
});

test("reviewing an earlier result preserves the next unfinished step", () => {
  const flow = guidedWorkflow([step("STORY"), step("SCREENPLAY"), step("CHARACTER")], "STORY");
  assert.equal(flow.preview, "STORY");
  assert.equal(flow.next, "SCENE");
});

test("resuming an older project fills a missing Character before continuing", () => {
  const flow = guidedWorkflow([step("STORY"), step("SCREENPLAY"), step("SCENE")]);
  assert.equal(flow.next, "CHARACTER");
  assert.equal(deriveStage("ANIMATION", flow.latest).status, "LOCKED");
});

test("a newer failed attempt is retried instead of treating the old result as complete", () => {
  const flow = guidedWorkflow([step("STORY"), step("STORY", "FAILED", 2)]);
  assert.equal(flow.next, "STORY");
  assert.equal(deriveStage("STORY", flow.latest).status, "FAILED");
});
