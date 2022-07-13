import "../styles/globals.css";
import type { AppProps } from "next/app";
import { CellData, Column, RoomProvider, Row } from "../liveblocks.config";
import { LiveObject, LiveMap, LiveList } from "@liveblocks/client";
import { nanoid } from "nanoid";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <RoomProvider
      id="nextjs-spreadsheet-advanced"
      initialStorage={{
        spreadsheet: new LiveObject({
          cells: new LiveMap<string, LiveObject<CellData>>(),
          rows: new LiveList<LiveObject<Row>>([
            new LiveObject({ id: nanoid(), height: 30 }),
          ]),
          columns: new LiveList<LiveObject<Column>>([
            new LiveObject({ id: nanoid(), width: 100 }),
          ]),
        }),
      }}
      initialPresence={{
        selectedCell: null,
      }}
    >
      <Component {...pageProps} />
    </RoomProvider>
  );
}

export default MyApp;
