"use client";

import { redirect } from "next/navigation";

import { auth } from "@/auth/manager";
import { UserNotificationsSettings } from "./_components/user-notifications-settings";

export default async function SettingsPage() {
  const session = await auth();
  if (session) {
    redirect("/");
  }

  return (
    <div className="flex flex-col w-full items-center justify-center flex-1">
      <UserNotificationsSettings />
    </div>
  );
}
