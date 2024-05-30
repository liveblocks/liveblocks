
import { useRoomContextBundle } from "@liveblocks/react";
import { Thread } from "@liveblocks/react-comments";
import React from "react";

// TODO: Remove hardcoded styling, need to make a decision how much we provide and export CSS

const ThreadPanel = () => {
  const { useThreads } = useRoomContextBundle();
  const { threads } = useThreads();

  if (!threads || threads.length === 0) {
    return <div style={{
      "display": "flex",
      "justifyContent": "center",
      "alignItems": "center",
      "height": "100%",
      "color": "rgba(55, 53, 47, 0.5)",
    }}>No threads yet</div>;
  }

  return (
    <div style={{
      "display": "flex", "flexDirection": "column"
    }}>
      {threads.map((thread) => {
        return <Thread key={thread.id} thread={thread} />;
      })}
    </div>
  );
}

export { ThreadPanel }