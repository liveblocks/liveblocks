import type { ClientStore, Mutations } from "./Store.js";

export class Client<M extends Mutations> {
  // #currentSession: Session; ??

  #actor?: number;
  #store: ClientStore<M>;

  constructor(store: ClientStore<M>) {
    this.#store = store;
  }
}
