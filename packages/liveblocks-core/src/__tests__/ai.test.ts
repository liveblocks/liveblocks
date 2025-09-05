import { describe, expect, test } from "vitest";

import { KnowledgeStack } from "../ai";
import type {
  AiAssistantContentPart,
  AiAssistantDeltaUpdate,
  AiExecutingToolInvocationPart,
  AiReasoningDelta,
  AiReceivingToolInvocationPart,
  AiTextDelta,
  AiToolInvocationDelta,
  AiToolInvocationStreamStart,
} from "../types/ai";
import {
  createReceivingToolInvocation,
  patchContentWithDelta,
} from "../types/ai";

describe("KnowledgeStack", () => {
  test("should be empty by default", () => {
    expect(new KnowledgeStack().get()).toEqual([]);
  });

  test("should be ref equal when called multiple times", () => {
    const stack = new KnowledgeStack();
    expect(stack.get()).toBe(stack.get());
  });

  test("multiple knowledge registrations", () => {
    const stack = new KnowledgeStack();
    const key1 = stack.registerLayer("«r1»");
    stack.updateKnowledge(key1, "abc", {
      description: "Some random value",
      value: "foo",
    });
    stack.updateKnowledge(key1, "def", {
      description: "Another random value",
      value: "bar",
    });
    expect(stack.get()).toEqual([
      { description: "Some random value", value: "foo" },
      { description: "Another random value", value: "bar" },
    ]);
  });

  test("overriding knowledge", () => {
    const stack = new KnowledgeStack();
    const key1 = stack.registerLayer("«r1»");
    const key2 = stack.registerLayer("«r2»");
    stack.updateKnowledge(key1, "abc", {
      description: "Some random value",
      value: "foo",
    });
    stack.updateKnowledge(key2, "abc", {
      description: "Another random value",
      value: "bar",
    });
    expect(stack.get()).toEqual([
      // { description: "Some random value", value: "foo" }, // <-- No longer present! Overwritten!
      { description: "Another random value", value: "bar" },
    ]);
  });

  test("explicitly removing knowledge", () => {
    const stack = new KnowledgeStack();
    const key1 = stack.registerLayer("«r1»");
    const key2 = stack.registerLayer("«r2»");
    stack.updateKnowledge(key1, "abc", {
      description: "Some random value",
      value: "foo",
    });
    stack.updateKnowledge(key2, "abc", null);
    expect(stack.get()).toEqual([]);

    stack.deregisterLayer(key2);
    expect(stack.get()).toEqual([
      { description: "Some random value", value: "foo" },
    ]);
  });

  test("registering exact same knowledge twice just overrides it", () => {
    const stack = new KnowledgeStack();
    const key1 = stack.registerLayer("«r1»");
    stack.updateKnowledge(key1, "abc", {
      description: "Some random value",
      value: "foo",
    });
    expect(stack.get()).toEqual([
      { description: "Some random value", value: "foo" },
    ]);

    // Setting a new value just overrides the previous value in this layer
    stack.updateKnowledge(key1, "abc", {
      description: "Something else",
      value: "bar",
    });
    expect(stack.get()).toEqual([
      { description: "Something else", value: "bar" },
    ]);

    // Overwriting with `null` wipes the entry
    stack.updateKnowledge(key1, "abc", null);
    expect(stack.get()).toEqual([]);
  });

  test("deregistering layer 1", () => {
    const stack = new KnowledgeStack();
    const key1 = stack.registerLayer("«r1»");
    const key2 = stack.registerLayer("«r2»");
    stack.updateKnowledge(key1, "abc", {
      description: "Some random value",
      value: "foo",
    });
    stack.updateKnowledge(key2, "abc", {
      description: "Another random value",
      value: "bar",
    });

    stack.deregisterLayer(key1);
    expect(stack.get()).toEqual([
      { description: "Another random value", value: "bar" },
    ]);
  });

  test("deregistering layer 2", () => {
    const stack = new KnowledgeStack();
    const key1 = stack.registerLayer("«r1»");
    const key2 = stack.registerLayer("«r2»");
    stack.updateKnowledge(key1, "abc", {
      description: "Some random value",
      value: "foo",
    });
    stack.updateKnowledge(key2, "abc", {
      description: "Another random value",
      value: "bar",
    });

    stack.deregisterLayer(key2);
    expect(stack.get()).toEqual([
      { description: "Some random value", value: "foo" },
    ]);
  });

  test("deregistering both layers", () => {
    const stack = new KnowledgeStack();
    const key1 = stack.registerLayer("«r1»");
    const key2 = stack.registerLayer("«r2»");
    stack.updateKnowledge(key1, "abc", {
      description: "Some random value",
      value: "foo",
    });
    stack.updateKnowledge(key2, "abc", {
      description: "Another random value",
      value: "bar",
    });

    stack.deregisterLayer(key2);
    stack.deregisterLayer(key1);
    expect(stack.get()).toEqual([]);
  });
});

