import cx from "classnames";
import type {
  ComponentProps,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useMediaQuery } from "../../hooks/useMediaQuery";
import { clamp } from "../../lib/clamp";

const BREAKPOINT = 680;
const INITIAL_WIDTH = 300;
const MIN_WIDTH = 200;
const MAX_WIDTH = 500;
const INITIAL_HEIGHT = 300;
const MIN_HEIGHT = 200;
const MAX_HEIGHT = 500;

interface Props extends ComponentProps<"div"> {
  content?: ReactNode;
}

interface HandleProps extends ComponentProps<"div"> {
  direction: "horizontal" | "vertical";
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
}

function Handle({
  direction,
  value,
  onValueChange,
  min,
  max,
  className,
  ...props
}: HandleProps) {
  const [isDragging, setDragging] = useState(false);
  const startOffset = useRef<number>();
  const startValue = useRef<number>();

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const delta =
        (startOffset.current ?? 0) -
        (direction === "vertical" ? event.pageY : event.pageX);

      onValueChange(clamp((startValue.current ?? 0) + delta, min, max));
    },
    [direction, min, max]
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      const delta =
        (startOffset.current ?? 0) -
        (direction === "vertical" ? event.pageY : event.pageX);

      onValueChange(clamp((startValue.current ?? 0) + delta, min, max));

      setDragging(false);

      startOffset.current = undefined;
      startValue.current = undefined;

      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");

      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointermove", handlePointerMove);
    },
    [direction, min, max, handlePointerMove]
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      startOffset.current =
        direction === "vertical" ? event.pageY : event.pageX;
      startValue.current = value;

      setDragging(true);

      document.body.style.userSelect = "none";
      document.body.style.cursor =
        direction === "vertical" ? "row-resize" : "col-resize";

      document.addEventListener("pointerup", handlePointerUp);
      document.addEventListener("pointermove", handlePointerMove);
    },
    [value, direction, handlePointerUp, handlePointerMove]
  );

  useEffect(() => {
    return () => {
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");

      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointermove", handlePointerMove);
    };
  }, [handlePointerUp, handlePointerMove]);

  return (
    <div
      className={cx(
        className,
        "absolute bg-black/5 transition-opacity hover:opacity-100",
        isDragging ? "opacity-100" : "opacity-0",
        {
          "left-0 -top-1.5 h-3 w-full cursor-row-resize":
            direction === "vertical",
          "top-0 -left-1.5 h-full w-3 cursor-col-resize":
            direction === "horizontal",
        }
      )}
      onPointerDown={handlePointerDown}
      {...props}
    />
  );
}

export function ResizablePanel({
  children,
  content,
  className,
  style,
  ...props
}: Props) {
  const isVertical = useMediaQuery(`(max-width: ${BREAKPOINT}px)`);
  const [width, setWidth] = useState(INITIAL_WIDTH);
  const [height, setHeight] = useState(INITIAL_HEIGHT);

  return (
    <div
      className={cx(className, "flex h-full")}
      style={{ ...style, flexDirection: isVertical ? "column" : "row" }}
      {...props}
    >
      <div className="flex-1">{children}</div>
      <div
        className={cx(
          "relative flex-none border-gray-200 dark:border-gray-600",
          isVertical ? "border-t" : "border-l"
        )}
        style={{
          width: isVertical ? "100%" : width,
          height: isVertical ? height : "100%",
          minWidth: isVertical ? undefined : MIN_WIDTH,
          minHeight: isVertical ? MIN_HEIGHT : undefined,
          maxWidth: isVertical ? undefined : MAX_WIDTH,
          maxHeight: isVertical ? MAX_HEIGHT : undefined,
        }}
      >
        {isVertical ? (
          <Handle
            direction="vertical"
            value={height}
            onValueChange={setHeight}
            min={MIN_HEIGHT}
            max={MAX_HEIGHT}
          />
        ) : (
          <Handle
            direction="horizontal"
            value={width}
            onValueChange={setWidth}
            min={MIN_WIDTH}
            max={MAX_WIDTH}
          />
        )}
        {content}
      </div>
    </div>
  );
}
