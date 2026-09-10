"use client";

import {
  useCreateFeed,
  useCreateFeedMessage,
  useFeedMessages,
} from "@liveblocks/react";
import { ArrowUp, Plus, SquareDashedMousePointer, X } from "lucide-react";
import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useValue, type Editor, type TLShape } from "tldraw";
import { getFeedId } from "@/lib/room";
import { getHtmlBoxDataFromShapeLike } from "@/lib/htmlBox";
import {
  agentStatusLabel,
  colorFromName,
  randomAgentName,
} from "@/lib/agentName";
import { Markdown } from "@liveblocks/react-ui/_private";

type AssistantMessageData = {
  role: "assistant";
  agentName?: string;
  text: string;
  reasoning: string;
  status: "thinking" | "editing" | "idle";
  isStreaming: boolean;
};

function isAssistantMessageData(value: unknown): value is AssistantMessageData {
  if (!value || typeof value !== "object") {
    return false;
  }
  const data = value as Record<string, unknown>;
  return data.role === "assistant";
}

type UserMessageData = {
  role: "user";
  text: string;
  selectedShapeNames?: string[];
};

function isUserMessageData(value: unknown): value is UserMessageData {
  if (!value || typeof value !== "object") {
    return false;
  }
  const data = value as Record<string, unknown>;
  return data.role === "user" && typeof data.text === "string";
}

