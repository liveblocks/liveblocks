import type { ComponentProps } from "react";

export function ObjectIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 4a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4Zm9 0a.75.75 0 0 1 .75-.75c.57 0 1.132.2 1.559.58.43.382.691.92.691 1.503v1.334c0 .124.055.264.188.382.135.12.336.201.562.201a.75.75 0 0 1 0 1.5.851.851 0 0 0-.562.201.514.514 0 0 0-.188.382v1.334c0 .583-.261 1.121-.691 1.503a2.35 2.35 0 0 1-1.559.58.75.75 0 0 1 0-1.5c.226 0 .427-.08.562-.201a.514.514 0 0 0 .188-.382V9.333c0-.5.193-.969.52-1.333a1.993 1.993 0 0 1-.52-1.333V5.333a.515.515 0 0 0-.188-.382.851.851 0 0 0-.562-.201A.75.75 0 0 1 9 4Zm-2.75-.75a.75.75 0 0 1 0 1.5.851.851 0 0 0-.562.201.514.514 0 0 0-.188.382v1.334c0 .5-.193.969-.52 1.333.327.364.52.832.52 1.333v1.334c0 .124.055.264.188.382.135.12.336.201.562.201a.75.75 0 0 1 0 1.5c-.57 0-1.132-.2-1.559-.58A2.012 2.012 0 0 1 4 10.667V9.333a.514.514 0 0 0-.188-.382.851.851 0 0 0-.562-.201.75.75 0 0 1 0-1.5c.226 0 .427-.08.562-.201A.514.514 0 0 0 4 6.667V5.333c0-.583.261-1.121.691-1.503a2.35 2.35 0 0 1 1.559-.58Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ArrayIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 3.5A3.5 3.5 0 0 1 3.5 0h9A3.5 3.5 0 0 1 16 3.5v9a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 0 12.5v-9ZM9 4a.75.75 0 0 1 .75-.75h1c.69 0 1.25.56 1.25 1.25v7c0 .69-.56 1.25-1.25 1.25h-1a.75.75 0 0 1 0-1.5h.75v-6.5h-.75A.75.75 0 0 1 9 4Zm-2.75-.75a.75.75 0 1 1 0 1.5H5.5v6.5h.75a.75.75 0 0 1 0 1.5h-1c-.69 0-1.25-.56-1.25-1.25v-7c0-.69.56-1.25 1.25-1.25h1Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function MapIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 3.5A3.5 3.5 0 0 1 3.5 0h9A3.5 3.5 0 0 1 16 3.5v9a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 0 12.5v-9Zm9.126.084a.75.75 0 0 1 1.04-.208l.002.001.002.001.004.003.01.007a1.37 1.37 0 0 1 .102.078c.06.049.139.117.229.207.18.18.406.446.628.816C11.59 5.234 12 6.37 12 8c0 1.632-.41 2.766-.857 3.51-.222.37-.448.637-.628.817a2.965 2.965 0 0 1-.331.285l-.01.007-.004.002-.002.002h-.001l-.001.001a.75.75 0 0 1-.842-1.241l.019-.015c.021-.018.06-.05.111-.101.101-.102.25-.272.403-.528.303-.505.643-1.37.643-2.739 0-1.368-.34-2.234-.643-2.74a2.737 2.737 0 0 0-.403-.527 1.467 1.467 0 0 0-.13-.116.75.75 0 0 1-.198-1.033Zm-3.292-.208a.75.75 0 1 1 .823 1.256c-.021.017-.06.05-.111.101-.101.102-.25.272-.403.528C5.84 5.766 5.5 6.63 5.5 8c0 1.368.34 2.234.643 2.74.153.255.302.425.403.527.05.05.09.084.111.101l.019.015a.75.75 0 0 1-.842 1.241l-.002-.001-.002-.002-.004-.002-.01-.007a1.791 1.791 0 0 1-.102-.078 2.962 2.962 0 0 1-.229-.207 4.23 4.23 0 0 1-.628-.816C4.41 10.766 4 9.63 4 8c0-1.632.41-2.766.857-3.51a4.23 4.23 0 0 1 .628-.817 2.952 2.952 0 0 1 .331-.285l.01-.007.004-.003h.002l.001-.002h.001Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function NumberIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.5 0A3.5 3.5 0 0 0 0 3.5v9A3.5 3.5 0 0 0 3.5 16h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 12.5 0h-9Zm4.17 4.127a.75.75 0 1 0-1.478-.254L5.912 5.5H4.335a.75.75 0 0 0 0 1.5h1.317l-.345 2H3.75a.75.75 0 0 0 0 1.5h1.3l-.237 1.373a.75.75 0 1 0 1.478.254l.28-1.627h1.996l-.237 1.373a.75.75 0 1 0 1.478.254l.28-1.627h1.576a.75.75 0 0 0 0-1.5h-1.317l.345-2h1.558a.75.75 0 0 0 0-1.5h-1.3l.237-1.373a.75.75 0 1 0-1.478-.254L9.43 5.5H7.434l.236-1.373ZM6.83 9l.345-2H9.17l-.345 2H6.83Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function StringIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 3.5A3.5 3.5 0 0 1 3.5 0h9A3.5 3.5 0 0 1 16 3.5v9a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 0 12.5v-9Zm11.65 2.486a.75.75 0 0 0-.294-1.471c-.751.15-1.34.462-1.783.894a3.347 3.347 0 0 0-.85 1.433c-.215.798-.22 1.62-.223 2.124V9l.003.215v.035a2.25 2.25 0 1 0 1.735-2.19c.094-.223.218-.417.383-.578.213-.208.53-.397 1.03-.496ZM6.74 5.103a.75.75 0 0 1-.589.883c-.498.1-.816.288-1.03.496-.164.16-.288.355-.382.577a2.25 2.25 0 1 1-1.735 2.19v-.034L3 9v-.034c.003-.505.008-1.326.224-2.124.152-.495.41-1.005.849-1.433.443-.432 1.032-.744 1.783-.894a.75.75 0 0 1 .883.588Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function BooleanOnIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.5 0A3.5 3.5 0 0 0 0 3.5v9A3.5 3.5 0 0 0 3.5 16h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 12.5 0h-9ZM3 8a3.5 3.5 0 0 1 3.5-3.5h3a3.5 3.5 0 1 1 0 7h-3A3.5 3.5 0 0 1 3 8Zm8.5 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function BooleanOffIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.5 0A3.5 3.5 0 0 0 0 3.5v9A3.5 3.5 0 0 0 3.5 16h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 12.5 0h-9ZM3 8a3.5 3.5 0 0 1 3.5-3.5h3a3.5 3.5 0 1 1 0 7h-3A3.5 3.5 0 0 1 3 8Zm5.5 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function CustomEventIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.5 0A3.5 3.5 0 0 0 0 3.5v9A3.5 3.5 0 0 0 3.5 16h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 12.5 0h-9Zm2.7 4.91a3.5 3.5 0 1 1 .49 5.97.75.75 0 0 0-.58-.04l-1.42.47.47-1.42a.75.75 0 0 0-.04-.58 3.5 3.5 0 0 1 1.08-4.4Zm2.45-2.14a5 5 0 0 0-5 6.92l-.86 2.57a.75.75 0 0 0 .95.95l2.57-.85a5 5 0 1 0 2.34-9.6Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function UserIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 3.5A3.5 3.5 0 0 1 3.5 0h9A3.5 3.5 0 0 1 16 3.5v9a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 0 12.5v-9Zm8 1A1.25 1.25 0 1 0 8 7a1.25 1.25 0 0 0 0-2.5ZM5.25 5.75a2.75 2.75 0 1 1 5.5 0 2.75 2.75 0 0 1-5.5 0ZM8 9.25c-1.38 0-2.431.296-3.224.761a4.172 4.172 0 0 0-1.587 1.634.75.75 0 0 0 1.321.71c.19-.353.502-.743 1.025-1.05.524-.307 1.303-.555 2.465-.555s1.941.248 2.465.555c.523.307.835.697 1.025 1.05a.75.75 0 0 0 1.32-.71 4.173 4.173 0 0 0-1.586-1.634C10.431 9.546 9.38 9.25 8 9.25Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function EllipsisIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.5 0A3.5 3.5 0 0 0 0 3.5v9A3.5 3.5 0 0 0 3.5 16h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 12.5 0h-9Zm1 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM9 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm2.5 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function QuestionIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 3.5A3.5 3.5 0 0 1 3.5 0h9A3.5 3.5 0 0 1 16 3.5v9a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 0 12.5v-9Zm8.71 3.63c-.635.245-1.46.859-1.46 1.87v.25a.75.75 0 0 0 1.5 0V9c0-.052.018-.122.102-.213.088-.097.228-.192.398-.257A2.687 2.687 0 0 0 11 6c0-.534-.06-1.299-.515-1.936C9.993 3.374 9.165 3 8 3c-1.353 0-2.13.79-2.53 1.51a4.085 4.085 0 0 0-.46 1.36l-.003.03-.002.01v.007a.75.75 0 0 0 1.49.17v-.008l.008-.047a2.588 2.588 0 0 1 .277-.793C7.006 4.835 7.353 4.5 8 4.5c.834 0 1.132.25 1.265.436.17.238.235.598.235 1.064 0 .466-.256.924-.79 1.13ZM8 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function CrossIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.5 0A3.5 3.5 0 0 0 0 3.5v9A3.5 3.5 0 0 0 3.5 16h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 12.5 0h-9Zm8.53 5.03a.75.75 0 0 0-1.06-1.06L8 6.94 5.03 3.97a.75.75 0 0 0-1.06 1.06L6.94 8l-2.97 2.97a.75.75 0 1 0 1.06 1.06L8 9.06l2.97 2.97a.75.75 0 1 0 1.06-1.06L9.06 8l2.97-2.97Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function TrashIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.5 0A3.5 3.5 0 0 0 0 3.5v9A3.5 3.5 0 0 0 3.5 16h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 12.5 0h-9Zm1.75 4.25c0-.966.784-1.75 1.75-1.75h2c.966 0 1.75.784 1.75 1.75v.5h1.75a.75.75 0 0 1 0 1.5H12v5A1.75 1.75 0 0 1 10.25 13h-4.5A1.75 1.75 0 0 1 4 11.25v-5h-.5a.75.75 0 0 1 0-1.5h1.75v-.5Zm4 0v.5h-2.5v-.5A.25.25 0 0 1 7 4h2a.25.25 0 0 1 .25.25Zm-3.75 2v5c0 .138.112.25.25.25h4.5a.25.25 0 0 0 .25-.25v-5h-5Z"
        fill="currentColor"
      />
    </svg>
  );
}
