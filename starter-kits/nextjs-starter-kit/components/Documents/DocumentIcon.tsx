import { ComponentProps } from "react";
import { DocumentType } from "@/types";

interface Props extends Omit<ComponentProps<"svg">, "type"> {
  type?: DocumentType;
}

function CanvasDocumentIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={19}
      height={19}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21.174 6.812a1 1 0 00-3.986-3.987L3.842 16.174a2 2 0 00-.5.83l-1.321 4.352a.5.5 0 00.623.622l4.353-1.32a2 2 0 00.83-.497zM15 5l4 4" />
    </svg>
  );
}

function TextDocumentIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      fill="none"
      height="20"
      width="20"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M4 7V4h16v3M9 20h6M12 4v16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function WhiteboardDocumentIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      fill="none"
      height="20"
      width="20"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M13.5 3H7a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h10a2 2 0 0 0 2-2V8.5L13.5 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M13 3v6h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function DocumentIcon({ type, ...props }: Props) {
  switch (type) {
    case "text":
      return <TextDocumentIcon {...props} />;
    case "canvas":
      return <CanvasDocumentIcon {...props} />;
    case "whiteboard":
      return <WhiteboardDocumentIcon {...props} />;
    default:
      return null;
  }
}
