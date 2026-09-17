/**
 * Copyright (c) Liveblocks Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import type { LiveTextData, LiveTextSegment } from "@liveblocks/core";
import { OpCode } from "@liveblocks/core";
import type { Decoder } from "decoders";
import {
  array,
  constant,
  either,
  number,
  object,
  oneOf,
  optional,
  sized,
  startsWith,
  string,
  taggedUnion,
  tuple,
} from "decoders";

import type {
  ClientWireOp,
  CreateFileOp,
  CreateListOp,
  CreateMapOp,
  CreateObjectOp,
  CreateRegisterOp,
  CreateTextOp,
  DeleteCrdtOp,
  DeleteObjectKeyOp,
  SetParentKeyOp,
  UpdateObjectOp,
  UpdateTextOp,
} from "~/protocol";

import { jsonObjectYolo, jsonYolo } from "./jsonYolo";

type HasOpId = { opId: string };

const intent = oneOf(["set", "push"] as const);
const storageFileId = sized(startsWith("fl_"), { size: 24 });
const fileSize = number.refine(
  (value) => Number.isSafeInteger(value) && value >= 0,
  "Must be a valid file size"
);

const liveTextVersion = number.reject((value) =>
  Number.isSafeInteger(value) && value >= 0
    ? null
    : "Must be a non-negative safe integer"
);

const updateObjectOp: Decoder<UpdateObjectOp & HasOpId> = object({
  type: constant(OpCode.UPDATE_OBJECT),
  opId: string,
  id: string,
  data: jsonObjectYolo,
});

const createObjectOp: Decoder<CreateObjectOp & HasOpId> = object({
  type: constant(OpCode.CREATE_OBJECT),
  opId: string,
  id: string,
  parentId: string,
  parentKey: string,
  data: jsonObjectYolo,
  intent: optional(intent),
  deletedId: optional(string),
});

const createListOp: Decoder<CreateListOp & HasOpId> = object({
  type: constant(OpCode.CREATE_LIST),
  opId: string,
  id: string,
  parentId: string,
  parentKey: string,
  intent: optional(intent),
  deletedId: optional(string),
});

const createMapOp: Decoder<CreateMapOp & HasOpId> = object({
  type: constant(OpCode.CREATE_MAP),
  opId: string,
  id: string,
  parentId: string,
  parentKey: string,
  intent: optional(intent),
  deletedId: optional(string),
});

const createRegisterOp: Decoder<CreateRegisterOp & HasOpId> = object({
  type: constant(OpCode.CREATE_REGISTER),
  opId: string,
  id: string,
  parentId: string,
  parentKey: string,
  data: jsonYolo,
  intent: optional(intent),
  deletedId: optional(string),
});

const liveTextSegment: Decoder<LiveTextSegment> = either(
  tuple(string),
  tuple(string, jsonObjectYolo)
);

const liveTextData: Decoder<LiveTextData> = array(liveTextSegment);

const textOperation = taggedUnion("type", {
  insert: object({
    type: constant("insert"),
    index: number,
    text: string,
    attributes: optional(jsonObjectYolo),
  }),
  delete: object({
    type: constant("delete"),
    index: number,
    length: number,
  }),
  format: object({
    type: constant("format"),
    index: number,
    length: number,
    attributes: jsonObjectYolo,
  }),
});

const createTextOp: Decoder<CreateTextOp & HasOpId> = object({
  type: constant(OpCode.CREATE_TEXT),
  opId: string,
  id: string,
  parentId: string,
  parentKey: string,
  data: liveTextData,
  version: liveTextVersion,
  intent: optional(intent),
  deletedId: optional(string),
});

const createFileOp: Decoder<CreateFileOp & HasOpId> = object({
  type: constant(OpCode.CREATE_FILE),
  opId: string,
  id: string,
  parentId: string,
  parentKey: string,
  data: object({
    id: storageFileId,
    name: string,
    size: fileSize,
    mimeType: string,
  }),
  intent: optional(intent),
  deletedId: optional(string),
});

const updateTextOp: Decoder<UpdateTextOp & HasOpId> = object({
  type: constant(OpCode.UPDATE_TEXT),
  opId: string,
  id: string,
  baseVersion: liveTextVersion,
  version: optional(liveTextVersion),
  ops: array(textOperation),
});

const deleteCrdtOp: Decoder<DeleteCrdtOp & HasOpId> = object({
  type: constant(OpCode.DELETE_CRDT),
  opId: string,
  id: string,
});

const setParentKeyOp: Decoder<SetParentKeyOp & HasOpId> = object({
  type: constant(OpCode.SET_PARENT_KEY),
  opId: string,
  id: string,
  parentKey: string,
});

const deleteObjectKeyOp: Decoder<DeleteObjectKeyOp & HasOpId> = object({
  type: constant(OpCode.DELETE_OBJECT_KEY),
  opId: string,
  id: string,
  key: string,
});

export const op: Decoder<ClientWireOp> = taggedUnion("type", {
  [OpCode.UPDATE_OBJECT]: updateObjectOp,
  [OpCode.CREATE_OBJECT]: createObjectOp,
  [OpCode.CREATE_LIST]: createListOp,
  [OpCode.CREATE_MAP]: createMapOp,
  [OpCode.CREATE_REGISTER]: createRegisterOp,
  [OpCode.CREATE_TEXT]: createTextOp,
  [OpCode.UPDATE_TEXT]: updateTextOp,
  [OpCode.CREATE_FILE]: createFileOp,
  [OpCode.DELETE_CRDT]: deleteCrdtOp,
  [OpCode.SET_PARENT_KEY]: setParentKeyOp,
  [OpCode.DELETE_OBJECT_KEY]: deleteObjectKeyOp,
});
