import * as Y from "yjs";

export type YTopAbstractTypeNode = {
  type: "Y.AbstractType";
  data: YAbstractTypeNode["data"];
};

export type YMapNode = {
  type: "Y.Map";
  data: Record<
    string,
    | YAbstractTypeNode
    | YDocNode
    | YContentStringNode
    | YContentAnyNode
    | YContentBinaryNode
    | YTopAbstractTypeNode
  >;
};

export type YArrayNode = {
  type: "Y.Array";
  data: (YAbstractTypeNode | YDocNode | YContentNode | YTopAbstractTypeNode)[];
};

export type YTextNode = {
  type: "Y.Text";
  data: YArrayNode["data"];
};

export type YXmlTextNode = {
  type: "Y.XmlText";
  data: YArrayNode["data"];
};

export type YXmlFragmentNode = {
  type: "Y.XmlFragment";
  data: YArrayNode["data"];
};

export type YXmlElementNode = {
  type: "Y.XmlElement";
  data: YArrayNode["data"];
};

export type YContentStringNode = {
  type: "Y.ContentString";
  data: string;
};

export type YContentBinaryNode = {
  type: "Y.ContentBinary";
  data: Uint8Array;
};

export type YContentFormatNode = {
  type: "Y.ContentFormat";
  data: {
    [key: string]: Object;
  };
};

export type YContentEmbedNode = {
  type: "Y.ContentEmbed";
  data: Object;
};

export type YContentAnyNode = {
  type: "Y.ContentAny";
  data: (Number | Object | Boolean | Array<unknown> | String)[];
};

export type YAbstractTypeNode =
  | YMapNode
  | YArrayNode
  | YTextNode
  | YXmlTextNode
  | YXmlFragmentNode
  | YXmlElementNode;

export type YContentNode =
  | YContentAnyNode
  | YContentBinaryNode
  | YContentStringNode
  | YContentFormatNode
  | YContentEmbedNode;

export type YDocNode = {
  type: "Y.Doc";
  guid: string;
  data: Record<string, YTopAbstractTypeNode>;
};

export type YNode =
  | YDocNode
  | YAbstractTypeNode
  | YContentNode
  | YTopAbstractTypeNode;

export function toYNode(value: Y.Doc): YDocNode;
export function toYNode(value: Y.Map<unknown>): YMapNode;
export function toYNode(value: Y.Array<unknown>): YArrayNode;
export function toYNode(value: Y.Text): YTextNode;
export function toYNode(value: Y.XmlText): YXmlTextNode;
export function toYNode(value: Y.XmlFragment): YXmlFragmentNode;
export function toYNode(value: Y.XmlElement): YXmlElementNode;
export function toYNode(value: Y.AbstractType<unknown>): YTopAbstractTypeNode;

export function toYNode(value: Y.ContentString): YContentStringNode;
export function toYNode(value: Y.ContentFormat): YContentFormatNode;
export function toYNode(value: Y.ContentEmbed): YContentEmbedNode;
export function toYNode(value: Y.ContentAny): YContentAnyNode;
export function toYNode(value: Y.ContentBinary): YContentBinaryNode;

