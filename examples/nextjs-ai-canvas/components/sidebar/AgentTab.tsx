"use client";

import {
  useCreateFeed,
  useCreateFeedMessage,
  useFeedMessages,
} from "@liveblocks/react";
import { Sparkles, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useValue, type Editor, type TLShape } from "tldraw";
import { getFeedId } from "@/lib/room";

type AssistantMessageData = {
  role: "assistant";
  text: string;
  reasoning: string;
  status: "thinking" | "editing" | "idle";
  isStreaming: boolean;
};

function isAssistantMessageData(
  value: unknown
): value is AssistantMessageData {
  if (!value || typeof value !== "object") {
    return false;
  }
  const data = value as Record<string, unknown>;
  return data.role === "assistant";
}

function isUserMessageData(
  value: unknown
): value is { role: "user"; text: string } {
  if (!value || typeof value !== "object") {
    return false;
  }
  const data = value as Record<string, unknown>;
  return data.role === "user" && typeof data.text === "string";
}

function selectedShapeSummary(shape: TLShape) {
  if (shape.type === "text") {
    const textValue =
      "text" in shape.props ? shape.props.text : "richText" in shape.props ? shape.props.richText : null;
    if (typeof textValue === "string" && textValue.trim().length > 0) {
      return textValue;
    }
    return "Text";
  }
  if (
    shape.type === "geo" &&
    "labelText" in shape.props &&
    typeof shape.props.labelText === "string" &&
    shape.props.labelText.trim().length > 0
  ) {
    return shape.props.labelText;
  }
  return shape.type;
}

export function AgentTab({
  fileId,
  roomId,
  editor,
}: {
  fileId: string;
  roomId: string;
  editor: Editor | null;
}) {
  const feedId = getFeedId(fileId);
  const createFeed = useCreateFeed();
  const createFeedMessage = useCreateFeedMessage();
  const { messages, isLoading, error } = useFeedMessages(feedId);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    void createFeed(feedId, {
      metadata: {
        kind: "ai-canvas",
      },
    }).catch(() => {
      // Feed may already exist.
    });
  }, [createFeed, feedId]);

  const selectedShapes = useValue(
    "agent-selected-shapes",
    () => editor?.getSelectedShapes() ?? [],
    [editor]
  );

  const selectedShapeIds = useMemo(
    () => selectedShapes.map((shape) => shape.id),
    [selectedShapes]
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || !editor) {
      return;
    }

    const selectedShapeContext = selectedShapes.map((shape) => ({
      id: shape.id,
      type: shape.type,
      x: shape.x,
      y: shape.y,
      props: shape.props,
    }));

    setIsSending(true);
    setInput("");

    await createFeedMessage(feedId, {
      role: "user",
      text,
      selectedShapeIds,
    });

    await fetch("/api/copilot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roomId,
        feedId,
        userMessage: text,
        context: {
          roomId,
          selectedShapeIds,
          selectedShapes: selectedShapeContext,
        },
      }),
    });

    setIsSending(false);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-neutral-200 px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          Selection context
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedShapes.length === 0 ? (
            <span className="text-xs text-neutral-400">
              Select a shape to send focused instructions.
            </span>
          ) : null}
          {selectedShapes.map((shape) => (
            <span
              key={shape.id}
              className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs text-violet-700"
            >
              {selectedShapeSummary(shape)}
              <button
                type="button"
                onClick={() => {
                  if (!editor) {
                    return;
                  }
                  const nextIds = selectedShapeIds.filter((id) => id !== shape.id);
                  if (nextIds.length === 0) {
                    editor.selectNone();
                  } else {
                    editor.setSelectedShapes(nextIds);
                  }
                }}
                className="rounded-full hover:bg-violet-200"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 agent-scrollbar space-y-2">
        {isLoading ? (
          <p className="text-sm text-neutral-500">Loading feed…</p>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error.message}</p> : null}

        {messages?.map((message) => {
          if (isUserMessageData(message.data)) {
            return (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[90%] rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white">
                  {message.data.text}
                </div>
              </div>
            );
          }

          if (isAssistantMessageData(message.data)) {
            return (
              <div key={message.id} className="flex justify-start">
                <div className="agent-message max-w-[95%] rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-violet-600">
                    <Sparkles size={14} />
                    Canvas Agent · {message.data.status}
                  </div>
                  {message.data.reasoning ? (
                    <details open={message.data.isStreaming}>
                      <summary className="cursor-pointer text-xs text-neutral-500">
                        Thought process
                      </summary>
                      <pre className="mt-1 rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-600">
                        {message.data.reasoning}
                      </pre>
                    </details>
                  ) : null}
                  <p className="mt-2 whitespace-pre-wrap">{message.data.text}</p>
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>

      <form onSubmit={onSubmit} className="border-t border-neutral-200 p-3">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask the agent to modify the canvas…"
          className="h-20 w-full resize-none rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400"
        />
        <button
          type="submit"
          disabled={isSending || input.trim().length === 0}
          className="mt-2 w-full rounded-xl bg-violet-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isSending ? "Sending…" : "Send to agent"}
        </button>
      </form>
    </div>
  );
}
