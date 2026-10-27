import Anthropic from "@anthropic-ai/sdk";
import type { LiveMap } from "@liveblocks/client";
import type { MutateStorageCallback } from "@liveblocks/node";
import { getLiveblocks } from "@/lib/liveblocksServer";
import { AGENT_TOOLS, type AgentStatus, type AgentToolInputMap } from "./tools";
import {
  createHtmlBoxShapeRecord,
  HTML_BOX_SHAPE_TYPE,
  normalizeBoxTitle,
  normalizeShapeLikeRecord,
} from "@/lib/htmlBox";

type StorageRecord = Liveblocks["Storage"]["records"] extends LiveMap<
  string,
  infer TValue
>
  ? TValue
  : never;

type ChatHistoryMessage = {
  role: "user" | "assistant";
  text: string;
};

type RunAgentParams = {
  roomId: string;
  userMessage: string;
  agentName: string;
  history: ChatHistoryMessage[];
  selectedShapeIds: string[];
  selectedShapes: Array<Record<string, unknown>>;
  onProgress: (update: {
    text?: string;
    reasoning?: string;
    status?: AgentStatus;
    isStreaming?: boolean;
  }) => Promise<void>;
};

type ToolUseCall = {
  id: string;
  name: keyof AgentToolInputMap;
  input: unknown;
};

type BoxAnchor = {
  shapeId: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

// Shared shape of the create_box / edit_box tool inputs.
type BoxInput = {
  targetShapeId?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  title?: string;
  html?: string;
};

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Storage mutations can fail transiently, especially when multiple agents
// mutate the same room concurrently. Retry with backoff so a single agent's
// hiccup doesn't silently drop its box.
async function mutateStorageWithRetry(
  roomId: string,
  label: string,
  mutator: MutateStorageCallback
) {
  const liveblocks = getLiveblocks();
  const maxAttempts = 4;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await liveblocks.mutateStorage(roomId, mutator);
      return;
    } catch (error) {
      lastError = error;
      console.error("[copilot] mutateStorage failed", {
        roomId,
        label,
        attempt,
        error: error instanceof Error ? error.message : String(error),
      });
      await new Promise((resolve) =>
        setTimeout(resolve, 150 * attempt + Math.random() * 150)
      );
    }
  }
  throw lastError;
}

type AgentBoxState = { agentName: string; agentStatus: string };

function createHtmlBoxRecord(
  input: BoxInput & { html: string; id?: string },
  agent?: AgentBoxState
) {
  const width = typeof input.w === "number" ? input.w : 320;
  const height = typeof input.h === "number" ? input.h : 180;
  const x = typeof input.x === "number" ? input.x : 220;
  const y = typeof input.y === "number" ? input.y : 220;
  const title = normalizeBoxTitle(input.title ?? "", "New Design");
  const html = input.html;
  return createHtmlBoxShapeRecord({
    id: input.id,
    x,
    y,
    w: width,
    h: height,
    title,
    html,
    agentName: agent?.agentName ?? "",
    agentStatus: agent?.agentStatus ?? "",
  });
}

// Build an updated html-box record, reusing existing values when the tool
// input omits a field. Optionally stamps the active agent state onto the box.
function buildUpdatedBoxRecord(
  existingRecord: Record<string, unknown>,
  input: BoxInput,
  agent?: AgentBoxState
): Record<string, unknown> {
  const existingProps =
    typeof existingRecord.props === "object" && existingRecord.props !== null
      ? (existingRecord.props as Record<string, unknown>)
      : {};
  const existingTitle =
    typeof existingProps.title === "string"
      ? normalizeBoxTitle(existingProps.title, "New Design")
      : "New Design";
  const title =
    typeof input.title === "string" && input.title.trim().length > 0
      ? normalizeBoxTitle(input.title, "New Design")
      : existingTitle;
  const html =
    typeof input.html === "string" && input.html.trim().length > 0
      ? input.html
      : typeof existingProps.html === "string"
        ? existingProps.html
        : "";

  return normalizeShapeLikeRecord({
    ...existingRecord,
    typeName: "shape",
    type: HTML_BOX_SHAPE_TYPE,
    ...(typeof input.x === "number" ? { x: input.x } : null),
    ...(typeof input.y === "number" ? { y: input.y } : null),
    props: {
      ...existingProps,
      ...(typeof input.w === "number" ? { w: input.w } : null),
      ...(typeof input.h === "number" ? { h: input.h } : null),
      title,
      html,
      updatedAt: new Date().toISOString(),
      ...(agent
        ? { agentName: agent.agentName, agentStatus: agent.agentStatus }
        : null),
    },
  });
}