describe("createReceivingToolInvocation", () => {
  test("creates receiving tool invocation with empty args", () => {
    const tool = createReceivingToolInvocation("inv-test", "testTool");

    expect(tool.type).toBe("tool-invocation");
    expect(tool.stage).toBe("receiving");
    expect(tool.invocationId).toBe("inv-test");
    expect(tool.name).toBe("testTool");
    expect(tool.partialArgsText).toBe("");
    expect(tool.partialArgs).toEqual({});
  });

  test("creates receiving tool invocation with partial args", () => {
    const tool = createReceivingToolInvocation(
      "inv-123",
      "search",
      '{"query": "test"}'
    );

    expect(tool.partialArgsText).toBe('{"query": "test"}');
    expect(tool.partialArgs).toEqual({ query: "test" });
  });

  test("allows appending deltas via __appendDelta", () => {
    const tool = createReceivingToolInvocation(
      "inv-456",
      "calculator",
      '{"expr": "2+'
    );

    expect(tool.partialArgs).toEqual({ expr: "2+" });

    tool.__appendDelta?.('2"}');

    expect(tool.partialArgsText).toBe('{"expr": "2+2"}');
    expect(tool.partialArgs).toEqual({ expr: "2+2" });
  });
});

describe("patchContentWithDelta", () => {
  describe("text-delta", () => {
    test("appends to existing text part", () => {
      const content: AiAssistantContentPart[] = [
        { type: "text", text: "Hello " },
      ];
      const delta: AiTextDelta = { type: "text-delta", textDelta: "world!" };

      patchContentWithDelta(content, delta);

      expect(content).toEqual([{ type: "text", text: "Hello world!" }]);
    });

    test("creates new text part when last part is not text", () => {
      const content: AiAssistantContentPart[] = [
        { type: "reasoning", text: "Some reasoning" },
      ];
      const delta: AiTextDelta = { type: "text-delta", textDelta: "Hello" };

      patchContentWithDelta(content, delta);

      expect(content).toEqual([
        { type: "reasoning", text: "Some reasoning" },
        { type: "text", text: "Hello" },
      ]);
    });

    test("creates new text part when content is empty", () => {
      const content: AiAssistantContentPart[] = [];
      const delta: AiTextDelta = { type: "text-delta", textDelta: "Hello" };

      patchContentWithDelta(content, delta);

      expect(content).toEqual([{ type: "text", text: "Hello" }]);
    });

    test("creates new text part when last part is tool-invocation", () => {
      const content: AiAssistantContentPart[] = [
        {
          type: "tool-invocation",
          stage: "executed",
          invocationId: "inv-1",
          name: "search",
          args: { query: "test" },
          result: { type: "success", data: { results: [] } },
        },
      ];
      const delta: AiTextDelta = { type: "text-delta", textDelta: "Done!" };

      patchContentWithDelta(content, delta);

      expect(content).toHaveLength(2);
      expect(content[1]).toEqual({ type: "text", text: "Done!" });
    });
  });

  describe("reasoning-delta", () => {
    test("appends to existing reasoning part", () => {
      const content: AiAssistantContentPart[] = [
        { type: "reasoning", text: "Let me think " },
      ];
      const delta: AiReasoningDelta = {
        type: "reasoning-delta",
        textDelta: "about this...",
      };

      patchContentWithDelta(content, delta);

      expect(content).toEqual([
        { type: "reasoning", text: "Let me think about this..." },
      ]);
    });

    test("creates new reasoning part when last part is not reasoning", () => {
      const content: AiAssistantContentPart[] = [
        { type: "text", text: "Some text" },
      ];
      const delta: AiReasoningDelta = {
        type: "reasoning-delta",
        textDelta: "Thinking",
      };

      patchContentWithDelta(content, delta);

      expect(content).toEqual([
        { type: "text", text: "Some text" },
        { type: "reasoning", text: "Thinking" },
      ]);
    });

    test("creates new reasoning part when content is empty", () => {
      const content: AiAssistantContentPart[] = [];
      const delta: AiReasoningDelta = {
        type: "reasoning-delta",
        textDelta: "Starting to analyze...",
      };

      patchContentWithDelta(content, delta);

      expect(content).toEqual([
        { type: "reasoning", text: "Starting to analyze..." },
      ]);
    });

    test("handles empty textDelta in reasoning-delta", () => {
      const content: AiAssistantContentPart[] = [];
      const delta: AiReasoningDelta = {
        type: "reasoning-delta",
        textDelta: "",
      };

      patchContentWithDelta(content, delta);

      expect(content).toEqual([{ type: "reasoning", text: "" }]);
    });
  });

  describe("tool-stream", () => {
    test("creates receiving tool invocation with empty partialArgs", () => {
      const content: AiAssistantContentPart[] = [];

      patchContentWithDelta(content, {
        type: "tool-stream",
        invocationId: "inv-test",
        name: "testTool",
      });

      expect(content).toEqual([
        expect.objectContaining({
          type: "tool-invocation",
          stage: "receiving",
          invocationId: "inv-test",
          name: "testTool",
          partialArgs: {},
        }),
      ]);
    });

    test("appends tool-stream after existing content", () => {
      const content: AiAssistantContentPart[] = [
        { type: "text", text: "Let me search for that" },
      ];
      const delta: AiToolInvocationStreamStart = {
        type: "tool-stream",
        invocationId: "inv-456",
        name: "calculator",
      };

      patchContentWithDelta(content, delta);

      expect(content).toHaveLength(2);
      expect(content[1]).toMatchObject({
        type: "tool-invocation",
        stage: "receiving",
        invocationId: "inv-456",
        name: "calculator",
        partialArgs: {},
      });
    });

    test("allows multiple tool-streams with different invocationIds", () => {
      const content: AiAssistantContentPart[] = [];

      patchContentWithDelta(content, {
        type: "tool-stream",
        invocationId: "inv-1",
        name: "search",
      });

      patchContentWithDelta(content, {
        type: "tool-stream",
        invocationId: "inv-2",
        name: "calculator",
      });

      expect(content).toHaveLength(2);
      expect(content[0]).toMatchObject({
        invocationId: "inv-1",
        name: "search",
      });
      expect(content[1]).toMatchObject({
        invocationId: "inv-2",
        name: "calculator",
      });
    });

    test("caches partialArgs computation between accesses", () => {
      // Setup
      // =====
      const content: AiAssistantContentPart[] = [];

      // Create two tool invocations (to test that each has its own cache)
      patchContentWithDelta(content, {
        type: "tool-stream",
        invocationId: "inv-cache-test",
        name: "testTool",
      });

      const tool1 = content[0] as AiReceivingToolInvocationPart;

      // Actual test
      // ===========

      expect(tool1.partialArgs).toEqual({});
      expect(tool1.partialArgs).toBe(tool1.partialArgs);
      //                                 ^^^^ Referentially equal

      // Add some partial args text
      patchContentWithDelta(content, {
        type: "tool-delta",
        delta: '{"query": "tes',
      });

      // Multiple accesses doesn't change the value...
      expect(tool1.partialArgs).toEqual({ query: "tes" });
      expect(tool1.partialArgs).toEqual({ query: "tes" });

      // ...in fact it returns the same value
      const result1 = tool1.partialArgs;
      expect(tool1.partialArgs).toBe(tool1.partialArgs);
      //                                 ^^^^ Referentially equal

      // Second tool invocation to test that each has its own cache
      patchContentWithDelta(content, {
        type: "tool-stream",
        invocationId: "inv-cache-test-2",
        name: "testTool2",
      });
      patchContentWithDelta(content, {
        type: "tool-delta",
        delta: '{"different": "value"}',
      });

      const tool2 = content[1] as AiReceivingToolInvocationPart;

      // Each tool should have its own cached values
      tool2.partialArgs;

      expect(tool2.partialArgs).toEqual({ different: "value" });
      expect(tool2.partialArgs).toBe(tool2.partialArgs);

      // First tool should still have its original cached value
      expect(tool1.partialArgs).toBe(result1); // Still the same cached object
    });
  });

  describe("tool-delta", () => {
    test("ignores delta when content is empty (no tool-stream yet)", () => {
      const content: AiAssistantContentPart[] = [];
      const delta: AiToolInvocationDelta = {
        type: "tool-delta",
        delta: '{"ignored": true}',
      };

      patchContentWithDelta(content, delta);

      expect(content).toEqual([]);
    });

    test("ignores delta when last part is text", () => {
      const content: AiAssistantContentPart[] = [
        { type: "text", text: "Some text" },
      ];
      const delta: AiToolInvocationDelta = {
        type: "tool-delta",
        delta: '{"ignored": true}',
      };

      patchContentWithDelta(content, delta);

      expect(content).toEqual([{ type: "text", text: "Some text" }]);
    });

    test("ignores delta when last part is reasoning", () => {
      const content: AiAssistantContentPart[] = [
        { type: "reasoning", text: "Thinking..." },
      ];
      const delta: AiToolInvocationDelta = {
        type: "tool-delta",
        delta: '{"ignored": true}',
      };

      patchContentWithDelta(content, delta);

      expect(content).toEqual([{ type: "reasoning", text: "Thinking..." }]);
    });

    test("ignores delta when last tool is executing", () => {
      const content: AiAssistantContentPart[] = [
        {
          type: "tool-invocation",
          stage: "executing",
          invocationId: "inv-123",
          name: "search",
          args: { query: "test" },
        },
      ];
      const delta: AiToolInvocationDelta = {
        type: "tool-delta",
        delta: '{"should": "be ignored"}',
      };

      patchContentWithDelta(content, delta);

      expect(content).toEqual([
        {
          type: "tool-invocation",
          stage: "executing",
          invocationId: "inv-123",
          name: "search",
          args: { query: "test" },
        },
      ]);
    });

    test("ignores delta when last tool is executed", () => {
      const content: AiAssistantContentPart[] = [
        {
          type: "tool-invocation",
          stage: "executed",
          invocationId: "inv-123",
          name: "search",
          args: { query: "test" },
          result: { type: "success", data: { found: true } },
        },
      ];
      const delta: AiToolInvocationDelta = {
        type: "tool-delta",
        delta: '{"should": "be ignored"}',
      };

      patchContentWithDelta(content, delta);

      expect(content[0]).toMatchObject({
        stage: "executed",
        invocationId: "inv-123",
      });
    });

    test("appends delta to receiving tool invocation", () => {
      const content: AiAssistantContentPart[] = [];

      // Start the tool stream
      patchContentWithDelta(content, {
        type: "tool-stream",
        invocationId: "inv-1",
        name: "search",
      });

      // Add delta
      patchContentWithDelta(content, {
        type: "tool-delta",
        delta: '{"query": "test"}',
      });

      expect(content).toEqual([
        expect.objectContaining({
          type: "tool-invocation",
          stage: "receiving",
          invocationId: "inv-1",
          name: "search",
          partialArgs: { query: "test" },
        }),
      ]);
    });

    test("builds JSON progressively with multiple deltas", () => {
      const content: AiAssistantContentPart[] = [];

      // Start the tool stream
      patchContentWithDelta(content, {
        type: "tool-stream",
        invocationId: "inv-complex",
        name: "api_call",
      });

      // Build up the JSON progressively
      const deltas = [
        '{"',
        'method": "',
        'GET",',
        ' "url": "https://',
        "api.example.com",
        '", "headers": {',
        '"Accept": "application/json"',
        "}}",
      ];

      for (const deltaText of deltas) {
        patchContentWithDelta(content, {
          type: "tool-delta",
          delta: deltaText,
        });
      }

      const tool = content[0] as AiReceivingToolInvocationPart;
      expect(tool.partialArgs).toEqual({
        method: "GET",
        url: "https://api.example.com",
        headers: { Accept: "application/json" },
      });
    });

    test("only affects the last receiving tool when multiple tools exist", () => {
      const content: AiAssistantContentPart[] = [];

      // First tool (executed)
      content.push({
        type: "tool-invocation",
        stage: "executed",
        invocationId: "inv-1",
        name: "search",
        args: { query: "first" },
        result: { type: "success", data: {} },
      });

      // Second tool (receiving)
      patchContentWithDelta(content, {
        type: "tool-stream",
        invocationId: "inv-2",
        name: "calculator",
      });

      // Delta should only affect the second tool
      patchContentWithDelta(content, {
        type: "tool-delta",
        delta: '{"expr": "2+2"}',
      });

      expect(content).toEqual([
        expect.objectContaining({
          type: "tool-invocation",
          stage: "executed",
          invocationId: "inv-1",
          name: "search",
          args: { query: "first" },
        }),
        expect.objectContaining({
          type: "tool-invocation",
          stage: "receiving",
          invocationId: "inv-2",
          name: "calculator",
          partialArgs: { expr: "2+2" },
        }),
      ]);
    });
  });

  describe("tool-invocation (executing/executed)", () => {
    test("appends new executing tool when no matching invocationId exists", () => {
      const content: AiAssistantContentPart[] = [];
      const delta: AiExecutingToolInvocationPart = {
        type: "tool-invocation",
        stage: "executing",
        invocationId: "inv-new",
        name: "search",
        args: { query: "test" },
      };

      patchContentWithDelta(content, delta);

      expect(content).toEqual([delta]);
    });

    test("replaces receiving tool with executing tool (same invocationId)", () => {
      const content: AiAssistantContentPart[] = [
        createReceivingToolInvocation("inv-123", "search", '{"query": "par"}'),
      ];

      const delta: AiExecutingToolInvocationPart = {
        type: "tool-invocation",
        stage: "executing",
        invocationId: "inv-123",
        name: "search",
        args: { query: "partial" },
      };

      patchContentWithDelta(content, delta);

      expect(content).toEqual([delta]);
    });

    test("replaces executing tool with executed tool (same invocationId)", () => {
      const content: AiAssistantContentPart[] = [
        {
          type: "tool-invocation",
          stage: "executing",
          invocationId: "inv-123",
          name: "search",
          args: { query: "test" },
        },
      ];

      const delta: AiAssistantDeltaUpdate = {
        type: "tool-invocation",
        stage: "executing",
        invocationId: "inv-123",
        name: "search",
        args: { query: "test" },
      };

      patchContentWithDelta(content, delta);

      expect(content).toEqual([delta]);
    });

    test("replaces tool in middle of content array", () => {
      const content: AiAssistantContentPart[] = [
        { type: "text", text: "Before" },
        createReceivingToolInvocation("inv-123", "search", '{"q": "test"}'),
        { type: "text", text: "After" },
      ];

      const delta: AiExecutingToolInvocationPart = {
        type: "tool-invocation",
        stage: "executing",
        invocationId: "inv-123",
        name: "search",
        args: { query: "complete" },
      };

      patchContentWithDelta(content, delta);

      expect(content).toEqual([
        { type: "text", text: "Before" },
        delta,
        { type: "text", text: "After" },
      ]);
    });

    test("replaces the LAST matching tool when multiple have same invocationId", () => {
      const content: AiAssistantContentPart[] = [
        createReceivingToolInvocation("inv-dup", "first", "a"),
        { type: "text", text: "Middle" },
        createReceivingToolInvocation("inv-dup", "second", "b"),
      ];

      const delta: AiExecutingToolInvocationPart = {
        type: "tool-invocation",
        stage: "executing",
        invocationId: "inv-dup",
        name: "replaced",
        args: { value: "test" },
      };

      patchContentWithDelta(content, delta);

      // Should replace the LAST one (index 2)
      expect(content[0]).toMatchObject({ name: "first" });
      expect(content[1]).toEqual({ type: "text", text: "Middle" });
      expect(content[2]).toEqual(delta);
    });

    test("does not affect tools with different invocationIds", () => {
      const content: AiAssistantContentPart[] = [
        createReceivingToolInvocation("inv-1", "tool1"),
        {
          type: "tool-invocation",
          stage: "executing",
          invocationId: "inv-2",
          name: "tool2",
          args: { x: 1 },
        },
      ];

      const delta: AiAssistantDeltaUpdate = {
        type: "tool-invocation",
        stage: "executing",
        invocationId: "inv-3",
        name: "tool3",
        args: { y: 2 },
      };

      patchContentWithDelta(content, delta);

      expect(content).toHaveLength(3);
      expect(content[0]).toMatchObject({ invocationId: "inv-1" });
      expect(content[1]).toMatchObject({ invocationId: "inv-2" });
      expect(content[2]).toMatchObject({ invocationId: "inv-3" });
    });
  });

  describe("integration scenarios", () => {
    test("mutates the original content array in-place", () => {
      const content: AiAssistantContentPart[] = [];
      const originalContent = content;

      patchContentWithDelta(content, {
        type: "text-delta",
        textDelta: "Hello",
      });

      expect(content).toBe(originalContent);
      expect(content).toEqual([{ type: "text", text: "Hello" }]);
    });

    test("handles mixed content flow: reasoning -> text -> tool", () => {
      const content: AiAssistantContentPart[] = [];

      // Start with reasoning
      patchContentWithDelta(content, {
        type: "reasoning-delta",
        textDelta: "Let me analyze",
      });

      // Continue reasoning
      patchContentWithDelta(content, {
        type: "reasoning-delta",
        textDelta: " this problem",
      });

      // Switch to text
      patchContentWithDelta(content, {
        type: "text-delta",
        textDelta: "I'll search for",
      });

      // Continue text
      patchContentWithDelta(content, {
        type: "text-delta",
        textDelta: " information",
      });

      // Add tool
      patchContentWithDelta(content, {
        type: "tool-stream",
        invocationId: "inv-1",
        name: "search",
      });

      expect(content).toEqual([
        { type: "reasoning", text: "Let me analyze this problem" },
        { type: "text", text: "I'll search for information" },
        expect.objectContaining({
          type: "tool-invocation",
          stage: "receiving",
          invocationId: "inv-1",
          name: "search",
        }),
      ]);
    });

    test("complete tool streaming workflow", () => {
      const content: AiAssistantContentPart[] = [];
      const deltas: AiAssistantDeltaUpdate[] = [
        { type: "tool-stream", invocationId: "inv-123", name: "search" },
        { type: "tool-delta", delta: '{"query": "' },
        { type: "tool-delta", delta: "hello" },
        { type: "tool-delta", delta: ', world"}' },
      ];

      for (const delta of deltas) {
        patchContentWithDelta(content, delta);
      }

      expect(content).toEqual([
        expect.objectContaining({
          type: "tool-invocation",
          stage: "receiving",
          invocationId: "inv-123",
          name: "search",
          partialArgs: { query: "hello, world" },
        }),
      ]);
    });

    test("multiple tools with interleaved text", () => {
      const content: AiAssistantContentPart[] = [];

      // First tool
      patchContentWithDelta(content, {
        type: "tool-stream",
        invocationId: "inv-1",
        name: "search",
      });
      patchContentWithDelta(content, {
        type: "tool-delta",
        delta: '{"q": "test"}',
      });

      // Text between tools
      patchContentWithDelta(content, {
        type: "text-delta",
        textDelta: "Now calculating...",
      });

      // Second tool
      patchContentWithDelta(content, {
        type: "tool-stream",
        invocationId: "inv-2",
        name: "calculator",
      });
      patchContentWithDelta(content, {
        type: "tool-delta",
        delta: '{"expr": "2+2"}',
      });

      expect(content).toHaveLength(3);
      expect(content[0]).toMatchObject({
        type: "tool-invocation",
        invocationId: "inv-1",
        partialArgs: { q: "test" },
      });
      expect(content[1]).toEqual({ type: "text", text: "Now calculating..." });
      expect(content[2]).toMatchObject({
        type: "tool-invocation",
        invocationId: "inv-2",
        partialArgs: { expr: "2+2" },
      });
    });

    test("tool lifecycle: receiving -> executing", () => {
      const content: AiAssistantContentPart[] = [];

      // Start tool stream (receiving)
      patchContentWithDelta(content, {
        type: "tool-stream",
        invocationId: "inv-lifecycle",
        name: "api",
      });

      // Build arguments
      patchContentWithDelta(content, {
        type: "tool-delta",
        delta: '{"endpoint": "/users", ',
      });

      expect(content).toEqual([
        expect.objectContaining({
          stage: "receiving",
          partialArgs: { endpoint: "/users" },
        }),
      ]);

      patchContentWithDelta(content, {
        type: "tool-delta",
        delta: '"method":"GET"}',
      });

      expect(content).toEqual([
        expect.objectContaining({
          stage: "receiving",
          partialArgs: { endpoint: "/users", method: "GET" },
        }),
      ]);

      // Transition to executing
      patchContentWithDelta(content, {
        type: "tool-invocation",
        stage: "executing",
        invocationId: "inv-lifecycle",
        name: "api",
        args: { endpoint: "/users", method: "GET" },
      });

      expect(content).toEqual([
        expect.objectContaining({
          stage: "executing",
          args: { endpoint: "/users", method: "GET" },
        }),
      ]);
    });
  });
});
