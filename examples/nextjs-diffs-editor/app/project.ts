/**
 * The files the shared project starts with. Each file becomes a LiveText
 * document in Storage the first time the room is created.
 */
export const PROJECT_FILES: { path: string; contents: string }[] = [
  {
    path: "src/components/Button.tsx",
    contents: `import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-500",
  secondary: "bg-zinc-200 text-zinc-900 hover:bg-zinc-300",
  ghost: "bg-transparent text-zinc-600 hover:bg-zinc-100",
};

const SIZE_CLASSES: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
  lg: "px-4 py-2 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium",
        "transition disabled:cursor-not-allowed disabled:opacity-60",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
    >
      {children}
    </button>
  );
}
`,
  },
  {
    path: "src/components/Card.tsx",
    contents: `import type { ReactNode } from "react";
import { cn } from "../lib/cn";

interface CardProps {
  title: string;
  description?: string;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Card({
  title,
  description,
  footer,
  className,
  children,
}: CardProps) {
  return (
    <section
      className={cn(
        "rounded-lg bg-white shadow ring-1 ring-zinc-950/5",
        className
      )}
    >
      <header className="border-b border-zinc-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
        ) : null}
      </header>
      <div className="px-4 py-3">{children}</div>
      {footer ? (
        <footer className="border-t border-zinc-100 px-4 py-2">{footer}</footer>
      ) : null}
    </section>
  );
}
`,
  },
  {
    path: "src/components/Avatar.tsx",
    contents: `interface AvatarProps {
  src: string;
  name: string;
  size?: number;
}

export function Avatar({ src, name, size = 32 }: AvatarProps) {
  return (
    <img
      src={src}
      alt={name}
      title={name}
      width={size}
      height={size}
      className="rounded-full ring-2 ring-white"
      draggable={false}
    />
  );
}
`,
  },
  {
    path: "src/lib/cn.ts",
    contents: `/**
 * Joins class names, skipping falsy values.
 */
export function cn(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(" ");
}
`,
  },
  {
    path: "src/index.ts",
    contents: `export { Avatar } from "./components/Avatar";
export { Button, type ButtonProps } from "./components/Button";
export { Card } from "./components/Card";
export { cn } from "./lib/cn";
`,
  },
  {
    path: "package.json",
    contents: `{
  "name": "@acme/ui",
  "version": "0.1.0",
  "description": "A tiny component library, edited together in real time.",
  "main": "src/index.ts",
  "peerDependencies": {
    "react": "^18 || ^19"
  }
}
`,
  },
  {
    path: "README.md",
    contents: `# @acme/ui

A tiny demo component library. Every file in this project is a shared
LiveText document: open this page in another tab and edit the same file to
see keystrokes, carets, and selections sync in real time.

- Undo (Cmd/Ctrl+Z) only reverts your own edits.
- Use the file tree on the left to switch files.
- Cmd/Ctrl-click in the editor to add extra carets.
`,
  },
];

/** The file opened when entering the room. */
export const DEFAULT_ACTIVE_FILE = PROJECT_FILES[0].path;
