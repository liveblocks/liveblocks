import styles from "./Editor.module.css";

import isHotkey from "is-hotkey";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createEditor, Editor, Node, Transforms, Range } from "slate";
import {
  Slate,
  withReact,
  Editable,
  ReactEditor,
  RenderElementProps,
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
import classNames from "classnames";

import {
  useList,
  useOthers,
  useRoom,
  useUpdateMyPresence,
} from "./liveblocks.config";
import { BlockType, CustomElement } from "./types";
import { toggleMark, withLayout, withNodeId } from "./utils";
import Leaf from "./blocks/Leaf";
import Block, { CreateNewBlockFromBlock } from "./blocks/Block";
import { HOTKEYS, USER_COLORS } from "./constants";
import {
  Avatar,
  Loading,
  Toolbar,
  BlockInlineActions,
  Header,
} from "./components";

const useEditor = () =>
  useMemo(() => withNodeId(withLayout(withReact(createEditor()))), []);

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

    // Override editor to insert a paragraph after inserting a new line
    editor.insertBreak = () => {
      insertBreak();
      if (editor.selection) {
        // Default new line
        let newBlock = { type: BlockType.Paragraph };

        // TODO tidy or create central block config file
        // Duplicate current element to new line if set
        const previousBlock = editor.children[
          editor.selection.anchor.path[0] - 1
        ] as CustomElement;
        if (
          previousBlock?.type &&
          Object.keys(CreateNewBlockFromBlock).includes(previousBlock?.type)
        ) {
          newBlock = CreateNewBlockFromBlock[previousBlock.type]();
        }

        Transforms.setNodes(editor, newBlock, {
          at: editor.selection,
        });
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
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const overId = event.over?.id;
    if (overId == null) {
      setActiveId(null);
    }

    const overIndex = editor.children.findIndex((x: any) => x.id === overId);

    console.log(overId, activeId, overIndex);

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
                            placeholder: true,
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
                document.body
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
            "--translate-y": sortable.transform
              ? `${sortable.transform.y}px`
              : undefined,
            pointerEvents: sortable.isSorting ? "none" : undefined,
            opacity: sortable.isDragging ? 0 : 1,
          } as React.CSSProperties /* casted because of css variable */
        }
      >
        {renderElement({ element, children })}
        {othersByBlockId.length > 0 && (
          <div className={classNames(styles.avatars, "avatars")}>
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
        <div className={classNames(styles.inline_actions, "inline_actions")}>
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
    <div className="drag-overlay">
      <Slate editor={editor} value={value}>
        <Editable
          readOnly={true}
          renderElement={renderElement}
          renderLeaf={Leaf}
        />
      </Slate>
    </div>
  );
}
