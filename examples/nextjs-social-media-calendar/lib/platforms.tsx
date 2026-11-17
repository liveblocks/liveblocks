import type { ComponentProps, CSSProperties, ReactElement } from "react";

export type Platform = "x" | "threads" | "bluesky" | "mastodon" | "linkedin";

export const PLATFORMS: Platform[] = [
  "x",
  "threads",
  "bluesky",
  "mastodon",
  "linkedin",
];

type PlatformInfo = {
  label: string;
  // Brand color used for the icon badge on calendar cards.
  color: string;
  // Soft background used behind the icon.
  background: string;
  // Maximum caption length, shown as a counter in the composer.
  maxLength: number;
  handle: string;
};

export const PLATFORM_INFO: Record<Platform, PlatformInfo> = {
  x: {
    label: "X",
    color: "#0F1419",
    background: "#EEF0F2",
    maxLength: 280,
    handle: "@liveblocks",
  },
  threads: {
    label: "Threads",
    color: "#000000",
    background: "#EDEDED",
    maxLength: 500,
    handle: "@liveblocks",
  },
  bluesky: {
    label: "Bluesky",
    color: "#1185FE",
    background: "#E6F1FF",
    maxLength: 300,
    handle: "@liveblocks.io",
  },
  mastodon: {
    label: "Mastodon",
    color: "#6364FF",
    background: "#EEEEFF",
    maxLength: 500,
    handle: "@liveblocks@mastodon.social",
  },
  linkedin: {
    label: "LinkedIn",
    color: "#0A66C2",
    background: "#E7F0FA",
    maxLength: 3000,
    handle: "Liveblocks",
  },
};

export function isPlatform(value: unknown): value is Platform {
  return PLATFORMS.some((platform) => platform === value);
}

/** The platforms in their canonical order, without duplicates. */
export function sortPlatforms(platforms: readonly Platform[]): Platform[] {
  return PLATFORMS.filter((platform) => platforms.includes(platform));
}

/** "X", "X and Threads", "X, Threads and LinkedIn". */
export function describePlatforms(platforms: readonly Platform[]) {
  const labels = sortPlatforms(platforms).map(
    (platform) => PLATFORM_INFO[platform].label
  );
  if (labels.length <= 1) {
    return labels[0] ?? "";
  }
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

/**
 * The platform with the shortest caption limit among those selected: the one
 * the whole post has to fit, since the same text goes everywhere.
 */
export function strictestPlatform(platforms: readonly Platform[]): Platform {
  return sortPlatforms(platforms).reduce((strictest, platform) =>
    PLATFORM_INFO[platform].maxLength < PLATFORM_INFO[strictest].maxLength
      ? platform
      : strictest
  );
}

type IconProps = Omit<ComponentProps<"svg">, "children">;

function BrandIcon({ children, ...props }: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="currentColor"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

function XIcon(props: IconProps) {
  return (
    <BrandIcon {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </BrandIcon>
  );
}

function LinkedInIcon(props: IconProps) {
  return (
    <BrandIcon {...props}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </BrandIcon>
  );
}

function ThreadsIcon(props: IconProps) {
  return (
    <BrandIcon {...props}>
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221z" />
    </BrandIcon>
  );
}

function BlueskyIcon(props: IconProps) {
  return (
    <BrandIcon {...props}>
      <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z" />
    </BrandIcon>
  );
}

function MastodonIcon(props: IconProps) {
  return (
    <BrandIcon {...props}>
      <path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01 20.282 20.282 0 0 1-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054c1.517.363 3.072.546 4.632.546.376 0 .75 0 1.125-.01 1.57-.044 3.224-.124 4.768-.422.038-.008.077-.015.11-.024 2.435-.464 4.753-1.92 4.989-5.604.008-.145.03-1.52.03-1.67.002-.512.167-3.63-.024-5.545zm-3.748 9.195h-2.561V8.29c0-1.309-.55-1.976-1.67-1.976-1.23 0-1.846.79-1.846 2.35v3.403h-2.546V8.663c0-1.56-.617-2.35-1.848-2.35-1.112 0-1.668.668-1.67 1.977v6.218H4.822V8.102c0-1.31.337-2.35 1.011-3.12.696-.77 1.608-1.164 2.74-1.164 1.311 0 2.302.5 2.962 1.498l.638 1.06.638-1.06c.66-.999 1.65-1.498 2.96-1.498 1.13 0 2.043.395 2.74 1.164.675.77 1.012 1.81 1.012 3.12z" />
    </BrandIcon>
  );
}

const PLATFORM_ICONS: Record<Platform, (props: IconProps) => ReactElement> = {
  x: XIcon,
  threads: ThreadsIcon,
  bluesky: BlueskyIcon,
  mastodon: MastodonIcon,
  linkedin: LinkedInIcon,
};

export function PlatformIcon({
  platform,
  ...props
}: IconProps & { platform: Platform }) {
  const Icon = PLATFORM_ICONS[platform];
  return <Icon {...props} />;
}

/**
 * The badges of every platform a post goes to, in a row — solid brand-colored
 * badges side by side with a small gap between them.
 */
export function PlatformBadges({
  platforms,
  size = 24,
  className,
}: {
  platforms: readonly Platform[];
  size?: number;
  className?: string;
}) {
  const sorted = sortPlatforms(platforms);
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        flexShrink: 0,
      }}
      aria-label={describePlatforms(sorted)}
    >
      {sorted.map((platform) => (
        <PlatformBadge
          key={platform}
          platform={platform}
          size={size}
          variant="solid"
        />
      ))}
    </span>
  );
}

/**
 * A small rounded badge with the platform's brand icon, used on calendar
 * cards, list rows, and the composer header. `soft` is the icon in the brand
 * color on a tinted background; `solid` is a white icon on the brand color,
 * the way networks badge an account's avatar.
 */
export function PlatformBadge({
  platform,
  size = 24,
  variant = "soft",
  className,
  style,
}: {
  platform: Platform;
  size?: number;
  variant?: "soft" | "solid";
  className?: string;
  style?: CSSProperties;
}) {
  const info = PLATFORM_INFO[platform];
  const solid = variant === "solid";
  return (
    <span
      className={className}
      title={info.label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: size / 3,
        background: solid ? info.color : info.background,
        color: solid ? "#fff" : info.color,
        flexShrink: 0,
        ...style,
      }}
    >
      <PlatformIcon
        platform={platform}
        width={size * 0.55}
        height={size * 0.55}
      />
    </span>
  );
}
