/* eslint-disable */
// @ts-nocheck
import React from "react";
import {
  LiveList as MyLiveList,
  LiveList as MySecondLiveList,
} from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

// Not constructors
MyLiveList();
MySecondLiveList();

// Constructors
new MyLiveList();
new MySecondLiveList();

const list = new MyLiveList();
const list2 = new MyLiveList([]);
const list3 = new MyLiveList([1, 2, 3]);

// Comment
const list4 = new MyLiveList();

/**
 * Comment
 */
const list5 = new MyLiveList([]);

//
// Comment
//
const list6 = new MyLiveList([1, 2, 3]);
