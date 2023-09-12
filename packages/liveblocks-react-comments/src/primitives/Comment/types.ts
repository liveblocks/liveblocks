import type { CommentBody } from "@liveblocks/core";
import type { ComponentType } from "react";

import type { ComponentPropsWithSlot } from "../../types";

export type CommentMentionProps = ComponentPropsWithSlot<"span">;

export type CommentRenderMentionProps = {
  /**
   * The mention's user ID.
   */
  userId: string;
};

export type CommentLinkProps = ComponentPropsWithSlot<"a">;

export type CommentRenderLinkProps = {
  /**
   * The link's URL.
   * @example "https://example.com", "www.example.com", etc.
   */
  url: string;
};

export interface CommentBodyProps
  extends Omit<ComponentPropsWithSlot<"div">, "children"> {
  /**
   * The comment body to display.
   * If not defined, the component will render `null`.
   */
  body?: CommentBody;

  /**
   * The component used to render mentions.
   */
  renderMention?: ComponentType<CommentRenderMentionProps>;

  /**
   * The component used to render links.
   */
  renderLink?: ComponentType<CommentRenderLinkProps>;
}
