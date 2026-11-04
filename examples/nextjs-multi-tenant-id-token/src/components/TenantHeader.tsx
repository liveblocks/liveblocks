"use client";

import clsx from "clsx";
import { ComponentProps } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { InboxPopover } from "./InboxPopover";
import { User } from "./User";
import { useRoomInfo } from "@liveblocks/react/suspense";
import { useExampleRoomId } from "../example.client";
import { ClientSideSuspense } from "@liveblocks/react";
import { usePathParams } from "../hooks/usePathParams";
import { TenantSelect } from "./TenantSelect";
import { useTenants } from "../hooks/useTenants";
interface TitleRoomProps extends ComponentProps<"div"> {
  room: string;
}

function TitleRoom({ room, ...props }: TitleRoomProps) {
  const roomId = useExampleRoomId(room);
  const { info } = useRoomInfo(roomId);

  return <div {...props}>{info.name}</div>;
}

export function TenantHeader({
  className,
  ...props
}: ComponentProps<"header">) {
  const { tenant, room } = usePathParams();
  const { activeTenant } = useTenants();

  if (!room) {
    return (
      <header className={clsx(className, "header")} {...props}>
        <User />
        <div className="header-title">{activeTenant?.name}</div>
        <div className="header-right">
          <InboxPopover />
          <TenantSelect />
        </div>
      </header>
    );
  }

  return (
    <header className={clsx(className, "header")} {...props}>
      <User />
      {room ? (
        <ErrorBoundary fallback={null}>
          <ClientSideSuspense fallback={null}>
            <TitleRoom className="header-title" room={room} />
          </ClientSideSuspense>
        </ErrorBoundary>
      ) : (
        <div className="header-title">{tenant}</div>
      )}
      <div className="header-right">
        <InboxPopover />
        <TenantSelect />
      </div>
    </header>
  );
}
