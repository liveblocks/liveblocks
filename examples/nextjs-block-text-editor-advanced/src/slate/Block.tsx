import { DefaultElement, RenderElementProps } from "slate-react";
import BlockImage from "./BlockImage";

// Note: {children} must be rendered in every element otherwise bugs occur
// https://docs.slatejs.org/api/nodes/element#rendering-void-elements
// https://github.com/ianstormtaylor/slate/issues/3930
export default function Block({ element, children, attributes }: RenderElementProps) {
  if (element.type === "image") {
    return (
      <div {...attributes} contentEditable={false}>
        <BlockImage {...element} />
        <div style={{ display: "none" }}>{children}</div>
      </div>
    )
  }

  if (element.type === "paragraph") {
    return (
      <p {...attributes}>
        {children}
      </p>
    );
  }

  return (
    <DefaultElement element={element} attributes={attributes}>{children}</DefaultElement>
  );
}
