"use client";

import {
  CodeHighlightNode,
  CodeNode,
  registerCodeHighlighting,
} from "@lexical/code";
import {
  $createHorizontalRuleNode,
  HorizontalRuleNode,
  INSERT_HORIZONTAL_RULE_COMMAND,
} from "@lexical/extension";
import { HashtagNode } from "@lexical/hashtag";
import {
  AutoLinkNode,
  LinkNode,
  createLinkMatcherWithRegExp,
} from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { MarkNode } from "@lexical/mark";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { AutoLinkPlugin } from "@lexical/react/LexicalAutoLinkPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HashtagPlugin } from "@lexical/react/LexicalHashtagPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { $insertNodeToNearestRoot } from "@lexical/utils";
import { LiveList, LiveObject, LiveText, type Room } from "@liveblocks/client";
import { LiveblocksCollaborationPlugin } from "@liveblocks/lexical/react";
import { ClientSideSuspense, RoomProvider, useRoom } from "@liveblocks/react";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
} from "lexical";
import { use, useCallback, useEffect, useSyncExternalStore } from "react";

import { ImageNode } from "./nodes/ImageNode";
import { MentionNode } from "./nodes/MentionNode";
import { Toolbar } from "./toolbar";

const URL_REGEX =
  /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)(?<![-.+():%])/;

const EMAIL_REGEX =
  /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

const AUTO_LINK_MATCHERS = [
  createLinkMatcherWithRegExp(URL_REGEX, (text) =>
    text.startsWith("http") ? text : `https://${text}`
  ),
  createLinkMatcherWithRegExp(EMAIL_REGEX, (text) => `mailto:${text}`),
];

const THEME = {
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
    strikethrough: "line-through",
    code: "rounded bg-neutral-100 p-1 font-mono text-sm dark:bg-neutral-800",
  },
  quote: "mb-4 border-l-4 border-neutral-300 pl-4 dark:border-neutral-700",
  heading: {
    h1: "mb-4 text-4xl font-bold",
    h2: "mb-4 text-3xl font-bold",
    h3: "mb-4 text-2xl font-bold",
    h4: "mb-4 text-xl font-bold",
    h5: "mb-4 text-lg font-bold",
    h6: "mb-4 text-base font-bold",
  },
  paragraph: "mb-4 text-base",
  link: "pointer-events-none text-blue-500 underline after:pointer-events-auto after:cursor-pointer after:font-bold after:content-['↗']",
  list: {
    ul: "mb-4 list-disc",
    ol: "mb-4 list-decimal",
    listitem: "mb-1 ml-4",
  },
  code: "mb-4 block overflow-x-auto rounded bg-neutral-100 px-4 py-2 font-mono text-sm dark:bg-neutral-800",
  codeHighlight: {
    atrule: "text-purple-700 dark:text-purple-300",
    attr: "text-purple-700 dark:text-purple-300",
    boolean: "text-amber-700 dark:text-amber-300",
    builtin: "text-emerald-700 dark:text-emerald-300",
    cdata: "text-neutral-500",
    char: "text-emerald-700 dark:text-emerald-300",
    class: "text-sky-700 dark:text-sky-300",
    "class-name": "text-sky-700 dark:text-sky-300",
    comment: "text-neutral-500 italic",
    constant: "text-amber-700 dark:text-amber-300",
    deleted: "text-red-600",
    doctype: "text-neutral-500",
    entity: "text-orange-700 dark:text-orange-300",
    function: "text-sky-700 dark:text-sky-300",
    important: "text-rose-700 dark:text-rose-300",
    inserted: "text-emerald-700",
    keyword: "text-purple-700 dark:text-purple-300",
    namespace: "text-rose-700 dark:text-rose-300",
    number: "text-amber-700 dark:text-amber-300",
    operator: "text-orange-700 dark:text-orange-300",
    prolog: "text-neutral-500",
    property: "text-amber-700 dark:text-amber-300",
    punctuation: "text-neutral-600 dark:text-neutral-300",
    regex: "text-rose-700 dark:text-rose-300",
    selector: "text-emerald-700 dark:text-emerald-300",
    string: "text-emerald-700 dark:text-emerald-300",
    symbol: "text-amber-700 dark:text-amber-300",
    tag: "text-amber-700 dark:text-amber-300",
    url: "text-orange-700 dark:text-orange-300",
    variable: "text-rose-700 dark:text-rose-300",
  },
  hr: "my-6 border-0 border-t border-neutral-300 dark:border-neutral-700",
  hrSelected: "outline outline-2 outline-offset-2 outline-blue-500",
  table: "mb-4 w-full table-fixed border-collapse",
  tableCell:
    "relative border border-neutral-300 p-2 align-top dark:border-neutral-700",
  tableCellHeader: "bg-neutral-100 font-semibold dark:bg-neutral-900",
  tableSelected: "outline outline-2 outline-blue-500",
  tableCellSelected: "bg-blue-50 dark:bg-blue-950",
  mark: "rounded bg-yellow-200 dark:bg-yellow-800",
  markOverlap: "rounded bg-yellow-300 dark:bg-yellow-700",
  hashtag: "text-blue-600 dark:text-blue-400",
  mention:
    "rounded bg-blue-100 px-0.5 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  image: "inline-block",
};

