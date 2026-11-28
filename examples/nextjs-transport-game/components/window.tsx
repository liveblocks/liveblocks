"use client";

import { Minus, Square, X } from "lucide-react";
import {
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

// Shared by every window, so the one touched last is on top
let topZ = 10;

type Props = {
  title: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  // Windows without `onClose` have no X button
  onClose?: () => void;
  canMinimize?: boolean;
};

// A window that floats over the map. Drag it by its title bar, roll it up
// with the minimize button, close it with the X.
export function Window({
  title,
  children,
  className,
  style,
  onClose,
  canMinimize = true,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [minimized, setMinimized] = useState(false);
  const [z, setZ] = useState(() => ++topZ);
  const drag = useRef<{
    pointerId: number;
    x: number;
    y: number;
    // Where the window sits when it hasn't been moved
    left: number;
    top: number;
    width: number;
  } | null>(null);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const element = ref.current;
    if (
      !element ||
      event.button !== 0 ||
      (event.target instanceof Element && event.target.closest("button"))
    ) {
      return;
    }
    const rect = element.getBoundingClientRect();
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX - offset.x,
      y: event.clientY - offset.y,
      left: rect.left - offset.x,
      top: rect.top - offset.y,
      width: rect.width,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) {
      return;
    }
    // Always leave enough of the title bar on screen to grab it again
    const minX = 60 - current.width - current.left;
    const maxX = window.innerWidth - 60 - current.left;
    const minY = -current.top;
    const maxY = window.innerHeight - 24 - current.top;
    setOffset({
      x: Math.max(minX, Math.min(maxX, event.clientX - current.x)),
      y: Math.max(minY, Math.min(maxY, event.clientY - current.y)),
    });
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === event.pointerId) {
      drag.current = null;
    }
  };

  return (
    <section
      ref={ref}
      aria-label={title}
      className={cn("win pointer-events-auto relative", className)}
      style={{
        ...style,
        zIndex: z,
        transform: `translate(${offset.x}px, ${offset.y}px)`,
      }}
      onPointerDownCapture={() => setZ(++topZ)}
    >
      <div
        className="win-title"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => canMinimize && setMinimized((value) => !value)}
      >
        <span className="min-w-0 flex-1 truncate">{title}</span>
        {canMinimize ? (
          <button
            type="button"
            className="win-title-button"
            aria-label={minimized ? "Restore" : "Minimize"}
            onClick={() => setMinimized((value) => !value)}
          >
            {minimized ? (
              <Square className="size-2" strokeWidth={4} />
            ) : (
              <Minus className="mt-1.5 size-2.5" strokeWidth={5} />
            )}
          </button>
        ) : null}
        {onClose ? (
          <button
            type="button"
            className="win-title-button"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="size-2.5" strokeWidth={4} />
          </button>
        ) : null}
      </div>
      {minimized ? null : children}
    </section>
  );
}
