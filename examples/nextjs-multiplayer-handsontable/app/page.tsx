import { Room } from "./Room";
import { AvatarStack } from "@liveblocks/react-ui";
import { Table } from "./Table";

export default function Page() {
  return (
    <Room>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "end",
            gap: 20,
          }}
        >
          <AvatarStack max={5} size={36} />

          <Table />
        </div>
      </div>
    </Room>
  );
}
