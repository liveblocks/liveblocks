import { nanoid } from "@liveblocks/core";
import { createLiveblocksContext } from "@liveblocks/react";
import type { WithLiveblocks } from "@liveblocks/zustand";
import { liveblocks } from "@liveblocks/zustand";
import { memo, useEffect, useRef, useState } from "react";
import { create } from "zustand";

import { getRoomFromUrl, Row, styles, useRenderCount } from "../utils";
import { createLiveblocksClient } from "../utils/createClient";

const client = createLiveblocksClient();
const { useSyncStatus } = createLiveblocksContext(client);

type ColumnId = "todo" | "in-progress" | "done";

type Card = {
  id: string;
  title: string;
};

const COLUMNS: { id: ColumnId; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "in-progress", label: "In Progress" },
  { id: "done", label: "Done" },
];

type Columns = Record<ColumnId, Card[]>;

const EMPTY_COLUMNS: Columns = {
  "todo": [],
  "in-progress": [],
  "done": [],
};

type State = {
  // Presence
  selectedCardId: string | null;
  draggedCardId: string | null;

  // Storage
  columns: Columns;

  // Mutations
  setSelectedCardId: (id: string | null) => void;
  setDraggedCardId: (id: string | null) => void;
  addCard: (columnId: ColumnId) => void;
  updateCardTitle: (cardId: string, title: string) => void;
  moveCard: (cardId: string, toColumnId: ColumnId, toIndex: number) => void;
  deleteCard: (cardId: string) => void;
  clear: () => void;
  populate: () => void;
};

function findCardColumn(columns: Columns, cardId: string): ColumnId | undefined {
  for (const [colId, cards] of Object.entries(columns)) {
    if (cards.some((c) => c.id === cardId)) return colId as ColumnId;
  }
  return undefined;
}

type Presence = {
  selectedCardId: string | null;
  draggedCardId: string | null;
};

const useStore = create<WithLiveblocks<State, Presence, never, never, never>>()(
  liveblocks(
    (set) => ({
      // Presence
      selectedCardId: null,
      draggedCardId: null,

      // Storage
      columns: EMPTY_COLUMNS,

      setSelectedCardId: (id) => set({ selectedCardId: id }),
      setDraggedCardId: (id) => set({ draggedCardId: id }),

      addCard: (columnId) =>
        set((state) => ({
          columns: {
            ...state.columns,
            [columnId]: [
              { id: nanoid(), title: "New card" },
              ...state.columns[columnId],
            ],
          },
        })),

      updateCardTitle: (cardId, title) =>
        set((state) => {
          const colId = findCardColumn(state.columns, cardId);
          if (!colId) return state;
          return {
            columns: {
              ...state.columns,
              [colId]: state.columns[colId].map((c) =>
                c.id === cardId ? { ...c, title } : c
              ),
            },
          };
        }),

      moveCard: (cardId, toColumnId, toIndex) =>
        set((state) => {
          const fromColId = findCardColumn(state.columns, cardId);
          if (!fromColId) return state;
          const card = state.columns[fromColId].find((c) => c.id === cardId)!;
          const fromCards = state.columns[fromColId].filter(
            (c) => c.id !== cardId
          );
          if (fromColId === toColumnId) {
            // Reorder within the same column
            const reordered = [...fromCards];
            reordered.splice(toIndex, 0, card);
            return {
              columns: { ...state.columns, [fromColId]: reordered },
            };
          }
          // Move across columns
          const toCards = [...state.columns[toColumnId]];
          toCards.splice(toIndex, 0, card);
          return {
            columns: {
              ...state.columns,
              [fromColId]: fromCards,
              [toColumnId]: toCards,
            },
          };
        }),

      deleteCard: (cardId) =>
        set((state) => {
          const colId = findCardColumn(state.columns, cardId);
          if (!colId) return state;
          return {
            columns: {
              ...state.columns,
              [colId]: state.columns[colId].filter((c) => c.id !== cardId),
            },
          };
        }),

      clear: () => set({ columns: EMPTY_COLUMNS }),

      populate: () =>
        set({
          columns: {
            "todo": [
              { id: nanoid(), title: "🎨 Create landing page" },
              { id: nanoid(), title: "🔐 Add authentication" },
              { id: nanoid(), title: "🚀 Deploy to production" },
            ],
            "in-progress": [
              { id: nanoid(), title: "⚡ Build API endpoints" },
              { id: nanoid(), title: "🧪 Write unit tests" },
            ],
            "done": [
              { id: nanoid(), title: "📦 Set up project" },
              { id: nanoid(), title: "🗄️ Design database schema" },
            ],
          },
        }),
    }),
    {
      client,
      storageMapping: { columns: true },
      presenceMapping: { selectedCardId: true, draggedCardId: true },
    }
  )
);

