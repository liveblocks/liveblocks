import styles from "./BlockToDo.module.css";
import { CustomElement, ToDoElement } from "../types";
import { ReactNode } from "react";
import { ReactEditor, useSlate } from "slate-react";
import { Transforms } from "slate";
import classNames from "classnames";
import CheckIcon from "../icons/check.svg";

type Props = {
  element: ToDoElement;
  children: ReactNode;
};

export default function BlockToDo({ element, children }: Props) {
  const editor = useSlate();

  return (
    <div className={styles.block_todo}>
      <div className={styles.checkbox_container} contentEditable={false}>
        <input
          className={styles.checkbox_element}
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
        <div
          className={classNames(styles.checkbox, {
            [styles.checkbox_checked]: element.checked,
          })}
        >
          <CheckIcon
            className={classNames(styles.check_icon, {
              [styles.check_icon_checked]: element.checked,
            })}
          />
        </div>
      </div>
      <div className={styles.todo_text}>{children}</div>
    </div>
  );
}
