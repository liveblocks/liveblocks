import type { InitialEditorStateType } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { Binding, ExcludedProperties, Provider, } from "@lexical/yjs";
import type { Point } from "lexical";
import { $isElementNode, $isTextNode } from "lexical";
import type { ReactNode } from "react";
import React, { createContext, useContext, useEffect, useMemo } from "react";
import type {
  Doc,
  RelativePosition
} from "yjs";
import {
  createRelativePositionFromTypeIndex
} from "yjs";

import type {
  CursorsContainerRef
} from "./useYjsCollaboration";
import {
  useYjsCollaboration,
  useYjsFocusTracking,
  useYjsHistory,
} from "./useYjsCollaboration";

type CollaborationContextType = {
  clientID: number;
  color: string;
  isCollabActive: boolean;
  name: string;
  yjsDocMap: Map<string, Doc>;
};

const entries = [
  ["Cat", "rgb(125, 50, 0)"],
  ["Dog", "rgb(100, 0, 0)"],
  ["Rabbit", "rgb(150, 0, 0)"],
  ["Frog", "rgb(200, 0, 0)"],
  ["Fox", "rgb(200, 75, 0)"],
  ["Hedgehog", "rgb(0, 75, 0)"],
  ["Pigeon", "rgb(0, 125, 0)"],
  ["Squirrel", "rgb(75, 100, 0)"],
  ["Bear", "rgb(125, 100, 0)"],
  ["Tiger", "rgb(0, 0, 150)"],
  ["Leopard", "rgb(0, 0, 200)"],
  ["Zebra", "rgb(0, 0, 250)"],
  ["Wolf", "rgb(0, 100, 150)"],
  ["Owl", "rgb(0, 100, 100)"],
  ["Gull", "rgb(100, 0, 100)"],
  ["Squid", "rgb(150, 0, 150)"],
];

const randomEntry = entries[Math.floor(Math.random() * entries.length)];

export const CollaborationContext = createContext<CollaborationContextType>({
  clientID: 0,
  color: randomEntry[1],
  isCollabActive: false,
  name: randomEntry[0],
  yjsDocMap: new Map(),
});

type Props = {
  id: string;
  providerFactory: (
    // eslint-disable-next-line no-shadow
    id: string,
    yjsDocMap: Map<string, Doc>
  ) => Provider;
  shouldBootstrap: boolean;
  username?: string;
  cursorColor?: string;
  cursorsContainerRef?: CursorsContainerRef;
  initialEditorState?: InitialEditorStateType;
  excludedProperties?: ExcludedProperties;
  // `awarenessData` parameter allows arbitrary data to be added to the awareness.
  awarenessData?: object;
  children?: ReactNode;
};

const BindingContext = createContext<Binding | null>(null);

export function useBinding(): Binding {
  const binding = useContext(BindingContext);
  if (binding === null) {
    throw new Error("useBinding must be used within a BindingProvider");
  }
  return binding;
}

export function CollaborationPlugin({
  id,
  providerFactory,
  shouldBootstrap,
  username,
  cursorColor,
  cursorsContainerRef,
  initialEditorState,
  excludedProperties,
  awarenessData,
  children,
}: Props): JSX.Element {
  const collabContext = useCollaborationContext(username, cursorColor);

  const { yjsDocMap, name, color } = collabContext;

  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    collabContext.isCollabActive = true;

    return () => {
      // Reseting flag only when unmount top level editor collab plugin. Nested
      // editors (e.g. image caption) should unmount without affecting it
      if (editor._parentEditor === null) {
        collabContext.isCollabActive = false;
      }
    };
  }, [collabContext, editor]);

  const provider = useMemo(
    () => providerFactory(id, yjsDocMap),
    [id, providerFactory, yjsDocMap]
  );

  const [cursors, binding] = useYjsCollaboration(
    editor,
    id,
    provider,
    yjsDocMap,
    name,
    color,
    shouldBootstrap,
    cursorsContainerRef,
    initialEditorState,
    excludedProperties,
    awarenessData
  );

  collabContext.clientID = binding.clientID;

  useYjsHistory(editor, binding);
  useYjsFocusTracking(editor, provider, name, color, awarenessData);

  console.log({ binding });

  return (
    <BindingContext.Provider value={binding}>
      {children}
      {cursors}
      { /*<Debug />*/}
    </BindingContext.Provider>
  );
}



