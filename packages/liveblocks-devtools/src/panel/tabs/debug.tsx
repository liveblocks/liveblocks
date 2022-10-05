import { useCallback, useEffect, useState } from "react";
import { onMessageFromClient, sendMessageToClient } from "../port";
import type { PanelToClientMessage } from "../../lib/protocol";
import { useTheme } from "../theme";

export function Debug() {
  const theme = useTheme();
  const [sentMessages, setSentMessages] = useState<unknown[]>([]);
  const [receivedMessages, setReceivedMessages] = useState<unknown[]>([]);

  useEffect(() => {
    function receiveMessage(msg: unknown) {
      setReceivedMessages((msglist) => [...msglist, msg]);
    }

    onMessageFromClient.addListener(receiveMessage);
    return () => {
      onMessageFromClient.removeListener(receiveMessage);
    };
  }, []);

  const handleClick = useCallback(() => {
    const msg: PanelToClientMessage = {
      name: "double-this-number-plz",
      value: 10000 * Math.random(),
    };
    setSentMessages((msglist) => [...msglist, msg]);
    sendMessageToClient(msg);
  }, []);

  return (
    <>
      <h1>Liveblocks ({theme})</h1>
      <button onClick={handleClick}>Send message</button>
      <table>
        <tr>
          <td className="w-1/2">
            <h3>Sent</h3>
            <ol>
              {sentMessages.map((message, index) => (
                <li key={index}>{JSON.stringify(message)}</li>
              ))}
            </ol>
          </td>
          <td className="w-1/2">
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
}
