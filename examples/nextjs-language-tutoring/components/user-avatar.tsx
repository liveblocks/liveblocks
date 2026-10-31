import { cn } from "@/lib/utils";

type UserInfo = Liveblocks["UserMeta"]["info"];

export function UserAvatar({
  info,
  size = 32,
  className,
  title,
}: {
  info: UserInfo | null | undefined;
  size?: number;
  className?: string;
  title?: string;
}) {
  const label = title ?? info?.name ?? "Unknown user";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-200 text-[0.6em] font-semibold text-neutral-600 ring-2 ring-white select-none",
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      title={label}
      aria-label={label}
    >
      {info?.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={info.avatar}
          alt=""
          width={size}
          height={size}
          className="size-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span>{initials(label)}</span>
      )}
    </span>
  );
}

function initials(name: string) {
  return name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
