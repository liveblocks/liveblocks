/**
 * MIT License
 *
 * Copyright (c) 2025, Tiptap GmbH
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/* eslint-disable */
import {
  getUpdatedPosition as coreGetUpdatedPosition,
  type GetUpdatedPositionResult,
  MappablePosition,
} from "@tiptap/core";
import type { EditorState, Transaction } from "@tiptap/pm/state";

import { isChangeOrigin } from "./isChangeOrigin";
import {
  getYAbsolutePosition,
  getYRelativePosition,
  type YRelativePosition,
} from "./yRelativePosition";

/**
 * A MappablePosition subclass that includes Y.js relative position information
 * to track positions in collaborative transactions.
 */
export class CollaborationMappablePosition extends MappablePosition {
  /**
   * The Y.js relative position used for mapping positions in collaborative editing.
   */
  public yRelativePosition: YRelativePosition;

  constructor(position: number, yRelativePosition: YRelativePosition) {
    super(position);
    this.yRelativePosition = yRelativePosition;
  }

  /**
   * Creates a CollaborationMappablePosition from a JSON object.
   */
  static fromJSON(json: any): CollaborationMappablePosition {
    return new CollaborationMappablePosition(
      json.position,
      json.yRelativePosition
    );
  }

  /**
   * Converts the CollaborationMappablePosition to a JSON object.
   */
  toJSON(): any {
    return {
      position: this.position,
      yRelativePosition: this.yRelativePosition,
    };
  }
}

/**
 * Creates a MappablePosition from a position number.
 * This is the collaboration implementation that returns a CollaborationMappablePosition.
 */
export function createMappablePosition(
  position: number,
  state: EditorState
): CollaborationMappablePosition {
  const yRelativePosition = getYRelativePosition(state, position);
  return new CollaborationMappablePosition(position, yRelativePosition);
}

/**
 * Returns the new position after applying a transaction. Handles both Y.js
 * transactions and regular transactions.
 */
export function getUpdatedPosition(
  position: MappablePosition,
  transaction: Transaction,
  state: EditorState
): GetUpdatedPositionResult {
  const yRelativePosition =
    position instanceof CollaborationMappablePosition
      ? position.yRelativePosition
      : null;

  if (isChangeOrigin(transaction) && yRelativePosition) {
    const absolutePosition = getYAbsolutePosition(state, yRelativePosition);

    return {
      position: new CollaborationMappablePosition(
        absolutePosition,
        yRelativePosition
      ),
      mapResult: null,
    };
  }

  const result = coreGetUpdatedPosition(position, transaction);

  const absolutePosition = result.position.position;

  return {
    position: new CollaborationMappablePosition(
      absolutePosition,
      yRelativePosition ?? getYRelativePosition(state, absolutePosition)
    ),
    mapResult: result.mapResult,
  };
}
