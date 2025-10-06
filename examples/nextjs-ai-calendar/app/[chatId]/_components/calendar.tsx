"use client";

import { useState } from "react";
import { faker } from "@faker-js/faker";

import { defineAiTool } from "@liveblocks/client";
import { RegisterAiKnowledge, RegisterAiTool } from "@liveblocks/react";
import { AiTool } from "@liveblocks/react-ui";

import {
  CalendarBody,
  CalendarHeader,
  CalendarItem,
  CalendarProvider,
} from "@/components/ui/calendar";

export function Calendar() {
  const [events, setEvents] = useState(initialEvents);

  return (
    <CalendarProvider
      initialMonth={7}
      initialYear={2025}
      className="h-full cursor-default"
    >
      <RegisterAiKnowledge
        description="Instructions"
        value="Reply minimally, and do not mention the status numbers, mention the status in words. 0 = Planned, 1 = In Progress, 2 = Done. For all day events, put them at midday. Don't write about which colour you're using, just do it. Prefer updating events to removing and adding, if they're the same event."
      />
      <RegisterAiKnowledge
        description="The current date and time"
        value={new Date().toString()}
      />
      <RegisterAiKnowledge
        description="Current calendar events"
        value={JSON.stringify(events)}
      />
      <RegisterAiTool
        name="add-calendar-events"
        tool={defineAiTool()({
          description:
            "Add multiple calendar events. For recurring events, just add it multiple times. Use a relevant emoji before each name. Add a relevant color. Birthdays pink, meetings purple, dentist red",
          parameters: {
            type: "object",
            properties: {
              events: {
                type: "array",
                description: "Array of calendar events to add",
                items: {
                  type: "object",
                  properties: {
                    name: {
                      type: "string",
                      description: "Name of the calendar event",
                    },
                    startAt: {
                      type: "string",
                      description: "Start time of the calendar event",
                    },
                    endAt: {
                      type: "string",
                      description: "End time of the calendar event",
                    },
                    status: {
                      type: "number",
                      description:
                        "Status of the calendar event. 0 = Planned, 1 = In Progress, 2 = Done",
                    },
                    color: {
                      type: "string",
                      description:
                        "Color of the calendar event (hex color code)",
                    },
                  },
                  required: ["name", "startAt", "endAt", "status"],
                  additionalProperties: false,
                },
              },
            },
            required: ["events"],
            additionalProperties: false,
          },
          render: ({ stage, args, result, types }) => {
            if (stage === "receiving") {
              return "Loading...";
            }
            return (
              <AiTool
                title={`Add calendar event${args.events.length === 1 ? "" : "s"}`}
                icon="🗓️"
              >
                <AiTool.Confirmation
                  types={types}
                  confirm={async ({ events }) => {
                    const newEvents = events.map((event) => ({
                      id: faker.string.uuid(),
                      name: event.name,
                      startAt: new Date(event.startAt),
                      endAt: new Date(event.endAt),
                      status: statuses[event.status],
                      color: event.color || "#6B7280", // Default to gray if no color provided
                    }));

                    setEvents((prevEvents) => [...prevEvents, ...newEvents]);

                    return {
                      data: { count: events.length },
                      description: `${events.length} event${events.length === 1 ? "" : "s"} added to calendar`,
                    };
                  }}
                >
                  Are you sure you want to add {args.events.length} event
                  {args.events.length === 1 ? "" : "s"}?
                </AiTool.Confirmation>
              </AiTool>
            );
          },
        })}
      />
      <RegisterAiTool
        name="edit-calendar-events"
        tool={defineAiTool()({
          description: "Replace specific calendar events by their ID",
          parameters: {
            type: "object",
            properties: {
              events: {
                type: "array",
                description:
                  "Array of calendar events to replace, each with an ID to identify which event to replace",
                items: {
                  type: "object",
                  properties: {
                    id: {
                      type: "string",
                      description: "ID of the existing event to replace",
                    },
                    name: {
                      type: "string",
                      description: "Name of the calendar event",
                    },
                    startAt: {
                      type: "string",
                      description: "Start time of the calendar event",
                    },
                    endAt: {
                      type: "string",
                      description: "End time of the calendar event",
                    },
                    status: {
                      type: "number",
                      description:
                        "Status of the calendar event. 0 = Planned, 1 = In Progress, 2 = Done",
                    },
                    color: {
                      type: "string",
                      description:
                        "Color of the calendar event (hex color code)",
                    },
                  },
                  required: ["id", "name", "startAt", "endAt", "status"],
                  additionalProperties: false,
                },
              },
            },
            required: ["events"],
            additionalProperties: false,
          },
          render: ({ stage, args, result, types }) => {
            if (stage === "receiving") {
              return "Loading...";
            }
            return (
              <AiTool
                title={`Edit calendar event${args.events.length === 1 ? "" : "s"}`}
                icon="✏️"
              >
                <AiTool.Confirmation
                  types={types}
                  confirm={async ({ events }) => {
                    setEvents((prevEvents) => {
                      const updatedEvents = [...prevEvents];

                      events.forEach((eventUpdate) => {
                        const index = updatedEvents.findIndex(
                          (e) => e.id === eventUpdate.id
                        );
                        if (index !== -1) {
                          updatedEvents[index] = {
                            ...updatedEvents[index],
                            name: eventUpdate.name,
                            startAt: new Date(eventUpdate.startAt),
                            endAt: new Date(eventUpdate.endAt),
                            status: statuses[eventUpdate.status],
                            color:
                              eventUpdate.color || updatedEvents[index].color,
                          };
                        }
                      });

                      return updatedEvents;
                    });

                    return {
                      data: { count: events.length },
                      description: `You've updated the event(s)`,
                    };
                  }}
                >
                  Are you sure you want to update {args.events.length} event
                  {args.events.length === 1 ? "" : "s"} in the calendar?
                </AiTool.Confirmation>
              </AiTool>
            );
          },
        })}
      />
      <RegisterAiTool
        name="remove-calendar-events"
        tool={defineAiTool()({
          description: "Remove specific calendar events by their ID",
          parameters: {
            type: "object",
            properties: {
              eventIds: {
                type: "array",
                description: "Array of event IDs to remove from the calendar",
                items: {
                  type: "string",
                  description: "ID of the event to remove",
                },
              },
            },
            required: ["eventIds"],
            additionalProperties: false,
          },
          render: ({ stage, args, result, types }) => {
            if (stage === "receiving") {
              return "Loading...";
            }
            return (
              <AiTool
                title={`Remove calendar event${args.eventIds.length === 1 ? "" : "s"}`}
                icon="🗑️"
              >
                <AiTool.Confirmation
                  types={types}
                  confirm={async ({ eventIds }) => {
                    setEvents((prevEvents) =>
                      prevEvents.filter((event) => !eventIds.includes(event.id))
                    );

                    return {
                      data: { count: eventIds.length },
                      description: `${eventIds.length} event${eventIds.length === 1 ? "" : "s"} removed from calendar`,
                    };
                  }}
                >
                  Are you sure you want to remove {args.eventIds.length} event
                  {args.eventIds.length === 1 ? "" : "s"} from the calendar?
                </AiTool.Confirmation>
              </AiTool>
            );
          },
        })}
      />
      <CalendarHeader />
      <CalendarBody features={events}>
        {({ feature }) => <CalendarItem feature={feature} key={feature.id} />}
      </CalendarBody>
    </CalendarProvider>
  );
}

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

const statuses = [
  { id: faker.string.uuid(), name: "Planned", color: "#6B7280" },
  { id: faker.string.uuid(), name: "In Progress", color: "#F59E0B" },
  { id: faker.string.uuid(), name: "Done", color: "#10B981" },
];

const initialEvents = [
  {
    id: faker.string.uuid(),
    name: "👥 Team Meeting",
    startAt: new Date(2025, 7, 5, 10, 0), // August 5th at 10:00 AM
    endAt: new Date(2025, 7, 5, 11, 0), // August 5th at 11:00 AM
    status: statuses[0], // Planned
    color: "#3B82F6", // Blue
  },
  {
    id: faker.string.uuid(),
    name: "📔 Project Review",
    startAt: new Date(2025, 7, 25, 14, 0), // August 25th at 2:00 PM
    endAt: new Date(2025, 7, 25, 16, 0), // August 25th at 4:00 PM
    status: statuses[1], // In Progress
    color: "#10B981", // Green
  },
];
