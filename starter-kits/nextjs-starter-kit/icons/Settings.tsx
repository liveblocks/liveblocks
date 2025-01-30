import { ComponentProps } from "react";

export function SettingsIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-sliders-horizontal"
      {...props}
    >
      <path d="M21 4L14 4" />
      <path d="M10 4L3 4" />
      <path d="M21 12L12 12" />
      <path d="M8 12L3 12" />
      <path d="M21 20L16 20" />
      <path d="M12 20L3 20" />
      <path d="M14 2L14 6" />
      <path d="M8 10L8 14" />
      <path d="M16 18L16 22" />
    </svg>
  );
}
