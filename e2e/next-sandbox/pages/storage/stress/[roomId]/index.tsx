import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

function getEngineFromRoomId(roomId: string): 0 | 1 | 2 {
  if (roomId.endsWith("-eng2")) return 2;
  if (roomId.endsWith("-eng1")) return 1;
  return 0;
}

function setEngineInRoomId(roomId: string, engine: 0 | 1 | 2): string {
  // Strip existing engine suffix if any
  const base = roomId.replace(/-eng[12]$/, "");
  if (engine === 1) return `${base}-eng1`;
  if (engine === 2) return `${base}-eng2`;
  return base;
}

export default function StressTestLanding() {
  const router = useRouter();
  const { roomId: routeRoomId } = router.query;

  const [roomId, setRoomId] = useState("");

  // Initialize from route param
  useEffect(() => {
    if (typeof routeRoomId === "string") {
      setRoomId(routeRoomId);
    }
  }, [routeRoomId]);

  // Wait for router to be ready
  if (!router.isReady || typeof routeRoomId !== "string") {
    return <div>Loading...</div>;
  }

  const currentEngine = getEngineFromRoomId(roomId);

  const handleEngineClick = (engine: 0 | 1 | 2) => {
    const newRoomId = setEngineInRoomId(roomId, engine);
    setRoomId(newRoomId);
    // Update URL to reflect new room ID
    void router.replace(`/storage/stress/${encodeURIComponent(newRoomId)}`, undefined, { shallow: true });
  };

  const handleRoomIdChange = (newRoomId: string) => {
    setRoomId(newRoomId);
  };

  const handleRoomIdBlur = () => {
    // Update URL when input loses focus
    if (roomId.trim() && roomId !== routeRoomId) {
      void router.replace(`/storage/stress/${encodeURIComponent(roomId.trim())}`, undefined, { shallow: true });
    }
  };

  const handleConnect = () => {
    if (roomId.trim()) {
      const engine = getEngineFromRoomId(roomId.trim());
      void router.push(`/storage/stress/${encodeURIComponent(roomId.trim())}/engine/${engine}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConnect();
    }
  };

  return (
    <div>
      <h3>
        <a href="/">Home</a> › <Link href="/storage">Storage</Link> › Stress Test
      </h3>

      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", margin: "8px 0", gap: "8px", alignItems: "center" }}>
          <span style={{ width: "80px" }}>Engine:</span>
          <button
            disabled={currentEngine === 0}
            onClick={() => handleEngineClick(0)}
            style={{
              padding: "4px 12px",
              background: currentEngine === 0 ? "#333" : "#eee",
              color: currentEngine === 0 ? "#fff" : "#333",
              border: "1px solid #999",
              borderRadius: "4px",
              cursor: currentEngine === 0 ? "default" : "pointer",
              opacity: currentEngine === 0 ? 0.7 : 1,
            }}
          >
            Default
          </button>
          <button
            disabled={currentEngine === 1}
            onClick={() => handleEngineClick(1)}
            style={{
              padding: "4px 12px",
              background: currentEngine === 1 ? "#333" : "#eee",
              color: currentEngine === 1 ? "#fff" : "#333",
              border: "1px solid #999",
              borderRadius: "4px",
              cursor: currentEngine === 1 ? "default" : "pointer",
              opacity: currentEngine === 1 ? 0.7 : 1,
            }}
          >
            V1
          </button>
          <button
            disabled={currentEngine === 2}
            onClick={() => handleEngineClick(2)}
            style={{
              padding: "4px 12px",
              background: currentEngine === 2 ? "#333" : "#eee",
              color: currentEngine === 2 ? "#fff" : "#333",
              border: "1px solid #999",
              borderRadius: "4px",
              cursor: currentEngine === 2 ? "default" : "pointer",
              opacity: currentEngine === 2 ? 0.7 : 1,
            }}
          >
            V2
          </button>
        </div>

        <div style={{ display: "flex", margin: "8px 0", gap: "8px", alignItems: "center" }}>
          <label style={{ width: "80px" }}>Room ID:</label>
          <input
            type="text"
            value={roomId}
            onChange={(e) => handleRoomIdChange(e.target.value)}
            onBlur={handleRoomIdBlur}
            onKeyDown={handleKeyDown}
            style={{ padding: "4px 8px", width: "250px", fontFamily: "monospace" }}
          />
        </div>

        <div style={{ margin: "16px 0" }}>
          <button
            onClick={handleConnect}
            disabled={!roomId.trim()}
            style={{
              padding: "8px 24px",
              background: "#333",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: roomId.trim() ? "pointer" : "not-allowed",
            }}
          >
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}
