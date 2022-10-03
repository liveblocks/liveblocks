import browser from "webextension-polyfill";
import { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { port } from "../port";

const Liveblocks = () => {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    function receiveMessage(message: any) {
      setMessages((messages) => [...messages, message]);
    }

    port.onMessage.addListener(receiveMessage);

    return () => {
      port.onMessage.removeListener(receiveMessage);
    };
  }, []);

  const handleClick = useCallback(() => {
    port.postMessage({
      name: "message",
      value: Math.random(),
      tabId: browser.devtools.inspectedWindow.tabId,
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
