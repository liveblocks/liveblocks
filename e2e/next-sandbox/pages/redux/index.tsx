import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "./hooks";
import { Provider } from "react-redux";
import { actions } from "@liveblocks/redux";

import store, { client, addItem, deleteItem, clear } from "./store";

export default function Home() {
  return (
    <Provider store={store}>
      <List />
    </Provider>
  );
}

function List() {
  const others = useAppSelector((state) => state.liveblocks.others);

  const items = useAppSelector((state) => state.items);
  const dispatch = useAppDispatch();

  let roomId = "e2e-redux-basic";
  if (typeof window !== "undefined") {
    const queryParam = window.location.search;
    if (queryParam.split("room=").length > 1) {
      roomId = queryParam.split("room=")[1];
    }
  }

  useEffect(() => {
    dispatch(actions.enterRoom(roomId));

    return () => {
      dispatch(actions.leaveRoom(roomId));
    };
  }, [actions.enterRoom, actions.leaveRoom]);

  if (items == null) {
    return <div>Loading</div>;
  }

  return (
    <div>
      <h1>Redux - Storage list sandbox</h1>
      <button
        id="push"
        onClick={() => {
          dispatch(
            addItem(
              client.getRoom(roomId)?.getSelf()?.connectionId + ":" + item
            )
          );

          item = String.fromCharCode(item.charCodeAt(0) + 1);
        }}
      >
        Push
      </button>

      <button
        id="delete"
        onClick={() => {
          if (items.length > 0) {
            const index = generateRandomNumber(items.length);
            dispatch(deleteItem(index));
          }
        }}
      >
        Delete
      </button>

      <button
        id="clear"
        onClick={() => {
          dispatch(clear());
        }}
      >
        Clear
      </button>

      <h2>Items</h2>
      <p id="itemsCount" style={{ visibility: "hidden" }}>
        {items.length}
      </p>
      <div id="items" style={{ whiteSpace: "pre" }}>
        {JSON.stringify(items, null, 2)}
      </div>

      <h2>Others</h2>
      <div id="others" style={{ whiteSpace: "pre" }}>
        {JSON.stringify(others, null, 2)}
      </div>
    </div>
  );
}

let item = "A";

function generateRandomNumber(max: number, ignore?: number) {
  let result = 0;
  while (true) {
    result = Math.floor(Math.random() * max);
    if (result !== ignore) {
      return result;
    }
  }
}
