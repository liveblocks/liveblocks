
import type * as Y from "yjs";

type StringProps = {
  content: Y.ContentString;
};

function ContentString({ content }: StringProps) {


  return <div className="y-item-string">
    <label>string</label> {content.str}
  </div>;
}

export default ContentString;
