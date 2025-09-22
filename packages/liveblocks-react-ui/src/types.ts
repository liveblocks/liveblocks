import type { CommentAttachment, Relax } from "@liveblocks/core";
import type { ComponentPropsWithoutRef, ElementType } from "react";
import type { BaseEditor } from "slate";
import type { HistoryEditor } from "slate-history";
import type { ReactEditor } from "slate-react";

export type Direction = "ltr" | "rtl";

export type SlotProp = {
  /**
   * Replace the rendered element by the one passed as a child.
   */
  asChild?: boolean;
};

export type ComponentPropsWithSlot<TElement extends ElementType<any>> =
  ComponentPropsWithoutRef<TElement> & SlotProp;
export type SlateEmptyText = {
  text: "";
};

export type ComposerEditor = BaseEditor & ReactEditor & HistoryEditor;

export type ComposerBodyBlockElement = ComposerBodyParagraph;

export type ComposerBodyInlineElement =
  | ComposerBodyText
  | ComposerBodyMention
  | ComposerBodyAutoLink
  | ComposerBodyCustomLink;

export type ComposerBodyElement =
  | ComposerBodyParagraph
  | ComposerBodyMention
  | ComposerBodyAutoLink
  | ComposerBodyCustomLink;

export type ComposerBodyInlineNonTextElement = Exclude<
  ComposerBodyInlineElement,
  ComposerBodyText
>;

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

export type ComposerBodyMention = Relax<
  ComposerBodyUserMention | ComposerBodyGroupMention
>;

type ComposerBodyUserMention = {
  type: "mention";
  kind: "user";
  id: string;
  children: [SlateEmptyText];
};

type ComposerBodyGroupMention = {
  type: "mention";
  kind: "group";
  id: string;
  userIds?: string[];
  children: [SlateEmptyText];
};

export type ComposerBodyText = {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  text: string;
};

export type ComposerBodyMark = keyof Omit<ComposerBodyText, "text">;

export type ComposerBodyMarks = {
  [K in ComposerBodyMark]: boolean;
};

export type ComposerBody = ComposerBodyBlockElement[];

export type AiComposerEditor = BaseEditor & ReactEditor & HistoryEditor;

export type AiComposerBodyBlockElement = AiComposerBodyParagraph;

export type AiComposerBodyInlineElement = AiComposerBodyText;

export type AiComposerBodyElement = AiComposerBodyParagraph;

export type AiComposerBodyInlineNonTextElement = Exclude<
  AiComposerBodyInlineElement,
  AiComposerBodyText
>;

export type AiComposerBodyParagraph = {
  type: "paragraph";
  children: AiComposerBodyInlineElement[];
};

export type AiComposerBodyText = {
  text: string;
};

export type AiComposerBody = AiComposerBodyBlockElement[];

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
