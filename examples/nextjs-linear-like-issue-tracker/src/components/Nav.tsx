"use client";

import Link from "next/link";
import { createIssue } from "@/actions/liveblocks";
import { useInbox } from "@/components/InboxContext";
import classNames from "classnames";
import { usePathname } from "next/navigation";
import { CreateIcon } from "@/icons/CreateIcon";
import { InboxIcon } from "@/icons/InboxIcon";
import {
  ClientSideSuspense,
  useUnreadInboxNotificationsCount,
} from "@liveblocks/react/suspense";
import { ComponentProps, useState } from "react";
import { Loading } from "@/components/Loading";
import { ProgressInProgressIcon } from "@/icons/ProgressInProgressIcon";
import { MyIssuesIcon } from "@/icons/MyIssuesIcon";

export function Nav() {
  const { isOpen, toggleInbox } = useInbox();
  const pathname = usePathname();
  const [creating, setCreating] = useState(false);

  return (
    <div>
      {creating ? (
        <div className="inset-0 bg-neutral-100/50 fixed z-50">
          <Loading />
        </div>
      ) : null}
      <div className="text-sm font-semibold p-2 pr-0 flex justify-between items-center mb-2">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="w-28 text-black font-semibold">Acme Inc</span>
        </Link>
        <button
          onClick={() => {
            setCreating(true);
            createIssue();
          }}
          className="bg-white rounded-lg p-1.5 shadow-sm border border-neutral-200 text"
        >
          <CreateIcon className="w-4 h-4" />
        </button>
      </div>
      {pathname.startsWith("/issue/") ? (
        <button
          onClick={toggleInbox}
          className={classNames(
            "flex items-center justify-between gap-2 w-full text-sm text-neutral-700 font-semibold p-2 rounded text-left hover:bg-neutral-200",
            { "bg-neutral-200": isOpen }
          )}
        >
          <span className="flex items-center gap-2">
            <InboxIcon className="w-4 h-4" />
            Inbox
          </span>
          <ClientSideSuspense fallback={<div />}>
            <UnreadBadge />
          </ClientSideSuspense>
        </button>
      ) : (
        <Link href="/inbox">
          <div
            className={classNames(
              "flex items-center justify-between gap-2 w-full text-sm text-neutral-700 font-semibold p-2 rounded text-left hover:bg-neutral-200",
              { "bg-neutral-200": pathname === "/inbox" }
            )}
          >
            <span className="flex items-center gap-2">
              <InboxIcon className="w-4 h-4" />
              Inbox
            </span>
            <ClientSideSuspense fallback={<div />}>
              <UnreadBadge />
            </ClientSideSuspense>
          </div>
        </Link>
      )}
      <Link href="/">
        <div
          className={classNames(
            "flex items-center justify-between gap-2 w-full text-sm text-neutral-700 font-semibold p-2 rounded text-left hover:bg-neutral-200",
            { "bg-neutral-200": pathname === "/" }
          )}
        >
          <span className="flex items-center gap-2">
            <MyIssuesIcon className="w-4 h-4" />
            Issues
          </span>
        </div>
      </Link>
    </div>
  );
}

function UnreadBadge() {
  const { count } = useUnreadInboxNotificationsCount();

  if (count <= 0) {
    return <div />;
  }

  return (
    <div className="w-5 h-5 flex justify-center items-center bg-neutral-200 font-medium text-xs rounded">
      {count}
    </div>
  );
}

