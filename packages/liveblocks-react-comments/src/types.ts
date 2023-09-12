import type { ComponentPropsWithoutRef, ElementType } from "react";

export type Direction = "ltr" | "rtl";

export type SlotProp = {
  asChild?: boolean;
};

export type ComponentPropsWithSlot<TElement extends ElementType<any>> =
  ComponentPropsWithoutRef<TElement> & SlotProp;

export type ComposerBodyBlockElement = ComposerBodyParagraph;

export type ComposerBodyInlineElement =
  | ComposerBodyText
  | ComposerBodyMention
  | ComposerBodyAutoLink;

export type ComposerBodyParagraph = {
  type: "paragraph";
  children: ComposerBodyInlineElement[];
};

export type ComposerBodyAutoLink = {
  type: "auto-link";
  href: string;
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