export function Debug() {
  const binding = useBinding();
  const outputArray = Array.from(binding.collabNodeMap.values());
  // prevent circular references via _parent
  function replacer(_: string, value: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (typeof value === "object" && value?._parent) {
      console.log("Possible circular ref", value);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return {
        ...value,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        _parent: value._parent._key
      };
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return value;
  }
  const output = JSON.stringify(outputArray, replacer, "  ");

  return <pre style={{ zIndex: 10000, position: "fixed", bottom: "0", right: "0", left: "0", background: "rgba(255,255,255,0.8)", height: "500px", overflow: "scroll" }}>{output}</pre>
}

export function useCollaborationContext(
  username?: string,
  color?: string
): CollaborationContextType {
  const collabContext = useContext(CollaborationContext);

  if (username) {
    collabContext.name = username;
  }

  if (color) {
    collabContext.color = color;
  }

  return collabContext;
}

export function getCollabNodeAndOffset(
  sharedType: any,
  offset: number
): [any, number] {
  const collabNode = sharedType._collabNode;

  if (collabNode === undefined) {
    return [null, 0];
  }

  if ("_children" in collabNode) {
    const { node, offset: collabNodeOffset } = getPositionFromElementAndOffset(
      collabNode,
      offset,
      true
    );

    if (node === null) {
      return [collabNode, 0];
    } else {
      return [node, collabNodeOffset];
    }
  }

  return [null, 0];
}

function getPositionFromElementAndOffset(
  node: any,
  offset: number,
  boundaryIsEdge: boolean
): {
  length: number;
  node: any | null;
  nodeIndex: number;
  offset: number;
} {
  let index = 0;
  let i = 0;
  const children = node._children;
  const childrenLength = children.length;

  for (; i < childrenLength; i++) {
    const child = children[i];
    const childOffset = index;
    const size = child.getSize();
    index += size;
    const exceedsBoundary = boundaryIsEdge ? index >= offset : index > offset;

    if (exceedsBoundary && "_text" in child) {
      let textOffset = offset - childOffset - 1;

      if (textOffset < 0) {
        textOffset = 0;
      }

      const diffLength = index - offset;
      return {
        length: diffLength,
        node: child,
        nodeIndex: i,
        offset: textOffset,
      };
    }

    if (index > offset) {
      return {
        length: 0,
        node: child,
        nodeIndex: i,
        offset: childOffset,
      };
    } else if (i === childrenLength - 1) {
      return {
        length: 0,
        node: null,
        nodeIndex: i + 1,
        offset: childOffset + 1,
      };
    }
  }

  return {
    length: 0,
    node: null,
    nodeIndex: 0,
    offset: 0,
  };
}

export function createRelativePosition(
  point: Point,
  binding: Binding
): null | RelativePosition {
  const collabNodeMap = binding.collabNodeMap;
  const collabNode = collabNodeMap.get(point.key);

  if (collabNode === undefined) {
    return null;
  }

  let offset = point.offset;
  let sharedType = collabNode.getSharedType();

  // console.log({ collabNode, sharedType });
  if ("_text" in collabNode) {
    sharedType = collabNode._parent._xmlText;
    const currentOffset = collabNode.getOffset();

    if (currentOffset === -1) {
      return null;
    }

    offset = currentOffset + 1 + offset;
  } else if ("_children" in collabNode && point.type === "element") {
    const parent = point.getNode();
    invariant($isElementNode(parent), "Element point must be an element node");
    let accumulatedOffset = 0;
    let i = 0;
    let node = parent.getFirstChild();
    while (node !== null && i++ < offset) {
      if ($isTextNode(node)) {
        accumulatedOffset += node.getTextContentSize() + 1;
      } else {
        accumulatedOffset++;
      }
      node = node.getNextSibling();
    }
    offset = accumulatedOffset;
  }

  return createRelativePositionFromTypeIndex(sharedType, offset);
}

// invariant(condition, message) will refine types based on "condition", and
// if "condition" is false will throw an error. This function is special-cased
// in flow itself, so we can't name it anything else.
export default function invariant(
  cond?: boolean,
  message?: string,
): asserts cond {
  if (cond) {
    return;
  }

  throw new Error(
    "Internal Lexical error: invariant() is meant to be replaced at compile " +
    "time. There is no runtime version. Error: " +
    message
  );
}
