import { Room } from "./Room";
import { CellThreadProvider } from "./CellThreadContext";
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
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "end",
            width: 720,
            gap: 20,
          }}
        >
          <AvatarStack max={5} size={36} />

          <CellThreadProvider>
            <Table />
          </CellThreadProvider>
        </div>
      </div>
    </Room>
  );
}
