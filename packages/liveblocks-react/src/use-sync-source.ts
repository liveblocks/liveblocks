import type { SyncSource } from "@liveblocks/core";
import { kInternal } from "@liveblocks/core";
import React from "react";

import { useClient } from "./liveblocks";

/**
 * @private For internal use only. Do not rely on this hook.
 */
export function useSyncSource(): SyncSource {
  const client = useClient();
  const syncSource = React.useMemo(
    () => client[kInternal].createSyncSource(),
    [client]
  );

  React.useEffect(() => {
    return () => syncSource.destroy();
  }, [syncSource]);

  return syncSource;
}
