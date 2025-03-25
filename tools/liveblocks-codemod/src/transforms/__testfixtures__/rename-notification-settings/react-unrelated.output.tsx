/* eslint-disable */
// @ts-nocheck
import { useRoomNotificationSettings } from "my-lib";
import { useUpdateRoomNotificationSettings } from "my-lib/suspense";

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
