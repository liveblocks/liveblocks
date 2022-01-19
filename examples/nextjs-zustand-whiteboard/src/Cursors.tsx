import useStore from "./store";
import { COLORS } from "./utils";

type CursorProps = {
  color: string;
  x: number;
  y: number;
};

function Cursor({ color, x, y }: CursorProps) {
  return (
    <svg
      style={{
        pointerEvents: "none",
        transition: "transform 0.5s cubic-bezier(.17,.93,.38,1)",
        transform: `translateX(${x}px) translateY(${y}px)`,
      }}
    >
      <path
        d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
        fill={color}
      />
    </svg>
  );
}

const Cursors = () => {
  const others = useStore((state) => state.others);

  return (
    <>
      {others.map((user) => {
        if (user.presence?.cursor == null) {
          return null;
        }
        return (
          <Cursor
            key={user.connectionId}
            color={COLORS[user.connectionId % COLORS.length]}
            x={user.presence.cursor.x}
            y={user.presence.cursor.y}
          />
        );
      })}
    </>
  );
};

export default Cursors;
