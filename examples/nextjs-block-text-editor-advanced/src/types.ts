import { LiveList } from "@liveblocks/client";
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
  blocks: LiveList<CustomElement>;
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
  ToDo = "todo",
  Paragraph = "paragraph",
  Image = "image",
  Video = "video",
  CodeSandbox = "codesandbox",
  Figma = "figma",
  Tweet = "tweet",
}

export type TextBlock =
  | BlockType.Title
  | BlockType.H1
  | BlockType.H2
  | BlockType.H3
  | BlockType.Paragraph;

export type BlockElement = {
  id: string;
  children: CustomText[];
};

export type ParagraphElement = BlockElement & {
  type: BlockType.Paragraph;
};

export type HeadingElement = BlockElement & {
  type: BlockType.H1 | BlockType.H2 | BlockType.H3;
};

export type ToDoElement = BlockElement & {
  type: BlockType.ToDo;
  checked: boolean;
}

export type ImageElement = BlockElement & {
  type: BlockType.Image;
  url: string | null;
  alt: string | null;
  children: [{ text: "" }];
};

export type VideoElement = BlockElement & {
  type: BlockType.Video;
  url: string | null;
  children: [{ text: "" }];
};

export type CodeSandboxElement = BlockElement & {
  type: BlockType.CodeSandbox;
  url: string | null;
  children: [{ text: "" }];
};

export type FigmaElement = BlockElement & {
  type: BlockType.Figma;
  url: string | null;
  children: [{ text: "" }];
};

export type TweetElement = BlockElement & {
  type: BlockType.Tweet;
  tweetId: string | null;
  children: [{ text: "" }];
};

export type TitleElement = BlockElement & {
  type: BlockType.Title;
};

export type CustomElement =
  | TitleElement
  | ParagraphElement
  | HeadingElement
  | ToDoElement
  | ImageElement
  | VideoElement
  | CodeSandboxElement
  | FigmaElement
  | TweetElement;

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
