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
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={classNames(styles.checkbox, {
            [styles.checkbox_checked]: element.checked,
          })}
        >
          <rect width="16" height="16" rx="4" className={styles.background} />

          <rect
            x="0.75"
            y="0.75"
            width="14.5"
            height="14.5"
            rx="3.25"
            stroke="black"
            strokeWidth="1.5"
            className={styles.border}
          />

          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12.6103 4.43593L7.09571 12.1564L3.46967 8.53033L4.53033 7.46967L6.9043 9.84364L11.3897 3.56407L12.6103 4.43593Z"
            className={styles.check}
          />
        </svg>
      </div>

      <div
        className={classNames(styles.todo_text, {
          [styles.todo_text_checked]: element.checked,
        })}
      >
        {children}
      </div>
    </div>
  );
}
