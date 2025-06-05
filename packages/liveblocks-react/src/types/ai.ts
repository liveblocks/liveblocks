import type {
  AiKnowledgeSource,
  AiOpaqueToolDefinition,
} from "@liveblocks/core";

export type RegisterAiKnowledgeProps = AiKnowledgeSource & {
  /**
   * An optional unique key for this knowledge source. If multiple components
   * register knowledge under the same key, the last one to mount takes
   * precedence.
   */
  id?: string;
};

export type RegisterAiToolProps = {
  name: string;
  tool: AiOpaqueToolDefinition;

  /**
   * When provided, the tool will only be available for this chatId. If not
   * provided, this tool will globally be made available to any AiChat
   * instance.
   */
  chatId?: string;
};
