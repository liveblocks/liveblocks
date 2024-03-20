"use client";

import { usePathname } from "next/navigation";
import { ComponentProps } from "react";
import { Link } from "./Link";
import clsx from "clsx";
import { Room } from "../../liveblocks.config";

interface SidebarProps extends ComponentProps<"aside"> {
  rooms: Room[];
}

export function Sidebar({ rooms, className, ...props }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={clsx(className, "sidebar")} {...props}>
      <ul>
        {rooms.map((room) => {
          const isActive = pathname === room.info.url;

          return (
            <li key={room.id}>
              <Link
                href={isActive ? "/" : room.info.url}
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
                    d="M11.3 3.3a1 1 0 0 0-.71-.3H5.5C4.67 3 4 3.67 4 4.5v11c0 .83.67 1.5 1.5 1.5h9c.83 0 1.5-.67 1.5-1.5V8.41a1 1 0 0 0-.3-.7l-4.4-4.42Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M11 3.5v2.83A1.67 1.67 0 0 0 12.67 8h2.83m-7 0H7m4 3H7m6 3H7"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {room.info.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
