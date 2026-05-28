import Anthropic from "@anthropic-ai/sdk";
import type { LiveMap } from "@liveblocks/client";
import { AI_USER } from "@/database";
import { getLiveblocks } from "@/lib/liveblocksServer";
import { AGENT_TOOLS, type AgentStatus, type AgentToolInputMap } from "./tools";

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

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function createGeoShapeRecord(input: AgentToolInputMap["create_shape"]) {
  const width = typeof input.w === "number" ? input.w : 320;
  const height = typeof input.h === "number" ? input.h : 180;
  const labelText =
    typeof input.props?.label === "string" ? input.props.label : "";

  return {
    id: `shape:${crypto.randomUUID()}`,
    typeName: "shape",
    type: "geo",
    x: input.x,
    y: input.y,
    rotation: 0,
    isLocked: false,
    opacity: 1,
    parentId: "page:page",
    index: `a${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`,
    props: {
      geo: "rectangle",
      w: width,
      h: height,
      color: "black",
      labelColor: "black",
      fill: "none",
      dash: "draw",
      size: "m",
      font: "draw",
      align: "middle",
      verticalAlign: "middle",
      growY: 0,
      url: "",
      labelText,
    },
    meta: {},
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

async function applyToolCall(
  roomId: string,
  call: ToolUseCall
): Promise<Record<string, unknown>> {
  const liveblocks = getLiveblocks();
  switch (call.name) {
    case "create_shape": {
      const input = call.input as AgentToolInputMap["create_shape"];
      const shape = createGeoShapeRecord(input);
      await liveblocks.mutateStorage(roomId, ({ root }) => {
        // XXX tldraw records are stored as JSON-like values in Liveblocks Storage.
        root.get("records").set(shape.id, shape as unknown as StorageRecord);
      });
      return { ok: true, id: shape.id };
    }

    case "update_shape": {
      const input = call.input as AgentToolInputMap["update_shape"];
      await liveblocks.mutateStorage(roomId, ({ root }) => {
        const records = root.get("records");
        const existing = records.get(input.id);
        if (!existing || typeof existing !== "object") {
          return;
        }
        const patchObject =
          input.patch && typeof input.patch === "object" ? input.patch : {};
        const existingObject = existing as Record<string, unknown>;
        const nextRecord = {
          ...existingObject,
          ...patchObject,
          props: {
            ...(typeof existingObject.props === "object" &&
            existingObject.props !== null
              ? (existingObject.props as Record<string, unknown>)
              : {}),
            ...(typeof patchObject.props === "object" && patchObject.props !== null
              ? (patchObject.props as Record<string, unknown>)
              : {}),
          },
        };
        records.set(input.id, nextRecord as unknown as StorageRecord);
      });
      return { ok: true, id: input.id };
    }

    case "delete_shape": {
      const input = call.input as AgentToolInputMap["delete_shape"];
      await liveblocks.mutateStorage(roomId, ({ root }) => {
        root.get("records").delete(input.id);
      });
      return { ok: true, id: input.id };
    }

    case "select": {
      const input = call.input as AgentToolInputMap["select"];
      await setAgentPresence(roomId, {
        selection: input.ids,
        agentStatus: "editing",
      });
      return { ok: true };
    }

    case "move_cursor": {
      const input = call.input as AgentToolInputMap["move_cursor"];
      await setAgentPresence(roomId, {
        cursor: { x: input.x, y: input.y },
        agentStatus: "editing",
      });
      return { ok: true };
    }

    case "set_status": {
      const input = call.input as AgentToolInputMap["set_status"];
      await setAgentPresence(roomId, {
        agentStatus: input.status,
      });
      return { ok: true };
    }

    case "finish": {
      const input = call.input as AgentToolInputMap["finish"];
      return { ok: true, message: input.message };
    }

    default:
      return { ok: false, error: "Unsupported tool" };
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

  await setAgentPresence(roomId, {
    selection: selectedShapeIds,
    agentStatus: "thinking",
  });
  await onProgress({ status: "thinking", isStreaming: true });

  const prompt = [
    "You are the canvas agent for a collaborative tldraw workspace.",
    "Use tools to edit the canvas records in Liveblocks storage.",
    "Always call set_status before editing and finish when done.",
    "",
    "<context>",
    JSON.stringify(
      {
        userMessage,
        selectedShapeIds,
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
  let finishedMessage = "";

  for (let step = 0; step < 4; step += 1) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1400,
      // XXX Anthropic's Tool type is stricter than our reusable schema literal.
      tools: AGENT_TOOLS as never,
      messages: messages as never,
    });

    const text = getText(response.content);
    if (text.trim().length > 0) {
      lastAssistantText = text;
      reasoning = [reasoning, text].filter(Boolean).join("\n\n");
      await onProgress({
        reasoning,
        text: finishedMessage || lastAssistantText,
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

      const result = await applyToolCall(roomId, call);
      if (call.name === "finish" && typeof result.message === "string") {
        finishedMessage = result.message;
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

  const finalText = finishedMessage || lastAssistantText || "Done.";

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
