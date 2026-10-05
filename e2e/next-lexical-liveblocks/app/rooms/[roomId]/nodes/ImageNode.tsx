"use client";

import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  LexicalUpdateJSON,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import { $applyNodeReplacement, DecoratorNode } from "lexical";
import type { JSX } from "react";

export type ImagePayload = {
  altText: string;
  src: string;
  height?: number;
  width?: number;
  key?: NodeKey;
};

export type SerializedImageNode = Spread<
  {
    altText: string;
    src: string;
    height?: number;
    width?: number;
  },
  SerializedLexicalNode
>;

function $convertImageElement(domNode: Node): DOMConversionOutput | null {
  if (!(domNode instanceof HTMLImageElement)) {
    return null;
  }

  const { alt: altText, src, width, height } = domNode;
  return {
    node: $createImageNode({
      altText,
      src,
      width: width || undefined,
      height: height || undefined,
    }),
  };
}

function ImageComponent({
  src,
  altText,
  width,
  height,
}: {
  src: string;
  altText: string;
  width?: number;
  height?: number;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={altText}
      width={width}
      height={height}
      className="my-4 max-w-full rounded"
      draggable={false}
    />
  );
}

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __altText: string;
  __width: number | undefined;
  __height: number | undefined;

  static getType(): string {
    return "image";
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__width,
      node.__height,
      node.__key
    );
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { altText, src, width, height } = serializedNode;
    return $createImageNode({ altText, src, width, height }).updateFromJSON(
      serializedNode
    );
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: () => ({
        conversion: $convertImageElement,
        priority: 0,
      }),
    };
  }

  constructor(
    src: string,
    altText: string,
    width?: number,
    height?: number,
    key?: NodeKey
  ) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__width = width;
    this.__height = height;
  }

  exportJSON(): SerializedImageNode {
    return {
      ...super.exportJSON(),
      altText: this.__altText,
      src: this.__src,
      width: this.__width,
      height: this.__height,
    };
  }

  updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedImageNode>): this {
    const node = super.updateFromJSON(serializedNode);
    const writable = node.getWritable();
    if (serializedNode.src !== undefined) {
      writable.__src = serializedNode.src;
    }
    if (serializedNode.altText !== undefined) {
      writable.__altText = serializedNode.altText;
    }
    if ("width" in serializedNode) {
      writable.__width = serializedNode.width;
    }
    if ("height" in serializedNode) {
      writable.__height = serializedNode.height;
    }
    return writable;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("img");
    element.setAttribute("src", this.__src);
    element.setAttribute("alt", this.__altText);
    if (this.__width !== undefined) {
      element.setAttribute("width", String(this.__width));
    }
    if (this.__height !== undefined) {
      element.setAttribute("height", String(this.__height));
    }
    return { element };
  }

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement("span");
    const theme = config.theme;
    if (theme.image !== undefined) {
      span.className = theme.image;
    }
    return span;
  }

  updateDOM(): false {
    return false;
  }

  getSrc(): string {
    return this.__src;
  }

  getAltText(): string {
    return this.__altText;
  }

  decorate(): JSX.Element {
    return (
      <ImageComponent
        src={this.__src}
        altText={this.__altText}
        width={this.__width}
        height={this.__height}
      />
    );
  }
}

export function $createImageNode({
  altText,
  src,
  width,
  height,
  key,
}: ImagePayload): ImageNode {
  return $applyNodeReplacement(new ImageNode(src, altText, width, height, key));
}

export function $isImageNode(
  node: LexicalNode | null | undefined
): node is ImageNode {
  return node instanceof ImageNode;
}
