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

export const RegisterAiKnowledge = memo(function RegisterAiKnowledge(
  props: AiKnowledgeSource & { knowledgeKey?: string }
) {
  const id = useId();
  const ai = useAi();
  const { description, value } = props;
  const rndKey = useRandom();
  const key = props.knowledgeKey ?? rndKey;

  const [layer, setLayer] = useState<
    ReturnType<typeof ai.registerKnowledgeLayer> | undefined
  >();

  // Executes at mount / unmount
  useEffect(() => {
    const layer = ai.registerKnowledgeLayer(id);
    setLayer(layer);
    return () => {
      ai.deregisterKnowledgeLayer(layer);
      setLayer(undefined);
    };
  }, [ai, id]);

  // Executes every render (if the props have changed)
  useEffect(() => {
    if (layer !== undefined) {
      ai.updateKnowledge(layer, { description, value }, key);
    }
  }, [ai, layer, key, description, value]);

  return null;
});
