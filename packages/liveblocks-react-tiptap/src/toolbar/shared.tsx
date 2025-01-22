import { useLayoutEffect } from "@liveblocks/react/_private";
import {
  Children,
  type ComponentProps,
  createContext,
  forwardRef,
  useContext,
  useId,
} from "react";

// This file is separate to avoid circular dependencies

type FloatingToolbarContext = {
  close: () => void;
  registerExternal: (id: string) => () => void;
};

export const FloatingToolbarContext =
  createContext<FloatingToolbarContext | null>(null);

export const FloatingToolbarExternal = forwardRef<
  HTMLDivElement,
  ComponentProps<"div">
>(({ children, style, ...props }, forwardedRef) => {
  const id = useId();
  const externalId = `liveblocks-floating-toolbar-external-${id}`;
  const floatingToolbarContext = useContext(FloatingToolbarContext);
  const registerExternal = floatingToolbarContext?.registerExternal;

  useLayoutEffect(() => {
    if (!registerExternal) {
      return;
    }

    return registerExternal(externalId);
  }, [registerExternal, externalId]);

  if (!floatingToolbarContext || Children.count(children) === 0) {
    return <>{children}</>;
  }

  return (
    <div
      ref={forwardedRef}
      style={{ display: "contents", ...style }}
      data-liveblocks-floating-toolbar-external={id}
      {...props}
      id={externalId}
    >
      {children}
    </div>
  );
});
