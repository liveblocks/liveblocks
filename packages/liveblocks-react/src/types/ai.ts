import type {
  AiAssistantContentPart,
  AiKnowledgeSource,
  AiOpaqueToolDefinition,
  Relax,
} from "@liveblocks/core";

export type RegisterAiKnowledgeProps = AiKnowledgeSource & {
  /**
   * An optional unique key for this knowledge source. If multiple components
   * register knowledge under the same key, the last one to mount takes
   * precedence.
   */
  id?: string;

  /**
   * When provided, the knowledge source will only be available for this chatId.
   * If not provided, this knowledge source will be available globally.
   */
  chatId?: string;
};

export type RegisterAiToolProps = {
  name: string;
  tool: AiOpaqueToolDefinition;

  /**
   * When provided, the tool will only be available for this chatId. If not
   * provided, this tool will be available globally.
   */
  chatId?: string;

  /**
   * Whether this tool should be enabled. When set to `false`, the tool will
   * not be made available to the AI copilot for any new/future chat messages,
   * but will still allow existing tool invocations to be rendered that are
   * part of the historic chat record. Defaults to true.
   */
  enabled?: boolean;
};

/**
 * Simplified status for the requested chat.
 * This hook offers a convenient way to update the UI while an AI chat
 * generation is in progress.
 */
export type AiChatStatus = Relax<
  | { status: "disconnected" } // WebSocket connection is disconnected
  | { status: "loading" }
  | { status: "idle" }
  | { status: "generating" } // Still generating, but there is no content yet
  | {
      status: "generating";
      partType: Exclude<AiAssistantContentPart["type"], "tool-invocation">;
    }
  | { status: "generating"; partType: "tool-invocation"; toolName: string }
>;