export default function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{ selection: null }}
      initialStorage={{
        document: new LiveObject({
          kind: "root",
          type: "root",
          version: 1,
          children: new LiveList([
            new LiveObject({
              kind: "element",
              type: "paragraph",
              version: 1,
              children: new LiveList([
                new LiveObject({
                  kind: "text",
                  type: "text",
                  version: 1,
                  content: new LiveText(),
                }),
              ]),
            }),
          ]),
        }),
      }}
    >
      <ClientSideSuspense fallback={null}>
        <div className="flex h-dvh flex-col bg-white text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
          <Editor />
        </div>
      </ClientSideSuspense>
    </RoomProvider>
  );
}

function Editor() {
  const room = useRoom();
  const root = useRoot(room);
  if (root === null) {
    return (
      <div className="p-4 text-neutral-500 dark:text-neutral-400">Loading…</div>
    );
  }

  const document = root.get("document");

  return (
    <LexicalComposer
      initialConfig={{
        namespace: "Liveblocks",
        nodes: [
          HeadingNode,
          QuoteNode,
          ListNode,
          ListItemNode,
          CodeNode,
          CodeHighlightNode,
          LinkNode,
          AutoLinkNode,
          HorizontalRuleNode,
          TableNode,
          TableCellNode,
          TableRowNode,
          MarkNode,
          HashtagNode,
          ImageNode,
          MentionNode,
        ],
        theme: THEME,
        onError: (error) => {
          console.error(error);
        },
      }}
    >
      <Toolbar />
      <div className="relative flex flex-1 text-base mt-4">
        <RichTextPlugin
          contentEditable={
            <ContentEditable className="flex-1 px-4 outline-none" />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <ListPlugin />
        <LinkPlugin />
        <AutoLinkPlugin matchers={AUTO_LINK_MATCHERS} />
        <TablePlugin />
        <HashtagPlugin />
        <MarkdownShortcutPlugin />
        <HorizontalRulePlugin />
        <CodeHighlightPlugin />
        <AutoFocusPlugin />
        <LiveblocksCollaborationPlugin room={room} root={document} />
      </div>
    </LexicalComposer>
  );
}

function HorizontalRulePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      INSERT_HORIZONTAL_RULE_COMMAND,
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }

        $insertNodeToNearestRoot($createHorizontalRuleNode());
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  return null;
}

function CodeHighlightPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return registerCodeHighlighting(editor);
  }, [editor]);

  return null;
}

function useRoot(room: Room) {
  const subscribe = room.events.storageDidLoad.subscribeOnce;
  const getSnapshot = room.getStorageOrNull;
  const getServerSnapshot = useCallback(() => {
    return null;
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
