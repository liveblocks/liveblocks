import type { Edge, Node } from "@xyflow/react";
import { nanoid } from "nanoid";

export const EXAMPLE_ID = "nextjs-typesafe-workflow-builder";
export const ROOM_ID_PREFIX = `liveblocks:examples:${EXAMPLE_ID}`;
export const FLOW_STORAGE_KEY = "flow" as const;
// Edges use React Flow's built-in smoothstep renderer.
export const WORKFLOW_EDGE_TYPE = "smoothstep" as const;
export const INPUT_NODE_ID = "input";

// Handle ids. Target handles are always `in`; source handles depend on the node.
export const IN_HANDLE = "in";
export const OUT_HANDLE = "out";
// Every Jev node has one "always" handle in addition to its answer handles.
export const ANY_HANDLE = "any";

export const LLM_MODELS = [
  { id: "openai/gpt-5.4-nano", label: "GPT-5.4 nano" },
  { id: "openai/gpt-5.4-mini", label: "GPT-5.4 mini" },
  { id: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
] as const;
export const DEFAULT_LLM_MODEL = LLM_MODELS[0].id;
export const DEFAULT_NOUL_THRESHOLD = 0.7;

export type QuestionType = "choice" | "score" | "noul";

export type Criterion = {
  // Used as the handle id suffix and, for Choice, as the option label sent to
  // TypeSafe. Kept URL/handle-safe (see `slugify`).
  key: string;
  description: string;
};

export type ChoiceQuestionDef = {
  id: string;
  type: "choice";
  instructions: string;
  options: Criterion[];
};

export type ScoreQuestionDef = {
  id: string;
  type: "score";
  instructions: string;
  // Ordered from lowest (index 0) to highest.
  levels: Criterion[];
};

export type NoulQuestionDef = {
  id: string;
  type: "noul";
  instructions: string;
  // `yes` fires when the returned probability is >= threshold.
  threshold: number;
};

export type QuestionDef =
  | ChoiceQuestionDef
  | ScoreQuestionDef
  | NoulQuestionDef;

export type InputNodeData = {
  label: string;
  // Used by the "Run" button in the side panel as the default input.
  sample: string;
};

export type JevNodeData = {
  label: string;
  questions: QuestionDef[];
};

export type LlmNodeData = {
  label: string;
  model: string;
  system: string;
  prompt: string;
};

export type InputNode = Node<InputNodeData, "input">;
export type JevNode = Node<JevNodeData, "jev">;
export type LlmNode = Node<LlmNodeData, "llm">;
export type WorkflowNode = InputNode | JevNode | LlmNode;
export type WorkflowNodeType = WorkflowNode["type"];

export type WorkflowEdgeData = Record<string, never>;
export type WorkflowEdge = Edge<WorkflowEdgeData, typeof WORKFLOW_EDGE_TYPE>;

export type Point = { x: number; y: number };

/* -------------------------------------------------------------------------- */
/*                                   Handles                                  */
/* -------------------------------------------------------------------------- */

export type HandleDef = {
  id: string;
  // Short label rendered next to the handle.
  label: string;
  // Longer description shown as a tooltip.
  title: string;
  questionId?: string;
};

export function questionHandleId(questionId: string, key: string) {
  return `q:${questionId}:${key}`;
}

export function getQuestionHandles(question: QuestionDef): HandleDef[] {
  switch (question.type) {
    case "choice":
      return question.options.map((option) => ({
        id: questionHandleId(question.id, option.key),
        label: option.key,
        title: `${question.id} = ${option.key}`,
        questionId: question.id,
      }));
    case "score":
      return question.levels.map((level, index) => ({
        id: questionHandleId(question.id, String(index)),
        label: level.key || `level ${index}`,
        title: `${question.id} rounds to level ${index}${level.key ? ` (${level.key})` : ""}`,
        questionId: question.id,
      }));
    case "noul":
      return [
        {
          id: questionHandleId(question.id, "yes"),
          label: "yes",
          title: `${question.id} ≥ ${question.threshold}`,
          questionId: question.id,
        },
        {
          id: questionHandleId(question.id, "no"),
          label: "no",
          title: `${question.id} < ${question.threshold}`,
          questionId: question.id,
        },
      ];
  }
}

export function getSourceHandles(node: WorkflowNode): HandleDef[] {
  switch (node.type) {
    case "input":
    case "llm":
      return [{ id: OUT_HANDLE, label: "output", title: "Output text" }];
    case "jev":
      return [
        ...node.data.questions.flatMap(getQuestionHandles),
        {
          id: ANY_HANDLE,
          label: "always",
          title: "Fires on every run that reaches this node",
        },
      ];
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Factories                                 */
/* -------------------------------------------------------------------------- */

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
}

export function createQuestion(type: QuestionType, index: number): QuestionDef {
  const id = `question_${index}`;

  switch (type) {
    case "choice":
      return {
        id,
        type,
        instructions: "",
        options: [
          { key: "option_a", description: "" },
          { key: "option_b", description: "" },
        ],
      };
    case "score":
      return {
        id,
        type,
        instructions: "",
        levels: [
          { key: "low", description: "" },
          { key: "medium", description: "" },
          { key: "high", description: "" },
        ],
      };
    case "noul":
      return { id, type, instructions: "", threshold: DEFAULT_NOUL_THRESHOLD };
  }
}

export function createInputNode(args: {
  position: Point;
  sample?: string;
}): InputNode {
  return {
    id: INPUT_NODE_ID,
    type: "input",
    position: args.position,
    deletable: false,
    data: { label: "Input", sample: args.sample ?? "" },
  };
}

export function createJevNode(args: {
  id?: string;
  position: Point;
  label?: string;
  questions?: QuestionDef[];
  selected?: boolean;
}): JevNode {
  return {
    id: args.id ?? `jev-${nanoid(8)}`,
    type: "jev",
    position: args.position,
    selected: args.selected,
    data: {
      label: args.label ?? "Jev",
      questions: args.questions ?? [createQuestion("choice", 1)],
    },
  };
}

export function createLlmNode(args: {
  id?: string;
  position: Point;
  label?: string;
  model?: string;
  system?: string;
  prompt?: string;
  selected?: boolean;
}): LlmNode {
  return {
    id: args.id ?? `llm-${nanoid(8)}`,
    type: "llm",
    position: args.position,
    selected: args.selected,
    data: {
      label: args.label ?? "LLM",
      model: args.model ?? DEFAULT_LLM_MODEL,
      system: args.system ?? "",
      prompt: args.prompt ?? "{{input}}",
    },
  };
}

export function createWorkflowEdge(args: {
  id?: string;
  source: string;
  sourceHandle: string;
  target: string;
}): WorkflowEdge {
  return {
    id:
      args.id ??
      `e-${args.source}-${args.sourceHandle}-${args.target}-${nanoid(6)}`,
    type: WORKFLOW_EDGE_TYPE,
    source: args.source,
    sourceHandle: args.sourceHandle,
    target: args.target,
    targetHandle: IN_HANDLE,
    data: {},
  };
}

/* -------------------------------------------------------------------------- */
/*                                Graph helpers                               */
/* -------------------------------------------------------------------------- */

/**
 * Returns true if adding an edge from `source` to `target` would create a
 * cycle (i.e. `source` is reachable from `target`).
 */
export function wouldCreateCycle(
  edges: readonly WorkflowEdge[],
  source: string,
  target: string
): boolean {
  if (source === target) {
    return true;
  }

  const visited = new Set<string>();
  const stack = [target];

  while (stack.length > 0) {
    const current = stack.pop()!;

    if (current === source) {
      return true;
    }

    if (visited.has(current)) {
      continue;
    }

    visited.add(current);

    for (const edge of edges) {
      if (edge.source === current) {
        stack.push(edge.target);
      }
    }
  }

  return false;
}

/**
 * Ids of nodes reachable from the input node. Anything else never runs.
 */
export function getReachableNodeIds(
  nodes: readonly WorkflowNode[],
  edges: readonly WorkflowEdge[]
): Set<string> {
  const reachable = new Set<string>();

  if (!nodes.some((node) => node.id === INPUT_NODE_ID)) {
    return reachable;
  }

  const stack = [INPUT_NODE_ID];

  while (stack.length > 0) {
    const current = stack.pop()!;

    if (reachable.has(current)) {
      continue;
    }

    reachable.add(current);

    for (const edge of edges) {
      if (edge.source === current) {
        stack.push(edge.target);
      }
    }
  }

  return reachable;
}

/**
 * Kahn's algorithm. Returns `null` if the graph contains a cycle.
 */
export function topologicalOrder(
  nodes: readonly WorkflowNode[],
  edges: readonly WorkflowEdge[]
): WorkflowNode[] | null {
  const indegree = new Map<string, number>();
  const byId = new Map<string, WorkflowNode>();

  for (const node of nodes) {
    indegree.set(node.id, 0);
    byId.set(node.id, node);
  }

  for (const edge of edges) {
    if (indegree.has(edge.target) && byId.has(edge.source)) {
      indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
    }
  }

  const queue = nodes.filter((node) => indegree.get(node.id) === 0);
  const order: WorkflowNode[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    order.push(node);

    for (const edge of edges) {
      if (edge.source !== node.id) {
        continue;
      }

      const next = indegree.get(edge.target);

      if (next === undefined) {
        continue;
      }

      indegree.set(edge.target, next - 1);

      if (next - 1 === 0) {
        const target = byId.get(edge.target);

        if (target) {
          queue.push(target);
        }
      }
    }
  }

  return order.length === nodes.length ? order : null;
}

/* -------------------------------------------------------------------------- */
/*                                 Templating                                 */
/* -------------------------------------------------------------------------- */

export type AnswerValue = {
  // Human-readable value: the chosen option, the level key, or "yes"/"no".
  value: string;
  probability: number;
  confidence: number;
};

/**
 * Resolves `{{input}}`, `{{answers.<id>}}`, `{{answers.<id>.probability}}` and
 * `{{answers.<id>.confidence}}`. Unknown placeholders resolve to "".
 */
export function renderTemplate(
  template: string,
  context: { input: string; answers: Record<string, AnswerValue> }
): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path: string) => {
    if (path === "input") {
      return context.input;
    }

    const [root, id, field] = path.split(".");

    if (root !== "answers" || !id) {
      return "";
    }

    const answer = context.answers[id];

    if (!answer) {
      return "";
    }

    if (field === "probability") {
      return answer.probability.toFixed(2);
    }

    if (field === "confidence") {
      return answer.confidence.toFixed(2);
    }

    return answer.value;
  });
}

export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
