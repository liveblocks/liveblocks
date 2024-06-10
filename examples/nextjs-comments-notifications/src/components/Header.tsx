"use client";

import clsx from "clsx";
import { ComponentProps, useMemo } from "react";
import { usePathname } from "next/navigation";
import { ErrorBoundary } from "react-error-boundary";
import { InboxPopover } from "./InboxPopover";
import { User } from "./User";
import { useRoomInfo } from "@liveblocks/react/suspense";
import { useExampleRoomId } from "../example.client";
import { ClientSideSuspense } from "@liveblocks/react";

interface TitleRoomProps extends ComponentProps<"div"> {
  room: string;
}

function TitleRoom({ room, ...props }: TitleRoomProps) {
  const roomId = useExampleRoomId(room);
  const { info } = useRoomInfo(roomId);

  return <div {...props}>{info.name}</div>;
}

export function Header({ className, ...props }: ComponentProps<"header">) {
  const pathname = usePathname();
  const room = useMemo(() => pathname.substring(1), [pathname]);

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
        <div className="header-title">Home</div>
      )}
      <InboxPopover />
    </header>
  );
}
