/**
 * Definition of all messages the Panel can send to the Client.
 */
export type PanelToClientMessage =
  | { name: "connect" }
  | {
      name: "message";
      value: number;
    };

export type ClientToPanelMessage = {
  name: "test";
  payload: "whatever";
};
