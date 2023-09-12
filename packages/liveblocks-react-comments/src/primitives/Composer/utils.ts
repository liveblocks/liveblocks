import type { Placement } from "@floating-ui/react-dom";
import type {
  CommentBody,
  CommentBodyLink,
  CommentBodyMention,
} from "@liveblocks/core";
import { Text as SlateText } from "slate";

import { isComposerBodyMention } from "../../slate/plugins/mentions";
import type {
  ComposerBody,
  ComposerBodyAutoLink,
  ComposerBodyMention,
  Direction,
} from "../../types";
import { isCommentBodyLink, isCommentBodyMention } from "../Comment/utils";
import type { SuggestionsPosition } from "./types";
import { isComposerBodyAutoLink } from "../../slate/plugins/auto-links";

export function composerBodyMentionToCommentBodyMention(
  mention: ComposerBodyMention
): CommentBodyMention {
  return {
    type: "mention",
    id: mention.id,
  };
}

export function composerBodyAutoLinkToCommentBodyLink(
  link: ComposerBodyAutoLink
): any {
  return {
    type: "link",
    url: link.url,
  };
}

export function commentBodyMentionToComposerBodyMention(
  mention: CommentBodyMention
): ComposerBodyMention {
  return {
    type: "mention",
    id: mention.id,
    children: [{ text: "" }],
  };
}

export function commentBodyLinkToComposerBodyLink(
  link: CommentBodyLink
): ComposerBodyAutoLink {
  return {
    type: "auto-link",
    url: link.url,
    children: [
      {
        text: link.url,
      },
    ],
  };
}

export function composerBodyToCommentBody(body: ComposerBody): CommentBody {
  return {
    version: 1,
    content: body.map((block) => ({
      ...block,
      children: block.children.map((inline) => {
        if (SlateText.isText(inline)) {
          return inline;
        }

        if (isComposerBodyMention(inline)) {
          return composerBodyMentionToCommentBodyMention(inline);
        }

        if (isComposerBodyAutoLink(inline)) {
          return composerBodyAutoLinkToCommentBodyLink(inline);
        }

        return inline;
      }),
    })),
  };
}

export function commentBodyToComposerBody(body: CommentBody): ComposerBody {
  return body.content.map((block) => ({
    ...block,
    children: block.children.map((inline) => {
      if (isCommentBodyMention(inline)) {
        return commentBodyMentionToComposerBodyMention(inline);
      }

      if (isCommentBodyLink(inline)) {
        return commentBodyLinkToComposerBodyLink(inline);
      }

      return inline;
    }),
  }));
}

export function getPlacementFromPosition(
  position: SuggestionsPosition,
  direction: Direction = "ltr"
): Placement {
  return `${position}-${direction === "rtl" ? "end" : "start"}`;
}

export function getSideAndAlignFromPlacement(placement: Placement) {
  const [side, align = "center"] = placement.split("-");

  return [side, align] as const;
}
