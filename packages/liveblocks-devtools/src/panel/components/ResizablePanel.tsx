import { useStorage } from "@plasmohq/storage/hook";
import cx from "classnames";
import type {
  ComponentProps,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { useLatest } from "../../hooks/useLatest";
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
  onValueApply: (value: number) => void;
  min: number;
  max: number;
}

function Handle({
  direction,
  value,
  onValueChange,
  onValueApply,
  min,
  max,
  className,
  ...props
}: HandleProps) {
  const [isDragging, setDragging] = useState(false);
  const startOffset = useRef<number>();
  const startValue = useRef<number>();
  const latestOnValueChange = useLatest(onValueChange);
  const latestOnValueApply = useLatest(onValueApply);

  const handleDrag = useCallback(
    (event: PointerEvent) => {
      const delta =
        (startOffset.current ?? 0) -
        (direction === "vertical" ? event.pageY : event.pageX);

      latestOnValueChange.current(
        Math.round(clamp((startValue.current ?? 0) + delta, min, max))
      );
    },
    [direction, min, max]
  );

  const handleDragEnd = useCallback(
    (event?: PointerEvent) => {
      if (event) {
        const delta =
          (startOffset.current ?? 0) -
          (direction === "vertical" ? event.pageY : event.pageX);

        latestOnValueApply.current(
          Math.round(clamp((startValue.current ?? 0) + delta, min, max))
        );
      }

      setDragging(false);

      startOffset.current = undefined;
      startValue.current = undefined;

      document.body.removeAttribute("data-resizing");

      document.removeEventListener("pointerup", handleDragEnd);
      document.removeEventListener("pointermove", handleDrag);
    },
    [direction, min, max, handleDrag]
  );

  const handleDragStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      startOffset.current =
        direction === "vertical" ? event.pageY : event.pageX;
      startValue.current = value;

      setDragging(true);

      document.body.setAttribute("data-resizing", direction);

      document.addEventListener("pointerup", handleDragEnd);
      document.addEventListener("pointermove", handleDrag);
    },
    [value, direction, handleDragEnd, handleDrag]
  );

  useEffect(() => {
    return handleDragEnd;
  }, [handleDragEnd]);

  return (
    <div
      className={cx(
        className,
        "absolute z-50 bg-black/5 transition-opacity hover:opacity-100",
        isDragging ? "opacity-100" : "opacity-0",
        {
          "left-0 -top-1.5 h-3 w-full cursor-row-resize":
            direction === "vertical",
          "top-0 -left-1.5 h-full w-3 cursor-col-resize":
            direction === "horizontal",
        }
      )}
      onPointerDown={handleDragStart}
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
  const id = useId();
  const isVertical = useMediaQuery(`(max-width: ${BREAKPOINT}px)`);
  const [width, , { setRenderValue: setRenderWidth, setStoreValue: setWidth }] =
    useStorage(`panel-width-${id}-0`, INITIAL_WIDTH);
  const [
    height,
    ,
    { setRenderValue: setRenderHeight, setStoreValue: setHeight },
  ] = useStorage(`panel-height-${id}-0`, INITIAL_HEIGHT);

  return (
    <div
      className={cx(className, "flex h-full")}
      style={{ ...style, flexDirection: isVertical ? "column" : "row" }}
      {...props}
    >
      <div className="bg-light-0 dark:bg-dark-0 min-h-0 min-w-0 flex-1">
        {children}
      </div>
      <div
        className={cx(
          "border-light-300 dark:border-dark-300 bg-light-0 dark:bg-dark-0 relative flex-none",
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
            onValueChange={setRenderHeight}
            onValueApply={setHeight}
            min={MIN_HEIGHT}
            max={MAX_HEIGHT}
          />
        ) : (
          <Handle
            direction="horizontal"
            value={width}
            onValueChange={setRenderWidth}
            onValueApply={setWidth}
            min={MIN_WIDTH}
            max={MAX_WIDTH}
          />
        )}
        {content}
      </div>
    </div>
  );
}
