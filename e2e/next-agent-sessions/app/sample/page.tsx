"use client";
import { nanoid } from "@liveblocks/core";
import { useAgentSession, useAgentSessions } from "@liveblocks/react";
import {
  ClientSideSuspense,
  RoomProvider,
} from "@liveblocks/react/suspense";
import { useState } from "react";

const ROOM_ID = "liveblocks:examples:agent-sessions";

const SpinnerIcon = () => (

  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    role="presentation"
    className="lb-icon"
  >
    <path d="M3 10a7 7 0 0 1 7-7" className="lb-icon-spinner" />
  </svg>
)

export default function Page() {
  return (
    <ClientSideSuspense
      fallback={
        <div className="h-screen w-full flex items-center justify-center">
          <SpinnerIcon />
        </div>
      }
    >
      <RoomProvider id={ROOM_ID}>
        <Sample />
      </RoomProvider>
    </ClientSideSuspense>
  );
}

function SessionMessages({
  sessionId,
  newMessageText,
  onMessageTextChange,
  onCreateMessage,
  onDeleteMessage,
}: {
  sessionId: string;
  newMessageText: string;
  onMessageTextChange: (text: string) => void;
  onCreateMessage: () => void;
  onDeleteMessage: (messageId: string) => void;
}) {
  const {
    messages,
  } = useAgentSession(sessionId);

  return (
    <div className="mt-4 border-t pt-4">
      <h4 className="font-semibold mb-2">Messages ({messages?.length || 0})</h4>

      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={newMessageText || ""}
          onChange={(e) => onMessageTextChange(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              onCreateMessage();
            }
          }}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 border rounded"
        />
        <button
          onClick={onCreateMessage}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Send
        </button>
      </div>

      <div className="space-y-2">
        {!messages || messages.length === 0 ? (
          <p className="text-gray-500 text-sm">No messages yet</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className="flex items-start justify-between p-2 bg-gray-50 rounded"
            >
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">
                  {new Date(message.timestamp).toLocaleString()}
                </div>
                <pre className="text-sm whitespace-pre-wrap">
                  {JSON.stringify(message.data, null, 2)}
                </pre>
              </div>
              <button
                onClick={() => onDeleteMessage(message.id)}
                className="ml-2 px-2 py-1 text-xs bg-red-100 rounded hover:bg-red-200"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Sample() {
  const {
    sessions,
    isLoading,
    error,
  } = useAgentSessions();
  const [newMessageText, setNewMessageText] = useState<Record<string, string>>({});

  const createAgentSession = async () => {
    try {
      const response = await fetch("/api/agent-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: ROOM_ID,
          sessionId: nanoid(),
          metadata: { created: new Date().toISOString() },
        }),
      });
      const data = await response.json();
      console.log("Created session:", data);
      // Refresh will happen automatically via useAgentSessions hook
    } catch (error) {
      console.error("Error creating session:", error);
    }
  };

  const deleteAgentSession = async (sessionId: string) => {
    try {
      const response = await fetch(
        `/api/agent-sessions/${sessionId}?roomId=${encodeURIComponent(ROOM_ID)}`,
        {
          method: "DELETE",
        }
      );
      if (response.ok) {
        console.log("Deleted session:", sessionId);
        // Refresh will happen automatically via useAgentSessions hook
      }
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  const updateSessionMetadata = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/agent-sessions/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: ROOM_ID,
          metadata: { updated: new Date().toISOString() },
        }),
      });
      const data = await response.json();
      console.log("Updated session:", data);
      // Refresh will happen automatically via useAgentSessions hook
    } catch (error) {
      console.error("Error updating session:", error);
    }
  };

  const createMessage = async (sessionId: string) => {
    const text = newMessageText[sessionId]?.trim();
    if (!text) return;

    try {
      const response = await fetch(`/api/agent-sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: ROOM_ID,
          data: { content: text, role: "user" },
        }),
      });
      const data = await response.json();
      console.log("Created message:", data);

      // Messages will refresh automatically via useAgentSession hook
      setNewMessageText((prev) => ({ ...prev, [sessionId]: "" }));
    } catch (error) {
      console.error("Error creating message:", error);
    }
  };

  const deleteMessage = async (sessionId: string, messageId: string) => {
    try {
      const response = await fetch(
        `/api/agent-sessions/${sessionId}/messages/${messageId}?roomId=${encodeURIComponent(ROOM_ID)}`,
        {
          method: "DELETE",
        }
      );
      if (response.ok) {
        console.log("Deleted message:", messageId);
        // Messages will refresh automatically via useAgentSession hook
      }
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  return (
    <main className="h-screen w-full max-w-4xl mx-auto flex p-4 py-8 flex-col overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Agent Sessions</h1>
        {!isLoading && (
          <button
            onClick={createAgentSession}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Create Session
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4">

        {isLoading && (
          <div className="h-24 w-24"><SpinnerIcon /></div>
        )}

        {error && (
          <p className="text-red-500">Error loading sessions: {error.message}</p>
        )}

        {sessions?.length === 0 && (
          <p className="text-gray-500">No sessions yet. Create one to get started!</p>
        )}

        {sessions?.map((session) => {

          return (
            <div
              key={session.sessionId}
              className="border rounded-lg p-4 bg-white shadow-sm"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    Session: {session.sessionId.slice(0, 20)}...
                  </h3>
                  <p className="text-sm text-gray-500">
                    Created: {new Date(session.timestamp).toLocaleString()}
                  </p>
                  {session.metadata && Object.keys(session.metadata).length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-400 mb-1">Metadata:</p>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(session.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => updateSessionMetadata(session.sessionId)}
                    className="px-3 py-1 text-sm bg-yellow-100 rounded hover:bg-yellow-200"
                  >
                    Update
                  </button>
                  <button
                    onClick={() => deleteAgentSession(session.sessionId)}
                    className="px-3 py-1 text-sm bg-red-100 rounded hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <SessionMessages
                sessionId={session.sessionId}
                newMessageText={newMessageText[session.sessionId] || ""}
                onMessageTextChange={(text) =>
                  setNewMessageText((prev) => ({
                    ...prev,
                    [session.sessionId]: text,
                  }))
                }
                onCreateMessage={() => createMessage(session.sessionId)}
                onDeleteMessage={(messageId) =>
                  deleteMessage(session.sessionId, messageId)
                }
              />
            </div>
          );
        })}
      </div>
    </main>
  );
}
