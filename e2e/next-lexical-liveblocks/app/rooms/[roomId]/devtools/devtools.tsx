import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useComposer } from "../composer";
import {
  $isDecoratorNode,
  $isElementNode,
  $isRootNode,
  $isTextNode,
  ElementNode,
  LexicalNode,
  RootNode,
  TextNode,
  $getRoot,
  $getSelection,
  LexicalEditor,
} from "lexical";

const EXTENSION_ID = "dmbopeepjkdlplkjcjbnfiikajiddhnd";

type ChromeApi = {
  runtime: {
    sendMessage: (extensionId: string, message: unknown) => Promise<unknown>;
  };
};

function getChrome(): ChromeApi | null {
  const chrome = (globalThis as typeof globalThis & { chrome?: ChromeApi })
    .chrome;
  if (chrome?.runtime === undefined) {
    return null;
  }
  return chrome;
}

export function DevToolsPlugin() {
  if (getChrome() === null) return null;

  return <DevToolsPluginImpl />;
}

function DevToolsPluginImpl() {
  const chrome = getChrome();
  if (chrome === null) return null;

  const editor = useComposer();
  const root = useRootElement(editor);
  const key = editor.getKey();

  useEffect(() => {
    if (root === null) return;

    chrome.runtime
      .sendMessage(EXTENSION_ID, {
        type: "LEXICAL_EDITOR_MOUNTED",
        payload: {
          id: key,
          state: editor.getEditorState().read(() => $serializeEditor(editor)),
        },
      })
      .catch(() => {
        // `chrome.runtime.sendMessage` throws an error if the extension is not installed or if devtools has not mounted.
      });

    return () => {
      chrome.runtime
        .sendMessage(EXTENSION_ID, {
          type: "LEXICAL_EDITOR_UNMOUNTED",
          payload: {
            id: key,
          },
        })
        .catch(() => {
          // `chrome.runtime.sendMessage` throws an error if the extension is not installed or if devtools has not mounted.
        });
    };
  }, [editor, key, root]);

  useEffect(() => {
    if (root === null) return;

    root.setAttribute("data-lexical-editor-key", key);

    // @ts-ignore
    root.__serialize = function () {
      return editor.getEditorState().read(() => $serializeEditor(editor));
    };

    // @ts-ignore
    root.__getHTMLElement = function (key: string) {
      return editor.getElementByKey(key);
    };

    return () => {
      root.removeAttribute("data-lexical-editor-key");

      // @ts-ignore
      root.__serialize = undefined;

      // @ts-ignore
      root.__getHTMLElement = undefined;
    };
  }, [root, editor, key]);

  useEffect(() => {
    if (root === null) return;

    function handleEditorUpdate() {
      const state = editor
        .getEditorState()
        .read(() => $serializeEditor(editor));

      chrome.runtime
        .sendMessage(EXTENSION_ID, {
          type: "UPDATE_EDITOR_STATE",
          payload: {
            id: key,
            state,
          },
        })
        .catch(() => {
          // `chrome.runtime.sendMessage` throws an error if the extension is not installed or if devtools has not mounted.
        });
    }

    return editor.registerUpdateListener(handleEditorUpdate);
  }, [editor, key, root]);

  return null;
}

