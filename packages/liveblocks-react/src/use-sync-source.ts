import type { SyncSource } from "@liveblocks/core";
import { kInternal } from "@liveblocks/core";
import { useEffect, useState } from "react";

import { useClient } from "./liveblocks";

/**
 * @private For internal use only. Do not rely on this hook.
 */
export function useSyncSource(): SyncSource | undefined {
  const client = useClient();
  const createSyncSource = client[kInternal].createSyncSource;
  const [syncSource, setSyncSource] = useState<SyncSource | undefined>();

  useEffect(() => {
    // Create new sync source on mount
    const newSyncSource = createSyncSource();
    setSyncSource(newSyncSource);
    return () => newSyncSource.destroy();
  }, [createSyncSource]);

  return syncSource;
}
