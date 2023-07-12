import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

export type ChildrenProp = {
  children?: ReactNode;
};

export type SlotProp = {
  asChild?: boolean;
};

export type ComponentPropsWithSlot<TElement extends ElementType<any>> =
  ComponentPropsWithoutRef<TElement> & SlotProp;

export type ComposerBodyBlockElement = ComposerBodyParagraph;

export type ComposerBodyInlineElement = ComposerBodyText | ComposerBodyMention;

export type ComposerBodyParagraph = {
  type: "paragraph";
  children: ComposerBodyInlineElement[];
};

export type ComposerBodyMention = {
  type: "mention";
  userId: string;
  children: [ComposerBodyEmptyText];
};

export type ComposerBodyText = {
  bold?: boolean;
  italic?: boolean;
  text: string;
};

export type ComposerBodyMarks = keyof Omit<ComposerBodyText, "text">;

export type ComposerBodyEmptyText = {
  text: "";
};

export type ComposerBody = ComposerBodyBlockElement[];
