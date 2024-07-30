import { kInternal } from "@liveblocks/core";
import { useRoom } from "@liveblocks/react";
import { Timestamp, useOverrides } from "@liveblocks/react-ui";
import React, { useCallback, useContext, useEffect, useState } from "react";

import { User } from "../mentions/user";
import { VersionContext } from "./VersionContext";

type VersionResponse = {
  date: number,
  authors: string[],
};

export function useVersions() {
  const room = useRoom();
  const [versions, setVersions] = useState<VersionResponse[]>([]);

  useEffect(() => {
    const load = async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const response = await room[kInternal].listTextVersions();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const data = await response.json() as { versions: VersionResponse[] };

      setVersions(data.versions.reverse());
    }
    load();
  }, [room]);

  return versions;
}

export function Versions() {
  const $ = useOverrides();
  const room = useRoom();
  const { setVersion } = useContext(VersionContext);

  // Usage in the component:
  const versions = useVersions();

  const handleGetVersion = useCallback(async (date: number) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const response = await room[kInternal].getTextVersion(date.toString())
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const buffer = await response.arrayBuffer();
    const data = new Uint8Array(buffer as ArrayBuffer);
    setVersion({ id: date.toString(), data })
  }, [room, setVersion]);

  return (
    <>
      {versions.map((v) => (
        <div key={v.date} onClick={() => handleGetVersion(v.date)}>
          <p><Timestamp locale={$.locale} date={new Date(v.date)} /></p>
          {v.authors?.length && v.authors.map((a, i) => (
            <span key={a}>{i !== 0 && ","}<User userId={a} /></span>
          ))}
        </div>
      ))}
    </>
  );
}