import type * as Y from "yjs";

type ContentTypeProps = {
  content: Y.ContentType;
};

function ContentType({ content }: ContentTypeProps) {
  return (
    <div className="y-item-deleted">
      <label>type</label>
      {content.getContent().toString()}
    </div>
  );
}

export default ContentType;
