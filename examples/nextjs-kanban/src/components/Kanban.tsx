"use client";

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { exampleFeatures, exampleStatuses } from "../lib/content";
import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from "./roadmap-ui/kanban";
import type { DragEndEvent } from "@dnd-kit/core";
import { format } from "date-fns";
import { useState } from "react";
import type { FC } from "react";
import { useMutation, useStorage } from "@liveblocks/react/suspense";
import { convertFromJson, convertToJson } from "@/lib/utils";
import { shallow } from "@liveblocks/react";
import { LiveList } from "@liveblocks/client";

// const exampleStatuses = [
//   { name: "hi", id: "planned" },
//   { name: "ok", id: "plannh" },
// ];

export const Kanban: FC = () => {
  const [_, setFeatures] = useState(exampleFeatures);
  const features = useStorage(
    (root) => root.features.map(convertFromJson),
    shallow
  );

  console.log(exampleFeatures);

  const handleDragEnd = useMutation(
    ({ storage }, event: DragEndEvent) => {
      const { active, over } = event;

      if (!over) {
        return;
      }

      const status = exampleStatuses.find((status) => status.name === over.id);

      if (!status) {
        return;
      }

      const newValue = features
        .map((feature) => {
          if (feature.id === active.id) {
            return { ...feature, status };
          }

          return feature;
        })
        .map(convertToJson);

      storage.set("features", new LiveList(newValue));
      // setFeatures(
      //   features.map((feature) => {
      //     if (feature.id === active.id) {
      //       return { ...feature, status };
      //     }
      //
      //     return feature;
      //   })
      // );
    },
    [features]
  );

  // const handleDragEnd = (event: DragEndEvent) => {
  //   // const { active, over } = event;
  //   //
  //   // if (!over) {
  //   //   return;
  //   // }
  //   //
  //   // const status = exampleStatuses.find((status) => status.name === over.id);
  //   //
  //   // if (!status) {
  //   //   return;
  //   // }
  //   //
  //   // setFeatures(
  //   //   features.map((feature) => {
  //   //     if (feature.id === active.id) {
  //   //       return { ...feature, status };
  //   //     }
  //   //
  //   //     return feature;
  //   //   })
  //   // );
  // };

  return (
    <KanbanProvider onDragEnd={handleDragEnd}>
      {exampleStatuses.map((status) => (
        <KanbanBoard key={status.name} id={status.name}>
          <KanbanHeader name={status.name} color={status.color} />
          <KanbanCards>
            {features
              .filter((feature) => feature.status.name === status.name)
              .map((feature, index) => (
                <KanbanCard
                  key={feature.id}
                  id={feature.id}
                  name={feature.name}
                  parent={status.name}
                  index={index}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <p className="m-0 flex-1 font-medium text-sm">
                        {feature.name}
                      </p>
                      <p className="m-0 text-xs text-muted-foreground">
                        {feature.initiative.name}
                      </p>
                    </div>
                    {feature.owner && (
                      <Avatar className="h-4 w-4 shrink-0">
                        <AvatarImage src={feature.owner.image} />
                        <AvatarFallback>
                          {feature.owner.name?.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  <p className="m-0text-xs text-muted-foreground">
                    {format(feature.startAt, "MMM d")} -{" "}
                    {format(feature.endAt, "MMM d, yyyy")}
                  </p>
                </KanbanCard>
              ))}
          </KanbanCards>
        </KanbanBoard>
      ))}
    </KanbanProvider>
  );
};
