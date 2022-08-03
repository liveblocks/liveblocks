import { LiveObject, LiveList } from "@liveblocks/client";
import { BaseEditor, BaseOperation } from "slate";
import { ReactEditor } from "slate-react";

declare module "slate" {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor;
    Element: CustomElement;
    Text: CustomText;
    Operation: BaseOperation & { isRemote?: boolean };
  }
}

export type Presence = {
  selectedBlockId: string | null;
};

export type Storage = {
  meta: LiveObject<DocumentMeta>;
  blocks: LiveList<CustomElement>;
};

export type DocumentMeta = {
  title: string | null;
};

export type UserMeta = {
  id: string;
  info: {
    name: string;
    imageUrl: string;
  };
};

export type ParagraphElement = {
  id: string;
  type: "paragraph";
  children: CustomText[];
};

export type HeadingElement = {
  id: string;
  type: "h1" | "h2" | "h3";
  children: CustomText[];
};

export type ImageElement = {
  id: string;
  type: "image";
  alt: string | null;
  url: string | null;
  children: [{ text: "" }];
};

export type VideoElement = {
  id: string;
  type: "video";
  url: string | null;
  children: [{ text: "" }];
};

export type CodeSandboxElement = {
  id: string;
  type: "codesandbox";
  url: string | null;
  children: [{ text: "" }];
};

export type CustomElement =
  ParagraphElement | HeadingElement | ImageElement | VideoElement | CodeSandboxElement;

export type CustomText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikeThrough?: boolean;
} & LeafDecoration;

type LeafDecoration = {
  placeholder?: boolean;
};

export type Format = "bold" | "underline" | "strikeThrough" | "italic";

export type Theme = "light" | "dark";
