import cx from "classnames";
import { CSSProperties, useState } from "react";
import { appendUnit } from "../utils";
import styles from "./Cell.module.css";

type Props = {
  displayValue: string;
  width: number;
  height: number;
  selectionColor?: string;
  onChange: (newValue: string) => void;
  getExpression: () => string;
};

export function Cell({
  displayValue,
  width,
  height,
  selectionColor,
  onChange,
  getExpression,
}: Props) {
  const [editingString, setEditingString] = useState<string | null>(null);

  const value = editingString == null ? displayValue : editingString;
  const isNumber = isNumeric(value);

  return (
    <div
      className={cx(styles.container)}
      style={
        {
          "--selection-color": selectionColor,
          textAlign: isNumber && editingString === null ? "right" : "left",
          width: appendUnit(width),
          height: appendUnit(height),
        } as CSSProperties
      }
    >
      <input
        readOnly={editingString === null}
        className={styles.input}
        onChange={(e) => setEditingString(e.target.value)}
        onBlur={(e) => {
          if (editingString !== null) {
            const target = e.target;
            onChange(target.value);
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
                onChange(target.value);
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
    </div>
  );
}

function isNumeric(str: any) {
  return !isNaN(str) && !isNaN(parseFloat(str));
}
