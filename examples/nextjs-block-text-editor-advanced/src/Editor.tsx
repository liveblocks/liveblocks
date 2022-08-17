import styles from "./Editor.module.css";

import isHotkey from "is-hotkey";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  createEditor,
  Editor,
  Element,
  Node,
  Point,
  Range,
  Transforms,
} from "slate";
import {
  Editable,
  ReactEditor,
  RenderElementProps,
  Slate,
  withReact,
} from "slate-react";
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

import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import classNames from "classnames";

import {
  useList,
  useOthers,
  useRoom,
  useUpdateMyPresence,
} from "./liveblocks.config";
import { BlockType, CustomElement } from "./types";
import {
  removeGlobalCursor,
  setGlobalCursor,
  toggleMark,
  withLayout,
  withNodeId,
} from "./utils";
import Leaf from "./blocks/Leaf";
import Block, { CreateNewBlockFromBlock } from "./blocks/Block";
import { HOTKEYS, PROSE_CONTAINER_ID, USER_COLORS } from "./constants";
import {
  Avatar,
  BlockInlineActions,
  Header,
  Loading,
  Toolbar,
} from "./components";
import { nanoid } from "nanoid";

const SHORTCUTS: Record<string, BlockType> = {
  "*": BlockType.BulletedList,
  "-": BlockType.BulletedList,
  "+": BlockType.BulletedList,
  "#": BlockType.H1,
  "##": BlockType.H2,
  "###": BlockType.H3,
  "[]": BlockType.ToDo,
};

const useEditor = () =>
  useMemo(
    () => withShortcuts(withNodeId(withLayout(withReact(createEditor())))),
    []
  );

function isNodeWithId(editor: Editor, id: string) {
  return (node: Node) => Editor.isBlock(editor, node) && node.id === id;
}

