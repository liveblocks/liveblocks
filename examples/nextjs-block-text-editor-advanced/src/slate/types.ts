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

export enum BlockType {
  H1 = "h1",
  H2 = "h2",
  H3 = "h3",
  Paragraph = "paragraph",
  Image = "image",
  Video = "video",
  CodeSandbox = "codesandbox",
  Figma = "figma",
}

export type TextBlock =
  BlockType.H1 | BlockType.H2 | BlockType.H3 | BlockType.Paragraph;

export type ParagraphElement = {
  id: string;
  type: BlockType.Paragraph;
  children: CustomText[];
};

export type HeadingElement = {
  id: string;
  type: BlockType.H1 | BlockType.H2 | BlockType.H3;
  children: CustomText[];
};

export type ImageElement = {
  id: string;
  type: BlockType.Image;
  alt: string | null;
  url: string | null;
  children: [{ text: "" }];
};

export type VideoElement = {
  id: string;
  type: BlockType.Video;
  url: string | null;
  children: [{ text: "" }];
};

export type CodeSandboxElement = {
  id: string;
  type: BlockType.CodeSandbox;
  url: string | null;
  children: [{ text: "" }];
};

export type FigmaElement = {
  id: string;
  type: BlockType.Figma;
  url: string | null;
  children: [{ text: "" }];
}

export type CustomElement =
  ParagraphElement | HeadingElement | ImageElement | VideoElement | CodeSandboxElement | FigmaElement;

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
