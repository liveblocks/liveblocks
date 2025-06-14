import { console } from "@liveblocks/core";
import { useCallback, useEffect, useRef, useState } from "react";

import { useRerender } from "./use-rerender";

/**
 * Hold a state in a "controlled" or "uncontrolled" way.
 */
export function useControllableState<T>(
  /**
   * The default uncontrolled value.
   */
  defaultValue: T,

  /**
   * The controlled value.
   *
   * If `undefined`, the returned value is uncontrolled.
   * If set, this controlled value is used and returned as is.
   */
  value: T | undefined,

  /**
   * The event handler called when the value changes.
   */
  onChange: ((value: T) => void) | undefined
) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const wasControlled = useRef(isControlled);

  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" &&
      wasControlled.current !== isControlled
    ) {
      console.warn(
        `A component is changing from ${
          wasControlled.current ? "controlled" : "uncontrolled"
        } to ${isControlled ? "controlled" : "uncontrolled"}.`
      );
    }

    wasControlled.current = isControlled;
  }, [isControlled]);

  const currentValue = isControlled ? value : uncontrolledValue;

  const setValue = useCallback(
    (value: T) => {
      if (isControlled) {
        return onChange?.(value);
      } else {
        setUncontrolledValue(value);

        return onChange?.(value);
      }
    },
    [isControlled, onChange]
  );

  return [currentValue, setValue] as const;
}

/**
 * @experimental
 *
 * Hold a value in a "semi-controlled" way: a controlled value that can be
 * overridden by uncontrolled changes in a "most recent wins" way.
 *
 * @example
 *
 * A `Collapsible` component uses `useSemiControllableState` to control
 * its "open" state, it accepts two optional props: `open` and `onOpenChange`.
 *
 * Internally, it passes them to `useSemiControllableState`:
 *
 * ```tsx
 * const [isOpen, setIsOpen] = useSemiControllableState(
 *   open ?? true, // Defaults to `true` if `open` is not provided
 *   onOpenChange
 * );
 *
 * // ... `isOpen` and `setIsOpen` are used in the component's implementation ...
 * ```
 *
 * And finally here's how it could be used in a "semi-controlled" way:
 *
 * ```tsx
 * const status: `"loading" | "success" | "error"`;
 *
 * <Collapsible open={status === "success"} />
 * ```
 *
 * Like with a traditional controlled value, the collapsible will start closed
 * and will automatically open when `status` becomes `"success"`.
 *
 * But unlike with a traditional controlled value, the collapsible can still
 * open/close when it's clicked on by the user, overriding `open={status === "success"}`.
 *
 * It's possible to use it as a traditional uncontrolled value:
 *
 * ```tsx
 * const defaultOpen = false;
 *
 * <Collapsible open={defaultOpen} />
 * ```
 *
 * Or to sync the uncontrolled value like with a traditional uncontrolled value:
 *
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 *
 * // `isOpen` is synced with the uncontrolled value when the user clicks
 * <Collapsible open={isOpen} onOpenChange={setIsOpen} />
 * ```
 *
 * But with the caveat that it will still be possible to change the
 * uncontrolled value:
 *
 * ```tsx
 * const open = false;
 *
 * // Clicking on the collapsible will still open/close it, unlike with a
 * // traditional controlled value.
 * <Collapsible open={open} />
 * ```
 */
export function useSemiControllableState<T>(
  /**
   * The controlled value.
   *
   * When this value changes, it becomes the current value.
   * But unlike a traditional controlled value, it can be overridden by
   * uncontrolled changes.
   */
  value: T,

  /**
   * The event handler called when the uncontrolled value changes.
   */
  onChange: ((value: T) => void) | undefined
) {
  const [uncontrolledValue, setUncontrolledValue] = useState(value);
  const lastChange = useRef<"uncontrolled" | "controlled">("controlled");
  const lastValue = useRef(value);
  const [rerender] = useRerender();

  // Listen to `value` changes during the render phase to avoid
  // having to always sync `uncontrolledValue` on every change.
  if (!Object.is(lastValue.current, value)) {
    lastValue.current = value;
    lastChange.current = "controlled";
  }

  const setValue = useCallback(
    (value: T) => {
      lastChange.current = "uncontrolled";
      setUncontrolledValue(value);

      // If the new `uncontrolledValue` is the same as last time it was the "last change",
      // `setUncontrolledValue` won't trigger a re-render, but the fact that it's becoming
      // uncontrolled again is a change that needs a re-render.
      rerender();

      onChange?.(value);
    },
    [onChange, rerender]
  );

  const currentValue =
    lastChange.current === "uncontrolled" ? uncontrolledValue : value;

  return [currentValue, setValue] as const;
}
