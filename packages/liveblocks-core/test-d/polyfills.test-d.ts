import NodeJSWebSocket from "ws";
import type { IWebSocket } from "@liveblocks/core";
import { expectAssignable } from "tsd";

//
// NOTE: If one of these tests ever fails, it means our IWebSocket type (which
// is our minimal subset between browser-based and NodeJS-based WebSocket
// implementations) is incompatible with either one of the implementations.
//
// This will most likely be reported as:
//
//     Argument of type typeof WebSocket is not assignable to parameter of type IWebSocket.
//       Types of parameters address and address are incompatible.
//         Type string is not assignable to type null.
//         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//
// Which is... not a very helpful message! 🤔
//
// The *actual* incompatibility probably lies much deeper in one of the other
// interface types.
//

// Browser-based websocket implementation is assignable to IWebSocket
expectAssignable<IWebSocket>(window.WebSocket);

// Node-based websocket implementation is assignable to IWebSocket
expectAssignable<IWebSocket>(NodeJSWebSocket);
