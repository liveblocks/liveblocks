import cx from "classnames";
import {
  type CSSProperties,
  type ChangeEvent,
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSelf } from "../liveblocks.config";
import { EXPRESSION_ERROR } from "../spreadsheet/interpreter/utils";
import type { UserInfo } from "../types";
import { appendUnit } from "../utils/appendUnit";
import {
  canUseEditingShortcuts,
  canUseShortcuts,
} from "../utils/canUseShortcuts";
import { useEventListener } from "../utils/useEventListener";
import styles from "./Cell.module.css";

export interface Props extends ComponentProps<"td"> {
  expression: string;
  getExpression: () => string;
  height: number;
  isSelected?: boolean;
  onDelete: () => void;
  onSelect: () => void;
  onValueChange: (value: string) => void;
  other?: UserInfo;
  width: number;
}

const singleCharacterRegex = /^.$/u;

export function Cell({
  expression,
  width,
  height,
  isSelected,
  other,
  onSelect,
  onValueChange,
  onDelete,
  getExpression,
  className,
  style,
  ...props
}: Props) {
  const self = useSelf();
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<string | null>(null);

  const value = useMemo(
    () => (draft == null ? expression : draft),
    [draft, expression]
  );
  const isError = useMemo(() => expression === EXPRESSION_ERROR, [expression]);
  const isEditing = useMemo(() => draft !== null, [draft]);

  useEffect(() => {
    if (!isSelected) {
      setDraft(null);
    }
  }, [isSelected]);

  const startEditing = useCallback(
    (value = "") => {
      input.current?.focus();
      setDraft(getExpression() + value.toUpperCase());
    },
    [getExpression]
  );

  const stopEditing = useCallback(() => {
    setDraft(null);
    input.current?.blur();
  }, []);

  const commitDraft = useCallback(() => {
    if (draft !== null) {
      onValueChange(draft);
    }
  }, [draft, onValueChange]);

  const handleClick = useCallback(() => {
    if (isSelected) {
      startEditing();
    } else {
      onSelect();
    }
  }, [onSelect, isSelected, startEditing]);

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    setDraft(value.replace(" ", "").toUpperCase());
  }, []);

  const handleBlur = useCallback(() => {
    stopEditing();
  }, [stopEditing]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isSelected) {
        return;
      }

      if (canUseShortcuts()) {
        const isSingleCharacterKey =
          singleCharacterRegex.test(event.key) &&
          ![event.shiftKey, event.ctrlKey, event.altKey, event.metaKey].some(
            Boolean
          );

        if (event.key === "Enter" || isSingleCharacterKey) {
          event.preventDefault();
          startEditing(isSingleCharacterKey ? event.key : "");
        } else if (event.key === "Backspace" || event.key === "Delete") {
          event.preventDefault();
          onDelete();
        }
      } else if (canUseEditingShortcuts(input)) {
        if (event.key === "Enter") {
          event.preventDefault();
          commitDraft();
          stopEditing();
        } else if (event.key === "Escape") {
          event.preventDefault();
          stopEditing();
        }
      }
    },
    [isSelected, commitDraft, startEditing, stopEditing, onDelete]
  );

  useEventListener("keydown", handleKeyDown);

  return (
    <td
      aria-selected={isSelected}
      className={cx(className, styles.cell, {
        selected: isSelected,
        "selected-other": other,
        editing: isEditing,
        error: isError,
      })}
      onClick={handleClick}
      style={
        {
          ...style,
          "--cell-selection":
            isSelected && self ? self.info.color : other?.color,
          "--cell-width": appendUnit(width),
          "--cell-height": appendUnit(height),
        } as CSSProperties
      }
      {...props}
    >
      {other && (
        <div aria-hidden className={styles.user}>
          <img alt={other.url} className={styles.user_avatar} src={other.url} />
          <span className={styles.user_label}>{other.name}</span>
        </div>
      )}
      {isError && !isEditing && (
        <div className={styles.error}>
          <svg height="20" width="20" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 19a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" fill="#fee2e2" />
            <path
              clipRule="evenodd"
              d="M10 5a1 1 0 0 1 1 1v4a1 1 0 1 1-2 0V6a1 1 0 0 1 1-1ZM9 14a1 1 0 0 1 1-1h.01a1 1 0 1 1 0 2H10a1 1 0 0 1-1-1Z"
              fill="#ef4444"
              fillRule="evenodd"
            />
          </svg>
        </div>
      )}
      <input
        className={styles.input}
        onBlur={handleBlur}
        onChange={handleChange}
        readOnly={!isEditing}
        ref={input}
        tabIndex={-1}
        value={value ?? ""}
      />
    </td>
  );
}