function useRootElement(editor: LexicalEditor): HTMLElement | null {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return editor.registerRootListener(onStoreChange);
    },
    [editor]
  );

  const getSnapshot = useCallback(() => {
    return editor.getRootElement();
  }, [editor]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export interface SerializedEditorState {
  id: string;
  namespace: string;
  root: SerializedRootNode;
  selection: SerializedSelection | null;
  version: 0.1;
}

export function $serializeEditor(editor: LexicalEditor): SerializedEditorState {
  const root = $serializeNode($getRoot());
  const selection = $serializeSelection($getSelection());

  return {
    id: editor.getKey(),
    namespace: editor._config.namespace,
    root,
    selection,
    version: 0.1,
  };
}

import {
  $isNodeSelection,
  $isRangeSelection,
  BaseSelection,
  NodeSelection,
  RangeSelection,
} from "lexical";

export function $serializeSelection(
  selection: RangeSelection
): SerializedRangeSelection;

export function $serializeSelection(
  selection: NodeSelection
): SerializedNodeSelection;

export function $serializeSelection(
  selection: BaseSelection | null
): SerializedSelection | null;

export function $serializeSelection(
  selection: BaseSelection | null
): SerializedSelection | null {
  if (selection === null) return null;

  const nodes = selection.getNodes().map((node) => node.getKey());

  if ($isRangeSelection(selection)) {
    return {
      type: "range",
      anchor: {
        key: selection.anchor.key,
        offset: selection.anchor.offset,
        type: selection.anchor.type,
      },
      focus: {
        key: selection.focus.key,
        offset: selection.focus.offset,
        type: selection.focus.type,
      },
      format: selection.format,
      nodes,
    };
  }

  if ($isNodeSelection(selection)) {
    return {
      type: "node",
      nodes,
    };
  }

  return {
    type: "unknown",
    nodes,
  };
}

export interface SerializedPoint {
  key: string;
  offset: number;
  type: "text" | "element";
}

export interface SerializedBaseSelection {
  nodes: string[];
}

export interface SerializedRangeSelection extends SerializedBaseSelection {
  type: "range";
  anchor: SerializedPoint;
  focus: SerializedPoint;
  format: number;
}

export interface SerializedNodeSelection extends SerializedBaseSelection {
  type: "node";
}

export interface SerializedUnknownSelection extends SerializedBaseSelection {
  type: "unknown";
}

export type SerializedSelection =
  | SerializedRangeSelection
  | SerializedNodeSelection
  | SerializedUnknownSelection;

export function $serializeNode(node: RootNode): SerializedRootNode;
export function $serializeNode(node: ElementNode): SerializedElementNode;
export function $serializeNode(node: TextNode): SerializedTextNode;
export function $serializeNode(node: LexicalNode): SerializedLexicalNode;
export function $serializeNode(node: LexicalNode): SerializedLexicalNode {
  const meta = node.exportJSON() as JsonObject;

  if ($isRootNode(node)) {
    const children = node.getChildren().map((child) => $serializeNode(child));
    return {
      group: "root",
      key: node.getKey(),
      type: node.getType(),
      children,
      meta,
    };
  }

  if ($isElementNode(node)) {
    const children = node.getChildren().map((child) => $serializeNode(child));
    return {
      group: "element",
      key: node.getKey(),
      type: node.getType(),
      children,
      meta,
    };
  }

  if ($isDecoratorNode(node)) {
    return {
      group: "decorator",
      key: node.getKey(),
      type: node.getType(),
      meta,
    };
  }

  if ($isTextNode(node)) {
    return {
      group: "text",
      key: node.getKey(),
      type: node.getType(),
      text: node.getTextContent(),
      meta,
    };
  }

  return {
    group: "unknown",
    key: node.getKey(),
    type: node.getType(),
    meta,
  };
}

export interface BaseSerializedNode {
  key: string;
  type: string;
  meta: JsonObject;
}

export interface SerializedRootNode extends BaseSerializedNode {
  group: "root";
  children: SerializedLexicalNode[];
}

export interface SerializedElementNode extends BaseSerializedNode {
  group: "element";
  children: SerializedLexicalNode[];
}

export interface SerializedTextNode extends BaseSerializedNode {
  group: "text";
  text: string;
}

export interface SerializedDecoratorNode extends BaseSerializedNode {
  group: "decorator";
}

export interface SerializedLineBreakNode extends BaseSerializedNode {
  group: "line-break";
}

export interface SerializedUnknownNode extends BaseSerializedNode {
  group: "unknown";
}

export type SerializedLexicalNode =
  | SerializedRootNode
  | SerializedElementNode
  | SerializedTextNode
  | SerializedDecoratorNode
  | SerializedLineBreakNode
  | SerializedUnknownNode;

export type Json = JsonScalar | JsonArray | JsonObject;
export type JsonScalar = string | number | boolean | null;
export type JsonArray = Json[];
export type JsonObject = { [key: string]: Json | undefined };
