import cx from "classnames";
import {
  ChangeEvent,
  ComponentProps,
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { EXPRESSION_ERROR } from "../spreadsheet/interpreter/utils";
import { UserInfo } from "../types";
import { appendUnit } from "../utils/appendUnit";
import { isNumeric } from "../utils/isNumeric";
import { useEvent } from "../utils/useEvent";
import styles from "./Cell.module.css";

export interface Props extends ComponentProps<"td"> {
  displayValue: string;
  width: number;
  height: number;
  isSelected?: boolean;
  user?: UserInfo;
  onSelect: () => void;
  onValueChange: (value: string) => void;
  getExpression: () => string;
}

export function Cell({
  displayValue,
  width,
  height,
  isSelected,
  user,
  onSelect,
  onValueChange,
  getExpression,
  className,
  style,
  ...props
}: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [editingString, setEditingString] = useState<string | null>(null);

  const value = useMemo(
    () => (editingString == null ? displayValue : editingString),
    [editingString, displayValue]
  );
  const isError = useMemo(
    () => displayValue === EXPRESSION_ERROR,
    [displayValue]
  );
  const isEditing = useMemo(() => editingString !== null, [editingString]);

  useEffect(() => {
    if (!isSelected) {
      setEditingString(null);
    }
  }, [isSelected]);

  const startEditing = useCallback(() => {
    input.current?.focus();
    setEditingString(getExpression());
  }, [getExpression]);

  const stopEditing = useCallback(() => {
    setEditingString(null);
    input.current?.blur();
  }, [editingString]);

  const handleClick = useCallback(() => {
    if (isSelected) {
      startEditing();
    } else {
      onSelect();
    }
  }, [onSelect]);

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    setEditingString(value.replace(" ", "").toUpperCase());
  }, []);

  const handleBlur = useCallback(() => {
    setEditingString(null);
  }, []);

  const handleKeyDown = useCallback(
    ({ key }: KeyboardEvent) => {
      if (!isSelected) {
        return;
      }

      if (
        document.activeElement === document.body ||
        document.activeElement === document.getElementById("table")
      ) {
        if (key === "Enter") {
          startEditing();
        } else if (key === "Backspace" || key === "Delete") {
          onValueChange("");
        }
      } else if (document.activeElement === input.current) {
        if (key === "Enter") {
          if (editingString !== null) {
            onValueChange(editingString);
          }
          stopEditing();
        } else if (key === "Escape") {
          stopEditing();
        }
      }
    },
    [isSelected, startEditing, stopEditing, editingString, onValueChange]
  );

  useEvent("keydown", handleKeyDown);

  return (
    <td
      className={cx(className, styles.cell, {
        selected: isSelected,
        editing: isEditing,
        user: user,
      })}
      style={
        {
          ...style,
          "--cell-selection": user?.color,
          textAlign:
            isNumeric(value) && editingString === null ? "right" : "left",
          width: appendUnit(width),
          height: appendUnit(height),
        } as CSSProperties
      }
      onClick={handleClick}
      {...props}
    >
      {user && (
        <div className={styles.user} aria-hidden>
          <img src={user.url} alt={user.url} className={styles.user_avatar} />
          <span className={styles.user_label}>{user.name}</span>
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