function selectedShapeSummary(shape: TLShape) {
  const htmlBox = getHtmlBoxDataFromShapeLike(shape);
  if (htmlBox && htmlBox.title.trim().length > 0) {
    return htmlBox.title;
  }
  if (shape.type === "text") {
    const textValue =
      "text" in shape.props
        ? shape.props.text
        : "richText" in shape.props
          ? shape.props.richText
          : null;
    if (typeof textValue === "string" && textValue.trim().length > 0) {
      return textValue;
    }
    return "Text";
  }
  if (shape.type === "geo" && "geo" in shape.props) {
    switch (shape.props.geo) {
      case "rectangle":
        return "Rectangle";
      case "ellipse":
        return "Circle";
      case "triangle":
        return "Triangle";
      case "diamond":
        return "Diamond";
      case "cloud":
        return "Cloud";
      default:
        return "Shape";
    }
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
  const baseFeedId = getFeedId(fileId);
  const createFeed = useCreateFeed();
  const createFeedMessage = useCreateFeedMessage();
  const [activeFeedId, setActiveFeedId] = useState(baseFeedId);
  const { messages, isLoading, error } = useFeedMessages(activeFeedId);
  const [input, setInput] = useState("");
  const badgeAreaRef = useRef<HTMLDivElement | null>(null);
  const [badgeAreaHeight, setBadgeAreaHeight] = useState(0);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) {
      return;
    }
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    void createFeed(activeFeedId, {
      metadata: {
        kind: "ai-canvas",
      },
    }).catch(() => {
      // Feed may already exist.
    });
  }, [activeFeedId, createFeed]);

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
    const selectedShapeNames = selectedShapes.map((shape) =>
      selectedShapeSummary(shape)
    );
    const agentName = randomAgentName();

    // Send the existing chat (oldest first) so the agent can resolve references
    // to earlier requests. The new message is sent separately as userMessage.
    const history = (messages ?? [])
      .map((message) => {
        const data = message.data;
        if (isUserMessageData(data)) {
          return { role: "user" as const, text: data.text };
        }
        if (isAssistantMessageData(data) && data.text.trim().length > 0) {
          return { role: "assistant" as const, text: data.text };
        }
        return null;
      })
      .filter(
        (entry): entry is { role: "user" | "assistant"; text: string } =>
          entry !== null
      )
      .slice(-40);

    setInput("");

    await createFeedMessage(activeFeedId, {
      role: "user",
      text,
      selectedShapeIds,
      selectedShapeNames,
    });

    // Fire and forget so another agent can be triggered while this one runs.
    void fetch("/api/copilot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roomId,
        feedId: activeFeedId,
        userMessage: text,
        agentName,
        history,
        context: {
          roomId,
          selectedShapeIds,
          selectedShapes: selectedShapeContext,
        },
      }),
    }).catch(() => {
      // The assistant feed message surfaces failures.
    });
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }
    event.preventDefault();
    const form = event.currentTarget.form;
    if (!form) {
      return;
    }
    if (input.trim().length === 0) {
      return;
    }
    form.requestSubmit();
  }

  async function onNewChat() {
    const nextFeedId = `${baseFeedId}-${Date.now().toString(36)}`;
    await createFeed(nextFeedId, {
      metadata: {
        kind: "ai-canvas",
      },
    }).catch(() => {
      // Feed may already exist.
    });
    setActiveFeedId(nextFeedId);
    setInput("");
  }

  useEffect(() => {
    if (!badgeAreaRef.current) {
      setBadgeAreaHeight(0);
      return;
    }

    const el = badgeAreaRef.current;
    const updateHeight = () => setBadgeAreaHeight(el.offsetHeight);
    updateHeight();

    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, [selectedShapes]);

  const composerPaddingTop =
    selectedShapes.length > 0 ? badgeAreaHeight + 14 : 12;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-neutral-200 bg-white px-3 py-2">
        <button
          type="button"
          onClick={onNewChat}
          className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <Plus size={12} />
          New chat
        </button>
      </div>
      <div
        ref={messagesScrollRef}
        className="min-h-0 flex-1 overflow-y-auto p-3 agent-scrollbar space-y-2 text-sm"
      >
        {isLoading ? (
          <p className="text-sm text-neutral-500">Loading feed…</p>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error.message}</p> : null}

        {messages?.map((message) => {
          if (isUserMessageData(message.data)) {
            const contextNames = message.data.selectedShapeNames ?? [];
            return (
              <div key={message.id} className="flex flex-col items-end gap-1">
                <div className="w-full rounded-lg bg-neutral-50 px-3 py-2 border border-neutral-200">
                  {contextNames.length > 0 ? (
                    <div className="flex max-w-full flex-wrap justify-start gap-1.5 -ml-1.5 mb-1">
                      {contextNames.map((name, index) => (
                        <span
                          key={`${message.id}-context-${index}`}
                          className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
                        >
                          <SquareDashedMousePointer size={12} />
                          {name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {message.data.text}
                </div>
              </div>
            );
          }

          if (isAssistantMessageData(message.data)) {
            const data = message.data;
            const running = data.status !== "idle";
            const statusLabel = agentStatusLabel(data.status);
            const agentColor = data.agentName
              ? colorFromName(data.agentName)
              : undefined;
            return (
              <div key={message.id} className="flex justify-start">
                <div className="agent-message max-w-[95%] rounded-lg px-3 py-2 text-neutral-800">
                  {data.agentName ? (
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-medium">
                      <span style={{ color: agentColor }}>
                        {data.agentName}
                      </span>
                      {running && statusLabel ? (
                        <span className="font-normal text-neutral-400">
                          · {statusLabel}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  {data.reasoning ? (
                    <details>
                      <summary className="cursor-pointer text-xs text-neutral-500 my-1">
                        <span className="ml-0.5">Thought process</span>
                      </summary>
                      <pre className="mt-1 rounded-sm bg-neutral-100 px-2 py-1 text-xs text-neutral-600">
                        {data.reasoning}
                      </pre>
                    </details>
                  ) : null}
                  {data.text ? (
                    <div className="mt-1 whitespace-pre-wrap">
                      <Markdown content={data.text} />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>

      <form
        onSubmit={onSubmit}
        className="border-t border-neutral-200 bg-white p-3"
      >
        <div className="relative">
          {selectedShapes.length > 0 ? (
            <div
              ref={badgeAreaRef}
              className="pointer-events-none absolute left-2 top-2 z-10 flex max-w-[75%] flex-wrap gap-1.5"
            >
              {selectedShapes.map((shape) => (
                <span
                  key={shape.id}
                  className="pointer-events-auto inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-xs text-blue-700"
                >
                  <SquareDashedMousePointer size={12} />
                  {selectedShapeSummary(shape)}
                  <button
                    type="button"
                    onClick={() => {
                      if (!editor) {
                        return;
                      }
                      const nextIds = selectedShapeIds.filter(
                        (id) => id !== shape.id
                      );
                      if (nextIds.length === 0) {
                        editor.selectNone();
                      } else {
                        editor.setSelectedShapes(nextIds);
                      }
                    }}
                    className="rounded-sm hover:bg-blue-50"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onComposerKeyDown}
            placeholder="Ask the agent to modify the canvas…"
            className="h-24 w-full resize-none rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 pr-28 text-xs outline-none placeholder:text-xs focus:border-sky-400"
            style={{ paddingTop: `${composerPaddingTop}px` }}
          />
          <button
            type="submit"
            disabled={input.trim().length === 0}
            className="absolute bottom-4 right-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-sky-700 bg-sky-700 text-white hover:bg-sky-600 disabled:opacity-50"
            aria-label="Send"
          >
            <ArrowUp size={12} />
          </button>
        </div>
      </form>
    </div>
  );
}
