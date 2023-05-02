import NodeJSWebSocket from "ws";
import type { IWebSocket } from "@liveblocks/core";
import { expectAssignable } from "tsd";

// Browser-based websocket implementation is assignable to IWebSocket
expectAssignable<IWebSocket>(window.WebSocket);

// Node-based websocket implementation is assignable to IWebSocket
expectAssignable<IWebSocket>(NodeJSWebSocket);
