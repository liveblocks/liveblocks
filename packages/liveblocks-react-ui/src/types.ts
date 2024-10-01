import type { CommentAttachment } from "@liveblocks/core";
import type { ComponentPropsWithoutRef, ElementType } from "react";

export type Direction = "ltr" | "rtl";

export type SlotProp = {
  /**
   * Replace the rendered element by the one passed as a child.
   */
  asChild?: boolean;
};

export type ComponentPropsWithSlot<TElement extends ElementType<any>> =
  ComponentPropsWithoutRef<TElement> & SlotProp;

export type ComposerBodyBlockElement = ComposerBodyParagraph;

export type ComposerBodyInlineElement =
  | ComposerBodyText
  | ComposerBodyMention
  | ComposerBodyAutoLink
  | ComposerBodyCustomLink;

export type ComposerBodyParagraph = {
  type: "paragraph";
  children: ComposerBodyInlineElement[];
};

export type ComposerBodyAutoLink = {
  type: "auto-link";
  url: string;
  children: ComposerBodyText[];
};

export type ComposerBodyCustomLink = {
  type: "custom-link";
  url: string;
  children: ComposerBodyText[];
};

export type ComposerBodyMention = {
  type: "mention";
  id: string;
  children: [ComposerBodyEmptyText];
};

export type ComposerBodyText = {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  text: string;
};

export type ComposerBodyMarks = keyof Omit<ComposerBodyText, "text">;

export type ComposerBodyEmptyText = {
  text: "";
};

export type ComposerBody = ComposerBodyBlockElement[];

export interface CommentAttachmentArgs {
  /**
   * The attachment.
   */
  attachment: CommentAttachment;

  /**
   * A presigned URL for the attachment.
   */
  url: string;
}
