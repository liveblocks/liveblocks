import { useOthers } from "@liveblocks/react";

export default function SomeoneIsTyping() {
  const someoneIsTyping = useOthers()
    .toArray()
    .some((user) => user.presence?.isTyping);

  return someoneIsTyping ? <div>Someone is typing</div> : null;
}
