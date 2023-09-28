import cx from "classnames";
import type {
  ChangeEvent,
  ComponentProps,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { forwardRef, useCallback, useEffect, useRef } from "react";

import { mergeRefs } from "../../lib/mergeRefs";
import { Tooltip } from "./Tooltip";

interface Props extends ComponentProps<"div"> {
  disabled?: boolean;
  placeholder?: string;
  value: ComponentProps<"input">["value"];
  setValue: (search: string) => void;
}

export const Search = forwardRef<HTMLInputElement, Props>(
  (
    { disabled, value, setValue, placeholder = "Search…", className, ...props },
    forwardRef
  ) => {
    const ref = useRef<HTMLInputElement>(null);
    const handleKeyDown = useCallback(
      (event: ReactKeyboardEvent<HTMLInputElement>) => {
        if (ref.current && event.key === "Escape") {
          setValue("");
          ref.current.blur();
          event.preventDefault();
          event.stopPropagation();
        }
      },
      [setValue]
    );

    const handleSearchChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => setValue(event.target.value),
      [setValue]
    );

    // Focus search on ⌘+F, ⌘+K, or /
    useEffect(() => {
      function handleKeyDown(event: KeyboardEvent) {
        // Except if disabled or an input is currently focused
        if (disabled || document.activeElement?.tagName === "INPUT") {
          return;
        }

        if (
          (event.metaKey && (event.key === "f" || event.key === "k")) ||
          event.key === "/"
        ) {
          if (ref.current) {
            ref.current.focus();
            event.preventDefault();
            event.stopPropagation();
          }
        }
      }

      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [disabled]);

    return (
      <div
        className={cx(
          className,
          "relative flex h-full items-center",
          disabled && "opacity-50"
        )}
        {...props}
      >
        <Tooltip
          content={
            <span className="whitespace-nowrap">
              Search with text or{" "}
              <span className="inline-block font-mono text-[95%]">/regex/</span>
            </span>
          }
          sideOffset={5}
          open={disabled ? false : undefined}
        >
          <input
            type="search"
            disabled={disabled}
            ref={mergeRefs(ref, forwardRef)}
            value={value}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="text-dark-0 dark:text-light-0 placeholder:text-dark-600 dark:placeholder:text-light-600 absolute inset-0 h-full w-full bg-transparent pl-7 pt-px pr-2.5 text-xs placeholder:opacity-50"
          />
        </Tooltip>
        <svg
          width="14"
          height="14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="pointer-events-none absolute left-2 opacity-50"
        >
          <path
            d="M6.5 11a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="m12.5 12.5-3-3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }
);
