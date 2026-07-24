import type { JSONContent } from "@tiptap/core";

function serializeMarks(text: string, marks?: JSONContent["marks"]): string {
  if (!marks?.length) {
    return text;
  }

  let result = text;
  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        result = `**${result}**`;
        break;
      case "italic":
        result = `*${result}*`;
        break;
      case "strike":
        result = `~~${result}~~`;
        break;
      case "code":
        result = `\`${result}\``;
        break;
    }
  }
  return result;
}

function serializeInline(node: JSONContent): string {
  switch (node.type) {
    case "text":
      return serializeMarks(node.text ?? "", node.marks);
    case "mention":
      return `<@${String(node.attrs?.id ?? "")}>`;
    case "hardBreak":
      return "\n";
    default:
      return (node.content ?? []).map(serializeInline).join("");
  }
}

function serializeBlock(node: JSONContent): string {
  switch (node.type) {
    case "paragraph":
      return (node.content ?? []).map(serializeInline).join("");
    case "codeBlock": {
      const code = (node.content ?? [])
        .map((child) => child.text ?? "")
        .join("\n");
      return `\`\`\`\n${code}\n\`\`\``;
    }
    default:
      return (node.content ?? []).map(serializeBlock).join("\n\n");
  }
}

export function serializeMarkdown(doc: JSONContent): string {
  if (doc.type !== "doc") {
    return "";
  }

  return (doc.content ?? [])
    .map(serializeBlock)
    .join("\n\n")
    .trim();
}

export function isMessageEmpty(doc: JSONContent): boolean {
  return serializeMarkdown(doc).length === 0;
}
