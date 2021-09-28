(() => {
  // node_modules/@liveblocks/client/lib/esm/utils.js
  function remove(array, item) {
    for (let i = 0; i < array.length; i++) {
      if (array[i] === item) {
        array.splice(i, 1);
        break;
      }
    }
  }

  // node_modules/@liveblocks/client/lib/esm/live.js
  var ServerMessageType;
  (function(ServerMessageType2) {
    ServerMessageType2[ServerMessageType2["UpdatePresence"] = 100] = "UpdatePresence";
    ServerMessageType2[ServerMessageType2["UserJoined"] = 101] = "UserJoined";
    ServerMessageType2[ServerMessageType2["UserLeft"] = 102] = "UserLeft";
    ServerMessageType2[ServerMessageType2["Event"] = 103] = "Event";
    ServerMessageType2[ServerMessageType2["RoomState"] = 104] = "RoomState";
    ServerMessageType2[ServerMessageType2["InitialStorageState"] = 200] = "InitialStorageState";
    ServerMessageType2[ServerMessageType2["UpdateStorage"] = 201] = "UpdateStorage";
  })(ServerMessageType || (ServerMessageType = {}));
  var ClientMessageType;
  (function(ClientMessageType2) {
    ClientMessageType2[ClientMessageType2["UpdatePresence"] = 100] = "UpdatePresence";
    ClientMessageType2[ClientMessageType2["ClientEvent"] = 103] = "ClientEvent";
    ClientMessageType2[ClientMessageType2["FetchStorage"] = 200] = "FetchStorage";
    ClientMessageType2[ClientMessageType2["UpdateStorage"] = 201] = "UpdateStorage";
  })(ClientMessageType || (ClientMessageType = {}));
  var CrdtType;
  (function(CrdtType2) {
    CrdtType2[CrdtType2["Object"] = 0] = "Object";
    CrdtType2[CrdtType2["List"] = 1] = "List";
    CrdtType2[CrdtType2["Map"] = 2] = "Map";
    CrdtType2[CrdtType2["Register"] = 3] = "Register";
  })(CrdtType || (CrdtType = {}));
  var OpType;
  (function(OpType2) {
    OpType2[OpType2["Init"] = 0] = "Init";
    OpType2[OpType2["SetParentKey"] = 1] = "SetParentKey";
    OpType2[OpType2["CreateList"] = 2] = "CreateList";
    OpType2[OpType2["UpdateObject"] = 3] = "UpdateObject";
    OpType2[OpType2["CreateObject"] = 4] = "CreateObject";
    OpType2[OpType2["DeleteCrdt"] = 5] = "DeleteCrdt";
    OpType2[OpType2["DeleteObjectKey"] = 6] = "DeleteObjectKey";
    OpType2[OpType2["CreateMap"] = 7] = "CreateMap";
    OpType2[OpType2["CreateRegister"] = 8] = "CreateRegister";
  })(OpType || (OpType = {}));
  var WebsocketCloseCodes;
  (function(WebsocketCloseCodes2) {
    WebsocketCloseCodes2[WebsocketCloseCodes2["CLOSE_ABNORMAL"] = 1006] = "CLOSE_ABNORMAL";
    WebsocketCloseCodes2[WebsocketCloseCodes2["INVALID_MESSAGE_FORMAT"] = 4e3] = "INVALID_MESSAGE_FORMAT";
    WebsocketCloseCodes2[WebsocketCloseCodes2["NOT_ALLOWED"] = 4001] = "NOT_ALLOWED";
    WebsocketCloseCodes2[WebsocketCloseCodes2["MAX_NUMBER_OF_MESSAGES_PER_SECONDS"] = 4002] = "MAX_NUMBER_OF_MESSAGES_PER_SECONDS";
    WebsocketCloseCodes2[WebsocketCloseCodes2["MAX_NUMBER_OF_CONCURRENT_CONNECTIONS"] = 4003] = "MAX_NUMBER_OF_CONCURRENT_CONNECTIONS";
    WebsocketCloseCodes2[WebsocketCloseCodes2["MAX_NUMBER_OF_MESSAGES_PER_DAY_PER_APP"] = 4004] = "MAX_NUMBER_OF_MESSAGES_PER_DAY_PER_APP";
    WebsocketCloseCodes2[WebsocketCloseCodes2["MAX_NUMBER_OF_CONCURRENT_CONNECTIONS_PER_ROOM"] = 4005] = "MAX_NUMBER_OF_CONCURRENT_CONNECTIONS_PER_ROOM";
  })(WebsocketCloseCodes || (WebsocketCloseCodes = {}));

  // node_modules/@liveblocks/client/lib/esm/position.js
  var min = 32;
  var max = 126;
  function makePosition(before, after) {
    if (before == null && after == null) {
      return pos([min + 1]);
    }
    if (before != null && after == null) {
      return getNextPosition(before);
    }
    if (before == null && after != null) {
      return getPreviousPosition(after);
    }
    return pos(makePositionFromCodes(posCodes(before), posCodes(after)));
  }
  function getPreviousPosition(after) {
    const result = [];
    const afterCodes = posCodes(after);
    for (let i = 0; i < afterCodes.length; i++) {
      const code = afterCodes[i];
      if (code <= min + 1) {
        result.push(min);
        if (afterCodes.length - 1 === i) {
          result.push(max);
          break;
        }
      } else {
        result.push(code - 1);
        break;
      }
    }
    return pos(result);
  }
  function getNextPosition(before) {
    const result = [];
    const beforeCodes = posCodes(before);
    for (let i = 0; i < beforeCodes.length; i++) {
      const code = beforeCodes[i];
      if (code === max) {
        result.push(code);
        if (beforeCodes.length - 1 === i) {
          result.push(min + 1);
          break;
        }
      } else {
        result.push(code + 1);
        break;
      }
    }
    return pos(result);
  }
  function makePositionFromCodes(before, after) {
    let index = 0;
    const result = [];
    while (true) {
      const beforeDigit = before[index] || min;
      const afterDigit = after[index] || max;
      if (beforeDigit > afterDigit) {
        throw new Error(`Impossible to generate position between ${before} and ${after}`);
      }
      if (beforeDigit === afterDigit) {
        result.push(beforeDigit);
        index++;
        continue;
      }
      if (afterDigit - beforeDigit === 1) {
        result.push(beforeDigit);
        result.push(...makePositionFromCodes(before.slice(index + 1), []));
        break;
      }
      const mid = afterDigit + beforeDigit >> 1;
      result.push(mid);
      break;
    }
    return result;
  }
  function posCodes(str) {
    const codes = [];
    for (let i = 0; i < str.length; i++) {
      codes.push(str.charCodeAt(i));
    }
    return codes;
  }
  function pos(codes) {
    return String.fromCharCode(...codes);
  }
  function compare(posA, posB) {
    const aCodes = posCodes(posA);
    const bCodes = posCodes(posB);
    const maxLength = Math.max(aCodes.length, bCodes.length);
    for (let i = 0; i < maxLength; i++) {
      const a = aCodes[i] == null ? min : aCodes[i];
      const b = bCodes[i] == null ? min : bCodes[i];
      if (a === b) {
        continue;
      } else {
        return a - b;
      }
    }
    throw new Error(`Impossible to compare similar position "${posA}" and "${posB}"`);
  }

  // node_modules/@liveblocks/client/lib/esm/doc.js
  var __classPrivateFieldSet = function(receiver, state, value, kind, f) {
    if (kind === "m")
      throw new TypeError("Private method is not writable");
    if (kind === "a" && !f)
      throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
      throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
  };
  var __classPrivateFieldGet = function(receiver, state, kind, f) {
    if (kind === "a" && !f)
      throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
      throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
  };
  var _Doc_instances;
  var _Doc_clock;
  var _Doc_opClock;
  var _Doc_items;
  var _Doc_root;
  var _Doc_actor;
  var _Doc_dispatch;
  var _Doc_applyCreateRegister;
  var _Doc_applyDeleteRecordKey;
  var _Doc_applyUpdateRecord;
  var _Doc_applyCreateMap;
  var _Doc_applyCreateList;
  var _Doc_applyCreateObject;
  var _Doc_applyDeleteRecord;
  var _Doc_applySetParentKey;
  var _AbstractCrdt_listeners;
  var _AbstractCrdt_deepListeners;
  var _AbstractCrdt_parent;
  var _AbstractCrdt_doc;
  var _AbstractCrdt_id;
  var _LiveObject_map;
  var _LiveObject_propToLastUpdate;
  var _LiveMap_map;
  var _LiveRegister_data;
  var _LiveList_items;
  var _LiveListIterator_innerIterator;
  function noOp() {
  }
  var Doc = class {
    constructor(root, actor = 0, dispatch = noOp) {
      _Doc_instances.add(this);
      _Doc_clock.set(this, 0);
      _Doc_opClock.set(this, 0);
      _Doc_items.set(this, new Map());
      _Doc_root.set(this, void 0);
      _Doc_actor.set(this, void 0);
      _Doc_dispatch.set(this, void 0);
      __classPrivateFieldSet(this, _Doc_root, root, "f");
      __classPrivateFieldSet(this, _Doc_actor, actor, "f");
      __classPrivateFieldSet(this, _Doc_dispatch, dispatch, "f");
    }
    static from(root, actor = 0, dispatch = noOp) {
      const rootRecord = new LiveObject(root);
      const storage = new Doc(rootRecord, actor, dispatch);
      rootRecord._attach(storage.generateId(), storage);
      storage.dispatch(rootRecord._serialize());
      return storage;
    }
    static load(items, actor, dispatch = noOp) {
      if (items.length === 0) {
        throw new Error("Internal error: cannot load storage without items");
      }
      const parentToChildren = new Map();
      let root = null;
      for (const tuple of items) {
        const parentId = tuple[1].parentId;
        if (parentId == null) {
          root = tuple;
        } else {
          const children = parentToChildren.get(parentId);
          if (children != null) {
            children.push(tuple);
          } else {
            parentToChildren.set(parentId, [tuple]);
          }
        }
      }
      if (root == null) {
        throw new Error("Root can't be null");
      }
      const doc = new Doc(null, actor, dispatch);
      __classPrivateFieldSet(doc, _Doc_root, LiveObject._deserialize(root, parentToChildren, doc), "f");
      return doc;
    }
    dispatch(ops) {
      __classPrivateFieldGet(this, _Doc_dispatch, "f").call(this, ops);
    }
    addItem(id, item) {
      __classPrivateFieldGet(this, _Doc_items, "f").set(id, item);
    }
    deleteItem(id) {
      __classPrivateFieldGet(this, _Doc_items, "f").delete(id);
    }
    getItem(id) {
      return __classPrivateFieldGet(this, _Doc_items, "f").get(id);
    }
    apply(op) {
      switch (op.type) {
        case OpType.UpdateObject: {
          __classPrivateFieldGet(this, _Doc_instances, "m", _Doc_applyUpdateRecord).call(this, op);
          break;
        }
        case OpType.CreateObject: {
          __classPrivateFieldGet(this, _Doc_instances, "m", _Doc_applyCreateObject).call(this, op);
          break;
        }
        case OpType.CreateMap: {
          __classPrivateFieldGet(this, _Doc_instances, "m", _Doc_applyCreateMap).call(this, op);
          break;
        }
        case OpType.CreateList: {
          __classPrivateFieldGet(this, _Doc_instances, "m", _Doc_applyCreateList).call(this, op);
          break;
        }
        case OpType.DeleteCrdt: {
          __classPrivateFieldGet(this, _Doc_instances, "m", _Doc_applyDeleteRecord).call(this, op);
          break;
        }
        case OpType.SetParentKey: {
          __classPrivateFieldGet(this, _Doc_instances, "m", _Doc_applySetParentKey).call(this, op);
          break;
        }
        case OpType.DeleteObjectKey: {
          __classPrivateFieldGet(this, _Doc_instances, "m", _Doc_applyDeleteRecordKey).call(this, op);
          break;
        }
        case OpType.CreateRegister: {
          __classPrivateFieldGet(this, _Doc_instances, "m", _Doc_applyCreateRegister).call(this, op);
          break;
        }
      }
    }
    get root() {
      return __classPrivateFieldGet(this, _Doc_root, "f");
    }
    count() {
      return __classPrivateFieldGet(this, _Doc_items, "f").size;
    }
    generateId() {
      var _a, _b;
      return `${__classPrivateFieldGet(this, _Doc_actor, "f")}:${__classPrivateFieldSet(this, _Doc_clock, (_b = __classPrivateFieldGet(this, _Doc_clock, "f"), _a = _b++, _b), "f"), _a}`;
    }
    generateOpId() {
      var _a, _b;
      return `${__classPrivateFieldGet(this, _Doc_actor, "f")}:${__classPrivateFieldSet(this, _Doc_opClock, (_b = __classPrivateFieldGet(this, _Doc_opClock, "f"), _a = _b++, _b), "f"), _a}`;
    }
  };
  _Doc_clock = new WeakMap(), _Doc_opClock = new WeakMap(), _Doc_items = new WeakMap(), _Doc_root = new WeakMap(), _Doc_actor = new WeakMap(), _Doc_dispatch = new WeakMap(), _Doc_instances = new WeakSet(), _Doc_applyCreateRegister = function _Doc_applyCreateRegister2(op) {
    if (__classPrivateFieldGet(this, _Doc_items, "f").has(op.id)) {
      return;
    }
    const parent = __classPrivateFieldGet(this, _Doc_items, "f").get(op.parentId);
    if (parent == null) {
      return;
    }
    if (!(parent instanceof LiveMap) && !(parent instanceof LiveList)) {
      throw new Error("LiveRegister can only be attached to a LiveMap or LiveList");
    }
    const newRegister = new LiveRegister(op.data);
    parent._attachChild(op.id, op.parentKey, newRegister);
  }, _Doc_applyDeleteRecordKey = function _Doc_applyDeleteRecordKey2(op) {
    const item = __classPrivateFieldGet(this, _Doc_items, "f").get(op.id);
    if (item && item instanceof LiveObject) {
      item._apply(op);
    }
  }, _Doc_applyUpdateRecord = function _Doc_applyUpdateRecord2(op) {
    const item = __classPrivateFieldGet(this, _Doc_items, "f").get(op.id);
    if (item && item instanceof LiveObject) {
      item._apply(op);
    }
  }, _Doc_applyCreateMap = function _Doc_applyCreateMap2(op) {
    if (__classPrivateFieldGet(this, _Doc_items, "f").has(op.id)) {
      return;
    }
    const parent = __classPrivateFieldGet(this, _Doc_items, "f").get(op.parentId);
    if (parent == null) {
      return;
    }
    const newMap = new LiveMap();
    parent._attachChild(op.id, op.parentKey, newMap);
  }, _Doc_applyCreateList = function _Doc_applyCreateList2(op) {
    if (__classPrivateFieldGet(this, _Doc_items, "f").has(op.id)) {
      return;
    }
    const parent = __classPrivateFieldGet(this, _Doc_items, "f").get(op.parentId);
    if (parent == null) {
      return;
    }
    const list = new LiveList();
    parent._attachChild(op.id, op.parentKey, list);
  }, _Doc_applyCreateObject = function _Doc_applyCreateObject2(op) {
    if (__classPrivateFieldGet(this, _Doc_items, "f").has(op.id)) {
      return;
    }
    if (op.parentId && op.parentKey) {
      const parent = __classPrivateFieldGet(this, _Doc_items, "f").get(op.parentId);
      if (parent == null) {
        return;
      }
      const newObj = new LiveObject(op.data);
      parent._attachChild(op.id, op.parentKey, newObj);
    }
  }, _Doc_applyDeleteRecord = function _Doc_applyDeleteRecord2(op) {
    const item = __classPrivateFieldGet(this, _Doc_items, "f").get(op.id);
    if (item == null) {
      return;
    }
    const parent = item._parent;
    if (parent == null) {
      return;
    }
    if (parent) {
      parent._detachChild(item);
    }
  }, _Doc_applySetParentKey = function _Doc_applySetParentKey2(op) {
    const item = __classPrivateFieldGet(this, _Doc_items, "f").get(op.id);
    if (item == null) {
      return;
    }
    if (item._parent == null) {
      return;
    }
    if (item._parent instanceof LiveList) {
      item._parent._setChildKey(op.parentKey, item);
    }
  };
  var AbstractCrdt = class {
    constructor() {
      _AbstractCrdt_listeners.set(this, []);
      _AbstractCrdt_deepListeners.set(this, []);
      _AbstractCrdt_parent.set(this, void 0);
      _AbstractCrdt_doc.set(this, void 0);
      _AbstractCrdt_id.set(this, void 0);
    }
    get _doc() {
      return __classPrivateFieldGet(this, _AbstractCrdt_doc, "f");
    }
    get _id() {
      return __classPrivateFieldGet(this, _AbstractCrdt_id, "f");
    }
    get _parent() {
      return __classPrivateFieldGet(this, _AbstractCrdt_parent, "f");
    }
    _setParent(parent) {
      if (__classPrivateFieldGet(this, _AbstractCrdt_parent, "f")) {
        throw new Error("Cannot attach parent if it already exist");
      }
      __classPrivateFieldSet(this, _AbstractCrdt_parent, parent, "f");
    }
    _attach(id, doc) {
      if (__classPrivateFieldGet(this, _AbstractCrdt_id, "f") || __classPrivateFieldGet(this, _AbstractCrdt_doc, "f")) {
        throw new Error("Cannot attach if CRDT is already attached");
      }
      doc.addItem(id, this);
      __classPrivateFieldSet(this, _AbstractCrdt_id, id, "f");
      __classPrivateFieldSet(this, _AbstractCrdt_doc, doc, "f");
    }
    _detach() {
      if (__classPrivateFieldGet(this, _AbstractCrdt_doc, "f") && __classPrivateFieldGet(this, _AbstractCrdt_id, "f")) {
        __classPrivateFieldGet(this, _AbstractCrdt_doc, "f").deleteItem(__classPrivateFieldGet(this, _AbstractCrdt_id, "f"));
      }
      __classPrivateFieldSet(this, _AbstractCrdt_parent, void 0, "f");
      __classPrivateFieldSet(this, _AbstractCrdt_doc, void 0, "f");
    }
    subscribe(listener) {
      __classPrivateFieldGet(this, _AbstractCrdt_listeners, "f").push(listener);
    }
    subscribeDeep(listener) {
      __classPrivateFieldGet(this, _AbstractCrdt_deepListeners, "f").push(listener);
    }
    unsubscribe(listener) {
      remove(__classPrivateFieldGet(this, _AbstractCrdt_listeners, "f"), listener);
    }
    unsubscribeDeep(listener) {
      remove(__classPrivateFieldGet(this, _AbstractCrdt_deepListeners, "f"), listener);
    }
    notify(onlyDeep = false) {
      if (onlyDeep === false) {
        for (const listener of __classPrivateFieldGet(this, _AbstractCrdt_listeners, "f")) {
          listener();
        }
      }
      for (const listener of __classPrivateFieldGet(this, _AbstractCrdt_deepListeners, "f")) {
        listener();
      }
      if (this._parent) {
        this._parent.notify(true);
      }
    }
  };
  _AbstractCrdt_listeners = new WeakMap(), _AbstractCrdt_deepListeners = new WeakMap(), _AbstractCrdt_parent = new WeakMap(), _AbstractCrdt_doc = new WeakMap(), _AbstractCrdt_id = new WeakMap();
  var LiveObject = class extends AbstractCrdt {
    constructor(object = {}) {
      super();
      _LiveObject_map.set(this, void 0);
      _LiveObject_propToLastUpdate.set(this, new Map());
      for (const key in object) {
        const value = object[key];
        if (value instanceof AbstractCrdt) {
          value._setParent(this);
        }
      }
      __classPrivateFieldSet(this, _LiveObject_map, new Map(Object.entries(object)), "f");
    }
    _serialize(parentId, parentKey) {
      if (this._id == null) {
        throw new Error("Cannot serialize item is not attached");
      }
      const ops = [];
      const op = {
        id: this._id,
        type: OpType.CreateObject,
        parentId,
        parentKey,
        data: {}
      };
      ops.push(op);
      for (const [key, value] of __classPrivateFieldGet(this, _LiveObject_map, "f")) {
        if (value instanceof AbstractCrdt) {
          ops.push(...value._serialize(this._id, key));
        } else {
          op.data[key] = value;
        }
      }
      return ops;
    }
    static _deserialize([id, item], parentToChildren, doc) {
      if (item.type !== CrdtType.Object) {
        throw new Error(`Tried to deserialize a record but item type is "${item.type}"`);
      }
      const object = new LiveObject(item.data);
      object._attach(id, doc);
      const children = parentToChildren.get(id);
      if (children == null) {
        return object;
      }
      for (const entry of children) {
        const crdt = entry[1];
        if (crdt.parentKey == null) {
          throw new Error("Tried to deserialize a crdt but it does not have a parentKey and is not the root");
        }
        const child = deserialize(entry, parentToChildren, doc);
        child._setParent(object);
        __classPrivateFieldGet(object, _LiveObject_map, "f").set(crdt.parentKey, child);
      }
      return object;
    }
    _attach(id, doc) {
      super._attach(id, doc);
      for (const [key, value] of __classPrivateFieldGet(this, _LiveObject_map, "f")) {
        if (value instanceof AbstractCrdt) {
          value._attach(doc.generateId(), doc);
        }
      }
    }
    _attachChild(id, key, child) {
      if (this._doc == null) {
        throw new Error("Can't attach child if doc is not present");
      }
      const previousValue = __classPrivateFieldGet(this, _LiveObject_map, "f").get(key);
      if (isCrdt(previousValue)) {
        previousValue._detach();
      }
      __classPrivateFieldGet(this, _LiveObject_map, "f").set(key, child);
      child._setParent(this);
      child._attach(id, this._doc);
      this.notify();
    }
    _detachChild(child) {
      for (const [key, value] of __classPrivateFieldGet(this, _LiveObject_map, "f")) {
        if (value === child) {
          __classPrivateFieldGet(this, _LiveObject_map, "f").delete(key);
        }
      }
      if (child) {
        child._detach();
      }
      this.notify();
    }
    _detach() {
      super._detach();
      for (const value of __classPrivateFieldGet(this, _LiveObject_map, "f").values()) {
        if (isCrdt(value)) {
          value._detach();
        }
      }
    }
    _apply(op) {
      if (op.type === OpType.UpdateObject) {
        for (const key in op.data) {
          const lastOpId = __classPrivateFieldGet(this, _LiveObject_propToLastUpdate, "f").get(key);
          if (lastOpId === op.opId) {
            __classPrivateFieldGet(this, _LiveObject_propToLastUpdate, "f").delete(key);
          } else if (lastOpId != null) {
            continue;
          }
          const oldValue = __classPrivateFieldGet(this, _LiveObject_map, "f").get(key);
          if (isCrdt(oldValue)) {
            oldValue._detach();
          }
          const value = op.data[key];
          __classPrivateFieldGet(this, _LiveObject_map, "f").set(key, value);
        }
        this.notify();
      } else if (op.type === OpType.DeleteObjectKey) {
        const key = op.key;
        const oldValue = __classPrivateFieldGet(this, _LiveObject_map, "f").get(key);
        if (isCrdt(oldValue)) {
          oldValue._detach();
        }
        __classPrivateFieldGet(this, _LiveObject_map, "f").delete(key);
        this.notify();
      }
    }
    toObject() {
      return Object.fromEntries(__classPrivateFieldGet(this, _LiveObject_map, "f"));
    }
    set(key, value) {
      this.update({ [key]: value });
    }
    get(key) {
      return __classPrivateFieldGet(this, _LiveObject_map, "f").get(key);
    }
    update(overrides) {
      if (this._doc && this._id) {
        const ops = [];
        const opId = this._doc.generateOpId();
        const updateOp = {
          opId,
          id: this._id,
          type: OpType.UpdateObject,
          data: {}
        };
        ops.push(updateOp);
        for (const key in overrides) {
          __classPrivateFieldGet(this, _LiveObject_propToLastUpdate, "f").set(key, opId);
          const oldValue = __classPrivateFieldGet(this, _LiveObject_map, "f").get(key);
          if (oldValue instanceof LiveObject) {
            oldValue._detach();
          }
          const newValue = overrides[key];
          if (newValue instanceof AbstractCrdt) {
            newValue._setParent(this);
            newValue._attach(this._doc.generateId(), this._doc);
            ops.push(...newValue._serialize(this._id, key));
          } else {
            updateOp.data[key] = newValue;
          }
          __classPrivateFieldGet(this, _LiveObject_map, "f").set(key, newValue);
        }
        this._doc.dispatch(ops);
        this.notify();
        return;
      }
      for (const key in overrides) {
        const oldValue = __classPrivateFieldGet(this, _LiveObject_map, "f").get(key);
        if (oldValue instanceof AbstractCrdt) {
          oldValue._detach();
        }
        const newValue = overrides[key];
        if (newValue instanceof AbstractCrdt) {
          newValue._setParent(this);
        }
        __classPrivateFieldGet(this, _LiveObject_map, "f").set(key, newValue);
      }
      this.notify();
    }
  };
  _LiveObject_map = new WeakMap(), _LiveObject_propToLastUpdate = new WeakMap();
  var LiveMap = class extends AbstractCrdt {
    constructor(entries) {
      super();
      _LiveMap_map.set(this, void 0);
      if (entries) {
        const mappedEntries = [];
        for (const entry of entries) {
          const value = selfOrRegister(entry[1]);
          value._setParent(this);
          mappedEntries.push([entry[0], value]);
        }
        __classPrivateFieldSet(this, _LiveMap_map, new Map(mappedEntries), "f");
      } else {
        __classPrivateFieldSet(this, _LiveMap_map, new Map(), "f");
      }
    }
    _serialize(parentId, parentKey) {
      if (this._id == null) {
        throw new Error("Cannot serialize item is not attached");
      }
      if (parentId == null || parentKey == null) {
        throw new Error("Cannot serialize map if parentId or parentKey is undefined");
      }
      const ops = [];
      const op = {
        id: this._id,
        type: OpType.CreateMap,
        parentId,
        parentKey
      };
      ops.push(op);
      for (const [key, value] of __classPrivateFieldGet(this, _LiveMap_map, "f")) {
        ops.push(...value._serialize(this._id, key));
      }
      return ops;
    }
    static _deserialize([id, item], parentToChildren, doc) {
      if (item.type !== CrdtType.Map) {
        throw new Error(`Tried to deserialize a map but item type is "${item.type}"`);
      }
      const map = new LiveMap();
      map._attach(id, doc);
      const children = parentToChildren.get(id);
      if (children == null) {
        return map;
      }
      for (const entry of children) {
        const crdt = entry[1];
        if (crdt.parentKey == null) {
          throw new Error("Tried to deserialize a crdt but it does not have a parentKey and is not the root");
        }
        const child = deserialize(entry, parentToChildren, doc);
        child._setParent(map);
        __classPrivateFieldGet(map, _LiveMap_map, "f").set(crdt.parentKey, child);
      }
      return map;
    }
    _attach(id, doc) {
      super._attach(id, doc);
      for (const [key, value] of __classPrivateFieldGet(this, _LiveMap_map, "f")) {
        if (isCrdt(value)) {
          value._attach(doc.generateId(), doc);
        }
      }
    }
    _attachChild(id, key, child) {
      if (this._doc == null) {
        throw new Error("Can't attach child if doc is not present");
      }
      const previousValue = __classPrivateFieldGet(this, _LiveMap_map, "f").get(key);
      if (previousValue) {
        previousValue._detach();
      }
      child._setParent(this);
      child._attach(id, this._doc);
      __classPrivateFieldGet(this, _LiveMap_map, "f").set(key, child);
      this.notify();
    }
    _detach() {
      super._detach();
      for (const item of __classPrivateFieldGet(this, _LiveMap_map, "f").values()) {
        item._detach();
      }
    }
    _detachChild(child) {
      for (const [key, value] of __classPrivateFieldGet(this, _LiveMap_map, "f")) {
        if (value === child) {
          __classPrivateFieldGet(this, _LiveMap_map, "f").delete(key);
        }
      }
      child._detach();
      this.notify();
    }
    get(key) {
      const value = __classPrivateFieldGet(this, _LiveMap_map, "f").get(key);
      if (value == void 0) {
        return void 0;
      }
      return selfOrRegisterValue(value);
    }
    set(key, value) {
      const oldValue = __classPrivateFieldGet(this, _LiveMap_map, "f").get(key);
      if (oldValue) {
        oldValue._detach();
      }
      const item = selfOrRegister(value);
      item._setParent(this);
      __classPrivateFieldGet(this, _LiveMap_map, "f").set(key, item);
      if (this._doc && this._id) {
        item._attach(this._doc.generateId(), this._doc);
        const ops = item._serialize(this._id, key);
        this._doc.dispatch(ops);
      }
      this.notify();
    }
    get size() {
      return __classPrivateFieldGet(this, _LiveMap_map, "f").size;
    }
    has(key) {
      return __classPrivateFieldGet(this, _LiveMap_map, "f").has(key);
    }
    delete(key) {
      const item = __classPrivateFieldGet(this, _LiveMap_map, "f").get(key);
      if (item == null) {
        return false;
      }
      item._detach();
      if (this._doc && item._id) {
        this._doc.dispatch([{ type: OpType.DeleteCrdt, id: item._id }]);
      }
      __classPrivateFieldGet(this, _LiveMap_map, "f").delete(key);
      this.notify();
      return true;
    }
    entries() {
      const innerIterator = __classPrivateFieldGet(this, _LiveMap_map, "f").entries();
      return {
        [Symbol.iterator]: function() {
          return this;
        },
        next() {
          const iteratorValue = innerIterator.next();
          if (iteratorValue.done) {
            return {
              done: true,
              value: void 0
            };
          }
          const entry = iteratorValue.value;
          return {
            value: [entry[0], selfOrRegisterValue(iteratorValue.value[1])]
          };
        }
      };
    }
    [(_LiveMap_map = new WeakMap(), Symbol.iterator)]() {
      return this.entries();
    }
    keys() {
      return __classPrivateFieldGet(this, _LiveMap_map, "f").keys();
    }
    values() {
      const innerIterator = __classPrivateFieldGet(this, _LiveMap_map, "f").values();
      return {
        [Symbol.iterator]: function() {
          return this;
        },
        next() {
          const iteratorValue = innerIterator.next();
          if (iteratorValue.done) {
            return {
              done: true,
              value: void 0
            };
          }
          return {
            value: selfOrRegisterValue(iteratorValue.value)
          };
        }
      };
    }
    forEach(callback) {
      for (const entry of this) {
        callback(entry[1], entry[0], this);
      }
    }
  };
  var LiveRegister = class extends AbstractCrdt {
    constructor(data) {
      super();
      _LiveRegister_data.set(this, void 0);
      __classPrivateFieldSet(this, _LiveRegister_data, data, "f");
    }
    get data() {
      return __classPrivateFieldGet(this, _LiveRegister_data, "f");
    }
    static _deserialize([id, item], parentToChildren, doc) {
      if (item.type !== CrdtType.Register) {
        throw new Error(`Tried to deserialize a map but item type is "${item.type}"`);
      }
      const register = new LiveRegister(item.data);
      register._attach(id, doc);
      return register;
    }
    _serialize(parentId, parentKey) {
      if (this._id == null || parentId == null || parentKey == null) {
        throw new Error("Cannot serialize register if parentId or parentKey is undefined");
      }
      return [
        {
          type: OpType.CreateRegister,
          id: this._id,
          parentId,
          parentKey,
          data: this.data
        }
      ];
    }
    _attachChild(id, key, crdt) {
      throw new Error("Method not implemented.");
    }
    _detachChild(crdt) {
      throw new Error("Method not implemented.");
    }
  };
  _LiveRegister_data = new WeakMap();
  var LiveList = class extends AbstractCrdt {
    constructor(items = []) {
      super();
      _LiveList_items.set(this, []);
      let position = void 0;
      for (let i = 0; i < items.length; i++) {
        const newPosition = makePosition(position);
        const item = selfOrRegister(items[i]);
        __classPrivateFieldGet(this, _LiveList_items, "f").push([item, newPosition]);
        position = newPosition;
      }
    }
    static _deserialize([id, item], parentToChildren, doc) {
      const list = new LiveList([]);
      list._attach(id, doc);
      const children = parentToChildren.get(id);
      if (children == null) {
        return list;
      }
      for (const entry of children) {
        const child = deserialize(entry, parentToChildren, doc);
        child._setParent(list);
        __classPrivateFieldGet(list, _LiveList_items, "f").push([child, entry[1].parentKey]);
        __classPrivateFieldGet(list, _LiveList_items, "f").sort((itemA, itemB) => compare(itemA[1], itemB[1]));
      }
      return list;
    }
    _serialize(parentId, parentKey) {
      if (this._id == null) {
        throw new Error("Cannot serialize item is not attached");
      }
      if (parentId == null || parentKey == null) {
        throw new Error("Cannot serialize list if parentId or parentKey is undefined");
      }
      const ops = [];
      const op = {
        id: this._id,
        type: OpType.CreateList,
        parentId,
        parentKey
      };
      ops.push(op);
      for (const [value, key] of __classPrivateFieldGet(this, _LiveList_items, "f")) {
        ops.push(...value._serialize(this._id, key));
      }
      return ops;
    }
    _attach(id, doc) {
      super._attach(id, doc);
      for (const [item, position] of __classPrivateFieldGet(this, _LiveList_items, "f")) {
        item._attach(doc.generateId(), doc);
      }
    }
    _detach() {
      super._detach();
      for (const [value] of __classPrivateFieldGet(this, _LiveList_items, "f")) {
        value._detach();
      }
    }
    _attachChild(id, key, child) {
      var _a;
      if (this._doc == null) {
        throw new Error("Can't attach child if doc is not present");
      }
      child._attach(id, this._doc);
      child._setParent(this);
      const index = __classPrivateFieldGet(this, _LiveList_items, "f").findIndex((entry) => entry[1] === key);
      if (index !== -1) {
        __classPrivateFieldGet(this, _LiveList_items, "f")[index][1] = makePosition(key, (_a = __classPrivateFieldGet(this, _LiveList_items, "f")[index + 1]) === null || _a === void 0 ? void 0 : _a[1]);
      }
      __classPrivateFieldGet(this, _LiveList_items, "f").push([child, key]);
      __classPrivateFieldGet(this, _LiveList_items, "f").sort((itemA, itemB) => compare(itemA[1], itemB[1]));
      this.notify();
    }
    _detachChild(child) {
      const indexToDelete = __classPrivateFieldGet(this, _LiveList_items, "f").findIndex((item) => item[0] === child);
      __classPrivateFieldGet(this, _LiveList_items, "f").splice(indexToDelete, 1);
      if (child) {
        child._detach();
      }
      this.notify();
    }
    _setChildKey(key, child) {
      var _a;
      const index = __classPrivateFieldGet(this, _LiveList_items, "f").findIndex((entry) => entry[1] === key);
      if (index !== -1) {
        __classPrivateFieldGet(this, _LiveList_items, "f")[index][1] = makePosition(key, (_a = __classPrivateFieldGet(this, _LiveList_items, "f")[index + 1]) === null || _a === void 0 ? void 0 : _a[1]);
      }
      const item = __classPrivateFieldGet(this, _LiveList_items, "f").find((item2) => item2[0] === child);
      if (item) {
        item[1] = key;
      }
      __classPrivateFieldGet(this, _LiveList_items, "f").sort((itemA, itemB) => compare(itemA[1], itemB[1]));
      this.notify();
    }
    get length() {
      return __classPrivateFieldGet(this, _LiveList_items, "f").length;
    }
    push(item) {
      const position = __classPrivateFieldGet(this, _LiveList_items, "f").length === 0 ? makePosition() : makePosition(__classPrivateFieldGet(this, _LiveList_items, "f")[__classPrivateFieldGet(this, _LiveList_items, "f").length - 1][1]);
      const value = selfOrRegister(item);
      value._setParent(this);
      __classPrivateFieldGet(this, _LiveList_items, "f").push([value, position]);
      this.notify();
      if (this._doc && this._id) {
        value._attach(this._doc.generateId(), this._doc);
        this._doc.dispatch(value._serialize(this._id, position));
      }
    }
    insert(item, index) {
      if (index < 0 || index > __classPrivateFieldGet(this, _LiveList_items, "f").length) {
        throw new Error(`Cannot delete list item at index "${index}". index should be between 0 and ${__classPrivateFieldGet(this, _LiveList_items, "f").length}`);
      }
      let before = __classPrivateFieldGet(this, _LiveList_items, "f")[index - 1] ? __classPrivateFieldGet(this, _LiveList_items, "f")[index - 1][1] : void 0;
      let after = __classPrivateFieldGet(this, _LiveList_items, "f")[index] ? __classPrivateFieldGet(this, _LiveList_items, "f")[index][1] : void 0;
      const position = makePosition(before, after);
      const value = selfOrRegister(item);
      value._setParent(this);
      __classPrivateFieldGet(this, _LiveList_items, "f").push([value, position]);
      __classPrivateFieldGet(this, _LiveList_items, "f").sort((itemA, itemB) => compare(itemA[1], itemB[1]));
      this.notify();
      if (this._doc && this._id) {
        value._attach(this._doc.generateId(), this._doc);
        this._doc.dispatch(value._serialize(this._id, position));
      }
    }
    move(index, targetIndex) {
      if (targetIndex < 0) {
        throw new Error("targetIndex cannot be less than 0");
      }
      if (targetIndex >= __classPrivateFieldGet(this, _LiveList_items, "f").length) {
        throw new Error("targetIndex cannot be greater or equal than the list length");
      }
      if (index < 0) {
        throw new Error("index cannot be less than 0");
      }
      if (index >= __classPrivateFieldGet(this, _LiveList_items, "f").length) {
        throw new Error("index cannot be greater or equal than the list length");
      }
      let beforePosition = null;
      let afterPosition = null;
      if (index < targetIndex) {
        afterPosition = targetIndex === __classPrivateFieldGet(this, _LiveList_items, "f").length - 1 ? void 0 : __classPrivateFieldGet(this, _LiveList_items, "f")[targetIndex + 1][1];
        beforePosition = __classPrivateFieldGet(this, _LiveList_items, "f")[targetIndex][1];
      } else {
        afterPosition = __classPrivateFieldGet(this, _LiveList_items, "f")[targetIndex][1];
        beforePosition = targetIndex === 0 ? void 0 : __classPrivateFieldGet(this, _LiveList_items, "f")[targetIndex - 1][1];
      }
      const position = makePosition(beforePosition, afterPosition);
      const item = __classPrivateFieldGet(this, _LiveList_items, "f")[index];
      item[1] = position;
      __classPrivateFieldGet(this, _LiveList_items, "f").sort((itemA, itemB) => compare(itemA[1], itemB[1]));
      this.notify();
      if (this._doc && this._id) {
        this._doc.dispatch([
          {
            type: OpType.SetParentKey,
            id: item[0]._id,
            parentKey: position
          }
        ]);
      }
    }
    delete(index) {
      if (index < 0 || index >= __classPrivateFieldGet(this, _LiveList_items, "f").length) {
        throw new Error(`Cannot delete list item at index "${index}". index should be between 0 and ${__classPrivateFieldGet(this, _LiveList_items, "f").length - 1}`);
      }
      const item = __classPrivateFieldGet(this, _LiveList_items, "f")[index];
      item[0]._detach();
      __classPrivateFieldGet(this, _LiveList_items, "f").splice(index, 1);
      if (this._doc) {
        const childRecordId = item[0]._id;
        if (childRecordId) {
          this._doc.dispatch([
            {
              id: childRecordId,
              type: OpType.DeleteCrdt
            }
          ]);
        }
      }
      this.notify();
    }
    toArray() {
      return __classPrivateFieldGet(this, _LiveList_items, "f").map((entry) => selfOrRegisterValue(entry[0]));
    }
    every(predicate) {
      return this.toArray().every(predicate);
    }
    filter(predicate) {
      return this.toArray().filter(predicate);
    }
    find(predicate) {
      return this.toArray().find(predicate);
    }
    findIndex(predicate) {
      return this.toArray().findIndex(predicate);
    }
    forEach(callbackfn) {
      return this.toArray().forEach(callbackfn);
    }
    get(index) {
      if (index < 0 || index >= __classPrivateFieldGet(this, _LiveList_items, "f").length) {
        return void 0;
      }
      return selfOrRegisterValue(__classPrivateFieldGet(this, _LiveList_items, "f")[index][0]);
    }
    indexOf(searchElement, fromIndex) {
      return this.toArray().indexOf(searchElement, fromIndex);
    }
    lastIndexOf(searchElement, fromIndex) {
      return this.toArray().lastIndexOf(searchElement, fromIndex);
    }
    map(callback) {
      return __classPrivateFieldGet(this, _LiveList_items, "f").map((entry, i) => callback(selfOrRegisterValue(entry[0]), i));
    }
    some(predicate) {
      return this.toArray().some(predicate);
    }
    [(_LiveList_items = new WeakMap(), Symbol.iterator)]() {
      return new LiveListIterator(__classPrivateFieldGet(this, _LiveList_items, "f"));
    }
  };
  var LiveListIterator = class {
    constructor(items) {
      _LiveListIterator_innerIterator.set(this, void 0);
      __classPrivateFieldSet(this, _LiveListIterator_innerIterator, items[Symbol.iterator](), "f");
    }
    [(_LiveListIterator_innerIterator = new WeakMap(), Symbol.iterator)]() {
      return this;
    }
    next() {
      const result = __classPrivateFieldGet(this, _LiveListIterator_innerIterator, "f").next();
      if (result.done) {
        return {
          done: true,
          value: void 0
        };
      }
      return {
        value: selfOrRegisterValue(result.value[0])
      };
    }
  };
  function deserialize(entry, parentToChildren, doc) {
    switch (entry[1].type) {
      case CrdtType.Object: {
        return LiveObject._deserialize(entry, parentToChildren, doc);
      }
      case CrdtType.List: {
        return LiveList._deserialize(entry, parentToChildren, doc);
      }
      case CrdtType.Map: {
        return LiveMap._deserialize(entry, parentToChildren, doc);
      }
      case CrdtType.Register: {
        return LiveRegister._deserialize(entry, parentToChildren, doc);
      }
      default: {
        throw new Error("Unexpected CRDT type");
      }
    }
  }
  function isCrdt(obj) {
    return obj instanceof LiveObject || obj instanceof LiveMap || obj instanceof LiveList || obj instanceof LiveRegister;
  }
  function selfOrRegisterValue(obj) {
    if (obj instanceof LiveRegister) {
      return obj.data;
    }
    return obj;
  }
  function selfOrRegister(obj) {
    if (obj instanceof LiveObject || obj instanceof LiveMap || obj instanceof LiveList) {
      return obj;
    } else if (obj instanceof LiveRegister) {
      throw new Error("Internal error. LiveRegister should not be created from selfOrRegister");
    } else {
      return new LiveRegister(obj);
    }
  }

  // node_modules/@liveblocks/client/lib/esm/authentication.js
  var __awaiter = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  function fetchAuthorize(endpoint, room2, publicApiKey) {
    return __awaiter(this, void 0, void 0, function* () {
      const res = yield fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          room: room2,
          publicApiKey
        })
      });
      if (!res.ok) {
        throw new AuthenticationError(`Authentication error. Liveblocks could not parse the response of your authentication "${endpoint}"`);
      }
      let authResponse = null;
      try {
        authResponse = yield res.json();
      } catch (er) {
        throw new AuthenticationError(`Authentication error. Liveblocks could not parse the response of your authentication "${endpoint}"`);
      }
      if (typeof authResponse.token !== "string") {
        throw new AuthenticationError(`Authentication error. Liveblocks could not parse the response of your authentication "${endpoint}"`);
      }
      return authResponse.token;
    });
  }
  function auth(endpoint, room2, publicApiKey) {
    return __awaiter(this, void 0, void 0, function* () {
      if (typeof endpoint === "string") {
        return fetchAuthorize(endpoint, room2, publicApiKey);
      }
      if (typeof endpoint === "function") {
        const { token } = yield endpoint(room2);
        return token;
      }
      throw new Error("Authentication error. Liveblocks could not parse the response of your authentication endpoint");
    });
  }
  var AuthenticationError = class extends Error {
    constructor(message) {
      super(message);
    }
  };
  function parseToken(token) {
    const tokenParts = token.split(".");
    if (tokenParts.length !== 3) {
      throw new AuthenticationError(`Authentication error. Liveblocks could not parse the response of your authentication endpoint`);
    }
    const data = JSON.parse(atob(tokenParts[1]));
    if (typeof data.actor !== "number") {
      throw new AuthenticationError(`Authentication error. Liveblocks could not parse the response of your authentication endpoint`);
    }
    return data;
  }

  // node_modules/@liveblocks/client/lib/esm/storage.js
  var __awaiter2 = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  var Storage = class {
    constructor(options) {
      this.options = options;
      this._doc = null;
      this._getInitialStatePromise = null;
      this._getInitialStateResolver = null;
    }
    createDocFromMessage(message) {
      if (message.items.length === 0) {
        this._doc = Doc.from(this.options.defaultRoot, this.options.getConnectionId(), this.options.dispatch);
      } else {
        this._doc = Doc.load(message.items, this.options.getConnectionId(), this.options.dispatch);
      }
    }
    getDocument() {
      return __awaiter2(this, void 0, void 0, function* () {
        if (this._doc) {
          return this._doc;
        }
        if (this._getInitialStatePromise == null) {
          this.options.fetchStorage();
          this._getInitialStatePromise = new Promise((resolve) => this._getInitialStateResolver = resolve);
        }
        yield this._getInitialStatePromise;
        return this._doc;
      });
    }
    onMessage(message) {
      var _a, _b;
      return __awaiter2(this, void 0, void 0, function* () {
        switch (message.type) {
          case ServerMessageType.InitialStorageState: {
            this.createDocFromMessage(message);
            (_a = this._getInitialStateResolver) === null || _a === void 0 ? void 0 : _a.call(this);
            break;
          }
          case ServerMessageType.UpdateStorage: {
            for (const op of message.ops) {
              (_b = this._doc) === null || _b === void 0 ? void 0 : _b.apply(op);
            }
            break;
          }
        }
      });
    }
  };
  var storage_default = Storage;

  // node_modules/@liveblocks/client/lib/esm/room.js
  var __awaiter3 = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  var BACKOFF_RETRY_DELAYS = [250, 500, 1e3, 2e3, 4e3, 8e3, 1e4];
  var HEARTBEAT_INTERVAL = 3e4;
  var PONG_TIMEOUT = 2e3;
  function isValidRoomEventType(value) {
    return value === "my-presence" || value === "others" || value === "event" || value === "error" || value === "connection";
  }
  function makeIdFactory(connectionId) {
    let count = 0;
    return () => `${connectionId}:${count++}`;
  }
  function makeOthers(presenceMap) {
    const array = Object.values(presenceMap);
    return {
      get count() {
        return array.length;
      },
      map(callback) {
        return array.map(callback);
      },
      toArray() {
        return array;
      }
    };
  }
  function log(...params) {
    return;
    console.log(...params, new Date().toString());
  }
  function makeStateMachine(state, context, mockedEffects) {
    const effects = mockedEffects || {
      authenticate() {
        return __awaiter3(this, void 0, void 0, function* () {
          try {
            const token = yield auth(context.authEndpoint, context.room, context.publicApiKey);
            const parsedToken = parseToken(token);
            const socket = new WebSocket(`${context.liveblocksServer}/?token=${token}`);
            socket.addEventListener("message", onMessage);
            socket.addEventListener("open", onOpen);
            socket.addEventListener("close", onClose);
            socket.addEventListener("error", onError);
            authenticationSuccess(parsedToken, socket);
          } catch (er) {
            authenticationFailure(er);
          }
        });
      },
      send(messageOrMessages) {
        if (state.socket == null) {
          throw new Error("Can't send message if socket is null");
        }
        state.socket.send(JSON.stringify(messageOrMessages));
      },
      delayFlush(delay) {
        return setTimeout(tryFlushing, delay);
      },
      startHeartbeatInterval() {
        return setInterval(heartbeat, HEARTBEAT_INTERVAL);
      },
      schedulePongTimeout() {
        return setTimeout(pongTimeout, PONG_TIMEOUT);
      },
      scheduleReconnect(delay) {
        return setTimeout(connect, delay);
      }
    };
    function subscribe(type, listener) {
      if (!isValidRoomEventType(type)) {
        throw new Error(`"${type}" is not a valid event name`);
      }
      state.listeners[type].push(listener);
    }
    function unsubscribe(event, callback) {
      if (!isValidRoomEventType(event)) {
        throw new Error(`"${event}" is not a valid event name`);
      }
      const callbacks = state.listeners[event];
      remove(callbacks, callback);
    }
    function getConnectionState() {
      return state.connection.state;
    }
    function getSelf() {
      return state.connection.state === "open" || state.connection.state === "connecting" ? {
        connectionId: state.connection.id,
        id: state.connection.userId,
        info: state.connection.userInfo,
        presence: getPresence()
      } : null;
    }
    function connect() {
      if (typeof window === "undefined") {
        return;
      }
      if (state.connection.state !== "closed" && state.connection.state !== "unavailable") {
        return null;
      }
      updateConnection({ state: "authenticating" });
      effects.authenticate();
    }
    function updatePresence(overrides) {
      const newPresence = Object.assign(Object.assign({}, state.me), overrides);
      if (state.flushData.presence == null) {
        state.flushData.presence = overrides;
      } else {
        for (const key in overrides) {
          state.flushData.presence[key] = overrides[key];
        }
      }
      state.me = newPresence;
      tryFlushing();
      for (const listener of state.listeners["my-presence"]) {
        listener(state.me);
      }
    }
    function authenticationSuccess(token, socket) {
      updateConnection({
        state: "connecting",
        id: token.actor,
        userInfo: token.info,
        userId: token.id
      });
      state.idFactory = makeIdFactory(token.actor);
      state.socket = socket;
    }
    function authenticationFailure(error) {
      console.error(error);
      updateConnection({ state: "unavailable" });
      state.numberOfRetry++;
      state.timeoutHandles.reconnect = effects.scheduleReconnect(getRetryDelay());
    }
    function onVisibilityChange(visibilityState) {
      if (visibilityState === "visible" && state.connection.state === "open") {
        log("Heartbeat after visibility change");
        heartbeat();
      }
    }
    function onUpdatePresenceMessage(message) {
      const user = state.users[message.actor];
      if (user == null) {
        state.users[message.actor] = {
          connectionId: message.actor,
          presence: message.data
        };
      } else {
        state.users[message.actor] = {
          id: user.id,
          info: user.info,
          connectionId: message.actor,
          presence: Object.assign(Object.assign({}, user.presence), message.data)
        };
      }
      updateUsers({
        type: "update",
        updates: message.data,
        user: state.users[message.actor]
      });
    }
    function updateUsers(event) {
      state.others = makeOthers(state.users);
      for (const listener of state.listeners["others"]) {
        listener(state.others, event);
      }
    }
    function onUserLeftMessage(message) {
      const userLeftMessage = message;
      const user = state.users[userLeftMessage.actor];
      if (user) {
        delete state.users[userLeftMessage.actor];
        updateUsers({ type: "leave", user });
      }
    }
    function onRoomStateMessage(message) {
      const newUsers = {};
      for (const key in message.users) {
        const connectionId = Number.parseInt(key);
        const user = message.users[key];
        newUsers[connectionId] = {
          connectionId,
          info: user.info,
          id: user.id
        };
      }
      state.users = newUsers;
      updateUsers({ type: "reset" });
    }
    function onNavigatorOnline() {
      if (state.connection.state === "unavailable") {
        log("Try to reconnect after connectivity change");
        reconnect();
      }
    }
    function onEvent(message) {
      for (const listener of state.listeners.event) {
        listener({ connectionId: message.actor, event: message.event });
      }
    }
    function onUserJoinedMessage(message) {
      state.users[message.actor] = {
        connectionId: message.actor,
        info: message.info,
        id: message.id
      };
      updateUsers({ type: "enter", user: state.users[message.actor] });
      if (state.me) {
        state.flushData.messages.push({
          type: ClientMessageType.UpdatePresence,
          data: state.me,
          targetActor: message.actor
        });
        tryFlushing();
      }
    }
    function onMessage(event) {
      if (event.data === "pong") {
        clearTimeout(state.timeoutHandles.pongTimeout);
        return;
      }
      const message = JSON.parse(event.data);
      switch (message.type) {
        case ServerMessageType.UserJoined: {
          onUserJoinedMessage(message);
          break;
        }
        case ServerMessageType.UpdatePresence: {
          onUpdatePresenceMessage(message);
          break;
        }
        case ServerMessageType.Event: {
          onEvent(message);
          break;
        }
        case ServerMessageType.UserLeft: {
          onUserLeftMessage(message);
          break;
        }
        case ServerMessageType.RoomState: {
          onRoomStateMessage(message);
          break;
        }
      }
      storage.onMessage(message);
    }
    function onClose(event) {
      state.socket = null;
      clearTimeout(state.timeoutHandles.pongTimeout);
      clearInterval(state.intervalHandles.heartbeat);
      if (state.timeoutHandles.flush) {
        clearTimeout(state.timeoutHandles.flush);
      }
      clearTimeout(state.timeoutHandles.reconnect);
      state.users = {};
      updateUsers({ type: "reset" });
      if (event.code >= 4e3 && event.code <= 4100) {
        updateConnection({ state: "failed" });
        const error = new LiveblocksError(event.reason, event.code);
        for (const listener of state.listeners.error) {
          listener(error);
        }
      } else if (event.wasClean === false) {
        updateConnection({ state: "unavailable" });
        state.numberOfRetry++;
        state.timeoutHandles.reconnect = effects.scheduleReconnect(getRetryDelay());
      } else {
        updateConnection({ state: "closed" });
      }
    }
    function updateConnection(connection) {
      state.connection = connection;
      for (const listener of state.listeners.connection) {
        listener(connection.state);
      }
    }
    function getRetryDelay() {
      return BACKOFF_RETRY_DELAYS[state.numberOfRetry < BACKOFF_RETRY_DELAYS.length ? state.numberOfRetry : BACKOFF_RETRY_DELAYS.length - 1];
    }
    function onError() {
    }
    function onOpen() {
      clearInterval(state.intervalHandles.heartbeat);
      state.intervalHandles.heartbeat = effects.startHeartbeatInterval();
      if (state.connection.state === "connecting") {
        updateConnection(Object.assign(Object.assign({}, state.connection), { state: "open" }));
        state.numberOfRetry = 0;
        tryFlushing();
      } else {
      }
    }
    function heartbeat() {
      if (state.socket == null) {
        return;
      }
      clearTimeout(state.timeoutHandles.pongTimeout);
      state.timeoutHandles.pongTimeout = effects.schedulePongTimeout();
      if (state.socket.readyState === WebSocket.OPEN) {
        state.socket.send("ping");
      }
    }
    function pongTimeout() {
      log("Pong timeout. Trying to reconnect.");
      reconnect();
    }
    function reconnect() {
      if (state.socket) {
        state.socket.removeEventListener("open", onOpen);
        state.socket.removeEventListener("message", onMessage);
        state.socket.removeEventListener("close", onClose);
        state.socket.removeEventListener("error", onError);
        state.socket.close();
        state.socket = null;
      }
      updateConnection({ state: "unavailable" });
      clearTimeout(state.timeoutHandles.pongTimeout);
      if (state.timeoutHandles.flush) {
        clearTimeout(state.timeoutHandles.flush);
      }
      clearTimeout(state.timeoutHandles.reconnect);
      clearInterval(state.intervalHandles.heartbeat);
      connect();
    }
    function tryFlushing() {
      if (state.socket == null) {
        return;
      }
      if (state.socket.readyState !== WebSocket.OPEN) {
        return;
      }
      const now = Date.now();
      const elapsedTime = now - state.lastFlushTime;
      if (elapsedTime > context.throttleDelay) {
        const messages = flushDataToMessages(state);
        if (messages.length === 0) {
          return;
        }
        effects.send(messages);
        state.flushData = {
          messages: [],
          storageOperations: [],
          presence: null
        };
        state.lastFlushTime = now;
      } else {
        if (state.timeoutHandles.flush != null) {
          clearTimeout(state.timeoutHandles.flush);
        }
        state.timeoutHandles.flush = effects.delayFlush(context.throttleDelay - (now - state.lastFlushTime));
      }
    }
    function flushDataToMessages(state2) {
      const messages = [];
      if (state2.flushData.presence) {
        messages.push({
          type: ClientMessageType.UpdatePresence,
          data: state2.flushData.presence
        });
      }
      for (const event of state2.flushData.messages) {
        messages.push(event);
      }
      if (state2.flushData.storageOperations.length > 0) {
        messages.push({
          type: ClientMessageType.UpdateStorage,
          ops: state2.flushData.storageOperations
        });
      }
      return messages;
    }
    function disconnect() {
      if (state.socket) {
        state.socket.removeEventListener("open", onOpen);
        state.socket.removeEventListener("message", onMessage);
        state.socket.removeEventListener("close", onClose);
        state.socket.removeEventListener("error", onError);
        state.socket.close();
        state.socket = null;
      }
      updateConnection({ state: "closed" });
      if (state.timeoutHandles.flush) {
        clearTimeout(state.timeoutHandles.flush);
      }
      clearTimeout(state.timeoutHandles.reconnect);
      clearTimeout(state.timeoutHandles.pongTimeout);
      clearInterval(state.intervalHandles.heartbeat);
      state.users = {};
      updateUsers({ type: "reset" });
      clearListeners();
    }
    function clearListeners() {
      for (const key in state.listeners) {
        state.listeners[key] = [];
      }
    }
    function getPresence() {
      return state.me;
    }
    function getOthers() {
      return state.others;
    }
    function broadcastEvent(event) {
      if (state.socket == null) {
        return;
      }
      state.flushData.messages.push({
        type: ClientMessageType.ClientEvent,
        event
      });
      tryFlushing();
    }
    function dispatch(ops) {
      state.flushData.storageOperations.push(...ops);
      tryFlushing();
    }
    const storage = new storage_default({
      fetchStorage: () => {
        state.flushData.messages.push({ type: ClientMessageType.FetchStorage });
        tryFlushing();
      },
      dispatch,
      getConnectionId: () => {
        const me = getSelf();
        if (me) {
          return me.connectionId;
        }
        throw new Error("Unexpected");
      },
      defaultRoot: state.defaultStorageRoot
    });
    function getStorage() {
      return __awaiter3(this, void 0, void 0, function* () {
        const doc = yield storage.getDocument();
        return {
          root: doc.root
        };
      });
    }
    return {
      onOpen,
      onClose,
      onMessage,
      authenticationSuccess,
      heartbeat,
      onNavigatorOnline,
      onVisibilityChange,
      connect,
      disconnect,
      subscribe,
      unsubscribe,
      updatePresence,
      broadcastEvent,
      getStorage,
      selectors: {
        getConnectionState,
        getSelf,
        getPresence,
        getOthers
      }
    };
  }
  function defaultState(me, defaultStorageRoot) {
    return {
      connection: { state: "closed" },
      socket: null,
      listeners: {
        event: [],
        others: [],
        "my-presence": [],
        error: [],
        connection: []
      },
      numberOfRetry: 0,
      lastFlushTime: 0,
      timeoutHandles: {
        flush: null,
        reconnect: 0,
        pongTimeout: 0
      },
      flushData: {
        presence: me == null ? {} : me,
        messages: [],
        storageOperations: []
      },
      intervalHandles: {
        heartbeat: 0
      },
      me: me == null ? {} : me,
      users: {},
      others: makeOthers({}),
      defaultStorageRoot,
      idFactory: null
    };
  }
  function createRoom(name, options) {
    const throttleDelay = options.throttle || 100;
    const liveblocksServer = options.liveblocksServer || "wss://liveblocks.net/v3";
    let authEndpoint;
    if (options.authEndpoint) {
      authEndpoint = options.authEndpoint;
    } else {
      const publicAuthorizeEndpoint = options.publicAuthorizeEndpoint || "https://liveblocks.io/api/public/authorize";
      authEndpoint = publicAuthorizeEndpoint;
    }
    const state = defaultState(options.defaultPresence, options.defaultStorageRoot);
    const machine = makeStateMachine(state, {
      throttleDelay,
      liveblocksServer,
      authEndpoint,
      room: name,
      publicApiKey: options.publicApiKey
    });
    const room2 = {
      getConnectionState: machine.selectors.getConnectionState,
      getSelf: machine.selectors.getSelf,
      subscribe: machine.subscribe,
      unsubscribe: machine.unsubscribe,
      getPresence: machine.selectors.getPresence,
      updatePresence: machine.updatePresence,
      getOthers: machine.selectors.getOthers,
      broadcastEvent: machine.broadcastEvent,
      getStorage: machine.getStorage
    };
    return {
      connect: machine.connect,
      disconnect: machine.disconnect,
      onNavigatorOnline: machine.onNavigatorOnline,
      onVisibilityChange: machine.onVisibilityChange,
      room: room2
    };
  }
  var LiveblocksError = class extends Error {
    constructor(message, code) {
      super(message);
      this.code = code;
    }
  };

  // node_modules/@liveblocks/client/lib/esm/client.js
  function createClient(options) {
    const clientOptions = options;
    if (typeof clientOptions.throttle === "number") {
      if (clientOptions.throttle < 80 || clientOptions.throttle > 1e3) {
        throw new Error("Liveblocks client throttle should be between 80 and 1000 ms");
      }
    }
    const rooms = new Map();
    function getRoom(roomId) {
      const internalRoom = rooms.get(roomId);
      return internalRoom ? internalRoom.room : null;
    }
    function enter(roomId, options2 = {}) {
      let internalRoom = rooms.get(roomId);
      if (internalRoom) {
        return internalRoom.room;
      }
      internalRoom = createRoom(roomId, Object.assign(Object.assign({}, clientOptions), options2));
      rooms.set(roomId, internalRoom);
      internalRoom.connect();
      return internalRoom.room;
    }
    function leave(roomId) {
      let room2 = rooms.get(roomId);
      if (room2) {
        room2.disconnect();
        rooms.delete(roomId);
      }
    }
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        for (const [, room2] of rooms) {
          room2.onNavigatorOnline();
        }
      });
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        for (const [, room2] of rooms) {
          room2.onVisibilityChange(document.visibilityState);
        }
      });
    }
    return {
      getRoom,
      enter,
      leave
    };
  }

  // app.js
  var client = createClient({
    authEndpoint: "/auth"
  });
  var room = client.enter("node-js-example", { cursor: null });
  var cursorsContainer = document.getElementById("cursors-container");
  room.subscribe("others", (others, event) => {
    switch (event.type) {
      case "reset": {
        cursorsContainer.innerHTML = "";
        for (const user of others.toArray()) {
          updateCursor(user);
        }
        break;
      }
      case "leave": {
        deleteCursor(event.user);
        break;
      }
      case "enter":
      case "update": {
        updateCursor(event.user);
        break;
      }
    }
  });
  document.addEventListener("pointermove", (e) => {
    room.updatePresence({ cursor: { x: e.clientX, y: e.clientY } });
  });
  document.addEventListener("pointerleave", (e) => {
    room.updatePresence({ cursor: null });
  });
  var COLORS = ["#DC2626", "#D97706", "#059669", "#7C3AED", "#DB2777"];
  function updateCursor(user) {
    const cursor = getCursorOrCreate(user.connectionId);
    if (user.presence?.cursor) {
      cursor.style.transform = `translateX(${user.presence.cursor.x}px) translateY(${user.presence.cursor.y}px)`;
      cursor.style.opacity = "1";
    } else {
      cursor.style.opacity = "0";
    }
  }
  function getCursorOrCreate(connectionId) {
    let cursor = document.getElementById(`cursor-${connectionId}`);
    if (cursor == null) {
      cursor = document.getElementById("cursor-template").cloneNode(true);
      cursor.id = `cursor-${connectionId}`;
      cursor.style.fill = COLORS[connectionId % COLORS.length];
      cursorsContainer.appendChild(cursor);
    }
    return cursor;
  }
  function deleteCursor(user) {
    const cursor = document.getElementById(`cursor-${user.connectionId}`);
    if (cursor) {
      cursor.parentNode.removeChild(cursor);
    }
  }
})();
