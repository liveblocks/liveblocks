"use client";

import { shallow } from "@liveblocks/client";
import { useOthersMapped } from "@liveblocks/react/suspense";

/**
 * Everyone else's cursor, from Presence. Cursors are shared in plan
 * coordinates and placed with this person's own pan and zoom, so they point
 * at the same spot on the plan for everyone.
 */
export function Cursors({
  view,
}: {
  view: { x: number; y: number; zoom: number };
}) {
  const others = useOthersMapped(
    (other) => ({
      cursor: other.presence.cursor,
      name: other.info.name,
      color: other.info.color,
    }),
    shallow
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {others.map(([connectionId, { cursor, name, color }]) =>
        cursor ? (
          <div
            key={connectionId}
            className="absolute top-0 left-0 transition-transform duration-75 ease-linear"
            style={{
              transform: `translate(${cursor.x * view.zoom + view.x}px, ${cursor.y * view.zoom + view.y}px)`,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              className="drop-shadow-sm"
              aria-hidden
            >
              <path
                d="M1.5 1.5 6 14.5l2.1-5.4 5.4-2.1z"
                fill={color}
                stroke="white"
                strokeWidth="1.25"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className="absolute top-3.5 left-3.5 rounded-full px-1.5 py-0.5 text-[11px] leading-none font-medium whitespace-nowrap text-white shadow-sm"
              style={{ backgroundColor: color }}
            >
              {name}
            </span>
          </div>
        ) : null
      )}
    </div>
  );
}
