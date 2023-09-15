import type * as Y from "yjs";

type ContentAnyProps = {
  content: Y.ContentAny;
};

function ContentAny({ content }: ContentAnyProps) {
  return (
    <div className="y-item-deleted">
      <label>any</label>
      {content.getContent().toString()}
    </div>
  );
}

export default ContentAny;
