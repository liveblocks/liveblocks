import type { HTMLAttributes } from "react";
import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
} from "react";

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

const RootContext = createContext<{
  open: boolean;
  onOpenChange(open: boolean): void;

  disabled: boolean;
  contentId: string;
} | null>(null);

export interface RootProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onOpenChange(open: boolean): void;
  disabled?: boolean;
}

export const Root = forwardRef<HTMLDivElement, RootProps>(function Root(
  { open, onOpenChange, disabled = false, ...props },
  forwardedRef
) {
  const id = useId();

  return (
    <RootContext.Provider
      value={{ open, onOpenChange, disabled, contentId: id }}
    >
      <div
        {...props}
        ref={forwardedRef}
        data-state={open ? "open" : "closed"}
        data-disabled={disabled ? "" : undefined}
      />
    </RootContext.Provider>
  );
});

/* -------------------------------------------------------------------------------------------------
 * Trigger
 * -----------------------------------------------------------------------------------------------*/
interface TriggerProps extends HTMLAttributes<HTMLButtonElement> {}

export const Trigger = forwardRef<HTMLButtonElement, TriggerProps>(
  function Trigger({ onClick, ...props }, forwardedRef) {
    const context = useContext(RootContext);

    if (!context) {
      throw new Error("Collapsible.Trigger must be a descendant of Root");
    }

    const { open, disabled, contentId, onOpenChange } = context;

    return (
      <button
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

interface ContentProps extends HTMLAttributes<HTMLDivElement> {}

export const Content = forwardRef<HTMLDivElement, ContentProps>(
  function Content(props, forwardedRef) {
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
      <div
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
