import { Slot } from "@radix-ui/react-slot";
import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
} from "react";

import type { ContentProps, RootProps, TriggerProps } from "./types";

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

const RootContext = createContext<{
  open: boolean;
  onOpenChange(open: boolean): void;

  disabled: boolean;
  contentId: string;
} | null>(null);

export const Root = forwardRef<HTMLDivElement, RootProps>(
  (
    { open, onOpenChange, disabled = false, asChild, ...props },
    forwardedRef
  ) => {
    const Component = asChild ? Slot : "div";
    const id = useId();

    return (
      <RootContext.Provider
        value={{ open, onOpenChange, disabled, contentId: id }}
      >
        <Component
          {...props}
          ref={forwardedRef}
          data-state={open ? "open" : "closed"}
          data-disabled={disabled ? "" : undefined}
        />
      </RootContext.Provider>
    );
  }
);

/* -------------------------------------------------------------------------------------------------
 * Trigger
 * -----------------------------------------------------------------------------------------------*/

export const Trigger = forwardRef<HTMLButtonElement, TriggerProps>(
  ({ onClick, asChild, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "button";
    const context = useContext(RootContext);

    if (!context) {
      throw new Error("Collapsible.Trigger must be a descendant of Root");
    }

    const { open, disabled, contentId, onOpenChange } = context;

    return (
      <Component
        {...props}
        ref={forwardedRef}
        type="button"
        aria-controls={contentId}
        aria-expanded={open || false}
        data-state={open ? "open" : "closed"}
        data-disabled={disabled ? "" : undefined}
        disabled={disabled}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) return;
          if (disabled) return;
          onOpenChange(!open);
        }}
      />
    );
  }
);

/* -------------------------------------------------------------------------------------------------
 * Content
 * -----------------------------------------------------------------------------------------------*/

export const Content = forwardRef<HTMLDivElement, ContentProps>(
  ({ asChild, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "div";
    const rootContext = useContext(RootContext);
    const divRef = useRef<HTMLDivElement>(null);

    if (!rootContext) throw new Error("Missing RootContext Provider");

    const { open, onOpenChange, disabled, contentId } = rootContext;

    useEffect(() => {
      const element = divRef.current;
      if (element === null) return;

      const isHiddenUntilFoundSupported = "onbeforematch" in document.body;
      if (!isHiddenUntilFoundSupported) return;

      function handleBeforeMatch() {
        onOpenChange(true);
      }

      // https://developer.chrome.com/articles/hidden-until-found/
      element.addEventListener("beforematch", handleBeforeMatch);
      return () => {
        element.removeEventListener("beforematch", handleBeforeMatch);
      };
    }, [onOpenChange]);

    // Passing `string` to `hidden` in JSX is not currently supported: https://github.com/facebook/react/issues/24740
    useEffect(() => {
      const element = divRef.current;
      if (element === null) return;

      if (open) return;

      const isHiddenUntilFoundSupported = "onbeforematch" in document.body;
      if (!isHiddenUntilFoundSupported) return;

      element.setAttribute("hidden", "until-found");
      return () => {
        element.removeAttribute("hidden");
      };
    }, [open]);

    useImperativeHandle<
      HTMLDivElement | null,
      HTMLDivElement | null
    >(forwardedRef, () => {
      return divRef.current;
    }, []);

    return (
      <Component
        {...props}
        ref={divRef}
        data-state={open ? "open" : "closed"}
        data-disabled={disabled ? "" : undefined}
        id={contentId}
        hidden={!open}
      />
    );
  }
);
