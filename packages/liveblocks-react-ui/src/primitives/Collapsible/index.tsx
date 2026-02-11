import { Slot as SlotPrimitive } from "radix-ui";
import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
} from "react";

import { useControllableState } from "../../utils/use-controllable-state";
import type { ContentProps, RootProps, TriggerProps } from "./types";

const COLLAPSIBLE_ROOT_NAME = "CollapsibleRoot";
const COLLAPSIBLE_TRIGGER_NAME = "CollapsibleTrigger";
const COLLAPSIBLE_CONTENT_NAME = "CollapsibleContent";

const CollapsibleContext = createContext<{
  open?: boolean;
  onOpenChange: (open: boolean) => void;
  disabled: boolean;
  contentId: string;
} | null>(null);

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

const CollapsibleRoot = forwardRef<HTMLDivElement, RootProps>(
  (
    {
      open: controlledOpen,
      onOpenChange: controlledOnOpenChange,
      defaultOpen,
      disabled = false,
      asChild,
      ...props
    },
    forwardedRef
  ) => {
    const [isOpen, onOpenChange] = useControllableState(
      defaultOpen ?? true,
      controlledOpen,
      controlledOnOpenChange
    );
    const Component = asChild ? SlotPrimitive.Slot : "div";
    const id = useId();

    return (
      <CollapsibleContext.Provider
        value={{ open: isOpen, onOpenChange, disabled, contentId: id }}
      >
        <Component
          {...props}
          ref={forwardedRef}
          data-state={isOpen ? "open" : "closed"}
          data-disabled={disabled ? "" : undefined}
        />
      </CollapsibleContext.Provider>
    );
  }
);

/* -------------------------------------------------------------------------------------------------
 * Trigger
 * -----------------------------------------------------------------------------------------------*/

const CollapsibleTrigger = forwardRef<HTMLButtonElement, TriggerProps>(
  ({ onClick, asChild, ...props }, forwardedRef) => {
    const Component = asChild ? SlotPrimitive.Slot : "button";
    const context = useContext(CollapsibleContext);

    if (!context) {
      throw new Error("Collapsible.Root is missing from the React tree.");
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

const CollapsibleContent = forwardRef<HTMLDivElement, ContentProps>(
  ({ asChild, ...props }, forwardedRef) => {
    const Component = asChild ? SlotPrimitive.Slot : "div";
    const context = useContext(CollapsibleContext);
    const divRef = useRef<HTMLDivElement>(null);

    if (!context) {
      throw new Error("Collapsible.Root is missing from the React tree.");
    }

    const { open, onOpenChange, disabled, contentId } = context;

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

if (process.env.NODE_ENV !== "production") {
  CollapsibleContent.displayName = COLLAPSIBLE_CONTENT_NAME;
  CollapsibleRoot.displayName = COLLAPSIBLE_ROOT_NAME;
  CollapsibleTrigger.displayName = COLLAPSIBLE_TRIGGER_NAME;
}

// NOTE: Every export from this file will be available publicly as Collapsible.*
export {
  CollapsibleContent as Content,
  CollapsibleRoot as Root,
  CollapsibleTrigger as Trigger,
};
