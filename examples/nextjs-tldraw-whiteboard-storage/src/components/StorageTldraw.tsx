"use client";

import "tldraw/tldraw.css";
import { useMemo } from "react";
import { DefaultStylePanel, Tldraw } from "tldraw";
import { Avatars } from "@/components/Avatars";
import { Badge } from "@/components/Badge";
import { useRoom, useSelf, useUploadFile } from "@liveblocks/react/suspense";
import { createLiveblocksAssetStore } from "./liveblocksAssetStore";
import { useStorageStore } from "./useStorageStore";

/**
 * IMPORTANT: LICENSE REQUIRED
 * To remove the watermark, you must first purchase a license
 * Learn more: https://tldraw.dev/community/license
 */

export function StorageTldraw() {
  const room = useRoom();
  const uploadFile = useUploadFile();
  // Getting authenticated user info. Doing this using selectors instead
  // of just `useSelf()` to prevent re-renders on Presence changes
  const id = useSelf((me) => me.id);
  const info = useSelf((me) => me.info);
  const assets = useMemo(
    () => createLiveblocksAssetStore(room, uploadFile),
    [room, uploadFile]
  );

  const store = useStorageStore({
    assets,
    user: { id, color: info.color, name: info.name },
  });

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <Tldraw
        store={store}
        components={{
          // Render a live avatar stack at the top-right
          StylePanel: () => (
            <div
              style={{
                display: "flex-column",
                marginTop: 4,
              }}
            >
              <Avatars />
              <DefaultStylePanel />
              <Badge />
            </div>
          ),
        }}
        autoFocus
      />
    </div>
  );
}