const renderBadgeStyle = {
  position: "absolute" as const,
  right: 0,
  bottom: 0,
  fontSize: 9,
  background: "teal",
  color: "white",
  borderRadius: 3,
  padding: "1px 4px",
};

const updateCardTitle = (cardId: string, title: string) =>
  useStore.getState().updateCardTitle(cardId, title);
const moveCardAction = (cardId: string, toColumnId: ColumnId, toIndex: number) =>
  useStore.getState().moveCard(cardId, toColumnId, toIndex);
const deleteCard = (cardId: string) =>
  useStore.getState().deleteCard(cardId);
const setSelectedCardId = (id: string | null) =>
  useStore.getState().setSelectedCardId(id);
const setDraggedCardId = (id: string | null) =>
  useStore.getState().setDraggedCardId(id);
const addCard = (columnId: ColumnId) =>
  useStore.getState().addCard(columnId);

const KanbanCard = memo(function KanbanCard({
  card,
  columnId,
}: {
  card: Card;
  columnId: ColumnId;
}) {
  const renderCount = useRef(0);
  renderCount.current++;

  const isSelectedByOther = useStore((s) =>
    s.liveblocks.others.some((o) => o.presence?.selectedCardId === card.id)
  );
  const isDraggedByOther = useStore((s) =>
    s.liveblocks.others.some((o) => o.presence?.draggedCardId === card.id)
  );

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", card.id);
        e.dataTransfer.effectAllowed = "move";
        setDraggedCardId(card.id);
      }}
      onDragEnd={() => setDraggedCardId(null)}
      data-card-id={card.id}
      data-testid={`card-${card.id}`}
      style={{
        position: "relative",
        background: "white",
        border: isSelectedByOther ? "2px solid #4a9eff" : "1px solid #ddd",
        borderRadius: 4,
        padding: 8,
        marginBottom: 6,
        cursor: "grab",
        opacity: isDraggedByOther ? 0.5 : 1,
      }}
    >
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <input
          data-testid={`card-title-${card.id}`}
          value={card.title}
          onChange={(e) => updateCardTitle(card.id, e.target.value)}
          onFocus={() => setSelectedCardId(card.id)}
          onBlur={() => setSelectedCardId(null)}
          style={{ flex: 1, border: "none", outline: "none", font: "inherit" }}
        />
        <button data-testid={`delete-card-${card.id}`} onClick={() => deleteCard(card.id)} style={{ cursor: "pointer" }}>
          x
        </button>
      </div>
      <select
        data-testid={`card-status-${card.id}`}
        value={columnId}
        onChange={(e) => {
          const toCol = e.target.value as ColumnId;
          const toLen = useStore.getState().columns[toCol].length;
          moveCardAction(card.id, toCol, toLen);
        }}
        style={{ marginTop: 4, fontSize: 12 }}
      >
        {COLUMNS.map((col) => (
          <option key={col.id} value={col.id}>
            {col.label}
          </option>
        ))}
      </select>
      <span data-testid={`card-renders-${card.id}`} style={renderBadgeStyle}>{renderCount.current}</span>
    </div>
  );
});

