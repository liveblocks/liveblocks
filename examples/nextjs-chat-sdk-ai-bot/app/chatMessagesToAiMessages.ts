import type { AiMessage, Attachment, Message } from "chat";

/**
 * Same MIME prefixes as the `chat` package's `toAiMessages` for text file attachments.
 */
const TEXT_MIME_PREFIXES = [
  "text/",
  "application/json",
  "application/xml",
  "application/javascript",
  "application/typescript",
  "application/yaml",
  "application/x-yaml",
  "application/toml",
] as const;

function isTextMimeType(mimeType: string): boolean {
  return TEXT_MIME_PREFIXES.some(
    (prefix) => mimeType === prefix || mimeType.startsWith(prefix)
  );
}

function attachmentBytes(
  data: ArrayBuffer | Uint8Array | Buffer
): Uint8Array {
  if (data instanceof Uint8Array) {
    return data;
  }
  return new Uint8Array(data);
}

export interface ChatMessagesToAiMessagesOptions {
  includeNames?: boolean;
  onUnsupportedAttachment?: (attachment: Attachment, message: Message) => void;
  /**
   * Called after default processing. Return `null` to skip the message.
   */
  transformMessage?: (
    aiMessage: AiMessage,
    source: Message
  ) => AiMessage | null | Promise<AiMessage | null>;
}

/**
 * Converts Chat SDK messages to AI SDK `ModelMessage[]`, matching `toAiMessages` from
 * `chat` except attachment parts use binary `data` instead of `data:...;base64,...`
 * strings. That avoids AI SDK 6 treating data URLs as remote URLs and throwing
 * `AI_DownloadError` ("URL scheme must be http or https, got data:").
 */
export async function chatMessagesToAiMessages(
  messages: Message[],
  options?: ChatMessagesToAiMessagesOptions
): Promise<AiMessage[]> {
  const includeNames = options?.includeNames ?? false;
  const transformMessage = options?.transformMessage;
  const onUnsupported =
    options?.onUnsupportedAttachment ??
    ((att: Attachment) => {
      console.warn(
        `chatMessagesToAiMessages: unsupported attachment type "${att.type}"${
          att.name ? ` (${att.name})` : ""
        } — skipped`
      );
    });

  const sorted = [...messages].sort(
    (a, b) =>
      (a.metadata.dateSent?.getTime() ?? 0) -
      (b.metadata.dateSent?.getTime() ?? 0)
  );
  const filtered = sorted.filter((msg) => msg.text.trim());

  const results = await Promise.all(
    filtered.map(async (msg) => {
      const role = msg.author.isMe ? "assistant" : "user";
      let textContent =
        includeNames && role === "user"
          ? `[${msg.author.userName}]: ${msg.text}`
          : msg.text;

      if (msg.links && msg.links.length > 0) {
        const linkParts = msg.links
          .map((link) => {
            const parts = link.fetchMessage
              ? [`[Embedded message: ${link.url}]`]
              : [link.url];
            if (link.title) {
              parts.push(`Title: ${link.title}`);
            }
            if (link.description) {
              parts.push(`Description: ${link.description}`);
            }
            if (link.siteName) {
              parts.push(`Site: ${link.siteName}`);
            }
            return parts.join("\n");
          })
          .join("\n\n");
        textContent += `\n\nLinks:\n${linkParts}`;
      }

      let aiMessage: AiMessage;

      if (role === "user") {
        const attachmentParts: Array<
          | { type: "text"; text: string }
          | {
              type: "file";
              data: Uint8Array;
              mediaType: string;
              filename?: string;
            }
        > = [];

        for (const att of msg.attachments ?? []) {
          const filePart = await attachmentToAiFilePart(att);
          if (filePart) {
            attachmentParts.push(filePart);
          } else if (att.type === "video" || att.type === "audio") {
            onUnsupported(att, msg);
          }
        }

        if (attachmentParts.length > 0) {
          aiMessage = {
            role,
            content: [{ type: "text", text: textContent }, ...attachmentParts],
          };
        } else {
          aiMessage = { role, content: textContent };
        }
      } else {
        aiMessage = { role: "assistant", content: textContent };
      }

      if (transformMessage) {
        return {
          result: await transformMessage(aiMessage, msg),
          source: msg,
        };
      }
      return { result: aiMessage, source: msg };
    })
  );

  return results
    .filter((r) => r.result != null)
    .map((r) => r.result as AiMessage);
}

async function attachmentToAiFilePart(
  att: Attachment
): Promise<{
  type: "file";
  data: Uint8Array;
  mediaType: string;
  filename?: string;
} | null> {
  if (att.type === "image") {
    if (!att.fetchData) {
      return null;
    }
    try {
      const buffer = await att.fetchData();
      const mimeType = att.mimeType ?? "image/png";
      return {
        type: "file",
        data: attachmentBytes(buffer),
        mediaType: mimeType,
        filename: att.name,
      };
    } catch (error) {
      console.error(
        "chatMessagesToAiMessages: failed to fetch image data",
        error
      );
      return null;
    }
  }

  if (att.type === "file" && att.mimeType && isTextMimeType(att.mimeType)) {
    if (!att.fetchData) {
      return null;
    }
    try {
      const buffer = await att.fetchData();
      return {
        type: "file",
        data: attachmentBytes(buffer),
        filename: att.name,
        mediaType: att.mimeType,
      };
    } catch (error) {
      console.error(
        "chatMessagesToAiMessages: failed to fetch file data",
        error
      );
      return null;
    }
  }

  return null;
}
