
import type * as Y from "yjs";

type StringProps = {
  content: Y.ContentFormat;
};

function ContentFormat({ content }: StringProps) {


  return <div className="y-item-format">
    <label>format</label> {content.value.toString()}
  </div>;
}

export default ContentFormat;
