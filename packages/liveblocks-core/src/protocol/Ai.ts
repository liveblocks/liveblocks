import type { Relax } from "../lib/Relax";

export type ContextualPromptResponse = Relax<
  // This is typed as a union to allow narrowing between "insert", "replace", and "other"
  | {
      type: "insert";
      text: string;
    }
  | {
      type: "replace";
      text: string;
    }
  | {
      type: "other";
      text: string;
    }
>;

export type ContextualPromptContext = {
  beforeSelection: string;
  selection: string;
  afterSelection: string;
};