// Stamp (or clear) the active-agent state on an existing html-box so the
// canvas can render a cursor attached to the box.
async function writeBoxAgentState(
  roomId: string,
  shapeId: string,
  agent: AgentBoxState
) {
  await mutateStorageWithRetry(roomId, "writeBoxAgentState", ({ root }) => {
    const records = root.get("records");
    const existing = records.get(shapeId);
    if (
      !existing ||
      typeof existing !== "object" ||
      (existing as Record<string, unknown>).type !== HTML_BOX_SHAPE_TYPE
    ) {
      return;
    }
    const record = existing as Record<string, unknown>;
    const props =
      typeof record.props === "object" && record.props !== null
        ? (record.props as Record<string, unknown>)
        : {};
    const next = normalizeShapeLikeRecord({
      ...record,
      props: {
        ...props,
        agentName: agent.agentName,
        agentStatus: agent.agentStatus,
      },
    });
    records.set(shapeId, next as unknown as StorageRecord);
  });
}

// Anchor (id + bounds) for a selected shape coming from the client context.
function getSelectedBoxAnchor(
  shape: Record<string, unknown>
): BoxAnchor | null {
  if (shape.type !== HTML_BOX_SHAPE_TYPE || typeof shape.id !== "string") {
    return null;
  }
  const props =
    typeof shape.props === "object" && shape.props !== null
      ? (shape.props as Record<string, unknown>)
      : {};
  return {
    shapeId: shape.id,
    x: typeof shape.x === "number" ? shape.x : 220,
    y: typeof shape.y === "number" ? shape.y : 220,
    w: typeof props.w === "number" ? props.w : 320,
    h: typeof props.h === "number" ? props.h : 180,
  };
}

function getToolCalls(content: unknown): ToolUseCall[] {
  if (!Array.isArray(content)) {
    return [];
  }

  const calls: ToolUseCall[] = [];
  for (const block of content) {
    if (!block || typeof block !== "object") {
      continue;
    }
    const maybeCall = block as Record<string, unknown>;
    if (
      maybeCall.type === "tool_use" &&
      typeof maybeCall.id === "string" &&
      typeof maybeCall.name === "string"
    ) {
      calls.push({
        id: maybeCall.id,
        name: maybeCall.name as keyof AgentToolInputMap,
        input: maybeCall.input,
      });
    }
  }
  return calls;
}

