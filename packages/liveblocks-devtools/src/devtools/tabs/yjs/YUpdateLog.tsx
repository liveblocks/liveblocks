import { ContentString, GC, Item } from "yjs";

import { useYUpdateLog } from "../../contexts/CurrentRoom";
import ContentDeleted from "./yflow/ContentDeleted";

export function YUpdateLog() {
  const updates = useYUpdateLog().map((update) => {
    return (
      <div>
        <div>Delete Set: {update.ds.clients.size}</div>
        <div>
          Items:{" "}
          <ul>
            {update.structs.map((item) => {
              if (item instanceof GC) {
                return <li>Garbage collection</li>;
              }
              if (item instanceof Item) {
                if (item.content instanceof ContentString) {
                  return (
                    <li>
                      {item.id.client}:{item.id.clock}: {item.content.str}
                    </li>
                  );
                }
                if (item.content instanceof ContentDeleted) {
                  return <li>Deleted: {item.length}</li>;
                }
              }
              return (
                <li>
                  {item.id.client}:{item.id.clock}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  });

  return <div>{updates}</div>;
}
