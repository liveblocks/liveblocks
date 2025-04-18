/* eslint-disable */
// @ts-nocheck
import {
  LiveblocksProvider,
  useRoomNotificationSettings,
  useErrorListener,
} from "@liveblocks/react";
import { useUpdateRoomNotificationSettings } from "@liveblocks/react/suspense";

function App() {
  const [{ settings }] = useRoomNotificationSettings();
  const updateRoomNotificationSettings = useUpdateRoomNotificationSettings();

  console.log(settings);

  useErrorListener((error) => {
    if (error.context.type === "UPDATE_NOTIFICATION_SETTINGS_ERROR") {
      console.error(error);
    }
  });

  return (
    <div>
      {JSON.stringify(settings)}
      <button onClick={() => updateRoomNotificationSettings({})}>
        Update settings
      </button>
    </div>
  );
}
