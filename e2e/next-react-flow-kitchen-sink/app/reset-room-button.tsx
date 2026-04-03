"use client";

import { useFormStatus } from "react-dom";
import { deleteRoom } from "./delete-room";

function ResetButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="text-sm px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
    >
      Reset
    </button>
  );
}

export function ResetRoomButton({ roomId }: { roomId: string }) {
  return (
    <form
      className="inline"
      action={async (formData) => {
        await deleteRoom(formData);
        window.location.assign("/");
      }}
    >
      <input type="hidden" name="roomId" value={roomId} />
      <ResetButton />
    </form>
  );
}