export function toYNode(
  item:
    | Y.Doc
    | Y.AbstractType<unknown>
    | Y.Map<unknown>
    | Y.Array<unknown>
    | Y.Text
    | Y.XmlText
    | Y.XmlFragment
    | Y.XmlElement
    | Y.ContentString
    | Y.ContentFormat
    | Y.ContentEmbed
    | Y.ContentAny
    | Y.ContentBinary
):
  | YDocNode
  | YMapNode
  | YArrayNode
  | YTextNode
  | YXmlTextNode
  | YXmlFragmentNode
  | YXmlElementNode
  | YContentStringNode
  | YContentFormatNode
  | YTopAbstractTypeNode
  | YContentEmbedNode
  | YContentBinaryNode
  | YContentAnyNode
  | undefined {
  if (item instanceof Y.Doc) {
    const result: Record<string, YTopAbstractTypeNode> = {};
    for (const [key, value] of item.share) {
      const type = getType(value);
      const shared = item.get(key, type);
      if (shared instanceof Y.Map) {
        const node = toYNode(shared);
        result[key] = {
          ...node,
          type: "Y.AbstractType",
        };
      } else if (shared instanceof Y.AbstractType) {
        const node = toYNode(shared);
        result[key] = node;
      }
    }
    return {
      type: "Y.Doc",
      guid: item.guid,
      data: result,
    };
  } else if (item instanceof Y.Map) {
    const data: YMapNode["data"] = {};
    item._map.forEach((item, key) => {
      if (item.deleted) return;
      const content = item.content;
      if (content instanceof Y.ContentDoc) {
        data[key] = toYNode(content.doc);
      } else if (content instanceof Y.ContentString) {
        data[key] = toYNode(content);
      } else if (content instanceof Y.ContentAny) {
        data[key] = toYNode(content);
      } else if (content instanceof Y.ContentBinary) {
        data[key] = toYNode(content);
      } else if (content instanceof Y.ContentType) {
        data[key] = toYNode(content.type);
      }
    });

    return {
      type: "Y.Map",
      data,
    };
  } else if (
    item instanceof Y.Array ||
    item instanceof Y.Text ||
    item instanceof Y.XmlText ||
    item instanceof Y.XmlFragment ||
    item instanceof Y.XmlElement ||
    item instanceof Y.AbstractType
  ) {
    const data: YArrayNode["data"] = [];
    let start = item._start;
    while (start !== null) {
      // If the item is deleted, skip it.
      if (start.deleted) {
        start = start.right;
        continue;
      }
      const content = start.content;
      if (content instanceof Y.ContentDoc) {
        data.push(toYNode(content.doc));
      } else if (content instanceof Y.ContentString) {
        data.push(toYNode(content));
      } else if (content instanceof Y.ContentAny) {
        data.push(toYNode(content));
      } else if (content instanceof Y.ContentBinary) {
        data.push(toYNode(content));
      } else if (content instanceof Y.ContentFormat) {
        data.push(toYNode(content));
      } else if (content instanceof Y.ContentEmbed) {
        data.push(toYNode(content));
      } else if (content instanceof Y.ContentType) {
        data.push(toYNode(content.type));
      }

      start = start.right;
    }
    return {
      type: getNodeTypeFromAbstractType(item),
      data,
    };
  } else if (item instanceof Y.ContentString) {
    return {
      type: "Y.ContentString",
      data: item.str,
    };
  } else if (item instanceof Y.ContentFormat) {
    return {
      type: "Y.ContentFormat",
      data: {
        [item.key]: item.value,
      },
    };
  } else if (item instanceof Y.ContentEmbed) {
    return {
      type: "Y.ContentEmbed",
      data: item.embed,
    };
  } else if (item instanceof Y.ContentAny) {
    return {
      type: "Y.ContentAny",
      data: item.arr,
    };
  } else if (item instanceof Y.ContentBinary) {
    return {
      type: "Y.ContentBinary",
      data: item.content,
    };
  }
}

function getNodeTypeFromAbstractType(
  value:
    | Y.Array<any>
    | Y.Text
    | Y.XmlText
    | Y.XmlFragment
    | Y.XmlElement
    | Y.AbstractType<any>
) {
  switch (value.constructor) {
    case Y.Array:
      return "Y.Array";
    case Y.Text:
      return "Y.Text";
    case Y.XmlText:
      return "Y.XmlText";
    case Y.XmlFragment:
      return "Y.XmlFragment";
    case Y.XmlElement:
      return "Y.XmlElement";
    case Y.AbstractType:
      return "Y.AbstractType";
    default:
      throw new Error(`Unsupported Yjs type: ${value.constructor}`);
  }
}

function getType(value: Y.AbstractType<any>) {
  // `value._first` is null for only a Y.Map
  if (!value._first && value._map instanceof Map && value._map.size > 0) {
    return Y.Map;
  }
  // There is not a proper way to distinguish between the rest of the `AbstractType`s, so we return `Y.AbstractType` as the type.
  return Y.AbstractType;
}
