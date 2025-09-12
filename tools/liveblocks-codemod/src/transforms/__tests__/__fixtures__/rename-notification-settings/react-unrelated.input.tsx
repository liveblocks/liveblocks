/* eslint-disable */
// @ts-nocheck
import { createRoomContext, useRoomNotificationSettings } from "my-lib";
import { useUpdateRoomNotificationSettings } from "my-lib/suspense";

function App() {
  const [{ settings }] = useRoomNotificationSettings();
  const updateRoomNotificationSettings = useUpdateRoomNotificationSettings();

  console.log(settings, "UPDATE_NOTIFICATION_SETTINGS_ERROR");

  return (
    <div>
      {JSON.stringify(settings)}
      <button onClick={() => updateRoomNotificationSettings({})}>
        Update settings
      </button>
    </div>
  );
}

export const {
  useRoomSubscriptionSettings,
  useUpdateRoomSubscriptionSettings,
} = createRoomContext();
