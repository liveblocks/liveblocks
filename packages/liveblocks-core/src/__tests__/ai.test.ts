import { describe, expect, test } from "vitest";

import { KnowledgeStack } from "../ai";
import type {
  AiAssistantContentPart,
  AiExecutingToolInvocationPart,
  AiReasoningDelta,
  AiReceivingToolInvocationPart,
  AiTextDelta,
} from "../types/ai";
import { patchContentWithDelta } from "../types/ai";

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

describe("patchContentWithDelta", () => {
  describe("text-delta", () => {
    test("should append text delta to existing text part", () => {
      const content: AiAssistantContentPart[] = [
        { type: "text", text: "Hello " },
      ];
      const delta: AiTextDelta = { type: "text-delta", textDelta: "world!" };

      patchContentWithDelta(content, delta);

      expect(content).toEqual([{ type: "text", text: "Hello world!" }]);
    });

    test("should create new text part if last part is not text", () => {
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

    test("should create new text part when content is empty", () => {
      const content: AiAssistantContentPart[] = [];
      const delta: AiTextDelta = { type: "text-delta", textDelta: "Hello" };

      patchContentWithDelta(content, delta);

      expect(content).toEqual([{ type: "text", text: "Hello" }]);
    });
  });

  describe("reasoning-delta", () => {
    test("should append reasoning delta to existing reasoning part", () => {
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

    test("should create new reasoning part if last part is not reasoning", () => {
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
  });

  describe("tool-invocation", () => {
    test("should add new receiving tool invocation when none exists", () => {
      const content: AiAssistantContentPart[] = [];
      const delta: AiReceivingToolInvocationPart = {
        type: "tool-invocation",
        stage: "receiving",
        invocationId: "inv-123",
        name: "search",
        partialArgs: { query: "hello" },
      };

      patchContentWithDelta(content, delta);

      expect(content).toEqual([delta]);
    });

    test("should replace existing tool invocation with same invocationId", () => {
      const content: AiAssistantContentPart[] = [
        { type: "text", text: "Some text" },
        {
          type: "tool-invocation",
          stage: "receiving",
          invocationId: "inv-123",
          name: "search",
          partialArgs: { query: "he" },
        },
        { type: "text", text: "More text" },
      ];
      const delta: AiReceivingToolInvocationPart = {
        type: "tool-invocation",
        stage: "receiving",
        invocationId: "inv-123",
        name: "search",
        partialArgs: { query: "hello world" },
      };

      patchContentWithDelta(content, delta);

      expect(content).toEqual([
        { type: "text", text: "Some text" },
        {
          type: "tool-invocation",
          stage: "receiving",
          invocationId: "inv-123",
          name: "search",
          partialArgs: { query: "hello world" },
        },
        { type: "text", text: "More text" },
      ]);
    });

    test("should replace tool invocation (even if it's not the last part)", () => {
      const content: AiAssistantContentPart[] = [
        {
          type: "tool-invocation",
          stage: "receiving",
          invocationId: "inv-123",
          name: "search",
          partialArgs: { query: "" },
        },
        { type: "text", text: "Some text" },
      ];

      const delta: AiExecutingToolInvocationPart = {
        type: "tool-invocation",
        stage: "executing",
        invocationId: "inv-123",
        name: "search",
        args: { query: "final" },
      };

      patchContentWithDelta(content, delta);

      // Should replace the rightmost (last) tool invocation with matching ID
      expect(content).toEqual([
        {
          type: "tool-invocation",
          stage: "executing",
          invocationId: "inv-123",
          name: "search",
          args: { query: "final" },
        },
        { type: "text", text: "Some text" },
      ]);
    });

    test("should add multiple tool invocations with different IDs", () => {
      const content: AiAssistantContentPart[] = [];

      const delta1: AiReceivingToolInvocationPart = {
        type: "tool-invocation",
        stage: "receiving",
        invocationId: "inv-1",
        name: "search",
        partialArgs: { query: "first" },
      };
      const delta2: AiReceivingToolInvocationPart = {
        type: "tool-invocation",
        stage: "receiving",
        invocationId: "inv-2",
        name: "calculator",
        partialArgs: { expression: "1 + 1" },
      };

      patchContentWithDelta(content, delta1);
      patchContentWithDelta(content, delta2);

      expect(content).toEqual([delta1, delta2]);
    });
  });

  describe("edge cases", () => {
    test("should mutate the original content array", () => {
      const content: AiAssistantContentPart[] = [];
      const originalContent = content;
      const delta: AiTextDelta = { type: "text-delta", textDelta: "Hello" };

      patchContentWithDelta(content, delta);

      expect(content).toBe(originalContent);
      expect(content).toEqual([{ type: "text", text: "Hello" }]);
    });

    test("should handle complex mixed content updates", () => {
      const content: AiAssistantContentPart[] = [
        { type: "text", text: "Initial " },
        { type: "reasoning", text: "Let me " },
      ];

      // Append to reasoning (last part) - should append to existing reasoning
      patchContentWithDelta(content, {
        type: "reasoning-delta",
        textDelta: "think more",
      });

      // Add text-delta (should create new text part since last part is reasoning)
      patchContentWithDelta(content, {
        type: "text-delta",
        textDelta: "message",
      });

      // Add tool invocation
      patchContentWithDelta(content, {
        type: "tool-invocation",
        stage: "receiving",
        invocationId: "inv-mixed",
        name: "helper",
        partialArgs: {},
      });

      expect(content).toEqual([
        { type: "text", text: "Initial " },
        { type: "reasoning", text: "Let me think more" },
        { type: "text", text: "message" },
        {
          type: "tool-invocation",
          stage: "receiving",
          invocationId: "inv-mixed",
          name: "helper",
          partialArgs: {},
        },
      ]);
    });
  });
});
