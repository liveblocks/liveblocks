import type { AiKnowledgeSource } from "@liveblocks/core";
import { kInternal, nanoid } from "@liveblocks/core";
import { memo, useEffect, useId, useState } from "react";

import { useClient } from "./liveblocks";

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
 *     <RegisterAiKnowledge
 *        description="The current list of todos"
 *        value={todos} />
 *
 * By mounting this component, the AI will get access to this knwoledge.
 * By unmounting this component, the AI will no longer have access to it.
 * It can choose to use or ignore this knowledge in its responses.
 */
export const RegisterAiKnowledge = memo(function RegisterAiKnowledge(
  props: AiKnowledgeSource & {
    /**
     * An optional unique key for this knowledge source. If multiple components
     * register knowledge under the same key, the last one to mount takes
     * precedence.
     */
    id?: string;
  }
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
