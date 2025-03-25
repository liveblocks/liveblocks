/* eslint-disable */
// @ts-nocheck
import {
  LiveblocksProvider,
  useRoomSubscriptionSettings,
} from "@liveblocks/react";
import { useUpdateRoomSubscriptionSettings } from "@liveblocks/react/suspense";

function App() {
  const [{ settings }] = useRoomSubscriptionSettings();
  const updateRoomNotificationSettings = useUpdateRoomSubscriptionSettings();

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