function getText(content: unknown): string {
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((block) => {
      if (!block || typeof block !== "object") {
        return "";
      }
      const maybeText = block as Record<string, unknown>;
      if (maybeText.type === "text" && typeof maybeText.text === "string") {
        return maybeText.text;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

// Extracts the model's extended-thinking (chain-of-thought) blocks.
function getThinking(content: unknown): string {
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((block) => {
      if (!block || typeof block !== "object") {
        return "";
      }
      const maybeThinking = block as Record<string, unknown>;
      if (
        maybeThinking.type === "thinking" &&
        typeof maybeThinking.thinking === "string"
      ) {
        return maybeThinking.thinking;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}

// Honest fallback shown when the agent fails to produce a real design, so it
// is never mistaken for generated output.
function createErrorFallbackHtml() {
  return `\
<section class="flex h-full min-h-full w-full items-center justify-center p-6 font-sans">
  <div class="max-w-sm rounded-xl border border-neutral-200 bg-white p-6 text-center">
    <div class="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-lg font-semibold text-red-500">!</div>
    <h1 class="mb-1 text-base font-semibold text-neutral-900">Generation failed</h1>
    <p class="text-sm text-neutral-500">The agent couldn't generate this design. Please try again.</p>
  </div>
</section>`;
}

function getShapeBoundsFromInput(input: BoxInput) {
  const w = typeof input.w === "number" ? input.w : 320;
  const h = typeof input.h === "number" ? input.h : 180;
  const x = typeof input.x === "number" ? input.x : 220;
  const y = typeof input.y === "number" ? input.y : 220;
  return { x, y, w, h };
}

const PLACEHOLDER_SPINNER_HTML = `<section
  aria-label="Generating"
  style="display:grid;place-items:center;width:100%;height:100%;min-height:100vh;background:#fff;"
>
  <div
    style="
      width:44px;
      height:44px;
      border:4px solid #e5e7eb;
      border-top-color:#7c3aed;
      border-radius:9999px;
      animation:spin 0.8s linear infinite;
    "
  ></div>
  <style>
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</section>`;

// Creates a spinner placeholder box at the given bounds. Called lazily from
// inside create_box (never before we know we're creating a new box).
async function createPlaceholderBox(
  roomId: string,
  bounds: Pick<BoxInput, "x" | "y" | "w" | "h">,
  agent: AgentBoxState
): Promise<BoxAnchor> {
  const { x, y, w, h } = getShapeBoundsFromInput({
    x: bounds?.x,
    y: bounds?.y,
    w: typeof bounds?.w === "number" ? bounds.w : 480,
    h: typeof bounds?.h === "number" ? bounds.h : 320,
  });

  const shape = createHtmlBoxRecord(
    {
      title: "Generating",
      html: PLACEHOLDER_SPINNER_HTML,
      x,
      y,
      w,
      h,
    },
    agent
  );
  await mutateStorageWithRetry(roomId, "createPlaceholderBox", ({ root }) => {
    const records = root.get("records");
    records.set(
      shape.id,
      normalizeShapeLikeRecord(shape) as unknown as StorageRecord
    );
  });

  return {
    shapeId: shape.id,
    x,
    y,
    w,
    h,
  };
}

async function applyToolCall(
  roomId: string,
  call: ToolUseCall,
  agentName: string,
  options?: { existingBoxId?: string }
): Promise<Record<string, unknown>> {
  if (call.name !== "create_box" && call.name !== "edit_box") {
    return { ok: false, error: "Unsupported tool" };
  }

  const input = call.input as BoxInput;
  const isEdit = call.name === "edit_box";
  const html = input.html;
  const agent: AgentBoxState = { agentName, agentStatus: "editing" };

  if (!isEdit && (typeof html !== "string" || html.trim().length === 0)) {
    return { ok: false, error: "create_box requires non-empty html." };
  }
  if (isEdit && (typeof input.targetShapeId !== "string" || input.targetShapeId.length === 0)) {
    return { ok: false, error: "edit_box requires targetShapeId." };
  }

  // edit_box: update the existing target box in place (no placeholder).
  if (isEdit) {
    let shapeId = "";
    await mutateStorageWithRetry(roomId, "edit_box", ({ root }) => {
      const records = root.get("records");
      const targetId = input.targetShapeId;
      if (!targetId) {
        return;
      }
      const existing = records.get(targetId);
      if (
        existing &&
        typeof existing === "object" &&
        (existing as Record<string, unknown>).type === HTML_BOX_SHAPE_TYPE
      ) {
        const nextRecord = buildUpdatedBoxRecord(
          existing as Record<string, unknown>,
          input,
          agent
        );
        records.set(targetId, nextRecord as unknown as StorageRecord);
        shapeId = targetId;
      }
    });

    if (!shapeId) {
      return {
        ok: false,
        error: "edit_box could not resolve an html-box with that targetShapeId.",
      };
    }
    return { ok: true, id: shapeId };
  }

  // create_box: reuse the spinner placeholder created the moment the model
  // committed to create_box (so the box already showed up). If there isn't one
  // yet, create it now. Then fill it with the generated HTML.
  const placeholderId =
    options?.existingBoxId ??
    (await createPlaceholderBox(roomId, input, agent)).shapeId;

  await mutateStorageWithRetry(roomId, "create_box.fill", ({ root }) => {
    const records = root.get("records");
    const existing = records.get(placeholderId);
    const next =
      existing &&
      typeof existing === "object" &&
      (existing as Record<string, unknown>).type === HTML_BOX_SHAPE_TYPE
        ? buildUpdatedBoxRecord(existing as Record<string, unknown>, input, agent)
        : normalizeShapeLikeRecord(
            createHtmlBoxRecord(
              { ...input, html: html as string, id: placeholderId },
              agent
            )
          );
    records.set(placeholderId, next as unknown as StorageRecord);
  });

  return { ok: true, id: placeholderId };
}

export async function runAgent({
  roomId,
  userMessage,
  agentName,
  history,
  selectedShapeIds,
  selectedShapes,
  onProgress,
}: RunAgentParams) {
  console.log("[copilot] agent run started", { roomId, agentName });
  const liveblocks = getLiveblocks();
  const storageDoc = await liveblocks.getStorageDocument(roomId, "json");

  // Decide create vs edit up front. If the user already has an html-box
  // selected, treat this as an edit turn; otherwise a spinner box is created
  // lazily inside create_box.
  let editAnchor: BoxAnchor | null = null;
  for (const shape of selectedShapes) {
    const anchor = getSelectedBoxAnchor(shape);
    if (anchor) {
      editAnchor = anchor;
      break;
    }
  }

  // Track every box this agent touches so we can clear its cursor at the end.
  const touchedBoxIds = new Set<string>();

  // For edits, attach the agent cursor to the selected box right away (while
  // thinking). For creates there is no box yet until create_box runs.
  if (editAnchor) {
    touchedBoxIds.add(editAnchor.shapeId);
    await writeBoxAgentState(roomId, editAnchor.shapeId, {
      agentName,
      agentStatus: "thinking",
    });
  }

  await onProgress({
    text: editAnchor ? "Editing..." : "Starting generation...",
    status: "thinking",
    isStreaming: true,
  });

  const contextSelectedShapeIds = selectedShapeIds;

  const prompt = [
    "You are the canvas AI for a collaborative design workspace.",
    "You have two tools:",
    "- create_box: create a brand new design box with generated HTML.",
    "- edit_box: modify an EXISTING box; you must pass targetShapeId set to the id of the box to change.",
    "Use edit_box (not create_box) when the user asks to change, update, restyle, or tweak an existing or selected box.",
    "Use create_box only for brand new designs.",
    "Do not call any other tools.",
    "Always provide a short title of 1-3 words in the tool call title field.",
    "Style everything with Tailwind CSS utility classes (Tailwind is loaded for you).",
    "Use only Tailwind utility classes in `class` attributes; avoid <style> blocks and inline style attributes.",
    "Generate responsive layouts by default using Tailwind's responsive prefixes (sm:, md:, lg:) and fluid/mobile-first patterns.",
    "Return a single self-contained HTML fragment (no <html>, <head>, or <body> wrappers).",
    "Choose box dimensions (w and h) freely to best fit the design you are creating — there are no fixed sizes. For example, use a tall narrow box (~390x844) for a mobile screen, a wide box (~1280x800) for a desktop layout, or a compact box for a single component.",
    editAnchor
      ? `The user selected an existing box to edit. Prefer edit_box with targetShapeId "${editAnchor.shapeId}".`
      : "There is no selected box; prefer create_box for a new design.",
    "",
    "The context includes conversationHistory: earlier messages in this chat, oldest first. Use it to understand references to previous requests (e.g. \"the previous one\", \"make it blue\", \"the homepage you made\"). Match such references to existing boxes in roomStorage and edit them with edit_box.",
    "",
    "Do ALL planning and reasoning silently in your private thinking. NEVER write plans, outlines, numbered steps, or explanations as visible message text.",
    "Send exactly ONE visible message: the final confirmation, after all edits are done, with no tool call. It MUST be a single short sentence (under ~20 words) confirming the result.",
    'Good final messages: "Done! The box is now a full marketing homepage for a paint brand called BrushstrokeCo." / "I\'ve converted it into a marketing homepage for a placeholder paint brand." / "Complete! The element now depicts a marketing homepage for a paint company."',
    "Never output anything longer than that single short sentence as visible text.",
    "",
    "<context>",
    JSON.stringify(
      {
        userMessage,
        conversationHistory: history,
        selectedShapeIds: contextSelectedShapeIds,
        selectedShapes,
        roomStorage: storageDoc,
      },
      null,
      2
    ),
    "</context>",
  ].join("\n");

  const messages: Array<Record<string, unknown>> = [
    {
      role: "user",
      content: prompt,
    },
  ];

  let lastAssistantText = "";
  let reasoning = "";
  let successfulToolCallCount = 0;
  // Spinner box created the moment the model commits to create_box (mid-stream),
  // so the box shows up immediately instead of only when generation finishes.
  let earlyPlaceholderId: string | null = null;
  let earlyPlaceholderConsumed = false;

  for (let step = 0; step < 4; step += 1) {
    // Stream only the reasoning (chain-of-thought) into the feed live. The
    // visible message body is never streamed, so the model can't show a plan.
    let liveThinking = "";
    let lastFlush = 0;
    let flushInFlight = false;
    let earlyPlaceholderPromise: Promise<void> | null = null;

    const flush = async () => {
      if (flushInFlight) {
        return;
      }
      const now = Date.now();
      if (now - lastFlush < 250) {
        return;
      }
      flushInFlight = true;
      lastFlush = now;
      try {
        const liveReasoning = [reasoning, liveThinking]
          .filter((part) => part.trim().length > 0)
          .join("\n\n");
        await onProgress({
          reasoning: liveReasoning,
          status: "thinking",
          isStreaming: true,
        });
      } finally {
        flushInFlight = false;
      }
    };

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      // Extended thinking gives us the model's real chain-of-thought, which we
      // surface as the "thought process". Note: thinking requires tool_choice
      // "auto" (forcing a tool is not allowed alongside thinking).
      thinking: { type: "enabled", budget_tokens: 2048 },
      // XXX Anthropic's Tool type is stricter than our reusable schema literal.
      tools: AGENT_TOOLS as never,
      tool_choice: { type: "auto" } as never,
      messages: messages as never,
    });

    stream.on("thinking", (delta: string) => {
      liveThinking += delta;
      void flush();
    });
    stream.on("streamEvent", (event) => {
      // As soon as a create_box tool call begins, drop the spinner box.
      const e = event as {
        type?: string;
        content_block?: { type?: string; name?: string };
      };
      if (
        e.type === "content_block_start" &&
        e.content_block?.type === "tool_use" &&
        e.content_block?.name === "create_box" &&
        !editAnchor &&
        earlyPlaceholderId === null &&
        earlyPlaceholderPromise === null
      ) {
        earlyPlaceholderPromise = createPlaceholderBox(roomId, {}, {
          agentName,
          agentStatus: "editing",
        }).then((placeholder) => {
          earlyPlaceholderId = placeholder.shapeId;
          touchedBoxIds.add(placeholder.shapeId);
        });
      }
    });

    const response = await stream.finalMessage();
    if (earlyPlaceholderPromise) {
      await earlyPlaceholderPromise;
    }

    const thinking = getThinking(response.content);
    const text = getText(response.content);
    const calls = getToolCalls(response.content);

    // Reasoning = the model's real chain-of-thought, plus any narration it
    // emits alongside a tool call.
    const narration = [thinking, calls.length > 0 ? text : ""]
      .filter((part) => part.trim().length > 0)
      .join("\n\n");
    if (narration.length > 0) {
      reasoning = [reasoning, narration].filter(Boolean).join("\n\n");
    }

    // Text emitted on a turn with no tool call is the final confirmation.
    if (calls.length === 0 && text.trim().length > 0) {
      lastAssistantText = text.trim();
    }

    // Reconcile the streamed message: clear streamed text on tool turns (it was
    // narration that now lives in reasoning), keep it as the final confirmation
    // on a no-tool turn.
    await onProgress({
      reasoning,
      text: calls.length === 0 ? lastAssistantText : "",
      status: calls.length === 0 ? "thinking" : "editing",
      isStreaming: true,
    });

    if (calls.length === 0) {
      break;
    }

    messages.push({
      role: "assistant",
      content: response.content,
    });

    const toolResults: Array<Record<string, unknown>> = [];
    for (const call of calls) {
      await onProgress({
        status: "editing",
        isStreaming: true,
      });

      const reuseEarly =
        call.name === "create_box" &&
        earlyPlaceholderId !== null &&
        !earlyPlaceholderConsumed;
      const result = await applyToolCall(
        roomId,
        call,
        agentName,
        reuseEarly ? { existingBoxId: earlyPlaceholderId ?? undefined } : undefined
      );
      if (reuseEarly) {
        earlyPlaceholderConsumed = true;
      }
      if (result.ok === true) {
        successfulToolCallCount += 1;
        if (typeof result.id === "string") {
          touchedBoxIds.add(result.id);
        }
      } else {
        console.error("[copilot] tool call failed", {
          roomId,
          tool: call.name,
          error: result.error,
        });
      }
      toolResults.push({
        type: "tool_result",
        tool_use_id: call.id,
        content: JSON.stringify(result),
      });
    }

    messages.push({
      role: "user",
      content: toolResults,
    });
  }

  let didFail = false;
  if (successfulToolCallCount === 0) {
    didFail = true;
    console.error(
      "[copilot] agent produced no successful tool call; inserting error fallback",
      { roomId, userMessage }
    );
    const html = createErrorFallbackHtml();
    const reuseEarly =
      !editAnchor && earlyPlaceholderId !== null && !earlyPlaceholderConsumed;
    const fallbackResult = await applyToolCall(
      roomId,
      {
        id: `fallback-${crypto.randomUUID()}`,
        name: editAnchor ? "edit_box" : "create_box",
        input: {
          ...(editAnchor ? { targetShapeId: editAnchor.shapeId } : null),
          title: "Failed",
          html,
        },
      },
      agentName,
      reuseEarly ? { existingBoxId: earlyPlaceholderId ?? undefined } : undefined
    );
    if (reuseEarly) {
      earlyPlaceholderConsumed = true;
    }
    if (typeof fallbackResult.id === "string") {
      touchedBoxIds.add(fallbackResult.id);
    }
    successfulToolCallCount = 1;
    await onProgress({
      status: "editing",
      isStreaming: true,
    });
  }

  const finalText = didFail
    ? "Generation failed. Please try again."
    : lastAssistantText || "Done!";

  await onProgress({
    text: finalText,
    reasoning,
    status: "idle",
    isStreaming: false,
  });

  // The agent has finished: clear its cursor from every box it touched.
  for (const shapeId of touchedBoxIds) {
    await writeBoxAgentState(roomId, shapeId, {
      agentName: "",
      agentStatus: "",
    });
  }

  console.log("[copilot] agent run finished", {
    roomId,
    agentName,
    successfulToolCallCount,
    didFail,
    touchedBoxes: touchedBoxIds.size,
  });

  return {
    text: finalText,
    reasoning,
  };
}
