import type * as Y from "yjs";

type ContentEmbedProps = {
  content: Y.ContentEmbed;
};

function ContentEmbed({ content }: ContentEmbedProps) {
  return (
    <div className="y-item-deleted">
      <label>embed</label>
      {content.getContent().toString()}
    </div>
  );
}

export default ContentEmbed;
