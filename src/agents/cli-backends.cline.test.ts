import { describe, expect, it } from "vitest";
import { resolveCliBackendConfig } from "./cli-backends.js";
import { parseCliJsonl } from "./cli-output.js";
import { isCliProvider } from "./model-selection-cli.js";

describe("cline-cli backend", () => {
  it("is available as a built-in CLI provider", () => {
    const backend = resolveCliBackendConfig("cline-cli");

    expect(isCliProvider("cline-cli")).toBe(true);
    expect(backend?.config).toMatchObject({
      command: "cline",
      args: ["--json", "--yolo", "--act"],
      output: "jsonl",
      input: "arg",
      sessionMode: "none",
      serialize: true,
    });
    expect(backend?.config.modelArg).toBeUndefined();
  });

  it("parses cline subprocess JSONL output", () => {
    const backend = resolveCliBackendConfig("cline-cli");
    expect(backend).not.toBeNull();

    const raw = [
      JSON.stringify({ type: "task_started", taskId: "task-1" }),
      JSON.stringify({ type: "say", say: "text", text: "draft", partial: false }),
      JSON.stringify({ type: "say", say: "completion_result", text: "final answer" }),
      JSON.stringify({
        type: "run_result",
        text: "final answer",
        usage: {
          inputTokens: 3,
          outputTokens: 4,
          cacheReadTokens: 2,
          cacheWriteTokens: 1,
        },
      }),
    ].join("\n");

    expect(parseCliJsonl(raw, backend!.config, "cline-cli")).toEqual({
      text: "final answer",
      sessionId: "task-1",
      usage: {
        input: 3,
        output: 4,
        cacheRead: 2,
        cacheWrite: 1,
        total: 10,
      },
    });
  });

  it("parses cline agent_event deltas when no run_result text is present", () => {
    const backend = resolveCliBackendConfig("cline-cli");
    expect(backend).not.toBeNull();

    const raw = [
      JSON.stringify({ type: "agent_event", event: { type: "content_start", text: "hello " } }),
      JSON.stringify({ type: "agent_event", event: { type: "content_delta", text: "world" } }),
      JSON.stringify({
        type: "agent_event",
        event: { type: "done", usage: { inputTokens: 1, outputTokens: 2 } },
      }),
    ].join("\n");

    expect(parseCliJsonl(raw, backend!.config, "cline-cli")).toEqual({
      text: "hello world",
      sessionId: undefined,
      usage: {
        input: 1,
        output: 2,
        cacheRead: undefined,
        cacheWrite: undefined,
        total: 3,
      },
    });
  });
});
