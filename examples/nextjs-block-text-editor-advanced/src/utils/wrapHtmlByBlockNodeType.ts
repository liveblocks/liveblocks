import { BlockNodeType } from "../types";

const wrapHtmlByBlockNodeType = (type: BlockNodeType, html: string): string => {
  switch (type) {
    case BlockNodeType.Bold:
      return `<strong>${html}</strong>`;
    case BlockNodeType.Italic:
      return `<em>${html}</em>`;
    case BlockNodeType.Underline:
      return `<u>${html}</u>`;
    case BlockNodeType.Strikethrough:
      return `<strike>${html}</strike>`;
    default:
      return html;
  }
};

export default wrapHtmlByBlockNodeType;
