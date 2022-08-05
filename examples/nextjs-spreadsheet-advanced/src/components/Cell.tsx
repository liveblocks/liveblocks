import cx from "classnames";
import {
  type CSSProperties,
  type ChangeEvent,
  type ComponentProps,
  type KeyboardEvent as ReactKeyboardEvent,
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
import { canUseShortcuts } from "../utils/canUseShortcuts";
import { useAutoFocus } from "../utils/useAutoFocus";
import { useEventListener } from "../utils/useEventListener";
import styles from "./Cell.module.css";

export interface Props extends ComponentProps<"td"> {
  expression: string;
  getExpression: () => string;
  height: number;
  isSelected?: boolean;
  onDelete: () => void;
  onSelect: () => void;
  onSelectAfter: () => void;
  onValueChange: (value: string) => void;
  other?: UserInfo;
  width: number;
}

export interface EditingCellProps extends ComponentProps<"input"> {
  expression: string;
  onEndEditing: () => void;
  onCommit: (value: string, direction?: "down") => void;
}

const singleCharacterRegex = /^.$/u;

function formatValue(value: string) {
  return value.replace(" ", "").toUpperCase();
}

function EditingCell({
  expression,
  onCommit,
  onEndEditing,
  className,
  ...props
}: EditingCellProps) {
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<string>(expression);
  const value = useMemo(
    () => (draft == null ? expression : draft),
    [draft, expression]
  );

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = event.currentTarget.value;

    setDraft(formatValue(value));
  }, []);

  const handleBlur = useCallback(() => {
    onCommit(draft);
  }, [draft, onEndEditing]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onEndEditing();
      } else if (event.key === "Enter") {
        event.preventDefault();
        onCommit(draft, "down");
      }
    },
    [draft, onCommit, onEndEditing]
  );

  useAutoFocus(input);

  return (
    <input
      className={cx(className, styles.input)}
      onBlur={handleBlur}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      ref={input}
      value={value ?? ""}
      {...props}
    />
  );
}

export function Cell({
  expression,
  width,
  height,
  isSelected,
  other,
  onSelect,
  onSelectAfter,
  onValueChange,
  onDelete,
  getExpression,
  className,
  style,
  ...props
}: Props) {
  const self = useSelf();
  const [isEditing, setEditing] = useState(false);
  const [editingValue, setEditingValue] = useState("");
  const isError = useMemo(() => expression === EXPRESSION_ERROR, [expression]);

  useEffect(() => {
    if (!isSelected) {
      setEditing(false);
    }
  }, [isSelected]);

  const stopEditing = useCallback(() => {
    setEditing(false);
    setEditingValue("");
  }, []);

  const handleCommit: EditingCellProps["onCommit"] = useCallback(
    (value, direction) => {
      stopEditing();
      onValueChange(value);

      if (direction === "down") {
        onSelectAfter();
      }
    },
    [onValueChange, onSelectAfter, stopEditing]
  );

  const handleClick = useCallback(() => {
    if (isSelected) {
      setEditing(true);
    } else {
      onSelect();
    }
  }, [onSelect, isSelected]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (canUseShortcuts()) {
        const isSingleCharacterKey =
          singleCharacterRegex.test(event.key) &&
          ![event.shiftKey, event.ctrlKey, event.altKey, event.metaKey].some(
            Boolean
          );

        if (event.key === "Enter" || isSingleCharacterKey) {
          event.preventDefault();
          setEditing(true);

          if (isSingleCharacterKey) {
            setEditingValue(formatValue(event.key));
          }
        } else if (event.key === "Backspace" || event.key === "Delete") {
          event.preventDefault();
          onDelete();
        }
      }
    },
    [onDelete, isSelected, isEditing]
  );

  useEventListener("keydown", handleKeyDown, isSelected && !isEditing);

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
      <div className={styles.content}>
        {isEditing ? (
          <EditingCell
            expression={getExpression() + editingValue}
            onCommit={handleCommit}
            onEndEditing={stopEditing}
          />
        ) : (
          <div className={styles.display}>{expression}</div>
        )}
        {isError && !isEditing && (
          <div className={styles.error}>
            <svg height="20" width="20" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M10 19a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
                fill="var(--red-100)"
              />
              <path
                clipRule="evenodd"
                d="M10 5a1 1 0 0 1 1 1v4a1 1 0 1 1-2 0V6a1 1 0 0 1 1-1ZM9 14a1 1 0 0 1 1-1h.01a1 1 0 1 1 0 2H10a1 1 0 0 1-1-1Z"
                fill="var(--red-500)"
                fillRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>
    </td>
  );
}