export default function App() {
  const editor = useEditor();

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeElement = editor.children.find(
    (x) => "id" in x && x.id === activeId
  ) as CustomElement | undefined;

  const room = useRoom();
  const blocks = useList("blocks");
  const isEditingRef = useRef(false);
  const updateMyPresence = useUpdateMyPresence();

  useEffect(() => {
    const { insertBreak } = editor;
    // Override editor to insert paragraph or element after inserting new line
    editor.insertBreak = () => {
      if (editor.selection) {
        const previousBlock = editor.children[
          editor.selection.anchor.path[0]
        ] as CustomElement;

        let newBlock;

        // Default paragraph new line
        const paragraphBlock: CustomElement = {
          type: BlockType.Paragraph,
          children: [{ text: "" }],
          id: nanoid(),
        };

        // If caret at position 0, convert previous block to empty paragraph
        if (editor.selection.anchor.offset === 0) {
          Transforms.setNodes(editor, paragraphBlock, {
            at: editor.selection,
          });

          // Pass state of old block to new block
          newBlock = previousBlock;
        }

        // Create different current element on new line if set in Block.tsx
        if (
          !newBlock &&
          previousBlock?.type &&
          Object.keys(CreateNewBlockFromBlock).includes(previousBlock?.type)
        ) {
          newBlock = CreateNewBlockFromBlock[previousBlock.type]();
        }

        if (!newBlock) {
          newBlock = paragraphBlock;
        }

        insertBreak();
        Transforms.setNodes(editor, newBlock as any, {
          at: editor.selection,
        });
      } else {
        insertBreak();
      }
    };
  }, [editor]);

  useEffect(() => {
    if (blocks == null) {
      return;
    }

    return room.subscribe(
      blocks,
      (updates) => {
        if (isEditingRef.current) {
          return;
        }

        isEditingRef.current = true;

        // We want to apply every operations without intermediate normalization to avoid in
        Editor.withoutNormalizing(editor, () => {
          for (const update of updates) {
            if (update.type === "LiveList" && update.node === blocks) {
              for (const delta of update.updates) {
                if (delta.type === "set") {
                  editor.apply({
                    type: "remove_node",
                    path: [delta.index],
                    node: editor.children[delta.index],
                    isRemote: true,
                  });
                  editor.apply({
                    type: "insert_node",
                    path: [delta.index],
                    node: delta.item as CustomElement,
                    isRemote: true,
                  });
                } else if (delta.type === "move") {
                  editor.apply({
                    type: "move_node",
                    path: [delta.previousIndex],
                    newPath: [delta.index],
                    isRemote: true,
                  });
                } else if (delta.type === "insert") {
                  editor.apply({
                    type: "insert_node",
                    path: [delta.index],
                    node: delta.item as CustomElement,
                    isRemote: true,
                  });
                } else if (delta.type === "delete") {
                  editor.apply({
                    type: "remove_node",
                    path: [delta.index],
                    node: editor.children[delta.index],
                    isRemote: true,
                  });
                }
              }
            }
          }
        });

        isEditingRef.current = false;
      },
      { isDeep: true }
    );
  }, [blocks]);

  const handleDragStart = (event: DragStartEvent) => {
    if (event.active) {
      clearSelection();
      setActiveId(event.active.id as string);
    }

    setGlobalCursor("grabbing");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    removeGlobalCursor("grabbing");

    const overId = event.over?.id;
    if (overId == null) {
      setActiveId(null);
    }

    const overIndex = editor.children.findIndex((x: any) => x.id === overId);
    if (overId !== activeId && overIndex !== -1) {
      Transforms.moveNodes(editor, {
        at: [],
        match: isNodeWithId(editor, activeId as string),
        to: [overIndex],
      });
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const clearSelection = () => {
    ReactEditor.blur(editor);
    Transforms.deselect(editor);
    window.getSelection()?.empty();
  };

  const renderElement = useCallback((props: RenderElementProps) => {
    const path = ReactEditor.findPath(editor, props.element);
    const isTopLevel = path.length === 1;

    return isTopLevel && path[0] !== 0 ? (
      <SortableElement
        {...props}
        renderElement={Block}
        onDelete={() =>
          Transforms.removeNodes(editor, {
            at: ReactEditor.findPath(editor, props.element),
          })
        }
        onInsertBelow={(block: CustomElement) => {
          const path = [ReactEditor.findPath(editor, props.element)[0] + 1];

          Transforms.insertNodes(editor, block, {
            at: path,
          });

          // Defer selection to be able to focus the element we just inserted
          setTimeout(() => {
            ReactEditor.focus(editor);
            Transforms.select(editor, {
              anchor: { path: [path[0], 0], offset: 0 },
              focus: { path: [path[0], 0], offset: 0 },
            });
          }, 0);
        }}
      />
    ) : (
      <Block {...props} />
    );
  }, []);

  const items = useMemo(
    () => editor.children.map((element: any) => element.id),
    [editor.children]
  );

  if (blocks == null) {
    return <Loading />;
  }

  return (
    <div className={styles.editor}>
      <Header />

      <div
        className={classNames(styles.prose, "prose")}
        id={PROSE_CONTAINER_ID}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.container}>
          <Slate
            editor={editor}
            value={blocks?.toArray()}
            onChange={() => {
              if (blocks == null) {
                return;
              }

              // Synchronizing Liveblocks storage and presence...

              // Setting a flag to make sure that we don't create an infinite loop with Storage subscriptions
              isEditingRef.current = true;

              room.batch(() => {
                // If the operation is a "move_node", we assume that it's coming from the drag operation and we simply call LiveList.move
                if (
                  editor.operations.length === 1 &&
                  editor.operations[0].type === "move_node" &&
                  editor.operations[0].isRemote === false
                ) {
                  const moveOperation = editor.operations[0];
                  blocks.move(moveOperation.path[0], moveOperation.newPath[0]);
                  return;
                }

                if (editor.selection) {
                  updateMyPresence({
                    selectedBlockId: (
                      editor.children[
                        editor.selection.anchor.path[0]
                      ] as CustomElement
                    ).id,
                  });
                } else {
                  updateMyPresence({
                    selectedBlockId: null,
                  });
                }

                if (
                  editor.operations.every(
                    (op) => op.isRemote || op.type === "set_selection"
                  )
                ) {
                  return;
                }

                // Naive algorithm to patch Liveblocks LiveList. Performance could be vastly improved
                const children = editor.children as CustomElement[];

                // Insert missing blocks
                for (let i = 0; i < editor.children.length; i++) {
                  const child = editor.children[i] as CustomElement;
                  const liveblocksChildIndex = blocks.findIndex(
                    (block) => block.id === child.id
                  );

                  if (liveblocksChildIndex === -1) {
                    blocks.insert(child, i);
                  }
                }

                // Delete blocks that are not in Slate children
                for (let i = 0; i < blocks.length; i++) {
                  const block = blocks.get(i)!;

                  if (
                    children.some((child) => child.id === block.id) === false
                  ) {
                    blocks.delete(i);
                    i--;
                  }
                }

                // At this point child that are not equals by reference needs to be replaced
                for (let i = 0; i < children.length; i++) {
                  const child = children[i];
                  const block = blocks.get(i);

                  if (child !== block) {
                    blocks.set(i, child);
                  }
                }
              });

              isEditingRef.current = false;
            }}
          >
            <Toolbar />
            <DndContext
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext
                items={items}
                strategy={verticalListSortingStrategy}
              >
                <Editable
                  renderElement={renderElement}
                  renderLeaf={Leaf}
                  /**
                   * Inspired by this great article from https://twitter.com/_jkrsp
                   * https://jkrsp.com/slate-js-placeholder-per-line/
                   **/
                  decorate={([node, path]) => {
                    if (editor.selection != null) {
                      if (
                        !Editor.isEditor(node) &&
                        Editor.string(editor, [path[0]]) === "" &&
                        Range.includes(editor.selection, path) &&
                        Range.isCollapsed(editor.selection)
                      ) {
                        return [
                          {
                            ...editor.selection,
                            placeholder: "Type something here…",
                          },
                        ];
                      }
                    }

                    return [];
                  }}
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
                  {activeElement && (
                    <DragOverlayContent
                      element={activeElement}
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
  renderElement,
  onDelete,
  onInsertBelow,
}: RenderElementProps & {
  renderElement: any;
  onDelete: () => void;
  onInsertBelow: (block: CustomElement) => void;
}) {
  const sortable = useSortable({ id: element.id });
  const othersByBlockId = useOthers()
    .toArray()
    .filter((user) => user.presence?.selectedBlockId === element.id);

  return (
    <div className={styles.block} {...attributes}>
      <div
        className={styles.sortable}
        {...sortable.attributes}
        ref={sortable.setNodeRef}
        style={
          {
            transition: sortable.transition,
            transform: CSS.Transform.toString(sortable.transform),
            pointerEvents: sortable.isSorting ? "none" : undefined,
            opacity: sortable.isDragging ? 0 : 1,
          } as React.CSSProperties /* cast because of css variable */
        }
      >
        {renderElement({ element, children })}
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
  element: CustomElement;
  renderElement: (props: RenderElementProps) => JSX.Element;
}) {
  const editor = useEditor();
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

function withShortcuts(editor: Editor) {
  const { deleteBackward, insertText } = editor;

  editor.insertText = (text) => {
    const { selection } = editor;

    if (text.endsWith(" ") && selection && Range.isCollapsed(selection)) {
      const { anchor } = selection;
      const block = Editor.above(editor, {
        match: (n) => Editor.isBlock(editor, n),
      });
      const path = block ? block[1] : [];
      const start = Editor.start(editor, path);
      const range = { anchor, focus: start };
      const beforeText = Editor.string(editor, range) + text.slice(0, -1);
      const type = SHORTCUTS[beforeText];

      if (type) {
        Transforms.select(editor, range);

        if (!Range.isCollapsed(range)) {
          Transforms.delete(editor);
        }

        const newProperties: Partial<CustomElement> = {
          type,
        };
        Transforms.setNodes<CustomElement>(editor, newProperties, {
          match: (n) => Editor.isBlock(editor, n),
        });

        return;
      }
    }

    insertText(text);
  };

  editor.deleteBackward = (...args: unknown[]) => {
    const { selection } = editor;

    if (selection && Range.isCollapsed(selection)) {
      const match = Editor.above(editor, {
        match: (n) => Editor.isBlock(editor, n),
      });

      if (match) {
        const [block, path] = match;
        const start = Editor.start(editor, path);

        if (
          !Editor.isEditor(block) &&
          Element.isElement(block) &&
          block.type !== BlockType.Paragraph &&
          Point.equals(selection.anchor, start)
        ) {
          const newProperties: Partial<CustomElement> = {
            type: BlockType.Paragraph,
          };
          Transforms.setNodes(editor, newProperties);

          return;
        }
      }

      // @ts-ignore
      deleteBackward(...args);
    }
  };

  return editor;
}
