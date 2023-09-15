import type * as Y from "yjs";

type ContentBinaryProps = {
  content: Y.ContentBinary;
};

function ContentBinary({ content }: ContentBinaryProps) {
  return (
    <div className="y-item-deleted">
      <label>binary</label>
      Length: {content.getLength()}
    </div>
  );
}

export default ContentBinary;
