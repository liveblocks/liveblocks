import { DefaultElement, RenderElementProps } from "slate-react";
import BlockImage from "./BlockImage";
import BlockVideo from "./BlockVideo";
import BlockCodeSandbox from "./BlockCodeSandbox";
import BlockFigma from "./BlockFigma";
import { BlockType } from "../types";
import BlockTweet from "./BlockTweet";
import styles from "./Block.module.css";
import BlockToDo from "./BlockToDo";
import BlockList from "./BlockList";

// If new block created when old block selected, create the following block
// Example: create checkbox block, press enter, new unchecked checkbox is created
export const CreateNewBlockFromBlock: Record<
  string,
  () => { type: BlockType }
> = {
  [BlockType.ToDo]: () => ({ type: BlockType.ToDo, checked: false }),
  [BlockType.List]: () => ({ type: BlockType.List }),
};

// Note: {children} must be rendered in every element otherwise bugs occur
// https://docs.slatejs.org/api/nodes/element#rendering-void-elements
// https://github.com/ianstormtaylor/slate/issues/3930
export default function Block({
  element,
  children,
  attributes,
}: RenderElementProps) {
  if (element.type === BlockType.Title) {
    return (
      <div className={styles.title} {...attributes}>
        {children}
      </div>
    );
  }

  if (element.type === BlockType.Paragraph) {
    return <p {...attributes}>{children}</p>;
  }

  if (element.type === BlockType.H1) {
    return <h1 {...attributes}>{children}</h1>;
  }

  if (element.type === BlockType.H2) {
    return <h2 {...attributes}>{children}</h2>;
  }

  if (element.type === BlockType.H3) {
    return <h3 {...attributes}>{children}</h3>;
  }

  if (element.type === BlockType.List) {
    return (
      <div {...attributes}>
        <BlockList element={element}>{children}</BlockList>
      </div>
    );
  }

  if (element.type === BlockType.ToDo) {
    return (
      <div {...attributes}>
        <BlockToDo element={element}>{children}</BlockToDo>
      </div>
    );
  }

  if (element.type === BlockType.Image) {
    return (
      <div {...attributes} contentEditable={false} className="embed">
        <BlockImage element={element} />
        <div style={{ display: "none" }}>{children}</div>
      </div>
    );
  }

  if (element.type === BlockType.Video) {
    return (
      <div {...attributes} contentEditable={false} className="embed">
        <BlockVideo element={element} />
        <div style={{ display: "none" }}>{children}</div>
      </div>
    );
  }

  if (element.type === BlockType.CodeSandbox) {
    return (
      <div {...attributes} contentEditable={false} className="embed">
        <BlockCodeSandbox element={element} />
        <div style={{ display: "none" }}>{children}</div>
      </div>
    );
  }

  if (element.type === BlockType.Figma) {
    return (
      <div {...attributes} contentEditable={false} className="embed">
        <BlockFigma element={element} />
        <div style={{ display: "none" }}>{children}</div>
      </div>
    );
  }

  if (element.type === BlockType.Tweet) {
    return (
      <div {...attributes} contentEditable={false} className="embed">
        <BlockTweet element={element} />
        <div style={{ display: "none" }}>{children}</div>
      </div>
    );
  }

  return (
    <DefaultElement element={element} attributes={attributes}>
      {children}
    </DefaultElement>
  );
}
