import type { Placement } from "@floating-ui/react-dom";
import type {
  CommentBody,
  CommentBodyLink,
  CommentBodyMention,
  CommentBodyText,
} from "@liveblocks/core";

import { isComposerBodyAutoLink } from "../../slate/plugins/auto-links";
import { isComposerBodyCustomLink } from "../../slate/plugins/custom-links";
import { isComposerBodyMention } from "../../slate/plugins/mentions";
import { isText } from "../../slate/utils/is-text";
import type {
  ComposerBody,
  ComposerBodyAutoLink,
  ComposerBodyCustomLink,
  ComposerBodyMention,
  ComposerBodyText,
  Direction,
} from "../../types";
import { exists } from "../../utils/exists";
import {
  isCommentBodyLink,
  isCommentBodyMention,
  isCommentBodyText,
} from "../Comment/utils";
import type { SuggestionsPosition } from "./types";

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
): CommentBodyLink {
  return {
    type: "link",
    url: link.url,
  };
}

export function composerBodyCustomLinkToCommentBodyLink(
  link: ComposerBodyCustomLink
): CommentBodyLink {
  return {
    type: "link",
    url: link.url,
    text: link.children.map((child) => child.text).join("") ?? "",
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
): ComposerBodyAutoLink | ComposerBodyCustomLink {
  if (link.text) {
    return {
      type: "custom-link",
      url: link.url,
      children: [{ text: link.text }],
    };
  } else {
    return {
      type: "auto-link",
      url: link.url,
      children: [{ text: link.url }],
    };
  }
}

export function composerBodyToCommentBody(body: ComposerBody): CommentBody {
  return {
    version: 1,
    content: body.map((block) => {
      const children = block.children
        .map((inline) => {
          if (isComposerBodyMention(inline)) {
            return composerBodyMentionToCommentBodyMention(inline);
          }

          if (isComposerBodyAutoLink(inline)) {
            return composerBodyAutoLinkToCommentBodyLink(inline);
          }

          if (isComposerBodyCustomLink(inline)) {
            return composerBodyCustomLinkToCommentBodyLink(inline);
          }

          if (isText(inline)) {
            return inline as CommentBodyText;
          }

          return null;
        })
        .filter(exists);

      return {
        ...block,
        children,
      };
    }),
  };
}

const emptyComposerBody: ComposerBody = [];

export function commentBodyToComposerBody(body: CommentBody): ComposerBody {
  if (!body || !body?.content) {
    return emptyComposerBody;
  }

  return body.content.map((block) => {
    const children = block.children
      .map((inline) => {
        if (isCommentBodyMention(inline)) {
          return commentBodyMentionToComposerBodyMention(inline);
        }

        if (isCommentBodyLink(inline)) {
          return commentBodyLinkToComposerBodyLink(inline);
        }

        if (isCommentBodyText(inline)) {
          return inline as ComposerBodyText;
        }

        return null;
      })
      .filter(exists);

    return {
      ...block,
      children,
    };
  });
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
