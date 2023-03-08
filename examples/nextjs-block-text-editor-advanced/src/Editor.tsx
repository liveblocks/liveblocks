import styles from "./Editor.module.css";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import isHotkey from "is-hotkey";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  createEditor,
  Descendant,
  Editor,
  NodeEntry,
  Path,
  Range,
  Transforms,
} from "slate";
import {
  Editable,
  ReactEditor,
  RenderElementProps,
  Slate,
  useSlateStatic,
  withReact,
} from "slate-react";

import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import classNames from "classnames";

import {
  createWithLiveblocks,
  createWithPresence,
  LiveblocksEditor,
  withHistory,
} from "@liveblocks/slate";
import Block from "./blocks/Block";
import Leaf from "./blocks/Leaf";
import { Avatar, BlockInlineActions, Header, Toolbar } from "./components";
import { HOTKEYS, PROSE_CONTAINER_ID, USER_COLORS } from "./constants";
import { useList, useRoom } from "./liveblocks.config";
import { isElementWithId, withElementIds } from "./plugins/withElementIds";
import { withLayout } from "./plugins/withLayout";
import { withResetBlockOnBreak } from "./plugins/withResetBlockOnBreak";
import { withShortcuts } from "./plugins/withShortcuts";
import { CustomElement, ElementWithId, UserMeta } from "./types";
import {
  isNotUndefined,
  omitTopLevelElementAttributes,
  removeGlobalCursor,
  setGlobalCursor,
  toggleMark,
} from "./utils";

const EMPTY_VALUE: Descendant[] = [];

const useEditor = () => {
  const room = useRoom();
  const liveRoot = useList("slateRoot");

  const editor = useMemo(() => {
    const withLiveblocks = createWithLiveblocks({ room, liveRoot });
    const withPresence = createWithPresence({
      presenceSpanField: "selection",
    });

    return withShortcuts(
      withLayout(
        withReact(
          withResetBlockOnBreak(
            withPresence(
              withHistory(withLiveblocks(withElementIds(createEditor())))
            )
          )
        )
      )
    );
  }, [room, liveRoot]);

  return editor;
};

export default function App() {
  const editor = useEditor();

  useEffect(() => {
    LiveblocksEditor.connect(editor);
    return () => LiveblocksEditor.disconnect(editor);
  }, [editor]);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const draggedElement = editor.children.find(
    (x) => isElementWithId(x) && x.id === draggedId
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (event.active) {
      clearSelection();
      setDraggedId(event.active.id as string);
    }

    setGlobalCursor("grabbing");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    removeGlobalCursor("grabbing");

    const overId = event.over?.id;
    if (overId == null) {
      setDraggedId(null);
    }

    const overIndex = editor.children.findIndex((x: any) => x.id === overId);
    if (overId !== draggedId && overIndex !== -1) {
      Transforms.moveNodes(editor, {
        at: [],
        match: (n) => isElementWithId(n) && n.id === draggedId,
        to: [overIndex],
      });
    }

    setDraggedId(null);
  };

  const handleDragCancel = () => {
    setDraggedId(null);
  };

  const clearSelection = () => {
    ReactEditor.blur(editor);
    window.getSelection()?.empty();
  };

  const renderElement = useCallback((props: RenderElementProps) => {
    const path = ReactEditor.findPath(editor, props.element);
    const isTopLevel = path.length === 1;
    const { element } = props;

    if (!isTopLevel || path[0] === 0 || !isElementWithId(element)) {
      return <Block {...props} />;
    }

    return (
      <SortableElement {...props} element={element}>
        <Block {...omitTopLevelElementAttributes(props)} />
      </SortableElement>
    );
  }, []);

  const dndItems = useMemo(
    () =>
      editor.children
        .map((child) => (isElementWithId(child) ? child.id : undefined))
        .filter(isNotUndefined),
    [editor.children]
  );

  const decorate = useCallback(([node, path]: NodeEntry) => {
    if (
      path.length !== 0 ||
      editor.selection == null ||
      Editor.isEditor(node) ||
      Editor.string(editor, [path[0]]) !== "" ||
      !Range.includes(editor.selection, path) ||
      !Range.isCollapsed(editor.selection)
    ) {
      return [];
    }

    return [
      {
        ...editor.selection,
        placeholder: "Type something here…",
      },
    ];
  }, []);

  return (
    <div className={styles.editor}>
      <Header />

      <div
        className={classNames(styles.prose, "prose")}
        id={PROSE_CONTAINER_ID}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.container}>
          <Slate editor={editor} value={EMPTY_VALUE}>
            <Toolbar />
            <DndContext
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext
                items={dndItems}
                strategy={verticalListSortingStrategy}
              >
                <Editable
                  placeholder="Write something…"
                  renderElement={renderElement}
                  renderLeaf={Leaf}
                  /**
                   * Inspired by this great article from https://twitter.com/_jkrsp
                   * https://jkrsp.com/slate-js-placeholder-per-line/
                   **/
                  decorate={decorate}
                  onKeyDown={(event) => {
                    for (const hotkey in HOTKEYS) {
                      if (
                        isHotkey(hotkey, event as any) &&
                        editor.selection &&
                        !Range.includes(editor.selection, [0]) // Do not apply marks if selection include title
                      ) {
                        event.preventDefault();
                        const mark = HOTKEYS[hotkey];
                        toggleMark(editor, mark);
                      }
                    }
                  }}
                />
              </SortableContext>
              {createPortal(
                <DragOverlay adjustScale={false}>
                  {draggedElement && (
                    <DragOverlayContent
                      element={draggedElement}
                      renderElement={renderElement}
                    />
                  )}
                </DragOverlay>,
                document.getElementById(PROSE_CONTAINER_ID) || document.body
              )}
            </DndContext>
          </Slate>
        </div>
      </div>
    </div>
  );
}

