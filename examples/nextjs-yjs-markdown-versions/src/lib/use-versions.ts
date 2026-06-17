import { useEffect, useState } from "react";
import * as Y from "yjs";

import { getVersionsArray, readVersions, type VersionInfo } from "./yjs-versions";

/**
 * Subscribes to the document's `Y.Array<VersionInfo>` and returns the current
 * snapshot. Re-renders whenever versions are added, removed or relabeled.
 */
export function useVersions(doc: Y.Doc | null): VersionInfo[] {
  const [versions, setVersions] = useState<VersionInfo[]>(() =>
    doc ? readVersions(doc) : []
  );

  useEffect(() => {
    if (!doc) return;
    const arr = getVersionsArray(doc);
    const update = () => setVersions(arr.toArray());
    arr.observe(update);
    update();
    return () => arr.unobserve(update);
  }, [doc]);

  return versions;
}
