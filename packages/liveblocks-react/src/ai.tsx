import type { AiKnowledgeSource } from "@liveblocks/core";
import { kInternal, nanoid } from "@liveblocks/core";
import { memo, useEffect, useId, useState } from "react";

import { useClient } from "./liveblocks";

function useAi() {
  return useClient()[kInternal].ai;
}

export const RegisterAiKnowledge = memo(function RegisterAiKnowledge(
  props: AiKnowledgeSource & { knowledgeKey?: string }
) {
  const id = useId();
  const ai = useAi();
  const { description, value } = props;
  const rndKey = useState(nanoid)[0];
  const key = props.knowledgeKey ?? rndKey;

  const [layer, setLayer] = useState<
    ReturnType<typeof ai.registerKnowledgeLayer> | undefined
  >();

  useEffect(() => {
    const layer = ai.registerKnowledgeLayer(id);
    setLayer(layer);
    return () => {
      ai.deregisterKnowledgeLayer(layer);
      setLayer(undefined);
    };
  }, [ai, id]);

  useEffect(() => {
    if (layer !== undefined) {
      ai.updateKnowledge(layer, { description, value }, key);
    }
  }, [ai, layer, key, description, value]);

  return null;
});
