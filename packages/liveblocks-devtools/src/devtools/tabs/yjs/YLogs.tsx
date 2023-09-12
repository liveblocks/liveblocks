import { useMemo } from "react";
import { ContentString, GC, Item } from "yjs";

import { createTreeFromYUpdates, YLogsTree } from "../../components/Tree";
import { useYUpdates } from "../../contexts/CurrentRoom";
import ContentDeleted from "./yflow/ContentDeleted";

export function YLogs() {
  const updates = useYUpdates();
  const tree = useMemo(() => createTreeFromYUpdates(updates), [updates]);

  return (
    <div className="absolute inset-0">
      <YLogsTree data={tree} />
    </div>
  );
}
