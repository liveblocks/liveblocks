import { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { onMessage, postMessage } from "./port";
import type { PanelToClientMessage } from "../lib/protocol";

const Liveblocks = () => {
  const [sentMessages, setSentMessages] = useState<unknown[]>([]);
  const [receivedMessages, setReceivedMessages] = useState<unknown[]>([]);

  useEffect(() => {
    function receiveMessage(msg: unknown) {
      setReceivedMessages((msglist) => [...msglist, msg]);
    }

    onMessage.addListener(receiveMessage);
    return () => {
      onMessage.removeListener(receiveMessage);
    };
  }, []);

  const handleClick = useCallback(() => {
    const msg: PanelToClientMessage = {
      name: "double-this-number-plz",
      value: 10000 * Math.random(),
    };
    setSentMessages((msglist) => [...msglist, msg]);
    postMessage(msg);
  }, []);

  return (
    <>
      <h1>Liveblocks</h1>
      <button onClick={handleClick}>Send message</button>
      <hr />
      <table>
        <tr>
          <td width="50%">
            <h3>Sent</h3>
            <ol>
              {sentMessages.map((message, index) => (
                <li key={index}>{JSON.stringify(message)}</li>
              ))}
            </ol>
          </td>
          <td width="50%">
            <h3>Received</h3>
            <ol>
              {receivedMessages.map((message, index) => (
                <li key={index}>{JSON.stringify(message)}</li>
              ))}
            </ol>
          </td>
        </tr>
      </table>
    </>
  );
};

const root = createRoot(document.getElementById("root"));
root.render(<Liveblocks />);
