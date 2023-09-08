import type * as Y from "yjs";

type DeletedProps = {
  content: Y.ContentDeleted;
};

function ContentDeleted({ content }: DeletedProps) {
  return (
    <div className="y-item-deleted">
      <label>deleted</label>
      length: {content.len}
    </div>
  );
}

export default ContentDeleted;