function Logo(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 128 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M28.832 3.219H26v16.778h2.832V3.22zm5.254 4.796h-2.831v11.982h2.83V8.015zm0-4.925h-2.831v3.054h2.83V3.09zm4.154 4.925h-3.042l4.283 11.982h3.159l4.283-11.982h-2.996l-1.79 5.676c-.047.147-.215.725-.503 1.731l-.574 1.93a147.428 147.428 0 00-1.064-3.661L38.24 8.015zM58.52 11.76c-.235-.803-.578-1.486-1.031-2.048a5.039 5.039 0 00-1.93-1.462c-.773-.351-1.63-.526-2.574-.526-1.794 0-3.23.561-4.306 1.684a5.704 5.704 0 00-1.206 2.013c-.265.772-.397 1.626-.397 2.562 0 2.005.534 3.553 1.603 4.646 1.084 1.107 2.528 1.66 4.33 1.66 1.544 0 2.795-.346 3.755-1.04.96-.695 1.596-1.724 1.907-3.09l-2.761-.21c-.133.741-.437 1.295-.913 1.661-.476.36-1.147.54-2.012.54-1.981 0-2.995-1.117-3.042-3.348h8.916l.012-.397c0-.96-.118-1.841-.351-2.645zm-7.946-.842c.5-.702 1.303-1.054 2.41-1.054.539 0 .992.074 1.358.223.367.148.683.386.948.713.206.255.365.544.468.855.116.324.187.662.21 1.006h-6.002c.07-.694.273-1.276.608-1.743zm19.295-2.434c-.803-.523-1.731-.784-2.784-.784h-.001a4.66 4.66 0 00-2.094.468 3.992 3.992 0 00-1.546 1.334V3.219h-2.83v16.778h2.831v-1.65c.36.593.867 1.082 1.474 1.416.632.351 1.33.527 2.094.527 1.062 0 2.001-.254 2.822-.76.819-.507 1.454-1.233 1.906-2.177.46-.952.691-2.067.691-3.346 0-1.249-.227-2.348-.678-3.3-.445-.96-1.073-1.7-1.885-2.223zm-1.205 8.693c-.452.687-1.224 1.03-2.317 1.03-.983 0-1.724-.355-2.222-1.065-.5-.71-.75-1.747-.75-3.112 0-1.319.223-2.348.667-3.09.453-.748 1.213-1.122 2.282-1.122 1.092 0 1.868.343 2.329 1.029.46.679.69 1.732.69 3.16 0 1.427-.226 2.484-.679 3.17zM77.03 3.22H74.2v16.778h2.831V3.22zm4.587 16.322c.92.5 2.012.749 3.277.749 1.216 0 2.285-.262 3.205-.784a5.341 5.341 0 002.142-2.2c.506-.951.76-2.052.76-3.3 0-1.2-.25-2.277-.749-3.229a5.473 5.473 0 00-2.13-2.246c-.92-.538-1.996-.808-3.228-.808-1.241 0-2.325.27-3.253.808a5.498 5.498 0 00-2.13 2.234c-.491.944-.737 2.025-.737 3.242 0 1.295.241 2.414.725 3.357a5.139 5.139 0 002.118 2.177zm5.628-2.352c-.476.671-1.26 1.007-2.351 1.007-.742 0-1.338-.149-1.79-.445-.454-.304-.781-.76-.984-1.37-.203-.616-.304-1.407-.304-2.375 0-1.45.238-2.511.714-3.182.484-.67 1.271-1.006 2.364-1.006 1.084 0 1.864.335 2.34 1.006.483.67.725 1.732.725 3.183 0 1.45-.238 2.511-.714 3.182zm7.618 2.352c.913.5 2 .749 3.265.749.982 0 1.86-.171 2.632-.515.773-.343 1.4-.822 1.884-1.439.485-.628.803-1.369.924-2.153l-2.726-.28c-.187.748-.499 1.306-.936 1.672-.437.367-1.03.55-1.778.55-.765 0-1.365-.156-1.803-.468-.436-.32-.74-.776-.912-1.369-.172-.6-.257-1.361-.257-2.281 0-.905.085-1.654.257-2.247.171-.6.472-1.06.9-1.38.438-.329 1.042-.492 1.815-.492.826 0 1.439.23 1.837.69.405.453.694 1.072.865 1.86l2.68-.48c-.257-1.279-.839-2.304-1.744-3.076-.897-.773-2.11-1.158-3.638-1.158-1.249 0-2.329.265-3.242.795a5.287 5.287 0 00-2.094 2.223c-.484.944-.726 2.032-.726 3.265 0 1.302.238 2.426.714 3.37a5.03 5.03 0 002.083 2.164zm13.047-3.99l1.322-1.264 3.51 5.71h3.265l-4.856-7.524 4.704-4.458h-3.675l-4.27 4.377V3.22h-2.832v16.778h2.832v-4.446zm10.578 4.306c.796.289 1.681.433 2.656.433 1.49 0 2.718-.297 3.686-.889.975-.593 1.463-1.56 1.463-2.902 0-.874-.227-1.56-.679-2.06a3.83 3.83 0 00-1.615-1.088c-.616-.226-1.455-.456-2.515-.69a15.398 15.398 0 01-1.463-.374c-.359-.118-.648-.27-.866-.457a.93.93 0 01-.316-.725c0-.437.195-.768.585-.995.39-.226.874-.34 1.451-.34.764 0 1.361.184 1.791.55.436.368.67.918.701 1.65l2.621-.432c-.125-1.342-.651-2.313-1.58-2.914-.92-.6-2.098-.901-3.533-.901-.843 0-1.622.128-2.34.386-.71.25-1.283.644-1.72 1.183-.437.537-.655 1.216-.655 2.035 0 .757.187 1.369.561 1.837a3.75 3.75 0 001.428 1.088c.577.25 1.302.488 2.176.714l.726.175c.484.115.964.248 1.439.398.327.102.596.242.807.421.211.18.316.414.316.703 0 .506-.211.897-.632 1.17-.413.273-1.018.41-1.813.41-.812 0-1.459-.204-1.943-.61-.483-.405-.729-.99-.737-1.754l-2.667.304c.03.92.284 1.689.76 2.305.484.616 1.119 1.072 1.907 1.369zM13.5 9H0l4 4v5.5L13.5 9zM6.5 20H20l-4-4v-5.5L6.5 20z"
        fill="currentColor"
      />
    </svg>
  );
}
