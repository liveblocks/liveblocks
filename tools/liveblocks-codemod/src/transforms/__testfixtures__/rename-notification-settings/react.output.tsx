/* eslint-disable */
// @ts-nocheck
import {
  LiveblocksProvider,
  useRoomSubscriptionSettings,
  useErrorListener,
} from "@liveblocks/react";
import { useUpdateRoomSubscriptionSettings } from "@liveblocks/react/suspense";

function App() {
  const [{ settings }] = useRoomSubscriptionSettings();
  const updateRoomNotificationSettings = useUpdateRoomSubscriptionSettings();

  console.log(settings);

  useErrorListener((error) => {
    if (error.context.type === "UPDATE_ROOM_SUBSCRIPTION_SETTINGS_ERROR") {
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
