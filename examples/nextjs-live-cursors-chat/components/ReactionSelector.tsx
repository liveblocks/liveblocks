import React from "react";

type Props = {
  setReaction: (reaction: string) => void;
};

export default function ReactionSelector({ setReaction }: Props) {
  return (
    <div
      className="bg-white rounded-full px-2 transform -translate-x-1/2 -translate-y-1/2"
      style={{
        boxShadow:
          "0 0 0 0.5px rgba(0, 0, 0, 0.08), 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      }}
      onPointerMove={(e) => e.stopPropagation()}
    >
      <ReactionButton reaction="👍" onSelect={setReaction} />
      <ReactionButton reaction="🔥" onSelect={setReaction} />
      <ReactionButton reaction="😍" onSelect={setReaction} />
      <ReactionButton reaction="👀" onSelect={setReaction} />
      <ReactionButton reaction="😱" onSelect={setReaction} />
      <ReactionButton reaction="🙁" onSelect={setReaction} />
    </div>
  );
}

function ReactionButton({
  reaction,
  onSelect,
}: {
  reaction: string;
  onSelect: (reaction: string) => void;
}) {
  return (
    <button
      className="p-2 text-xl select-none focus:outline-none transform transition-transform hover:scale-150 focus:scale-150"
      onPointerDown={() => onSelect(reaction)}
    >
      {reaction}
    </button>
  );
}
