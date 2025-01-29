"use client";

import { useCallback } from "react";

import { useExampleRoomId } from "@/hooks/use-example-room-id";
import { useToast } from "@/hooks/use-toast";

export function TriggerCustomNotificationButton({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const roomId = useExampleRoomId();
  const { toast } = useToast();

  const onClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>): Promise<void> => {
      e.preventDefault();

      try {
        const response = await fetch(
          "/api/liveblocks-custom-notification-trigger",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              roomId,
              currentUserId,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        toast({
          title: "Custom notification triggered ✅",
        });
      } catch (err) {
        console.error(err);
      }
    },
    [currentUserId, roomId, toast]
  );

  return (
    <button
      title="trigger custom notification"
      onClick={onClick}
      className="inline-flex relative items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground w-8 h-8"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
    </button>
  );
}
