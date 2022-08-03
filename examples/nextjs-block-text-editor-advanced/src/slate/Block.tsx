import { DefaultElement, RenderElementProps } from "slate-react";
import BlockImage from "./BlockImage";
import BlockVideo from "./BlockVideo";
import BlockCodeSandbox from "./BlockCodeSandbox";

// TODO - Chris' ideas
// code highlighting component
// multiplayer tldraw component

// Note: {children} must be rendered in every element otherwise bugs occur
// https://docs.slatejs.org/api/nodes/element#rendering-void-elements
// https://github.com/ianstormtaylor/slate/issues/3930
export default function Block({
  element,
  children,
  attributes,
}: RenderElementProps) {
  if (element.type === "paragraph") {
    return <p {...attributes}>{children}</p>;
  }

  if (element.type === "h1") {
    return <h1 {...attributes}>{children}</h1>;
  }

  if (element.type === "h2") {
    return <h2 {...attributes}>{children}</h2>;
  }

  if (element.type === "h3") {
    return <h3 {...attributes}>{children}</h3>;
  }

  if (element.type === "image") {
    return (
      <div {...attributes} contentEditable={false}>
        <BlockImage element={element} />
        <div style={{ display: "none" }}>{children}</div>
      </div>
    );
  }

  if (element.type === "video") {
    return (
      <div {...attributes} contentEditable={false}>
        <BlockVideo element={element} />
        <div style={{ display: "none" }}>{children}</div>
      </div>
    );
  }

  if (element.type === "codesandbox") {
    return (
      <div {...attributes} contentEditable={false}>
        <BlockCodeSandbox element={element} />
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
