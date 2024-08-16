import { kInternal } from "@liveblocks/core";
import { useRoom } from "@liveblocks/react";
import { Timestamp, useOverrides } from "@liveblocks/react-ui";
import React, { useCallback, useContext, useEffect, useState } from "react";

import { User } from "../mentions/user";
import { VersionContext } from "./VersionContext";

type VersionResponse = {
  createdAt: number,
  id: string,
  authors: string[],
};

export function useVersions() {
  const room = useRoom();
  const [versions, setVersions] = useState<VersionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const response = await room[kInternal].listTextVersions();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const data = await response.json() as { versions: VersionResponse[] };

      setVersions(data.versions);
      setIsLoading(false);
    }
    load();
  }, [room]);

  return {
    versions,
    isLoading
  };
}

export function Versions() {
  const $ = useOverrides();
  const room = useRoom();
  const { version, setVersion, setIsLoading } = useContext(VersionContext);

  // Usage in the component:
  const { versions, isLoading } = useVersions();

  const handleGetVersion = useCallback(async (version: VersionResponse) => {
    setIsLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const response = await room[kInternal].getTextVersion(version.id)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const buffer = await response.arrayBuffer();
    const data = new Uint8Array(buffer);
    setIsLoading(false);
    const { id, authors, createdAt } = version;
    setVersion({ id, createdAt: new Date(createdAt), authors, data })
  }, [room, setVersion, setIsLoading]);

  return (
    <>
      <h4 style={{ padding: "8px 8px 4px 8px", fontSize: "1rem", color: "#838383" }}>Version History</h4>
      {isLoading && <div style={{ padding: "16px" }}>Loading...</div>}
      {versions.map((v) => (
        <div
          key={v.id}
          onClick={() => handleGetVersion(v)}
          style={{
            cursor: "pointer",
            backgroundColor: version?.id === v.createdAt.toString() ? "rgba(255,255,255,0.05)" : "transparent",
            padding: "8px",
          }}
        >
          <p><Timestamp locale={$.locale} date={new Date(v.createdAt)} /></p>
          {v.authors?.length !== 0 && v.authors.map((a, i) => (
            <span key={a} style={{ fontSize: "0.75rem", color: "#838383" }}>{i !== 0 && ","}<User userId={a} /></span>
          ))}
        </div>
      ))}
    </>
  );
}