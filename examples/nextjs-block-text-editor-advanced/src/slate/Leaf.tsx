import classNames from "classnames";
import { RenderLeafProps } from "slate-react";
import styles from "../../styles/BlockText.module.css";

export default function Leaf({ leaf, children, attributes }: RenderLeafProps) {
  if (leaf.placeholder) {
    return (
      <>
        <span {...attributes}>{children}</span>
        <div
          className={classNames(styles.placeholder, "placeholder")}
          contentEditable={false}
        >
          Type something here…
        </div>
      </>
    );
  }

  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }

  if (leaf.italic) {
    children = <em>{children}</em>;
  }

  if (leaf.underline) {
    children = <u>{children}</u>;
  }

  if (leaf.strikeThrough) {
    children = <del>{children}</del>;
  }

  return <span {...attributes}>{children}</span>;
}
