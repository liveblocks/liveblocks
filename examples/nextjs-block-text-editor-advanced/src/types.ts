import { LiveMap, LiveObject, LiveList } from "@liveblocks/client";

export type BlockProps = TextBlock | VideoBlock;

export enum BlockType {
  Text,
  Video,
}

export type VideoBlock = {
  type: BlockType.Video;
  url: string | null;
};

export type TextBlock = {
  type: BlockType.Text;
  node: BlockTopLevelNode;
};

export type TextSelection = {
  caretPosition: number | null;
};

export type Presence = {
  selectedBlockIds: string[];
  textSelection: TextSelection | null;
};

export type Storage = {
  meta: LiveObject<DocumentMeta>;
  blocks: LiveMap<string, LiveObject<BlockProps>>;
  blockIds: LiveList<string>;
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

export enum BlockNodeType {
  HeadingOne,
  HeadingTwo,
  HeadingThree,
  Paragraph,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Misc,
  Br,
  Text,
}

export type BlockNode =
  | ParagraphBlockNode
  | HeadingOneBlockNode
  | HeadingTwoBlockNode
  | HeadingThreeBlockNode
  | BoldBlockNode
  | UnderlineBlockNode
  | ItalicBlockNode
  | StrikethroughBlockNode
  | MiscBlockNode
  | BrBlockNode
  | TextBlockNode;

export type BlockTopLevelNodeType =
  | BlockNodeType.HeadingOne
  | BlockNodeType.HeadingTwo
  | BlockNodeType.HeadingThree
  | BlockNodeType.Paragraph;

export type BlockTopLevelNode =
  | HeadingOneBlockNode
  | HeadingTwoBlockNode
  | HeadingThreeBlockNode
  | ParagraphBlockNode;

export type HeadingOneBlockNode = {
  type: BlockNodeType.HeadingOne;
  children: BlockNode[];
};

export type HeadingTwoBlockNode = {
  type: BlockNodeType.HeadingTwo;
  children: BlockNode[];
};

export type HeadingThreeBlockNode = {
  type: BlockNodeType.HeadingThree;
  children: BlockNode[];
};

export type ParagraphBlockNode = {
  type: BlockNodeType.Paragraph;
  children: BlockNode[];
};

export type BoldBlockNode = {
  type: BlockNodeType.Bold;
  children: BlockNode[];
};

export type ItalicBlockNode = {
  type: BlockNodeType.Italic;
  children: BlockNode[];
};

export type UnderlineBlockNode = {
  type: BlockNodeType.Underline;
  children: BlockNode[];
};

export type StrikethroughBlockNode = {
  type: BlockNodeType.Strikethrough;
  children: BlockNode[];
};

export type MiscBlockNode = {
  type: BlockNodeType.Misc;
  children: BlockNode[];
};

export type BrBlockNode = {
  type: BlockNodeType.Br;
};

export type TextBlockNode = {
  type: BlockNodeType.Text;
  text: string;
};

export type Format = "bold" | "underline" | "strikeThrough" | "italic";

export type Theme = "light" | "dark";
