import { useAppSelector } from "../hooks";

export default function SomeoneIsTyping() {
  const someoneIsTyping = useAppSelector((state) =>
    state.liveblocks.others.some((user) => user.presence?.isTyping)
  );

  return someoneIsTyping ? <div>Someone is typing</div> : null;
}
