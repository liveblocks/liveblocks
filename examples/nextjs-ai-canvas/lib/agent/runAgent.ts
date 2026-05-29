import Anthropic from "@anthropic-ai/sdk";
import type { LiveMap } from "@liveblocks/client";
import { AI_USER } from "@/database";
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

type RunAgentParams = {
  roomId: string;
  userMessage: string;
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

function createHtmlBoxRecord(input: BoxInput & { html: string }) {
  const width = typeof input.w === "number" ? input.w : 320;
  const height = typeof input.h === "number" ? input.h : 180;
  const x = typeof input.x === "number" ? input.x : 220;
  const y = typeof input.y === "number" ? input.y : 220;
  const title = normalizeBoxTitle(input.title ?? "", "New Design");
  const html = input.html;
  return createHtmlBoxShapeRecord({
    x,
    y,
    w: width,
    h: height,
    title,
    html,
  });
}

// Build an updated html-box record, reusing existing values when the tool
// input omits a field (used by edit_box and create_box-into-placeholder).
function buildUpdatedBoxRecord(
  existingRecord: Record<string, unknown>,
  input: BoxInput
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
    },
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

async function setAgentPresence(
  roomId: string,
  data: {
    cursor?: { x: number; y: number } | null;
    selection?: string[];
    agentStatus?: AgentStatus;
  },
  ttl = 30
) {
  const liveblocks = getLiveblocks();
  await liveblocks.setPresence(roomId, {
    userId: AI_USER.id,
    userInfo: AI_USER.info,
    data: {
      cursor: data.cursor ?? null,
      selection: data.selection ?? [],
      isAgent: true,
      agentStatus: data.agentStatus ?? "idle",
    },
    ttl,
  });
}

function getShapeBoundsFromInput(input: BoxInput) {
  const w = typeof input.w === "number" ? input.w : 320;
  const h = typeof input.h === "number" ? input.h : 180;
  const x = typeof input.x === "number" ? input.x : 220;
  const y = typeof input.y === "number" ? input.y : 220;
  return { x, y, w, h };
}

function boxCenter(anchor: Pick<BoxAnchor, "x" | "y" | "w" | "h">) {
  return {
    x: anchor.x + anchor.w / 2,
    y: anchor.y + anchor.h / 2,
  };
}

function withCursorWobble(
  cursor: { x: number; y: number } | null | undefined,
  tick: number
) {
  if (!cursor) {
    return null;
  }
  const angle = tick * 0.9;
  return {
    x: cursor.x + Math.cos(angle) * 6,
    y: cursor.y + Math.sin(angle) * 4,
  };
}

async function deleteShapeFromStorage(roomId: string, shapeId: string) {
  const liveblocks = getLiveblocks();
  await liveblocks.mutateStorage(roomId, ({ root }) => {
    const records = root.get("records");
    records.delete(shapeId);
  });
}

// Resize/move the spinner placeholder to the AI's chosen dimensions, keeping
// the existing (spinner) html so the box snaps to its final size before the
// generated content fills in.
async function resizePlaceholderToInput(
  roomId: string,
  placeholderId: string,
  input: BoxInput
) {
  const liveblocks = getLiveblocks();
  await liveblocks.mutateStorage(roomId, ({ root }) => {
    const records = root.get("records");
    const existing = records.get(placeholderId);
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
    const resized = normalizeShapeLikeRecord({
      ...record,
      ...(typeof input.x === "number" ? { x: input.x } : null),
      ...(typeof input.y === "number" ? { y: input.y } : null),
      props: {
        ...props,
        ...(typeof input.w === "number" ? { w: input.w } : null),
        ...(typeof input.h === "number" ? { h: input.h } : null),
      },
    });
    records.set(placeholderId, resized as unknown as StorageRecord);
  });
}

async function createPlaceholderBox(roomId: string): Promise<BoxAnchor> {
  const liveblocks = getLiveblocks();
  const placeholderInput: BoxInput & { html: string } = {
    title: "Generating",
    html: `<section
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
</section>`,
    x: 220,
    y: 220,
    w: 480,
    h: 320,
  };
  const { x, y, w, h } = getShapeBoundsFromInput(placeholderInput);

  const shape = createHtmlBoxRecord(placeholderInput);
  await liveblocks.mutateStorage(roomId, ({ root }) => {
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
  options?: { preferredTargetShapeId?: string; placeholderShapeId?: string }
): Promise<Record<string, unknown>> {
  const liveblocks = getLiveblocks();

  if (call.name !== "create_box" && call.name !== "edit_box") {
    await setAgentPresence(roomId, { agentStatus: "thinking" });
    return { ok: false, error: "Unsupported tool" };
  }

  const input = call.input as BoxInput;
  const isEdit = call.name === "edit_box";
  const html = input.html;

  if (!isEdit && (typeof html !== "string" || html.trim().length === 0)) {
    return { ok: false, error: "create_box requires non-empty html." };
  }
  if (isEdit && (typeof input.targetShapeId !== "string" || input.targetShapeId.length === 0)) {
    return { ok: false, error: "edit_box requires targetShapeId." };
  }

  // create_box can reuse the placeholder via preferredTargetShapeId; edit_box
  // targets the shape the model chose.
  const targetId =
    (isEdit ? input.targetShapeId : undefined) ??
    options?.preferredTargetShapeId;

  const isPlaceholderFill = Boolean(
    targetId &&
      options?.placeholderShapeId &&
      targetId === options.placeholderShapeId
  );
  const hasGeometry =
    typeof input.x === "number" ||
    typeof input.y === "number" ||
    typeof input.w === "number" ||
    typeof input.h === "number";

  // As soon as we know the AI's dimensions, snap the placeholder to that size
  // (still showing the spinner) before writing the generated HTML.
  if (isPlaceholderFill && hasGeometry && targetId) {
    await resizePlaceholderToInput(roomId, targetId, input);
    await setAgentPresence(
      roomId,
      {
        cursor: boxCenter(getShapeBoundsFromInput(input)),
        selection: [targetId],
        agentStatus: "editing",
      },
      120
    );
  }

  let shapeId = "";
  await liveblocks.mutateStorage(roomId, ({ root }) => {
    const records = root.get("records");

    if (targetId) {
      const existing = records.get(targetId);
      if (
        existing &&
        typeof existing === "object" &&
        (existing as Record<string, unknown>).type === HTML_BOX_SHAPE_TYPE
      ) {
        const nextRecord = buildUpdatedBoxRecord(
          existing as Record<string, unknown>,
          input
        );
        records.set(targetId, nextRecord as unknown as StorageRecord);
        shapeId = targetId;
        return;
      }
    }

    // No usable target: create a new box (also the create_box default path).
    // No migration path in this demo for non-html-box targets.
    if (typeof html !== "string" || html.trim().length === 0) {
      return;
    }
    const shape = createHtmlBoxRecord({ ...input, html });
    records.set(
      shape.id,
      normalizeShapeLikeRecord(shape) as unknown as StorageRecord
    );
    shapeId = shape.id;
  });

  if (!shapeId) {
    return {
      ok: false,
      error: isEdit
        ? "edit_box could not resolve a target box and had no html to create one."
        : "Failed to create box.",
    };
  }

  if (typeof input.x === "number" && typeof input.y === "number") {
    await setAgentPresence(roomId, {
      cursor: { x: input.x, y: input.y },
      agentStatus: "editing",
    });
  }
  return {
    ok: true,
    id: shapeId,
    center: hasGeometry ? boxCenter(getShapeBoundsFromInput(input)) : undefined,
  };
}

export async function runAgent({
  roomId,
  userMessage,
  selectedShapeIds,
  selectedShapes,
  onProgress,
}: RunAgentParams) {
  const liveblocks = getLiveblocks();
  const storageDoc = await liveblocks.getStorageDocument(roomId, "json");

  // Decide create vs edit up front. If the user already has an html-box
  // selected, treat this as an edit turn and show NO placeholder; otherwise
  // create a placeholder spinner box for immediate feedback while generating.
  let editAnchor: BoxAnchor | null = null;
  for (const shape of selectedShapes) {
    const anchor = getSelectedBoxAnchor(shape);
    if (anchor) {
      editAnchor = anchor;
      break;
    }
  }

  const placeholder = editAnchor ? null : await createPlaceholderBox(roomId);
  const focusAnchor = placeholder ?? editAnchor;
  let focusCenter = focusAnchor ? boxCenter(focusAnchor) : { x: 400, y: 400 };
  const focusSelection = focusAnchor ? [focusAnchor.shapeId] : [];

  await setAgentPresence(roomId, {
    cursor: focusCenter,
    selection: focusSelection,
    agentStatus: "thinking",
  }, 120);
  await onProgress({
    text: placeholder ? "Starting generation..." : "Editing...",
    status: "thinking",
    isStreaming: true,
  });

  const contextSelectedShapeIds = placeholder
    ? Array.from(new Set([placeholder.shapeId, ...selectedShapeIds]))
    : selectedShapeIds;

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
    "When you call a tool, accompany it with a short note (1-3 sentences) explaining your design reasoning and decisions. This narration is shown to the user as your thought process.",
    "After you finish all edits, send a FINAL message with no tool call. This final message must be a single, very short confirmation sentence.",
    'Example final message: "Done! The CTA has been updated to an orange theme."',
    "Never make the final message longer than one short sentence, and do not restate your reasoning in it.",
    "",
    "<context>",
    JSON.stringify(
      {
        userMessage,
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
  let placeholderConsumed = false;
  let wobbleTick = 0;

  for (let step = 0; step < 4; step += 1) {
    wobbleTick += 1;
    await setAgentPresence(
      roomId,
      {
        cursor: withCursorWobble(focusCenter, wobbleTick),
        selection: focusSelection,
        agentStatus: "thinking",
      },
      120
    );

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      // XXX Anthropic's Tool type is stricter than our reusable schema literal.
      tools: AGENT_TOOLS as never,
      tool_choice: (step === 0
        ? { type: "any" }
        : { type: "auto" }) as never,
      messages: messages as never,
    });

    const text = getText(response.content);
    const calls = getToolCalls(response.content);

    if (text.trim().length > 0) {
      if (calls.length > 0) {
        // Text emitted alongside a tool call is the agent's reasoning/narration.
        reasoning = [reasoning, text].filter(Boolean).join("\n\n");
        await onProgress({
          reasoning,
          status: "thinking",
          isStreaming: true,
        });
      } else {
        // Text emitted with no tool call is the final short confirmation.
        lastAssistantText = text.trim();
      }
    }

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

      const result = await applyToolCall(roomId, call, {
        preferredTargetShapeId:
          placeholder && successfulToolCallCount === 0
            ? placeholder.shapeId
            : undefined,
        placeholderShapeId: placeholder?.shapeId,
      });
      // Follow the (possibly resized) box with the agent cursor.
      const resultCenter = (result as { center?: { x: number; y: number } })
        .center;
      if (resultCenter) {
        focusCenter = resultCenter;
      }
      wobbleTick += 1;
      await setAgentPresence(
        roomId,
        {
          cursor: withCursorWobble(focusCenter, wobbleTick),
          selection: focusSelection,
          agentStatus: "editing",
        },
        120
      );
      if (result.ok === true) {
        successfulToolCallCount += 1;
        if (placeholder && result.id === placeholder.shapeId) {
          placeholderConsumed = true;
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
      { preferredTargetShapeId: placeholder?.shapeId }
    );
    successfulToolCallCount = 1;
    if (placeholder && fallbackResult.id === placeholder.shapeId) {
      placeholderConsumed = true;
    }
    await onProgress({
      status: "editing",
      isStreaming: true,
    });
  }

  // If a placeholder was created but the agent edited a different box instead
  // of reusing it, the placeholder spinner would linger forever. Remove it.
  if (placeholder && !placeholderConsumed) {
    await deleteShapeFromStorage(roomId, placeholder.shapeId);
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

  await setAgentPresence(
    roomId,
    {
      cursor: null,
      selection: [],
      agentStatus: "idle",
    },
    2
  );

  return {
    text: finalText,
    reasoning,
  };
}
