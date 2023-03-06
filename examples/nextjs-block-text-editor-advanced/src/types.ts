import type { LiveRoot, SlatePresence } from "@liveblocks/slate";
import { BaseEditor, BaseElement, BaseOperation } from "slate";
import { ReactEditor } from "slate-react";

declare module "slate" {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor;
    Element: CustomElement;
    Text: CustomText;
    Operation: BaseOperation & { isRemote?: boolean };
  }
}

export type Presence = SlatePresence<"selection">;

export type Storage = {
  slateRoot: LiveRoot;
};

export type UserMeta = {
  id: string;
  info: {
    name: string;
    imageUrl: string;
  };
};

export enum BlockType {
  Title = "title",
  H1 = "h1",
  H2 = "h2",
  H3 = "h3",
  BulletedList = "bulleted-list",
  ToDo = "todo",
  Paragraph = "paragraph",
  Image = "image",
  Video = "video",
  CodeSandbox = "codesandbox",
  Figma = "figma",
}

export type TextBlock =
  | BlockType.Title
  | BlockType.H1
  | BlockType.H2
  | BlockType.H3
  | BlockType.Paragraph
  | BlockType.BulletedList
  | BlockType.ToDo;

export type BlockMetadata = {
  createdBy?: number;
};

export type ParagraphElement = BaseElement & {
  type: BlockType.Paragraph;
};

export type HeadingElement = BaseElement & {
  type: BlockType.H1 | BlockType.H2 | BlockType.H3;
};

export type ListElement = BaseElement & {
  type: BlockType.BulletedList;
};

export type ToDoElement = BaseElement & {
  type: BlockType.ToDo;
  checked: boolean;
};

export type ImageElement = BaseElement & {
  type: BlockType.Image;
  url: string | null;
  alt: string | null;
};

export type VideoElement = BaseElement & {
  type: BlockType.Video;
  url: string | null;
};

export type CodeSandboxElement = BaseElement & {
  type: BlockType.CodeSandbox;
  url: string | null;
};

export type FigmaElement = BaseElement & {
  type: BlockType.Figma;
  url: string | null;
};

export type TitleElement = BaseElement & {
  type: BlockType.Title;
};

export type ElementWithId = BaseElement & {
  id: string;
};

export type CustomElement = (
  | TitleElement
  | ParagraphElement
  | HeadingElement
  | ListElement
  | ToDoElement
  | ImageElement
  | VideoElement
  | CodeSandboxElement
  | FigmaElement
) &
  (ElementWithId | {}) &
  BlockMetadata;

export type CustomText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikeThrough?: boolean;
} & LeafDecoration;

type LeafDecoration = {
  placeholder?: string;
};

export type Format = "bold" | "underline" | "strikeThrough" | "italic";

export type Theme = "light" | "dark";