const Column = memo(function Column({ id, label }: { id: ColumnId; label: string }) {
  const renderCount = useRef(0);
  renderCount.current++;

  const cards = useStore((s) => s.columns[id]);
  const [dragOver, setDragOver] = useState(false);
  const [dropIndex, setDropIndex] = useState(-1);

  const colRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={colRef}
      data-testid={`column-${id}`}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOver(true);

        // Compute drop index from card elements
        const cardEls = colRef.current?.querySelectorAll("[data-card-id]");
        if (!cardEls || cardEls.length === 0) {
          setDropIndex(0);
          return;
        }
        let idx = cardEls.length;
        for (let i = 0; i < cardEls.length; i++) {
          const rect = cardEls[i].getBoundingClientRect();
          if (e.clientY < rect.top + rect.height / 2) {
            idx = i;
            break;
          }
        }
        setDropIndex(idx);
      }}
      onDragLeave={(e) => {
        // Only handle leave if actually leaving the column
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDragOver(false);
          setDropIndex(-1);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        const cardId = e.dataTransfer.getData("text/plain");
        if (cardId) moveCardAction(cardId, id, dropIndex >= 0 ? dropIndex : cards.length);
        setDragOver(false);
        setDropIndex(-1);
      }}
      style={{
        position: "relative",
        flex: 1,
        background: dragOver ? "#e8e8e8" : "#f4f4f4",
        borderRadius: 4,
        padding: 8,
        minHeight: 200,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <strong>{label}</strong>
        <button data-testid={`add-card-${id}`} onClick={() => addCard(id)} style={{ cursor: "pointer" }}>
          + Add
        </button>
      </div>
      {cards.map((card) => (
        <KanbanCard key={card.id} card={card} columnId={id} />
      ))}
      <span data-testid={`column-renders-${id}`} style={renderBadgeStyle}>{renderCount.current}</span>
    </div>
  );
});

export default function ZustandKanbanApp() {
  const renderCount = useRenderCount();
  const {
    columns,
    clear,
    populate,
    liveblocks: { enterRoom, isStorageLoading, room, others },
  } = useStore();
  const syncStatus = useSyncStatus();
  const roomId = getRoomFromUrl();

  useEffect(() => {
    return enterRoom(roomId);
  }, [roomId, enterRoom]);

  if (isStorageLoading) {
    return <div>Loading...</div>;
  }

  const theirPresence = others[0]?.presence;
  const totalCards =
    columns["todo"].length +
    columns["in-progress"].length +
    columns["done"].length;

  return (
    <div>
      <h3>
        <a href="/">Home</a> › Zustand Kanban
      </h3>

      <div style={{ marginBottom: 8 }}>
        <button id="populate" onClick={populate} style={{ cursor: "pointer" }}>
          Populate
        </button>
        <button id="clear" onClick={clear} style={{ cursor: "pointer", marginLeft: 4 }}>
          Clear all
        </button>
        <button
          id="undo"
          onClick={room?.history.undo}
          disabled={!room?.history.canUndo()}
          style={{ cursor: "pointer", marginLeft: 4 }}
        >
          Undo
        </button>
        <button
          id="redo"
          onClick={room?.history.redo}
          disabled={!room?.history.canRedo()}
          style={{ cursor: "pointer", marginLeft: 4 }}
        >
          Redo
        </button>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        {COLUMNS.map((col) => (
          <Column key={col.id} id={col.id} label={col.label} />
        ))}
      </div>

      <h2>Debug</h2>
      <table style={styles.dataTable}>
        <tbody>
          <Row id="renderCount" name="Render count" value={renderCount} />
          <Row id="syncStatus" name="Sync status" value={syncStatus} />
          <Row id="numCards" name="Cards count" value={totalCards} />
          <Row id="columns" name="Columns" value={columns} />
          <Row id="theirPresence" name="Their presence" value={theirPresence} />
          <Row id="numOthers" name="Others count" value={others.length} />
        </tbody>
      </table>
    </div>
  );
}
