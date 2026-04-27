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

import { OpCode } from "@liveblocks/core";
import type { Decoder } from "decoders";
import {
  array,
  constant,
  number,
  object,
  optional,
  string,
  taggedUnion,
} from "decoders";

import type {
  ClientWireOp,
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
  intent: optional(constant("set")),
  deletedId: optional(string),
});

const createListOp: Decoder<CreateListOp & HasOpId> = object({
  type: constant(OpCode.CREATE_LIST),
  opId: string,
  id: string,
  parentId: string,
  parentKey: string,
  intent: optional(constant("set")),
  deletedId: optional(string),
});

const createMapOp: Decoder<CreateMapOp & HasOpId> = object({
  type: constant(OpCode.CREATE_MAP),
  opId: string,
  id: string,
  parentId: string,
  parentKey: string,
  intent: optional(constant("set")),
  deletedId: optional(string),
});

const createRegisterOp: Decoder<CreateRegisterOp & HasOpId> = object({
  type: constant(OpCode.CREATE_REGISTER),
  opId: string,
  id: string,
  parentId: string,
  parentKey: string,
  data: jsonYolo,
  intent: optional(constant("set")),
  deletedId: optional(string),
});

const textDelta = array(
  object({
    insert: string,
    attributes: optional(jsonObjectYolo),
  })
);

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
  data: textDelta,
  version: number,
  intent: optional(constant("set")),
  deletedId: optional(string),
});

const updateTextOp: Decoder<UpdateTextOp & HasOpId> = object({
  type: constant(OpCode.UPDATE_TEXT),
  opId: string,
  id: string,
  baseVersion: number,
  version: optional(number),
  ops: array(textOperation),
  metadata: optional(jsonObjectYolo),
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
  [OpCode.DELETE_CRDT]: deleteCrdtOp,
  [OpCode.SET_PARENT_KEY]: setParentKeyOp,
  [OpCode.DELETE_OBJECT_KEY]: deleteObjectKeyOp,
});
