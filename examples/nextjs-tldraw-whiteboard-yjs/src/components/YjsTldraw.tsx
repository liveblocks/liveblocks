"use client";

import "tldraw/tldraw.css";
import { Tldraw, DefaultStylePanel } from "tldraw";
import { useSelf } from "@liveblocks/react/suspense";
import { Avatars } from "@/components/Avatars";
import { useYjsStore } from "@/components/useYjsStore";
import { Badge } from "@/components/Badge";

/**
 * IMPORTANT: LICENSE REQUIRED
 * To remove the watermark, you must first purchase a license
 * Learn more: https://tldraw.dev/community/license
 */

export function YjsTldraw() {
  // Getting authenticated user info. Doing this using selectors instead
  // of just `useSelf()` to prevent re-renders on Presence changes
  const id = useSelf((me) => me.id);
  const info = useSelf((me) => me.info);

  const store = useYjsStore({
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
