"use client";

import { ComponentProps, Suspense } from "react";
import { Link } from "./Link";
import clsx from "clsx";
import { usePathParams } from "../hooks/usePathParams";

interface SidebarProps extends ComponentProps<"aside"> {
  rooms: Liveblocks["RoomInfo"][];
}

export function Sidebar({ rooms, className, ...props }: SidebarProps) {
  const { tenant, pathname } = usePathParams();

  return (
    <aside className={clsx(className, "sidebar")} {...props}>
      <ul>
        {rooms.map((room) => {
          const roomPath = `/${tenant}/${room.slug}`;
          const isActive = pathname === roomPath;
          return (
            <li key={room.id}>
              <Suspense fallback={null}>
                <Link
                  href={roomPath}
                  className="sidebar-room"
                  data-active={isActive ? "" : undefined}
                >
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4 8h12M4 12h12M8.5 3.5 7 16.5m6-13-1.5 13"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {room.name}
                </Link>
              </Suspense>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
