import styles from "./BlockToDo.module.css";
import { CustomElement, ToDoElement } from "../types";
import { ReactNode } from "react";
import { ReactEditor, useSlate } from "slate-react";
import { Transforms } from "slate";
import classNames from "classnames";
import CheckIcon from "../icons/check.svg";
import { useState } from "react";
import { useEffect } from "react";

type Props = {
  element: ToDoElement;
  children: ReactNode;
};

export default function BlockToDo({ element, children }: Props) {
  const editor = useSlate();
  const [animating, setAnimating] = useState(false);
  let timer: NodeJS.Timeout;

  useEffect(() => {
    clearTimeout(timer);
  })

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
  
            setAnimating(e.target.checked);

            timer = setTimeout(() => {
              setAnimating(false);
              clearTimeout(timer);
            }, 400);
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

          <path d="M4 8L7 11L12 4" strokeWidth="1.5" className={classNames(styles.check, { [styles.check_animating]: animating, [styles.check_not_animating]: !animating })}/>

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
