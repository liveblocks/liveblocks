"use client";

import { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function ActionButton({
  children,
}: {
  children: ReactNode | ((pending: boolean) => ReactNode);
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="text-sm px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
    >
      {typeof children === "function" ? children(pending) : children}
    </button>
  );
}
