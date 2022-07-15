import { useState } from "react";
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
  const [editingStr, setEditingString] = useState<string | null>(null);

  const value = editingStr == null ? displayValue : editingStr;
  const isNumber = isNumeric(value);

  return (
    <input
      style={{
        textAlign: isNumber && editingStr === null ? "right" : "left",
        width: width + "px",
        height: height + "px",
        border: selectionColor ? "solid 2px " + selectionColor : undefined,
      }}
      readOnly={editingStr === null}
      className={styles.input}
      onChange={(e) => setEditingString(e.target.value)}
      onBlur={(e) => {
        if (editingStr !== null) {
          const target = e.target;
          onChange(target.value);
          setEditingString(null);
        }
      }}
      onKeyDown={(e) => {
        const target = e.target;

        switch (e.key) {
          case "Enter": {
            if (editingStr === null) {
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
  );
}

function isNumeric(str: any) {
  return !isNaN(str) && !isNaN(parseFloat(str));
}
