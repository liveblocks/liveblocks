import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "./hooks";
import { Provider } from "react-redux";
import { actions } from "@liveblocks/redux";
import {
  getRoomFromUrl,
  opaqueIf,
  randomInt,
  Row,
  styles,
  useRenderCount,
} from "../../utils";

import store, {
  client,
  setName,
  incCounter,
  addItem,
  deleteItem,
  clear,
} from "./store";

export default function ReduxApp() {
  return (
    <Provider store={store}>
      <ReduxSandbox />
    </Provider>
  );
}

function ReduxSandbox() {
  const renderCount = useRenderCount();
  const status = useAppSelector((state) => state.liveblocks.status);
  const others = useAppSelector((state) => state.liveblocks.others);

  const items = useAppSelector((state) => state.items);
  const dispatch = useAppDispatch();

  const roomId = getRoomFromUrl();

  useEffect(() => {
    dispatch(actions.enterRoom(roomId));
    return () => {
      dispatch(actions.leaveRoom(roomId));
    };
  }, [actions.enterRoom, actions.leaveRoom]);

  if (items == null) {
    return <div>Loading...</div>;
  }

  const theirPresence = others[0]?.presence;

  const canDelete = items.length > 0;
  const nextIndexToDelete = canDelete ? randomInt(items.length) : -1;

  return (
    <div>
      <h1>Redux sandbox</h1>
      <button id="set-name" onClick={() => dispatch(setName("Vincent"))}>
        Set name
      </button>

      <button id="inc-counter" onClick={() => dispatch(incCounter())}>
        Inc counter
      </button>

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
        Push ({item})
      </button>

      <button
        id="delete"
        style={opaqueIf(canDelete)}
        onClick={() => {
          if (!canDelete) return;
          dispatch(deleteItem(nextIndexToDelete));
        }}
      >
        Delete {canDelete && `(${nextIndexToDelete})`}
      </button>

      <button
        id="clear"
        onClick={() => {
          dispatch(clear());
        }}
      >
        Clear
      </button>

      {/* TODO Add undo/redo buttons to this app + test them? */}

      <table style={styles.dataTable}>
        <tbody>
          <Row id="renderCount" name="Render count" value={renderCount} />
        </tbody>
      </table>

      <h2>Items</h2>
      <table style={styles.dataTable}>
        <tbody>
          <Row id="socketStatus" name="WebSocket status" value={status} />
          <Row id="itemsCount" name="Items count" value={items.length} />
          <Row id="items" name="Items" value={items} />
        </tbody>
      </table>

      <h2>Others</h2>
      <table style={styles.dataTable}>
        <tbody>
          <Row id="theirPresence" name="Their presence" value={theirPresence} />
          <Row id="othersCount" name="Others count" value={others.length} />
          <Row id="others" name="Others" value={others} />
        </tbody>
      </table>
    </div>
  );
}

let item = "A";
