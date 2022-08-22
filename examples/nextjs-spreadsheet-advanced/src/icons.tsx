import { ComponentProps } from "react";

export function HandlerIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      fill="none"
      height="16"
      width="16"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        clipRule="evenodd"
        d="M5 6.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM5 12.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM11 6.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM11 12.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}

export function EllipsisIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      fill="none"
      height="16"
      width="16"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M3 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM13 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function UndoIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      fill="none"
      height="20"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M7.707 5.707a1 1 0 0 0-1.414-1.414l-3 3a1 1 0 0 0 0 1.414l3 3a1 1 0 0 0 1.414-1.414L6.414 9H12.5a2.5 2.5 0 0 1 0 5H11a1 1 0 1 0 0 2h1.5a4.5 4.5 0 1 0 0-9H6.414l1.293-1.293Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function RedoIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      fill="none"
      height="20"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M12.293 5.707a1 1 0 0 1 1.414-1.414l3 3a1 1 0 0 1 0 1.414l-3 3a1 1 0 0 1-1.414-1.414L13.586 9H7.5a2.5 2.5 0 0 0 0 5H9a1 1 0 1 1 0 2H7.5a4.5 4.5 0 1 1 0-9h6.086l-1.293-1.293Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function TrashIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      fill="none"
      height="20"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="m6.095 7 .735 8.09a1 1 0 0 0 .996.91h4.348a1 1 0 0 0 .995-.91L13.905 7h-7.81Z"
        fill="currentColor"
        fillOpacity={0.2}
      />
      <path
        clipRule="evenodd"
        d="M6 4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1h3a1 1 0 1 1 0 2h-1.087l-.752 8.272A3 3 0 0 1 12.174 18H7.826a3 3 0 0 1-2.987-2.728L4.087 7H3a1 1 0 0 1 0-2h3V4Zm2 1h4V4H8v1ZM6.095 7l.736 8.09a1 1 0 0 0 .995.91h4.348a1 1 0 0 0 .995-.91L13.905 7H6.095"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}

export function EraserIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      fill="none"
      height="20"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="m5.414 14-1-1L11 6.414 13.586 9l-5 5H5.414Z"
        fill="currentColor"
        fillOpacity={0.2}
      />
      <path
        clipRule="evenodd"
        d="M11.707 4.293a1 1 0 0 0-1.414 0l-8 8a1 1 0 0 0 0 1.414l2 2A1 1 0 0 0 5 16h4a1 1 0 0 0 .707-.293l6-6a1 1 0 0 0 0-1.414l-4-4ZM5.414 14l-1-1L11 6.414 13.586 9l-5 5H5.414ZM14 14a1 1 0 1 0 0 2h3a1 1 0 1 0 0-2h-3Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}

export function ResetIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      fill="none"
      height="20"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        clipRule="evenodd"
        d="M15 10a5 5 0 0 0-9-3h2a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1V4a1 1 0 0 1 2 0v1.101a7 7 0 1 1-1.063 8.4 1 1 0 1 1 1.731-1.002A5 5 0 0 0 15 10Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}

export function AddColumnBeforeIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      fill="none"
      height="20"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M15 5a1 1 0 0 0-1-1h-3v12h3a1 1 0 0 0 1-1V5Z"
        fill="currentColor"
        fillOpacity={0.2}
      />
      <path
        clipRule="evenodd"
        d="M17 5a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 1 1 0 1 0 2 0 1 1 0 0 1 1-1h3v12H6a1 1 0 0 1-1-1 1 1 0 1 0-2 0 3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V5Zm-3-1h-3v12h3a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1ZM4 7a1 1 0 0 1 1 1v1h1a1 1 0 0 1 0 2H5v1a1 1 0 1 1-2 0v-1H2a1 1 0 1 1 0-2h1V8a1 1 0 0 1 1-1Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}

export function AddColumnAfterIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      fill="none"
      height="20"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M5 5a1 1 0 0 1 1-1h3v12H6a1 1 0 0 1-1-1V5Z"
        fill="currentColor"
        fillOpacity={0.2}
      />
      <path
        clipRule="evenodd"
        d="M3 5a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3 1 1 0 1 1-2 0 1 1 0 0 0-1-1h-3v12h3a1 1 0 0 0 1-1 1 1 0 1 1 2 0 3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V5Zm3-1h3v12H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm10 3a1 1 0 0 1 1 1v1h1a1 1 0 1 1 0 2h-1v1a1 1 0 1 1-2 0v-1h-1a1 1 0 1 1 0-2h1V8a1 1 0 0 1 1-1Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}

