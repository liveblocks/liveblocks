import { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { onMessage, postMessage } from "./port";

const Liveblocks = () => {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    function receiveMessage(message: any) {
      setMessages((messages) => [...messages, message]);
    }

    onMessage.addListener(receiveMessage);

    return () => {
      onMessage.removeListener(receiveMessage);
    };
  }, []);

  const handleClick = useCallback(() => {
    postMessage({
      name: "message",
      value: Math.random(),
    });
  }, []);

  return (
    <>
      <h1>Liveblocks</h1>
      <button onClick={handleClick}>Send message</button>
      <hr />
      {messages.map((message, index) => (
        <p key={index}>{JSON.stringify(message)}</p>
      ))}
    </>
  );
};

const root = createRoot(document.getElementById("root"));
root.render(<Liveblocks />);
