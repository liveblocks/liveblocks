import cx from "classnames";
import {
  ChangeEvent,
  ComponentProps,
  CSSProperties,
  FocusEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { EXPRESSION_ERROR } from "../spreadsheet/interpreter/utils";
import { UserInfo } from "../types";
import { appendUnit } from "../utils/appendUnit";
import {
  canUseEditingShortcuts,
  canUseShortcuts,
} from "../utils/canUseShortcuts";
import { isNumeric } from "../utils/isNumeric";
import { useEventListener } from "../utils/useEventListener";
import styles from "./Cell.module.css";

export interface Props extends ComponentProps<"td"> {
  expression: string;
  width: number;
  height: number;
  isSelected?: boolean;
  other?: UserInfo;
  onSelect: () => void;
  onValueChange: (value: string) => void;
  onDelete: () => void;
  getExpression: () => string;
}

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

  const startEditing = useCallback(() => {
    input.current?.focus();
    setDraft(getExpression());
  }, [getExpression]);

  const stopEditing = useCallback(() => {
    setDraft(null);
    input.current?.blur();
  }, [draft]);

  const commitDraft = useCallback(() => {
    if (draft !== null) {
      onValueChange(draft);
    }
  }, [draft]);

  const handleClick = useCallback(() => {
    if (isSelected) {
      startEditing();
    } else {
      onSelect();
    }
  }, [onSelect]);

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    setDraft(value.replace(" ", "").toUpperCase());
  }, []);

  const handleBlur = useCallback(() => {
    stopEditing();
  }, [stopEditing]);

  const handleKeyDown = useCallback(
    ({ key }: KeyboardEvent) => {
      if (!isSelected) {
        return;
      }

      if (canUseShortcuts()) {
        if (key === "Enter") {
          startEditing();
        } else if (key === "Backspace" || key === "Delete") {
          onValueChange("");
        }
      } else if (canUseEditingShortcuts(input)) {
        if (key === "Enter") {
          commitDraft();
          stopEditing();
        } else if (key === "Escape") {
          stopEditing();
        }
      }
    },
    [isSelected, commitDraft, startEditing, stopEditing, onValueChange]
  );

  useEventListener("keydown", handleKeyDown);

  return (
    <td
      className={cx(className, styles.cell, {
        selected: isSelected,
        "selected-other": other,
        editing: isEditing,
      })}
      style={
        {
          ...style,
          "--cell-selection": other?.color,
          textAlign: isNumeric(value) && draft === null ? "right" : "left",
          width: appendUnit(width),
          height: appendUnit(height),
        } as CSSProperties
      }
      onClick={handleClick}
      {...props}
    >
      {other && (
        <div className={styles.user} aria-hidden>
          <img src={other.url} alt={other.url} className={styles.user_avatar} />
          <span className={styles.user_label}>{other.name}</span>
        </div>
      )}
      <input
        tabIndex={-1}
        ref={input}
        readOnly={!isEditing}
        className={styles.input}
        onChange={handleChange}
        onBlur={handleBlur}
        value={value ?? ""}
      />
    </td>
  );
}
