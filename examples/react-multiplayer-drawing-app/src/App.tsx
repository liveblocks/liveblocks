import * as React from "react";
import {
  useList,
  useMyPresence,
  useOthers,
  useRedo,
  useSelf,
  useUndo,
} from "@liveblocks/react";
import "./styles.css";
import { LiveList } from "@liveblocks/client";
import { Line } from "./components/Line";
import { UserCursor } from "./components/UserCursor";
import { User } from "./types";
import { UserToken } from "./components/UserToken";
import { useKeyboardEvents } from "./hooks/useKeyboardEvents";
import { connectionIdToColor } from "./utils";

// The scroll's y offset is based on the number of milliseconds
// since 12:00AM today.
const date = new Date();

date.setUTCHours(0, 0, 0, 0);

const START_TIME = date.getTime();

function getYOffset() {
  return (Date.now() - START_TIME) / 80;
}

function getPoint(x: number, y: number) {
  return [x, y + getYOffset()];
}

type Line = {
  id: string;
  points: number[][];
};

export default function App() {
  const lines = useList<Line>("lines");

  if (lines == null) {
    return <div>Loading</div>;
  }

  return <Whiteboard lines={lines} />;
}

function Whiteboard({ lines }: { lines: LiveList<Line> }) {
  const others = useOthers<User>();
  const self = useSelf<User>();
  const [presence, updateMyPresence] = useMyPresence<User>();

  const undo = useUndo();
  const redo = useRedo();

  useKeyboardEvents();

  const clearAllLines = React.useCallback(() => {
    // Ugly but LiveList.clear is coming soon!
    while (lines.length > 0) {
      lines.delete(0);
    }
  }, [lines]);

  // On pointer down, start a new current line
  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);

      updateMyPresence({ points: [getPoint(e.clientX, e.clientY)] });
    },
    [presence, updateMyPresence]
  );

  // On pointer move, update awareness and (if down) update the current line
  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const point = getPoint(e.clientX, e.clientY);

      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        updateMyPresence({ points: [...presence.points!, point] });
      }

      updateMyPresence({
        cursor: { x: point[0], y: point[1] },
      });
    },
    [presence, updateMyPresence]
  );

  // On pointer up, complete the current line
  const handlePointerUp = React.useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      e.currentTarget.releasePointerCapture(e.pointerId);

      lines.push({ id: Date.now().toString(), points: presence.points! });

      updateMyPresence({ points: [] });
    },
    [lines, updateMyPresence, presence]
  );

  const [_, forceUpdate] = React.useReducer((s) => !s, false);

  React.useEffect(() => {
    const timeout = setInterval(forceUpdate, 30);
    return () => clearInterval(timeout);
  }, []);

  return (
    <div className="canvas-container">
      <svg
        className="canvas-layer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerEnter={() => updateMyPresence({ isActive: true })}
        onPointerLeave={() =>
          updateMyPresence({ isActive: false, cursor: null })
        }
      >
        <g transform={`translate(0, -${getYOffset()})`}>
          {self && presence.points && presence.points.length > 2 && (
            <Line
              key="draft"
              points={presence.points}
              color={connectionIdToColor(self.connectionId)}
              isComplete={false}
            />
          )}
          {lines.map((line) => (
            <Line
              key={line.id}
              points={line.points}
              isComplete={true}
              color="black"
            />
          ))}
          {/* Lines drafts */}
          {others.map((other) => {
            if (
              other.presence?.points == null ||
              other.presence.points.length < 2
            ) {
              return null;
            }

            return (
              <Line
                key={"draft_" + other.connectionId}
                points={other.presence.points}
                isComplete={false}
                color={connectionIdToColor(other.connectionId)}
              />
            );
          })}
          {/* Live Cursors */}
          {others.map((other) => {
            if (other.presence == null || other.presence.cursor == null) {
              return null;
            }

            return (
              <UserCursor
                key={other.connectionId}
                cursor={other.presence.cursor}
                isActive={true}
                connectionId={other.connectionId}
              />
            );
          })}
        </g>
        {/* User Tokens */}
        {others.toArray().map((other, i) => {
          if (other.presence == null) {
            return null;
          }

          return (
            <UserToken
              key={other.connectionId}
              connectionId={other.connectionId}
              user={other.presence}
              index={i + 1}
              isSelf={false}
            />
          );
        })}
        {self && (
          <UserToken
            key={self?.connectionId}
            connectionId={self?.connectionId}
            user={presence}
            index={0}
            isSelf={true}
          />
        )}
      </svg>
      <div className="canvas-controls">
        <button onClick={undo}>Undo</button>
        <button onClick={redo}>Redo</button>
        <button onClick={clearAllLines}>Clear</button>
      </div>
      <div className="author">
        by Guillaume Salles - inspired by steveruizok
      </div>
    </div>
  );
}
