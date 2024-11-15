import type { ClientStore } from "./Store.js";
import type { Mutations } from "./types.js";

export class Client<M extends Mutations> {
  // #currentSession: Session; ??

  // #actor?: number;
  #store: ClientStore<M>;

  constructor(store: ClientStore<M>) {
    this.#store = store;
  }
}
