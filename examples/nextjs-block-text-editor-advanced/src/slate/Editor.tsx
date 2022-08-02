import styles from "../../styles/Document.module.css";
import isHotkey from "is-hotkey";
import blockTextStyles from "../../styles/BlockText.module.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createEditor, Editor, Node, Transforms, Location } from "slate";
import {
  Slate,
  withReact,
  Editable,
  ReactEditor,
  DefaultElement,
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
import { createPortal } from "react-dom";
import { nanoid } from "nanoid";
import Header from "./Header";
import Container from "../components/Container";
import classNames from "classnames";
import BlockInlineActions from "./BlockInlineActions";
import { RoomProvider, useList, useRoom } from "./liveblocks.config";
import { LiveList, LiveObject } from "@liveblocks/client";
import { Format } from "../types";
import { CustomElement, DocumentMeta } from "./types";
import { toggleMark, withNodeId } from "./utils";
import Leaf from "./Leaf";
import Toolbar from "./Toolbar";

const initialValue: CustomElement[] = [
  {
    id: nanoid(),
    type: "paragraph",
    children: [
      {
        text: "Hello",
      },
    ],
  },
];

export const useEditor = () =>
  useMemo(() => withNodeId(withReact(createEditor())), []);

function isNodeWithId(editor: Editor, id: string) {
  return (node: Node) => Editor.isBlock(editor, node) && node.id === id;
}

const HOTKEYS: Record<string, Format> = {
  "mod+b": "bold",
  "mod+i": "italic",
  "mod+u": "underline",
};

export default function Room() {
  return (
    <RoomProvider
      id="slate-test"
      initialStorage={{
        meta: new LiveObject<DocumentMeta>({
          title: null,
        }),
        blocks: new LiveList(initialValue),
      }}
    >
      <App />
    </RoomProvider>
  );
}

function App() {
  const editor = useEditor();

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeElement = editor.children.find(
    (x) => "id" in x && x.id === activeId
  ) as CustomElement | undefined;

  const room = useRoom();
  const blocks = useList("blocks");
  const isEditingRef = useRef(false);

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
    const isTopLevel = ReactEditor.findPath(editor, props.element).length === 1;

    return isTopLevel ? (
      <SortableElement
        {...props}
        renderElement={DefaultElement}
        onDelete={() =>
          Transforms.removeNodes(editor, {
            at: ReactEditor.findPath(editor, props.element),
          })
        }
        onInsertBelow={() => {
          Transforms.insertNodes(
            editor,
            {
              id: nanoid(),
              type: "paragraph",
              children: [
                {
                  text: "",
                },
              ],
            },
            {
              at: [ReactEditor.findPath(editor, props.element)[0] + 1],
            }
          );
        }}
      />
    ) : (
      <DefaultElement {...props} />
    );
  }, []);

  const items = useMemo(
    () => editor.children.map((element: any) => element.id),
    [editor.children]
  );

  if (blocks == null) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.block_text_editor}>
      <Header />

      <div
        className={classNames(styles.prose, "prose")}
        onClick={(e) => e.stopPropagation()}
      >
        <Container>
          <Slate
            editor={editor}
            value={blocks?.toArray()}
            onChange={(value) => {
              if (blocks == null || isEditingRef.current) {
                return;
              }

              console.log(editor.operations);

              isEditingRef.current = true;

              room.batch(() => {
                for (const op of editor.operations) {
                  if (op.isRemote) {
                    continue;
                  }

                  switch (op.type) {
                    case "insert_node": {
                      blocks.insert(
                        value[op.path[0]] as CustomElement,
                        op.path[0]
                      );
                      break;
                    }
                    case "remove_node": {
                      if (op.path.length === 1) {
                        // Remove top level node
                        blocks.delete(op.path[0]);
                      } else {
                        blocks.set(
                          op.path[0],
                          value[op.path[0]] as CustomElement
                        );
                      }
                      break;
                    }
                    case "remove_text":
                    case "insert_text":
                      blocks.set(
                        op.path[0],
                        value[op.path[0]] as CustomElement
                      );
                      break;
                    case "split_node":
                      if (op.path.length > 1) {
                        blocks.set(
                          op.path[0],
                          value[op.path[0]] as CustomElement
                        );
                      } else {
                        const index = op.path[0] + 1;
                        blocks.insert(value[index] as CustomElement, index);
                      }
                      break;
                    case "merge_node": {
                      if (op.path.length === 1) {
                        blocks.set(
                          op.path[0] - 1,
                          value[op.path[0] - 1] as CustomElement
                        );
                        blocks.delete(op.path[0]);
                      }
                      break;
                    }
                    case "move_node":
                      if (op.path.length === 1 && op.newPath.length === 1) {
                        blocks.move(op.path[0], op.newPath[0]);
                      }
                      break;
                    case "set_node": {
                      blocks.set(
                        op.path[0],
                        value[op.path[0]] as CustomElement
                      );
                      break;
                    }
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
                  onKeyDown={(event) => {
                    for (const hotkey in HOTKEYS) {
                      if (isHotkey(hotkey, event as any)) {
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
                    <DragOverlayContent element={activeElement} />
                  )}
                </DragOverlay>,
                document.body
              )}
            </DndContext>
          </Slate>
        </Container>
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
  onInsertBelow: () => void;
}) {
  const sortable = useSortable({ id: element.id });

  return (
    <div className={blockTextStyles.block_text} {...attributes}>
      <div
        className="sortable"
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
          } as React.CSSProperties /* casted becase of css variable */
        }
      >
        <div
          className={classNames(
            blockTextStyles.inline_actions,
            "inline_actions"
          )}
        >
          <BlockInlineActions
            blockId={element.id}
            onDelete={onDelete}
            onInsertBelow={onInsertBelow}
          />
        </div>
        <div>{renderElement({ element, children })}</div>
      </div>
    </div>
  );
}

function DragOverlayContent({ element }: { element: CustomElement }) {
  const editor = useEditor();
  const [value] = useState([JSON.parse(JSON.stringify(element))]); // clone

  return (
    <div className="drag-overlay">
      <Slate editor={editor} value={value}>
        <Editable
          readOnly={true}
          renderElement={DefaultElement}
          renderLeaf={Leaf}
        />
      </Slate>
    </div>
  );
}

function getBlocksIndicesToUpdate(editor: Editor) {
  const indices = new Set<number>();

  for (const op of editor.operations) {
    switch (op.type) {
      case "remove_text":
      case "insert_text":
        indices.add(op.path[0]);
        break;
      case "split_node":
        if (op.path.length > 1) {
          indices.add(op.path[0]);
        }
        break;
    }
  }

  return Array.from(indices);
}
