import useStore from "./store";

export default function SomeoneIsTyping() {
  const others = useStore((state) => state.liveblocks.others);

  const someoneIsTyping = others.some((user) => user.presence?.isTyping);

  return someoneIsTyping ? (
    <div className="someone_is_typing">Someone is typing</div>
  ) : null;
}
