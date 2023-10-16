import { actions } from "@liveblocks/redux";
import React, { useEffect } from "react";
import { Provider } from "react-redux";

import {
  getRoomFromUrl,
  padItem,
  randomInt,
  Row,
  styles,
  useRenderCount,
} from "../utils";
import Button from "../utils/Button";
import { useAppDispatch, useAppSelector } from "../utils/for-redux/hooks";
import store, {
  addItem,
  clear,
  client,
  deleteItem,
  incCounter,
  setName,
} from "../utils/for-redux/store";

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

  const room = client.getRoom(roomId);
  const connectionId = room?.getSelf()?.connectionId ?? 0;

  useEffect(() => {
    dispatch(actions.enterRoom(roomId));
    return () => {
      dispatch(actions.leaveRoom(roomId));
    };
  }, [actions.enterRoom, actions.leaveRoom]);

  if (items === null) {
    return <div>Loading...</div>;
  }

  const theirPresence = others[0]?.presence;

  const nextValueToPush = padItem(connectionId, item);
  const canDelete = items.length > 0;
  const nextIndexToDelete = canDelete ? randomInt(items.length) : -1;

  return (
    <div>
      <h3>
        <a href="/">Home</a> › Redux
      </h3>

      <div style={{ display: "flex", margin: "8px 0" }}>
        <Button id="set-name" onClick={() => dispatch(setName("Vincent"))}>
          Set name
        </Button>

        <Button id="inc-counter" onClick={() => dispatch(incCounter())}>
          Inc counter
        </Button>

        <Button
          id="push"
          onClick={() => {
            dispatch(addItem(nextValueToPush));
            item = String.fromCharCode(item.charCodeAt(0) + 1);
          }}
          subtitle={nextValueToPush}
        >
          Push
        </Button>

        <Button
          id="delete"
          enabled={canDelete}
          onClick={() => {
            if (!canDelete) return;
            dispatch(deleteItem(nextIndexToDelete));
          }}
          subtitle={
            canDelete
              ? `index ${nextIndexToDelete} (${items[
                  nextIndexToDelete
                ].trim()})`
              : null
          }
        >
          Delete
        </Button>

        <Button
          id="clear"
          onClick={() => {
            dispatch(clear());
          }}
        >
          Clear
        </Button>

        {/* TODO Add undo/redo buttons to this app + test them? */}
      </div>

      <table style={styles.dataTable}>
        <tbody>
          <Row id="renderCount" name="Render count" value={renderCount} />
          <Row id="connectionId" name="Connection ID" value={connectionId} />
          <Row id="socketStatus" name="WebSocket status" value={status} />
        </tbody>
      </table>

      <h2>Storage</h2>
      <table style={styles.dataTable}>
        <tbody>
          <Row id="numItems" name="Items count" value={items.length} />
          <Row id="items" name="Items" value={items} />
        </tbody>
      </table>

      <h2>Presence</h2>
      <table style={styles.dataTable}>
        <tbody>
          <Row id="theirPresence" name="Their presence" value={theirPresence} />
          <Row id="numOthers" name="Others count" value={others.length} />
          <Row id="others" name="Others" value={others} />
        </tbody>
      </table>
    </div>
  );
}

let item = "A";
