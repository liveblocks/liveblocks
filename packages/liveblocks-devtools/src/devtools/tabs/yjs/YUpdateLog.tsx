import { ContentString, GC, Item } from "yjs";

import { useYUpdateLog } from "../../contexts/CurrentRoom";
import ContentDeleted from "./yflow/ContentDeleted";

export function YUpdateLog() {
  const updates = useYUpdateLog();

  return (
    <div className="w-full">
      {updates.map((update) => {
        return (
          <div className="border-b border-light-300 dark:border-dark-300 bg-light-0 dark:bg-dark-0 last:border-none">
            <div>Delete Set: {update.ds.clients.size}</div>
            <div>
              Items:{" "}
              <ul className="pl-8">
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
      })}
    </div>
  );
}
