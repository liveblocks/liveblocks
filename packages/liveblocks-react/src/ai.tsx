import type {
  AiKnowledgeSource,
  AiOpaqueToolDefinition,
} from "@liveblocks/core";
import { kInternal, nanoid } from "@liveblocks/core";
import { memo, useEffect, useId, useState } from "react";

import { useClient } from "./contexts";

function useAi() {
  return useClient()[kInternal].ai;
}

function useRandom() {
  return useState(nanoid)[0];
}

export type RegisterAiKnowledgeProps = AiKnowledgeSource & {
  /**
   * An optional unique key for this knowledge source. If multiple components
   * register knowledge under the same key, the last one to mount takes
   * precedence.
   */
  id?: string;
};

/**
 * Make knowledge about your application state available to any AI used in
 * a chat or a one-off request.
 *
 * For example:
 *
 *     <RegisterAiKnowledge
 *        description="The current mode of my application"
 *        value="dark" />
 *
 *     <RegisterAiKnowledge
 *        description="The current list of todos"
 *        value={todos} />
 *
 * By mounting this component, the AI will get access to this knwoledge.
 * By unmounting this component, the AI will no longer have access to it.
 * It can choose to use or ignore this knowledge in its responses.
 */
export const RegisterAiKnowledge = memo(function RegisterAiKnowledge(
  props: RegisterAiKnowledgeProps
) {
  const layerId = useId();
  const ai = useAi();
  const { description, value } = props;

  const [layerKey, setLayerKey] = useState<
    ReturnType<typeof ai.registerKnowledgeLayer> | undefined
  >();

  // Executes at mount / unmount
  useEffect(() => {
    const layerKey = ai.registerKnowledgeLayer(layerId);
    setLayerKey(layerKey);
    return () => {
      ai.deregisterKnowledgeLayer(layerKey);
      setLayerKey(undefined);
    };
  }, [ai, layerId]);

  // Executes every render (if the props have changed)
  const randomKey = useRandom();
  const knowledgeKey = props.id ?? randomKey;
  useEffect(() => {
    if (layerKey !== undefined) {
      ai.updateKnowledge(layerKey, { description, value }, knowledgeKey);
    }
  }, [ai, layerKey, knowledgeKey, description, value]);

  return null;
});

export type RegisterAiToolProps = {
  name: string;
  tool: AiOpaqueToolDefinition;

  // XXX Remove this chatId prop?
  chatId: string;
};

export const RegisterAiTool = memo(function RegisterAiTool({
  chatId,
  name,
  tool,
}: RegisterAiToolProps) {
  // Register the provided tools to the chat on mount and unregister them on unmount
  const client = useClient();
  const ai = client[kInternal].ai;
  useEffect(() => {
    ai.registerTool(chatId, name, tool);
    return () => {
      ai.unregisterTool(chatId, name);
    };
  }, [ai, chatId, name, tool]);

  return null;
});
