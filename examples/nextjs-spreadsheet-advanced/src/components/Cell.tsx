import cx from "classnames";
import { ComponentProps, CSSProperties, useState } from "react";
import { UserInfo } from "../types";
import { appendUnit } from "../utils";
import styles from "./Cell.module.css";

interface Props extends ComponentProps<"td"> {
  displayValue: string;
  width: number;
  height: number;
  selection?: UserInfo;
  onValueChange: (value: string) => void;
  getExpression: () => string;
}

export function Cell({
  displayValue,
  width,
  height,
  selection,
  onValueChange,
  getExpression,
  className,
  style,
  ...props
}: Props) {
  const [editingString, setEditingString] = useState<string | null>(null);

  const value = editingString == null ? displayValue : editingString;
  const isNumber = isNumeric(value);

  return (
    <td
      className={cx(className, styles.cell)}
      style={
        {
          ...style,
          "--cell-selection": selection?.color,
          textAlign: isNumber && editingString === null ? "right" : "left",
          width: appendUnit(width),
          height: appendUnit(height),
        } as CSSProperties
      }
      {...props}
    >
      {selection && (
        <div className={styles.name} aria-hidden>
          {selection.name}
        </div>
      )}
      <input
        readOnly={editingString === null}
        className={styles.input}
        onChange={(e) => setEditingString(e.target.value)}
        onBlur={(e) => {
          if (editingString !== null) {
            const target = e.target;
            onValueChange(target.value);
            setEditingString(null);
          }
        }}
        onKeyDown={(e) => {
          const target = e.target;

          switch (e.key) {
            case "Enter": {
              if (editingString === null) {
                target.focus();
                target.select();
                setEditingString(getExpression());
              } else {
                onValueChange(target.value);
                setEditingString(null);
              }
            }
          }
        }}
        onDoubleClick={() => {
          setEditingString(getExpression());
        }}
        value={value}
      />
    </td>
  );
}

function isNumeric(string: any) {
  return !isNaN(string) && !isNaN(parseFloat(string));
}
