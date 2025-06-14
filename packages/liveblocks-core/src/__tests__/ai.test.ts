import { KnowledgeStack } from "../ai";

describe("KnowledgeStack", () => {
  it("should be empty by default", () => {
    expect(new KnowledgeStack().get()).toEqual([]);
  });

  it("should be ref equal when called multiple times", () => {
    const stack = new KnowledgeStack();
    expect(stack.get()).toBe(stack.get());
  });

  it("multiple knowledge registrations", () => {
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

  it("overriding knowledge", () => {
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

  it("explicitly removing knowledge", () => {
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

  it("registering exact same knowledge twice just overrides it", () => {
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

  it("deregistering layer 1", () => {
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

  it("deregistering layer 2", () => {
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

  it("deregistering both layers", () => {
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
