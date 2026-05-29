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

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function createHtmlBoxRecord(input: AgentToolInputMap["html_canvas_box"]) {
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

function inferShortTitle(userMessage: string) {
  const cleaned = userMessage
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalizeBoxTitle(cleaned, "New Design");
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

function createFallbackResponsiveHtml(userMessage: string) {
  const prompt = userMessage.trim() || "Landing page";
  return `\
<section style="padding:24px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
  <div style="max-width:960px;margin:0 auto">
    <h1 style="font-size:clamp(1.5rem,4vw,2.5rem);line-height:1.15;margin:0 0 12px">Generated concept</h1>
    <p style="font-size:clamp(1rem,2vw,1.125rem);color:#444;margin:0 0 20px">${prompt.replace(
      /</g,
      "&lt;"
    )}</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
      <article style="border:1px solid #ddd;border-radius:12px;padding:16px">
        <h2 style="font-size:1rem;margin:0 0 8px">Feature one</h2>
        <p style="margin:0;color:#555">Responsive card layout for quick iteration.</p>
      </article>
      <article style="border:1px solid #ddd;border-radius:12px;padding:16px">
        <h2 style="font-size:1rem;margin:0 0 8px">Feature two</h2>
        <p style="margin:0;color:#555">Edit this HTML from the right-side drawer.</p>
      </article>
    </div>
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

function getShapeBoundsFromInput(input: AgentToolInputMap["html_canvas_box"]) {
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

async function createPlaceholderBox(roomId: string): Promise<BoxAnchor> {
  const liveblocks = getLiveblocks();
  const placeholderInput: AgentToolInputMap["html_canvas_box"] = {
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
  options?: { preferredTargetShapeId?: string }
): Promise<Record<string, unknown>> {
  const liveblocks = getLiveblocks();
  switch (call.name) {
    case "html_canvas_box": {
      const input = call.input as AgentToolInputMap["html_canvas_box"];
      const inputTitle = normalizeBoxTitle(input.title ?? "", "New Design");
      const html = input.html;
      if (typeof html !== "string" || html.trim().length === 0) {
        return { ok: false, error: "Tool input html must be a non-empty string." };
      }

      let shapeId = "";
      await liveblocks.mutateStorage(roomId, ({ root }) => {
        const records = root.get("records");
        const existingId = input.targetShapeId ?? options?.preferredTargetShapeId;

        if (existingId) {
          const existing = records.get(existingId);
          if (existing && typeof existing === "object") {
            const existingRecord = existing as Record<string, unknown>;
            if (existingRecord.type !== HTML_BOX_SHAPE_TYPE) {
              // No migration path in this demo: only update existing html-box shapes.
              const shape = createHtmlBoxRecord(input);
              records.set(
                shape.id,
                normalizeShapeLikeRecord(shape) as unknown as StorageRecord
              );
              shapeId = shape.id;
              return;
            }
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
                ? inputTitle
                : existingTitle;

            const nextRecord = normalizeShapeLikeRecord({
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

            records.set(
              existingId,
              normalizeShapeLikeRecord(nextRecord) as unknown as StorageRecord
            );
            shapeId = existingId;
            return;
          }
        }

        const shape = createHtmlBoxRecord(input);
        records.set(
          shape.id,
          normalizeShapeLikeRecord(shape) as unknown as StorageRecord
        );
        shapeId = shape.id;
      });
      if (typeof input.x === "number" && typeof input.y === "number") {
        await setAgentPresence(roomId, {
          cursor: { x: input.x, y: input.y },
          agentStatus: "editing",
        });
      }
      return { ok: true, id: shapeId };
    }

    default: {
      await setAgentPresence(roomId, {
        agentStatus: "thinking",
      });
      return { ok: false, error: "Unsupported tool" };
    }
  }
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
  const placeholder = await createPlaceholderBox(roomId);
  const placeholderCenter = boxCenter(placeholder);

  await setAgentPresence(roomId, {
    cursor: placeholderCenter,
    selection: [placeholder.shapeId],
    agentStatus: "thinking",
  }, 120);
  await onProgress({
    text: "Starting generation...",
    status: "thinking",
    isStreaming: true,
  });

  const selectedShapeIdsWithPlaceholder = Array.from(
    new Set([placeholder.shapeId, ...selectedShapeIds])
  );

  const prompt = [
    "You are the canvas AI for a collaborative design workspace.",
    "You have exactly one tool: html_canvas_box.",
    "Do not call any other tools.",
    "Use html_canvas_box to create/update design boxes with generated HTML for websites/apps.",
    "Always provide a short title of 1-3 words in the tool call title field.",
    "Generate responsive HTML/CSS by default (mobile-first layout, fluid widths, and sensible breakpoints).",
    "When the user asks to edit an existing selected box, set targetShapeId to one of selectedShapeIds.",
    "",
    "<context>",
    JSON.stringify(
      {
        userMessage,
        selectedShapeIds: selectedShapeIdsWithPlaceholder,
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
        cursor: withCursorWobble(placeholderCenter, wobbleTick),
        selection: [placeholder.shapeId],
        agentStatus: "thinking",
      },
      120
    );

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1400,
      // XXX Anthropic's Tool type is stricter than our reusable schema literal.
      tools: AGENT_TOOLS as never,
      tool_choice: (step === 0
        ? { type: "any" }
        : { type: "auto" }) as never,
      messages: messages as never,
    });

    const text = getText(response.content);
    if (text.trim().length > 0) {
      lastAssistantText = text;
      reasoning = [reasoning, text].filter(Boolean).join("\n\n");
      await onProgress({
        reasoning,
        text: lastAssistantText,
        status: "thinking",
        isStreaming: true,
      });
    }

    const calls = getToolCalls(response.content);
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
          successfulToolCallCount === 0 ? placeholder.shapeId : undefined,
      });
      wobbleTick += 1;
      await setAgentPresence(
        roomId,
        {
          cursor: withCursorWobble(placeholderCenter, wobbleTick),
          selection: [placeholder.shapeId],
          agentStatus: "editing",
        },
        120
      );
      if (result.ok === true) {
        successfulToolCallCount += 1;
        if (result.id === placeholder.shapeId) {
          placeholderConsumed = true;
        }
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

  if (successfulToolCallCount === 0) {
    const html = createFallbackResponsiveHtml(userMessage);
    await applyToolCall(roomId, {
      id: `fallback-${crypto.randomUUID()}`,
      name: "html_canvas_box",
      input: {
        targetShapeId: placeholder.shapeId,
        title: inferShortTitle(userMessage),
        html,
      },
    }, { preferredTargetShapeId: placeholder.shapeId });
    successfulToolCallCount = 1;
    placeholderConsumed = true;
    await onProgress({
      status: "editing",
      isStreaming: true,
    });
  }

  // If the agent edited an existing box instead of reusing the placeholder,
  // the placeholder spinner would otherwise linger forever. Remove it.
  if (!placeholderConsumed) {
    await deleteShapeFromStorage(roomId, placeholder.shapeId);
  }

  const finalText =
    lastAssistantText ||
    (successfulToolCallCount > 0
      ? "Added an HTML box to the canvas. Open the HTML tool to inspect or edit the code."
      : "I couldn't generate a box this turn. Please try again.");

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
