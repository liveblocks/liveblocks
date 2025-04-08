"use client";

import "tldraw/tldraw.css";
import { Tldraw, DefaultStylePanel, DefaultStylePanelContent } from "tldraw";
import { useStorageStore } from "./useStorageStore";
import { useSelf, useRoom } from "@liveblocks/react/suspense";
import { Avatars } from "@/components/Avatars";
import { Badge } from "@/components/Badge";
import { useState } from "react";
import { PreviewShapeUtil } from "./PreviewShape";

/**
 * IMPORTANT: LICENSE REQUIRED
 * To remove the watermark, you must first purchase a license
 * Learn more: https://tldraw.dev/community/license
 */

const shapeUtils = [PreviewShapeUtil];
PreviewShapeUtil.type = "response";

export function StorageTldraw() {
  // Getting authenticated user info. Doing this using selectors instead
  // of just `useSelf()` to prevent re-renders on Presence changes
  const id = useSelf((me) => me.id);
  const info = useSelf((me) => me.info);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const room = useRoom();

  const store = useStorageStore({
    shapeUtils,
    user: { id, color: info.color, name: info.name },
  });

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    try {
      // Send the input text to the API endpoint
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, roomId: room.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to process AI request");
      }

      setInput("");
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <div
        style={{
          position: "fixed",
          top: 20,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          display: "flex",
          gap: "8px",
          background: "white",
          padding: "8px",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask AI to draw something..."
          style={{
            padding: "8px 12px",
            borderRadius: "4px",
            border: "1px solid #ddd",
            width: "300px",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={isLoading || !input.trim()}
          style={{
            padding: "8px 16px",
            borderRadius: "4px",
            border: "none",
            background: isLoading ? "#ccc" : "#0066ff",
            color: "white",
            cursor: isLoading ? "not-allowed" : "pointer",
          }}
        >
          {isLoading ? "Processing..." : "Send"}
        </button>
      </div>
      <Tldraw
        store={store}
        shapeUtils={shapeUtils}
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
