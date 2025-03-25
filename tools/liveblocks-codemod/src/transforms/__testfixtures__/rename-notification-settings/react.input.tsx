/* eslint-disable */
// @ts-nocheck
import {
  LiveblocksProvider,
  useRoomNotificationSettings,
} from "@liveblocks/react";
import { useUpdateRoomNotificationSettings } from "@liveblocks/react/suspense";

function App() {
  const [{ settings }] = useRoomNotificationSettings();
  const updateRoomNotificationSettings = useUpdateRoomNotificationSettings();

  console.log(settings);

  return (
    <div>
      {JSON.stringify(settings)}
      <button onClick={() => updateRoomNotificationSettings({})}>
        Update settings
      </button>
    </div>
  );
}
