import type { LayerKey } from "@liveblocks/core";
import { kInternal, nanoid } from "@liveblocks/core";
import { memo, useEffect, useId, useState } from "react";

import { useClient } from "./contexts";
import type { RegisterAiKnowledgeProps, RegisterAiToolProps } from "./types/ai";

function useAi() {
  return useClient()[kInternal].ai;
}

function useRandom() {
  return useState(nanoid)[0];
}

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
 * Or scoped to a specific chat:
 *
 *     <RegisterAiKnowledge
 *        description="The current list of todos"
 *        value={todos}
 *        chatId="chat-1234" />
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
  const { description, value, chatId } = props;

  const [layerKey, setLayerKey] = useState<LayerKey | undefined>();

  // Executes at mount / unmount
  useEffect(() => {
    const { layerKey, deregister } = ai.registerKnowledgeLayer(layerId, chatId);
    setLayerKey(layerKey);
    return () => {
      deregister();
      setLayerKey(undefined);
    };
  }, [ai, layerId, chatId]);

  // Executes every render (if the props have changed)
  const randomKey = useRandom();
  const knowledgeKey = props.id ?? randomKey;
  useEffect(() => {
    if (layerKey !== undefined) {
      ai.updateKnowledge(
        layerKey,
        { description, value },
        knowledgeKey,
        chatId
      );
    }
  }, [ai, layerKey, knowledgeKey, description, value, chatId]);

  return null;
});

/**
 * Make a tool available to your AI chat or a one-off request.
 * A tool is a piece of functionality that the AI can call to perform an action
 * or look up information on the user's behalf.
 *
 * Also, tools are used to render custom UIs for tool invocations, which are
 * embedded inside the AI chat.
 *
 * For example:
 *
 *   <RegisterAiTool
 *     name="list-todos"
 *     tool={defineAiTool()({ ... })}
 *     />
 *
 * Or scoped to a specific chat:
 *
 *   <RegisterAiTool
 *     name="list-todos"
 *     tool={defineAiTool()({ ... })}
 *     chatId="chat-1234"
 *     />
 *
 * By mounting this component, the tool is made available.
 * By unmounting this component, the tool will no longer be available.
 */
export const RegisterAiTool = memo(function RegisterAiTool({
  chatId,
  name,
  tool,
  enabled,
}: RegisterAiToolProps) {
  // Register the provided tools to the chat on mount and unregister them on unmount
  const client = useClient();
  const ai = client[kInternal].ai;
  useEffect(() => {
    // The `enabled` prop, when specified, will take precedence over the
    // `enabled` property of the tool itself. This allows enabling or disabling
    // the tool dynamically.
    const toolWithEnabled = enabled !== undefined ? { ...tool, enabled } : tool;
    return ai.registerTool(name, toolWithEnabled, chatId);
  }, [ai, chatId, name, tool, enabled]);

  return null;
});
