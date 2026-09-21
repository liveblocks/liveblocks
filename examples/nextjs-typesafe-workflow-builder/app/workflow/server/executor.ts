import "server-only";

import { nanoid } from "nanoid";
import {
  MAX_INPUT_PREVIEW,
  MAX_NODE_EXECUTIONS,
  RUN_TIMEOUT_MS,
  type Answer,
  type NodeResultData,
  type RunTrace,
  type RunTrigger,
} from "../runs";
import {
  ANY_HANDLE,
  INPUT_NODE_ID,
  OUT_HANDLE,
  getActivation,
  getReachableNodeIds,
  questionHandleId,
  renderTemplate,
  topologicalOrder,
  truncate,
  type AnswerValue,
  type JevNode,
  type LlmNode,
  type QuestionDef,
  type WorkflowNode,
} from "../shared";
import { liveblocks, readWorkflowGraph } from "./liveblocks";
import { runLlm } from "./llm";
import { askJev, type JevState } from "./typesafe";

const STREAM_THROTTLE_MS = 100;

/**
 * What a node hands to its children once it has finished.
 */
type NodeState = {
  output: string;
  // Template-friendly answers accumulated along the path so far.
  answers: Record<string, AnswerValue>;
  // Raw TypeSafe answers accumulated along the path so far.
  rawAnswers: Record<string, Answer>;
  firedHandles: Set<string>;
};

export type RunWorkflowOptions = {
  roomId: string;
  input: string;
  trigger: RunTrigger;
};

/**
 * Starts a run and returns its id right away, plus a promise for the full
 * trace once every node has settled.
 */
export function startWorkflowRun(options: RunWorkflowOptions): {
  runId: string;
  trace$: Promise<RunTrace>;
} {
  const runId = `run-${nanoid(10)}`;
  return { runId, trace$: runWorkflow(runId, options) };
}