export function MoveColumnBeforeIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      fill="none"
      height="20"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M15 5a1 1 0 0 0-1-1h-3v12h3a1 1 0 0 0 1-1V5Z"
        fill="currentColor"
        fillOpacity={0.2}
      />
      <path
        clipRule="evenodd"
        d="M17 5a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 1 1 0 1 0 2 0 1 1 0 0 1 1-1h3v5H5.414l.293-.293a1 1 0 0 0-1.414-1.414l-2 2a1 1 0 0 0 0 1.414l2 2a1 1 0 0 0 1.414-1.414L5.414 11H9v5H6a1 1 0 0 1-1-1 1 1 0 1 0-2 0 3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V5Zm-3 11h-3V4h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}

export function MoveColumnAfterIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      fill="none"
      height="20"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M5 5a1 1 0 0 1 1-1h3v12H6a1 1 0 0 1-1-1V5Z"
        fill="currentColor"
        fillOpacity={0.2}
      />
      <path
        clipRule="evenodd"
        d="M3 5a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3 1 1 0 1 1-2 0 1 1 0 0 0-1-1h-3v5h3.586l-.293-.293a1 1 0 0 1 1.414-1.414l2 2a1 1 0 0 1 0 1.414l-2 2a1 1 0 0 1-1.414-1.414l.293-.293H11v5h3a1 1 0 0 0 1-1 1 1 0 1 1 2 0 3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V5Zm3-1h3v12H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}

export function AddRowBeforeIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      fill="none"
      height="20"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M4 14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3H4v3Z"
        fill="currentColor"
        fillOpacity={0.2}
      />
      <path
        clipRule="evenodd"
        d="M10 1a1 1 0 0 1 1 1v1h1a1 1 0 1 1 0 2h-1v1a1 1 0 1 1-2 0V5H8a1 1 0 0 1 0-2h1V2a1 1 0 0 1 1-1Zm5 16a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 1 1 0 1 0 0 2 1 1 0 0 1 1 1v3H4V6a1 1 0 0 1 1-1 1 1 0 1 0 0-2 3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h10Zm1-3v-3H4v3a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}

export function AddRowAfterIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      fill="none"
      height="20"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M4 6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v3H4V6Z"
        fill="currentColor"
        fillOpacity={0.2}
      />
      <path
        clipRule="evenodd"
        d="M15 3a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3 1 1 0 1 1 0-2 1 1 0 0 0 1-1v-3H4v3a1 1 0 0 0 1 1 1 1 0 1 1 0 2 3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h10Zm1 3v3H4V6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1Zm-6 7a1 1 0 0 1 1 1v1h1a1 1 0 1 1 0 2h-1v1a1 1 0 1 1-2 0v-1H8a1 1 0 1 1 0-2h1v-1a1 1 0 0 1 1-1Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}

export function MoveRowBeforeIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      fill="none"
      height="20"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M4 14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3H4v3Z"
        fill="currentColor"
        fillOpacity={0.2}
      />
      <path
        clipRule="evenodd"
        d="M12.707 5.707a1 1 0 0 0 0-1.414l-2-2a1 1 0 0 0-1.414 0l-2 2a1 1 0 0 0 1.414 1.414L9 5.414V9H4V6a1 1 0 0 1 1-1 1 1 0 1 0 0-2 3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 1 1 0 1 0 0 2 1 1 0 0 1 1 1v3h-5V5.414l.293.293a1 1 0 0 0 1.414 0ZM4 14v-3h12v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}

export function MoveRowAfterIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      fill="none"
      height="20"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M4 6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v3H4V6Z"
        fill="currentColor"
        fillOpacity={0.2}
      />
      <path
        clipRule="evenodd"
        d="M15 3a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3 1 1 0 1 1 0-2 1 1 0 0 0 1-1v-3h-5v3.586l.293-.293a1 1 0 0 1 1.414 1.414l-2 2a1 1 0 0 1-1.414 0l-2-2a1 1 0 1 1 1.414-1.414l.293.293V11H4v3a1 1 0 0 0 1 1 1 1 0 1 1 0 2 3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h10Zm1 3v3H4V6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}
