import { ComponentProps } from "react";

interface Props extends ComponentProps<"time"> {
  seconds: number;
}

export default function Duration({ seconds, ...props }: Props) {
  return (
    <time dateTime={`P${Math.round(seconds)}S`} {...props}>
      {format(seconds)}
    </time>
  );
}

function format(seconds: number) {
  const date = new Date(seconds * 1000);
  const hh = date.getUTCHours();
  const mm = date.getUTCMinutes();
  const ss = pad(date.getUTCSeconds());
  if (hh) {
    return `${hh}:${pad(mm)}:${ss}`;
  }
  return `${mm}:${ss}`;
}

function pad(string: number) {
  return ("0" + string).slice(-2);
}
