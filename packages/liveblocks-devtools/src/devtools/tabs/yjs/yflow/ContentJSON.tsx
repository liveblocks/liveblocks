import type * as Y from "yjs";

type StringProps = {
  content: Y.ContentJSON;
};

function ContentJSON({ content }: StringProps) {
  return (
    <div className="y-item-string">
      <label>json</label> {content.arr?.toString()}
    </div>
  );
}

export default ContentJSON;
