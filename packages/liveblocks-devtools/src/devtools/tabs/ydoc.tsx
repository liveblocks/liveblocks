
import type { ComponentProps, MouseEvent } from "react";

import { Loading } from "../../components/Loading";
import { yDocToJson } from "../../lib/ydoc";
import { EmptyState } from "../components/EmptyState";
import { useStatus, useYdoc } from "../contexts/CurrentRoom";

interface Props extends ComponentProps<"div"> {
  search?: RegExp;
  searchText?: string;
  onSearchClear: (event: MouseEvent<HTMLButtonElement>) => void;
}



export function Ydoc({
  search,
  searchText,
  onSearchClear,
  className,
  ...props
}: Props) {
  const ydoc = useYdoc();
  const currentStatus = useStatus();
  if (
    currentStatus === "connected" ||
    currentStatus === "open" || // Same as "connected", but only sent by old clients (prior to 1.1)
    currentStatus === "reconnecting"
  ) {
    return <div>{ydoc}</div>
  }
  return <EmptyState visual={<Loading />} />;

}