async function runWorkflow(
  runId: string,
  options: RunWorkflowOptions
): Promise<RunTrace> {
  const { roomId, input, trigger } = options;
  const startedAt = Date.now();
  const messages = new Map<string, NodeResultData>();
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), RUN_TIMEOUT_MS);
  let executions = 0;
  let limitReached = false;

  const metadata: Liveblocks["FeedMetadata"] = {
    status: "running",
    trigger,
    input: truncate(input, MAX_INPUT_PREVIEW),
    startedAt: String(startedAt),
  };

  await safe(() => liveblocks.createFeed({ roomId, feedId: runId, metadata }));

  const finish = async (error?: string): Promise<RunTrace> => {
    clearTimeout(timeout);

    const failedNode = [...messages.values()].find(
      (message) => message.status === "error"
    );
    const finalError = error ?? failedNode?.error;
    const completedAt = Date.now();
    const finalMetadata: Liveblocks["FeedMetadata"] = {
      ...metadata,
      status: finalError ? "error" : "complete",
      completedAt: String(completedAt),
      ...(finalError ? { error: finalError } : {}),
    };

    await safe(() =>
      liveblocks.updateFeed({ roomId, feedId: runId, metadata: finalMetadata })
    );

    const outputMessage = [...messages.values()].find(
      (message) => message.nodeType === "output" && message.status === "complete"
    );

    return {
      runId,
      status: finalMetadata.status,
      trigger,
      input,
      startedAt,
      completedAt,
      ...(finalError ? { error: finalError } : {}),
      output: outputMessage?.outputs ?? [],
      nodes: [...messages.values()].sort((a, b) => a.startedAt - b.startedAt),
    };
  };

  const { nodes, edges } = await readWorkflowGraph(roomId);
  const reachable = getReachableNodeIds(nodes, edges);
  const activeNodes = nodes.filter((node) => reachable.has(node.id));
  const activeEdges = edges.filter(
    (edge) => reachable.has(edge.source) && reachable.has(edge.target)
  );

  if (!activeNodes.some((node) => node.id === INPUT_NODE_ID)) {
    return finish("The workflow has no input node.");
  }

  const order = topologicalOrder(activeNodes, activeEdges);

  if (order === null) {
    return finish("The workflow contains a cycle.");
  }

  /* ------------------------------ Feed writes ----------------------------- */

  async function writeMessage(
    data: NodeResultData,
    existingId?: string
  ): Promise<string | undefined> {
    messages.set(data.nodeId, data);

    if (existingId) {
      await safe(() =>
        liveblocks.updateFeedMessage({
          roomId,
          feedId: runId,
          messageId: existingId,
          data,
        })
      );
      return existingId;
    }

    const created = await safe(() =>
      liveblocks.createFeedMessage({ roomId, feedId: runId, data })
    );
    return created?.id;
  }

  /* ------------------------------- Execution ------------------------------ */

  const results = new Map<string, Promise<NodeState | null>>();

  for (const node of order) {
    results.set(
      node.id,
      executeNode(node).catch((error: unknown) => {
        // Unexpected failure outside of the per-node error handling.
        console.error(`Node ${node.id} failed`, error);
        return null;
      })
    );
  }

  async function executeNode(node: WorkflowNode): Promise<NodeState | null> {
    if (node.type === "input") {
      const state: NodeState = {
        output: input,
        answers: {},
        rawAnswers: {},
        firedHandles: new Set([OUT_HANDLE]),
      };
      const nodeStartedAt = Date.now();

      await writeMessage({
        nodeId: node.id,
        nodeType: "input",
        label: node.data.label,
        status: "complete",
        parentNodeIds: [],
        input,
        output: input,
        firedHandles: [OUT_HANDLE],
        durationMs: 0,
        startedAt: nodeStartedAt,
      });

      return state;
    }

    // Wait for every parent to settle, whether or not it fired into us.
    const incoming = activeEdges.filter((edge) => edge.target === node.id);
    const parents = await Promise.all(
      incoming.map(async (edge) => ({
        edge,
        state: await results.get(edge.source),
      }))
    );
    const fired = parents.filter(
      ({ edge, state }) =>
        state != null &&
        edge.sourceHandle != null &&
        state.firedHandles.has(edge.sourceHandle)
    );

    // `any`: at least one incoming handle fired (OR). `all`: every incoming
    // handle fired (AND). Parents that never ran count as not fired.
    const requireAll = getActivation(node.data) === "all";

    if (fired.length === 0 || (requireAll && fired.length < incoming.length)) {
      return null;
    }

    // Join fired parents: outputs concatenated (deduplicated per parent),
    // answers merged (later parents win on conflicting ids).
    const parentNodeIds = [...new Set(fired.map(({ edge }) => edge.source))];
    const nodeInput = parentNodeIds
      .map((id) => fired.find(({ edge }) => edge.source === id)!.state!.output)
      .filter((text) => text.length > 0)
      .join("\n\n");
    const answers: Record<string, AnswerValue> = {};
    const rawAnswers: Record<string, Answer> = {};

    for (const { state } of fired) {
      Object.assign(answers, state!.answers);
      Object.assign(rawAnswers, state!.rawAnswers);
    }

    const nodeStartedAt = Date.now();
    const base: NodeResultData = {
      nodeId: node.id,
      nodeType: node.type,
      label: node.data.label,
      status: "running",
      parentNodeIds,
      activation: requireAll ? "all" : "any",
      input: nodeInput,
      startedAt: nodeStartedAt,
    };

    if (abort.signal.aborted) {
      await writeMessage({
        ...base,
        status: "error",
        error: `Run exceeded ${RUN_TIMEOUT_MS / 1000}s.`,
        durationMs: 0,
      });
      return null;
    }

    if (limitReached || ++executions > MAX_NODE_EXECUTIONS) {
      limitReached = true;
      await writeMessage({
        ...base,
        status: "error",
        error: `Run exceeded ${MAX_NODE_EXECUTIONS} node executions.`,
        durationMs: 0,
      });
      return null;
    }

    const messageId = await writeMessage(base);

    try {
      if (node.type === "jev") {
        return await executeJev(node, base, messageId, {
          input: nodeInput,
          answers,
          rawAnswers,
        });
      }

      if (node.type === "llm") {
        return await executeLlm(node, base, messageId, {
          input: nodeInput,
          answers,
          rawAnswers,
        });
      }

      const texts = parentNodeIds
        .map(
          (id) => fired.find(({ edge }) => edge.source === id)!.state!.output
        )
        .filter((text) => text.length > 0);

      return await executeOutput(base, messageId, texts, {
        answers,
        rawAnswers,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown error";
      await writeMessage(
        {
          ...base,
          status: "error",
          error: reason,
          durationMs: Date.now() - nodeStartedAt,
        },
        messageId
      );
      return null;
    }
  }

  async function executeJev(
    node: JevNode,
    base: NodeResultData,
    messageId: string | undefined,
    context: Pick<NodeState, "answers" | "rawAnswers"> & { input: string }
  ): Promise<NodeState> {
    // Upstream answers are exposed in the state so later questions can refer
    // to them by id, as recommended in the TypeSafe docs.
    const state: JevState = { input: context.input };

    for (const [id, answer] of Object.entries(context.answers)) {
      state[id] = answer.value;
    }

    const result = await askJev(node.data, state);
    const firedHandles = new Set<string>([ANY_HANDLE]);
    const answers = { ...context.answers };
    const rawAnswers = { ...context.rawAnswers, ...result.answers };
    const questionCount = Object.keys(result.answers).length;

    for (const question of node.data.questions) {
      const answer = result.answers[question.id];

      if (!answer) {
        continue;
      }

      const { handleKey, value } = resolveAnswer(question, answer);
      firedHandles.add(questionHandleId(question.id, handleKey));
      answers[question.id] = value;
    }

    await writeMessage(
      {
        ...base,
        status: questionCount === 0 ? "skipped" : "complete",
        output: context.input,
        answers: result.answers,
        firedHandles: [...firedHandles],
        mock: result.mock,
        model: result.model,
        durationMs: Date.now() - base.startedAt,
      },
      messageId
    );

    return { output: context.input, answers, rawAnswers, firedHandles };
  }

  async function executeLlm(
    node: LlmNode,
    base: NodeResultData,
    messageId: string | undefined,
    context: Pick<NodeState, "answers" | "rawAnswers"> & { input: string }
  ): Promise<NodeState> {
    const prompt = renderTemplate(node.data.prompt, context).trim();
    const system = renderTemplate(node.data.system, context).trim();

    if (prompt === "") {
      await writeMessage(
        {
          ...base,
          status: "skipped",
          output: context.input,
          firedHandles: [OUT_HANDLE],
          durationMs: Date.now() - base.startedAt,
        },
        messageId
      );

      return {
        output: context.input,
        answers: context.answers,
        rawAnswers: context.rawAnswers,
        firedHandles: new Set([OUT_HANDLE]),
      };
    }

    let lastWrite = 0;
    let pending: Promise<unknown> = Promise.resolve();

    const result = await runLlm({
      system,
      prompt,
      model: node.data.model,
      signal: abort.signal,
      onChunk: (text) => {
        const now = Date.now();

        if (now - lastWrite < STREAM_THROTTLE_MS) {
          return;
        }

        lastWrite = now;
        pending = pending.then(() =>
          writeMessage(
            {
              ...base,
              status: "running",
              output: text,
              model: node.data.model,
            },
            messageId
          )
        );
      },
    });

    await pending;

    await writeMessage(
      {
        ...base,
        status: "complete",
        output: result.text,
        firedHandles: [OUT_HANDLE],
        mock: result.mock,
        model: result.model,
        durationMs: Date.now() - base.startedAt,
      },
      messageId
    );

    return {
      output: result.text,
      answers: context.answers,
      rawAnswers: context.rawAnswers,
      firedHandles: new Set([OUT_HANDLE]),
    };
  }

  async function executeOutput(
    base: NodeResultData,
    messageId: string | undefined,
    texts: string[],
    context: Pick<NodeState, "answers" | "rawAnswers">
  ): Promise<NodeState> {
    const joined = texts.join("\n\n");

    await writeMessage(
      {
        ...base,
        status: "complete",
        output: joined,
        outputs: texts,
        firedHandles: [],
        durationMs: Date.now() - base.startedAt,
      },
      messageId
    );

    return {
      output: joined,
      answers: context.answers,
      rawAnswers: context.rawAnswers,
      firedHandles: new Set(),
    };
  }

  await Promise.all([...results.values()]);

  return finish(
    limitReached
      ? `Run exceeded ${MAX_NODE_EXECUTIONS} node executions.`
      : undefined
  );
}

/**
 * Picks which handle an answer fires and the template-friendly value.
 */
function resolveAnswer(
  question: QuestionDef,
  answer: Answer
): { handleKey: string; value: AnswerValue } {
  switch (answer.type) {
    case "choice":
      return {
        handleKey: answer.choice,
        value: {
          value: answer.choice,
          probability: answer.probabilities[answer.choice] ?? 0,
          confidence: answer.confidence,
        },
      };
    case "score": {
      const levelKey =
        question.type === "score"
          ? (question.levels[answer.level]?.key ?? String(answer.level))
          : String(answer.level);
      return {
        handleKey: String(answer.level),
        value: {
          value: levelKey,
          probability: answer.probabilities[String(answer.level)] ?? 0,
          confidence: answer.confidence,
        },
      };
    }
    case "noul": {
      const yes = answer.noul >= answer.threshold;
      return {
        handleKey: yes ? "yes" : "no",
        value: {
          value: yes ? "yes" : "no",
          probability: answer.noul,
          confidence: Math.abs(answer.noul - 0.5) * 2,
        },
      };
    }
  }
}

/**
 * Feed writes should never take the run down: log and continue. (The local
 * Liveblocks dev server stubs the feed REST endpoints, for instance.)
 */
async function safe<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    console.error("Feed write failed", error);
    return undefined;
  }
}
