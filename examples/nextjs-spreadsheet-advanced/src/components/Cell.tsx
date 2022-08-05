import cx from "classnames";
import {
  type CSSProperties,
  type ChangeEvent,
  type ComponentProps,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSelf } from "../liveblocks.config";
import { EXPRESSION_ERROR } from "../spreadsheet/interpreter/utils";
import type { UserInfo } from "../types";
import { appendUnit } from "../utils/appendUnit";
import { useAutoFocus } from "../utils/useAutoFocus";
import styles from "./Cell.module.css";

export interface Props extends Omit<ComponentProps<"td">, "onSelect"> {
  expression: string;
  getExpression: () => string;
  height: number;
  isSelected?: boolean;
  isEditing?: boolean;
  onStartEditing: () => void;
  onEndEditing: () => void;
  onDelete: () => void;
  onSelect: () => void;
  onCommit: (value: string, direction?: "down") => void;
  other?: UserInfo;
  width: number;
}

export interface EditingCellProps extends ComponentProps<"input"> {
  expression: string;
  onEndEditing: () => void;
  onCommit: (value: string, direction?: "down") => void;
}

export function formatValue(value: string) {
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
  }, [draft, onCommit]);

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
  isEditing,
  other,
  onSelect,
  onStartEditing,
  onEndEditing,
  onCommit,
  onDelete,
  getExpression,
  className,
  style,
  ...props
}: Props) {
  const self = useSelf();
  const isError = useMemo(() => expression === EXPRESSION_ERROR, [expression]);

  const handleClick = useCallback(() => {
    if (isSelected) {
      onStartEditing();
    } else {
      onSelect();
    }
  }, [onSelect, onStartEditing, isSelected]);

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
            expression={getExpression()}
            onCommit={onCommit}
            onEndEditing={onEndEditing}
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
