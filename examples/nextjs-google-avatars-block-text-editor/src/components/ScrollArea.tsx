import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import cx from "classnames";
import React, { forwardRef } from "react";
import styles from "./ScrollArea.module.css";

interface Props extends ScrollAreaPrimitive.ScrollAreaProps {
  orientation?: "horizontal" | "vertical" | "both";
  hidden?: boolean;
}

export const ScrollArea = forwardRef<HTMLDivElement, Props>(
  ({ children, orientation = "both", ...props }, forwardedRef) => {
    return (
      <ScrollAreaRoot {...props} ref={forwardedRef}>
        <ScrollAreaViewport>{children}</ScrollAreaViewport>
        {(orientation === "vertical" || orientation === "both") && (
          <ScrollAreaScrollbar orientation="vertical">
            <ScrollAreaThumb />
          </ScrollAreaScrollbar>
        )}
        {(orientation === "horizontal" || orientation === "both") && (
          <ScrollAreaScrollbar orientation="horizontal">
            <ScrollAreaThumb />
          </ScrollAreaScrollbar>
        )}
      </ScrollAreaRoot>
    );
  }
);

ScrollArea.displayName = "ScrollArea";

export const ScrollAreaRoot = forwardRef<
  HTMLDivElement,
  ScrollAreaPrimitive.ScrollAreaProps
>(({ children, style, ...props }, forwardedRef) => {
  return (
    <ScrollAreaPrimitive.Root
      {...props}
      ref={forwardedRef}
      style={{ ...style, overflow: "hidden" }}
    >
      {children}
    </ScrollAreaPrimitive.Root>
  );
});

ScrollAreaRoot.displayName = "ScrollAreaRoot";

export const ScrollAreaViewport = forwardRef<
  HTMLDivElement,
  ScrollAreaPrimitive.ScrollAreaViewportProps
>(({ children, className, ...props }, forwardedRef) => {
  return (
    <ScrollAreaPrimitive.Viewport
      {...props}
      ref={forwardedRef}
      className={cx(className, styles.viewport)}
    >
      {children}
    </ScrollAreaPrimitive.Viewport>
  );
});

ScrollAreaViewport.displayName = "ScrollAreaViewport";

export const ScrollAreaScrollbar = forwardRef<
  HTMLDivElement,
  ScrollAreaPrimitive.ScrollAreaScrollbarProps
>(({ children, className, ...props }, forwardedRef) => {
  return (
    <ScrollAreaPrimitive.Scrollbar
      {...props}
      ref={forwardedRef}
      className={cx(className, styles.scrollbar)}
    >
      {children}
    </ScrollAreaPrimitive.Scrollbar>
  );
});

ScrollAreaScrollbar.displayName = "ScrollAreaScrollbar";

export const ScrollAreaThumb = forwardRef<
  HTMLDivElement,
  ScrollAreaPrimitive.ScrollAreaThumbProps
>(({ className, ...props }, forwardedRef) => {
  return (
    <ScrollAreaPrimitive.Thumb
      {...props}
      ref={forwardedRef}
      className={cx(className, styles.thumb)}
    />
  );
});

ScrollAreaThumb.displayName = "ScrollAreaThumb";