function SortableElement({
  attributes,
  element,
  children,
}: RenderElementProps & {
  element: ElementWithId;
}) {
  const editor = useSlateStatic();
  const sortable = useSortable({ id: element.id });

  // TODO:
  const othersByBlockId: (UserMeta & { connectionId: number })[] = [];
  const onDelete = useCallback(
    () =>
      Transforms.removeNodes(editor, {
        at: ReactEditor.findPath(editor, element),
      }),
    []
  );

  const onInsertBelow = useCallback((block: CustomElement) => {
    Transforms.insertNodes(editor, block, {
      at: Path.next(ReactEditor.findPath(editor, element)),
      select: true,
    });
  }, []);

  return (
    <div className={styles.block} {...attributes}>
      <div
        className={styles.sortable}
        {...sortable.attributes}
        ref={sortable.setNodeRef}
        style={{
          transition: sortable.transition,
          transform: CSS.Transform.toString(sortable.transform),
          pointerEvents: sortable.isSorting ? "none" : undefined,
          opacity: sortable.isDragging ? 0 : 1,
        }}
      >
        {children}
        {othersByBlockId.length > 0 && (
          <div
            className={classNames(styles.avatars, "avatars")}
            contentEditable={false}
            style={{ userSelect: "none" }}
          >
            {othersByBlockId.map((user) => {
              return (
                <Avatar
                  key={user.connectionId}
                  imageUrl={user.info.imageUrl}
                  name={user.info.name}
                  size="sm"
                  color={USER_COLORS[user.connectionId % USER_COLORS.length]}
                />
              );
            })}
          </div>
        )}
        <div
          className={classNames(styles.inline_actions, "inline_actions")}
          contentEditable={false}
          style={{ userSelect: "none" }}
        >
          <BlockInlineActions
            blockId={element.id}
            onDelete={onDelete}
            onInsertBelow={onInsertBelow}
          />
        </div>
      </div>
    </div>
  );
}

function DragOverlayContent({
  element,
  renderElement,
}: {
  element: Descendant;
  renderElement: (props: RenderElementProps) => JSX.Element;
}) {
  const editor = useMemo(() => withReact(createEditor()), []);
  const [value] = useState([JSON.parse(JSON.stringify(element))]); // clone

  return (
    <Slate editor={editor} value={value}>
      <Editable
        readOnly={true}
        renderElement={renderElement}
        renderLeaf={Leaf}
      />
    </Slate>
  );
}
