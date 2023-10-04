import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "./hooks";
import { Provider } from "react-redux";
import { actions } from "@liveblocks/redux";
import { genRoomId, getRoomFromUrl, randomInt, Row, styles } from "../../utils";

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

  const roomId = getRoomFromUrl() ?? genRoomId("e2e-redux-basic");

  useEffect(() => {
    dispatch(actions.enterRoom(roomId));
    return () => {
      dispatch(actions.leaveRoom(roomId));
    };
  }, [actions.enterRoom, actions.leaveRoom]);

  if (items == null) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Redux sandbox</h1>
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
            const index = randomInt(items.length);
            dispatch(deleteItem(index));
          }
        }}
      >
        Delete multiple
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
      <table style={styles.dataTable}>
        <tbody>
          <Row id="itemsCount" name="Items count" value={items.length} />
          <Row id="items" name="Items" value={items} />
        </tbody>
      </table>

      <h2>Others</h2>
      <table style={styles.dataTable}>
        <tbody>
          <Row id="othersCount" name="Others count" value={others.length} />
          <Row id="others" name="Others" value={others} />
        </tbody>
      </table>
    </div>
  );
}

let item = "A";
