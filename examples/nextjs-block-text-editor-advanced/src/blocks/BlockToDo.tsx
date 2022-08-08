import styles from "./BlockToDo.module.css";
import { CustomElement, ToDoElement } from "../types";
import { ReactNode } from "react";
import { ReactEditor, useSlate } from "slate-react";
import { Transforms } from "slate";

type Props = {
  element: ToDoElement;
  children: ReactNode;
};

export default function BlockToDo({ element, children }: Props) {
  const editor = useSlate();

  return (
    <div className={styles.block_todo}>
      <div className={styles.todo_checkbox_col} contentEditable={false}>
        <input
          className={styles.todo_checkbox}
          type="checkbox"
          checked={element.checked}
          onChange={(e) => {
            const path = ReactEditor.findPath(editor, element);
            const newProperties: Partial<CustomElement> = {
              checked: e.target.checked,
            };
            Transforms.setNodes<CustomElement>(editor, newProperties, {
              at: path,
            });
          }}
        />
      </div>
      <div className={styles.todo_text}>
        {children}
      </div>
    </div>
  );
}
