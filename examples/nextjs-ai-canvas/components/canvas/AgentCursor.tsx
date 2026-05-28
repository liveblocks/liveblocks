"use client";

import { useOthers } from "@liveblocks/react/suspense";
import { Sparkles } from "lucide-react";
import clsx from "clsx";

const STATUS_TEXT: Record<"thinking" | "editing" | "idle", string> = {
  thinking: "thinking…",
  editing: "editing…",
  idle: "idle",
};

export function AgentCursor() {
  const others = useOthers();

  return (
    <>
      {others.map((other) => {
        const cursor = other.presence.cursor;
        const isAgent = Boolean(other.presence?.isAgent);
        const status = other.presence.agentStatus ?? "idle";
        if (!cursor) {
          return null;
        }

        return (
          <div
            key={other.connectionId}
            className="pointer-events-none fixed z-40 transition-transform duration-150"
            style={{
              left: cursor.x,
              top: cursor.y,
              transform: "translate(8px, 8px)",
            }}
          >
            {isAgent ? (
              <div className="relative">
                <div className="absolute -inset-2 rounded-full bg-violet-400/20 blur-md" />
                <div className="relative flex items-center gap-2 rounded-full border border-violet-300 bg-violet-600 px-2.5 py-1 text-xs text-white shadow-md">
                  <Sparkles size={14} className="animate-pulse" />
                  <span>{other.info?.name ?? "Agent"}</span>
                  <span
                    className={clsx(
                      "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide",
                      status === "thinking" && "bg-violet-500",
                      status === "editing" && "bg-fuchsia-500",
                      status === "idle" && "bg-white/25"
                    )}
                  >
                    {STATUS_TEXT[status]}
                  </span>
                </div>
              </div>
            ) : (
              <div
                className="rounded-full px-2 py-1 text-xs text-white shadow"
                style={{
                  background: other.info?.color ?? "#0f172a",
                }}
              >
                {other.info?.name ?? "Guest"}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
