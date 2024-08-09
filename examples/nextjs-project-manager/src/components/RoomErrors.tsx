"use client";

import {
  useErrorListener,
  useLostConnectionListener,
} from "@liveblocks/react/suspense";
import { toast } from "sonner";

export default function RoomErrors() {
  useErrorListener((error) => {
    console.log(error);
    switch (error.code) {
      case -1:
        // Authentication error
        toast.error("You don't have access to this room");
        break;

      case 4001:
        // Could not connect because you don't have access to this room
        toast.error("You don't have access to this room");
        break;

      case 4005:
        // Could not connect because room was full
        toast.error("Could not connect because the room is full");
        break;

      default:
        // Unexpected error
        toast.error("An unexpected error happenned");
        break;
    }
  });

  useLostConnectionListener((event) => {
    switch (event) {
      case "lost":
        toast.warning("Still trying to reconnect…");
        break;

      case "restored":
        toast.success("Successfully reconnected again!");
        break;

      case "failed":
        toast.error("Could not restore the connection");
        break;
    }
  });

  return null;
}
