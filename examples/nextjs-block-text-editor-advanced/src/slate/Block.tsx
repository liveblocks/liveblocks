import { DefaultElement, RenderElementProps } from "slate-react";
import BlockImage from "./BlockImage";
import BlockVideo from "./BlockVideo";
import BlockCodeSandbox from "./BlockCodeSandbox";
import BlockFigma from "./BlockFigma";
import { BlockType } from "./types";
import BlockTweet from "./BlockTweet";

// Note: {children} must be rendered in every element otherwise bugs occur
// https://docs.slatejs.org/api/nodes/element#rendering-void-elements
// https://github.com/ianstormtaylor/slate/issues/3930
export default function Block({
  element,
  children,
  attributes,
}: RenderElementProps) {
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

  if (element.type === BlockType.Image) {
    return (
      <div {...attributes} contentEditable={false}>
        <BlockImage element={element} />
        <div style={{ display: "none" }}>{children}</div>
      </div>
    );
  }

  if (element.type === BlockType.Video) {
    return (
      <div {...attributes} contentEditable={false}>
        <BlockVideo element={element} />
        <div style={{ display: "none" }}>{children}</div>
      </div>
    );
  }

  if (element.type === BlockType.CodeSandbox) {
    return (
      <div {...attributes} contentEditable={false}>
        <BlockCodeSandbox element={element} />
        <div style={{ display: "none" }}>{children}</div>
      </div>
    );
  }

  if (element.type === BlockType.Figma) {
    return (
      <div {...attributes} contentEditable={false}>
        <BlockFigma element={element} />
        <div style={{ display: "none" }}>{children}</div>
      </div>
    );
  }

  if (element.type === BlockType.Tweet) {
    return (
      <div {...attributes} contentEditable={false}>
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
