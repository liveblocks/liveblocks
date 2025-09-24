import { anything, iso8601, tuple } from "decoders";
import { assertEq, assertSame, partially } from "tosti";
import { describe, test } from "vitest";

import { KnowledgeStack } from "../ai";
import { iso } from "../lib/utils";
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
    assertEq(new KnowledgeStack().get(), []);
  });

  test("should be ref equal when called multiple times", () => {
    const stack = new KnowledgeStack();
    assertSame(stack.get(), stack.get());
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
    assertEq(stack.get(), [
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
    assertEq(stack.get(), [
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
    assertEq(stack.get(), []);

    stack.deregisterLayer(key2);
    assertEq(stack.get(), [{ description: "Some random value", value: "foo" }]);
  });

  test("registering exact same knowledge twice just overrides it", () => {
    const stack = new KnowledgeStack();
    const key1 = stack.registerLayer("«r1»");
    stack.updateKnowledge(key1, "abc", {
      description: "Some random value",
      value: "foo",
    });
    assertEq(stack.get(), [{ description: "Some random value", value: "foo" }]);

    // Setting a new value just overrides the previous value in this layer
    stack.updateKnowledge(key1, "abc", {
      description: "Something else",
      value: "bar",
    });
    assertEq(stack.get(), [{ description: "Something else", value: "bar" }]);

    // Overwriting with `null` wipes the entry
    stack.updateKnowledge(key1, "abc", null);
    assertEq(stack.get(), []);
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
    assertEq(stack.get(), [
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
    assertEq(stack.get(), [{ description: "Some random value", value: "foo" }]);
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
    assertEq(stack.get(), []);
  });
});

describe("createReceivingToolInvocation", () => {
  test("creates receiving tool invocation with empty args", () => {
    const tool = createReceivingToolInvocation("inv-test", "testTool");

    assertEq(tool.type, "tool-invocation");
    assertEq(tool.stage, "receiving");
    assertEq(tool.invocationId, "inv-test");
    assertEq(tool.name, "testTool");
    assertEq(tool.partialArgsText, "");
    assertEq(tool.partialArgs, {});
  });

  test("creates receiving tool invocation with partial args", () => {
    const tool = createReceivingToolInvocation(
      "inv-123",
      "search",
      '{"query": "test"}'
    );

    assertEq(tool.partialArgsText, '{"query": "test"}');
    assertEq(tool.partialArgs, { query: "test" });
  });

  test("allows appending deltas via __appendDelta", () => {
    const tool = createReceivingToolInvocation(
      "inv-456",
      "calculator",
      '{"expr": "2+'
    );

    assertEq(tool.partialArgs, { expr: "2+" });

    tool.__appendDelta?.('2"}');

    assertEq(tool.partialArgsText, '{"expr": "2+2"}');
    assertEq(tool.partialArgs, { expr: "2+2" });
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

      assertEq(content, [{ type: "text", text: "Hello world!" }]);
    });

    test("creates new text part when last part is not text", () => {
      const content: AiAssistantContentPart[] = [
        {
          type: "reasoning",
          text: "Some reasoning",
          startedAt: iso("2025-09-28"),
        },
      ];
      const delta: AiTextDelta = { type: "text-delta", textDelta: "Hello" };

      patchContentWithDelta(content, delta);

      assertEq(content, [
        {
          type: "reasoning",
          text: "Some reasoning",
          startedAt: iso("2025-09-28"),
          endedAt: iso8601,
        },
        { type: "text", text: "Hello" },
      ]);
    });

    test("creates new text part when content is empty", () => {
      const content: AiAssistantContentPart[] = [];
      const delta: AiTextDelta = { type: "text-delta", textDelta: "Hello" };

      patchContentWithDelta(content, delta);

      assertEq(content, [{ type: "text", text: "Hello" }]);
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

      assertEq(content, tuple(anything, anything));
      assertEq(content[1], { type: "text", text: "Done!" });
    });
  });

  describe("reasoning-delta", () => {
    test("appends to existing reasoning part", () => {
      const content: AiAssistantContentPart[] = [
        {
          type: "reasoning",
          text: "Let me think ",
          startedAt: iso("2025-09-28"),
        },
      ];
      const delta: AiReasoningDelta = {
        type: "reasoning-delta",
        textDelta: "about this...",
      };

      patchContentWithDelta(content, delta);

      assertEq(content, [
        {
          type: "reasoning",
          text: "Let me think about this...",
          startedAt: iso("2025-09-28"),
        },
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

      assertEq(content, [
        { type: "text", text: "Some text" },
        {
          type: "reasoning",
          text: "Thinking",
          startedAt: iso8601,
        },
      ]);
    });

    test("creates new reasoning part when content is empty", () => {
      const content: AiAssistantContentPart[] = [];
      const delta: AiReasoningDelta = {
        type: "reasoning-delta",
        textDelta: "Starting to analyze...",
      };

      patchContentWithDelta(content, delta);

      assertEq(content, [
        {
          type: "reasoning",
          text: "Starting to analyze...",
          startedAt: iso8601,
        },
      ]);
    });

    test("handles empty textDelta in reasoning-delta", () => {
      const content: AiAssistantContentPart[] = [];
      const delta: AiReasoningDelta = {
        type: "reasoning-delta",
        textDelta: "",
      };

      patchContentWithDelta(content, delta);

      assertEq(content, [
        {
          type: "reasoning",
          text: "",
          startedAt: iso8601,
        },
      ]);
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

      assertEq(content, [
        partially({
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

      assertEq(content, tuple(anything, anything));
      assertEq(
        content[1],
        partially({
          type: "tool-invocation",
          stage: "receiving",
          invocationId: "inv-456",
          name: "calculator",
          partialArgs: {},
        })
      );
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

      assertEq(content, tuple(anything, anything));
      assertEq(
        content[0],
        partially({
          invocationId: "inv-1",
          name: "search",
        })
      );
      assertEq(
        content[1],
        partially({
          invocationId: "inv-2",
          name: "calculator",
        })
      );
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

      assertEq(tool1.partialArgs, {});
      assertSame(tool1.partialArgs, tool1.partialArgs);
      //                                 ^^^^ Referentially equal

      // Add some partial args text
      patchContentWithDelta(content, {
        type: "tool-delta",
        delta: '{"query": "tes',
      });

      // Multiple accesses doesn't change the value...
      assertEq(tool1.partialArgs, { query: "tes" });
      assertEq(tool1.partialArgs, { query: "tes" });

      // ...in fact it returns the same value
      const result1 = tool1.partialArgs;
      assertSame(tool1.partialArgs, tool1.partialArgs);
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

      assertEq(tool2.partialArgs, { different: "value" });
      assertSame(tool2.partialArgs, tool2.partialArgs);

      // First tool should still have its original cached value
      assertSame(tool1.partialArgs, result1); // Still the same cached object
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

      assertEq(content, []);
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

      assertEq(content, [{ type: "text", text: "Some text" }]);
    });

    test("ignores delta when last part is reasoning", () => {
      const content: AiAssistantContentPart[] = [
        {
          type: "reasoning",
          text: "Thinking...",
          startedAt: iso("2025-09-28"),
        },
      ];
      const delta: AiToolInvocationDelta = {
        type: "tool-delta",
        delta: '{"ignored": true}',
      };

      patchContentWithDelta(content, delta);

      assertEq(content, [
        {
          type: "reasoning",
          text: "Thinking...",
          startedAt: iso("2025-09-28"),
        },
      ]);
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

      assertEq(content, [
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

      assertEq(
        content[0],
        partially({
          stage: "executed",
          invocationId: "inv-123",
        })
      );
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

      assertEq(content, [
        partially({
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
      assertEq(tool.partialArgs, {
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

      assertEq(content, [
        {
          type: "tool-invocation",
          stage: "executed",
          invocationId: "inv-1",
          name: "search",
          args: { query: "first" },
          result: anything,
        },
        partially({
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

      assertEq(content, [delta]);
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

      assertEq(content, [delta]);
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

      assertEq(content, [delta]);
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

      assertEq(content, [
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
      assertEq(content[0], partially({ name: "first" }));
      assertEq(content[1], { type: "text", text: "Middle" });
      assertEq(content[2], delta);
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

      assertEq(
        content,
        tuple(
          partially({ invocationId: "inv-1" }),
          partially({ invocationId: "inv-2" }),
          partially({ invocationId: "inv-3" })
        )
      );
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

      assertSame(content, originalContent);
      assertEq(content, [{ type: "text", text: "Hello" }]);
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

      assertEq(content, [
        {
          type: "reasoning",
          text: "Let me analyze this problem",
          startedAt: iso8601,
          endedAt: iso8601,
        },
        { type: "text", text: "I'll search for information" },
        partially({
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

      assertEq(content, [
        partially({
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

      assertEq(content, tuple(anything, anything, anything));
      assertEq(
        content[0],
        partially({
          type: "tool-invocation",
          invocationId: "inv-1",
          partialArgs: { q: "test" },
        })
      );
      assertEq(content[1], { type: "text", text: "Now calculating..." });
      assertEq(
        content[2],
        partially({
          type: "tool-invocation",
          invocationId: "inv-2",
          partialArgs: { expr: "2+2" },
        })
      );
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

      assertEq(content, [
        partially({
          stage: "receiving",
          partialArgs: { endpoint: "/users" },
        }),
      ]);

      patchContentWithDelta(content, {
        type: "tool-delta",
        delta: '"method":"GET"}',
      });

      assertEq(content, [
        partially({
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

      assertEq(content, [
        partially({
          stage: "executing",
          args: { endpoint: "/users", method: "GET" },
        }),
      ]);
    });
  });
});
