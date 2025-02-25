import { UserNotificationsSettings } from "./_components/user-notifications-settings";

// Settings that allow users to choose which notifications are received
// https://liveblocks.io/docs/guides/how-to-create-a-notification-settings-panel

export default function SettingsPage() {
  return (
    <div className="flex flex-col w-full items-center justify-center flex-1">
      <UserNotificationsSettings />
    </div>
  );
}
