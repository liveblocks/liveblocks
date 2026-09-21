import type { OutputProperty, WorkflowNodeType } from "./shared";

export type WorkflowOutput = Record<string, string[]>;

export function createEmptyOutput(
  properties: readonly OutputProperty[]
): WorkflowOutput {
  return Object.fromEntries(
    properties.map<[string, string[]]>(({ name }) => [name, []])
  );
}

export function getRunOutput(
  outputs: WorkflowOutput | string[] | undefined
): WorkflowOutput {
  // Older saved runs had one list of outputs without property names.
  return Array.isArray(outputs)
    ? { customer: outputs, team: [] }
    : (outputs ?? {});
}

export type RunStatus = "running" | "complete" | "error";
export type RunTrigger = "test" | "api";
export type NodeStatus = "running" | "complete" | "error" | "skipped";

export type ChoiceAnswer = {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
};

export type ScoreAnswer = {
  type: "score";
  // Expected score, may fall between two integer levels.
  score: number;
  // Rounded level index that decided which handle fired.
  level: number;
  confidence: number;
  probabilities: Record<string, number>;
};

export type NoulAnswer = {
  type: "noul";
  noul: number;
  threshold: number;
};

export type Answer = ChoiceAnswer | ScoreAnswer | NoulAnswer;

/**
 * The data stored in one feed message: the result of executing one node.
 */
export type NodeResultData = {
  nodeId: string;
  nodeType: WorkflowNodeType;
  label: string;
  status: NodeStatus;
  // Ids of the upstream nodes whose handles fired into this node.
  parentNodeIds: string[];
  // Whether this node required every incoming handle to fire ("all") or just
  // one ("any").
  activation?: "any" | "all";
  // The resolved `input` state this node received.
  input: string;
  // LLM output (streams in) or, for Jev nodes, the input passed through.
  output?: string;
  // Output node only: parent texts per property, in connection order.
  // The array variant supports runs saved before outputs were separated.
  outputs?: WorkflowOutput | string[];
  // Jev answers keyed by question id.
  answers?: Record<string, Answer>;
  // Source handles that fired on this node.
  firedHandles?: string[];
  // Set when the node ran against a mock instead of a real provider.
  mock?: boolean;
  model?: string;
  durationMs?: number;
  error?: string;
  startedAt: number;
};

export type RunSummary = {
  runId: string;
  status: RunStatus;
  trigger: RunTrigger;
  input: string;
  startedAt: number;
  completedAt?: number;
  error?: string;
};

export type RunTrace = RunSummary & {
  nodes: NodeResultData[];
  // Texts that reached each output input, with an empty array for unused inputs.
  output: WorkflowOutput;
};

export const MAX_INPUT_PREVIEW = 200;
export const MAX_NODE_EXECUTIONS = 25;
export const RUN_TIMEOUT_MS = 60_000;
