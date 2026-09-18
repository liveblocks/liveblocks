import {
  ISSUE_LABEL_IDS,
  type IssueLabelId,
  type IssuePriorityId,
  type IssueProgressId,
} from "@/config";
import { AI_USER_INFO, getUserExpertise, getUsers } from "@/database";
import {
  applyIssuePropertyUpdates,
  type IssuePropertyUpdates,
} from "@/lib/apply-issue-property-updates";
import { writeFeedComplete, writeFeedStatus } from "@/lib/ai-feed-messages";
import type { BackgroundTasks } from "@/lib/background-tasks";
import { loadIssueDescriptionMarkdown } from "@/lib/issue-context-markdown";
import type { ImmutableStorage } from "@/liveblocks.config";
import { liveblocks } from "@/liveblocks.server.config";
import { getTypeSafeClient } from "@/typesafe.server.config";
import {
  choice,
  noul,
  type NoulQuestion,
  type SystemOneResult,
} from "@typesafe-ai/sdk";

// The properties and labels sparkle buttons are classification problems, not
// text generation, so they are answered by Jev (TypeSafe's System One model).
// We send the issue as `state`, ask typed questions, and get back calibrated
// probabilities. All decision-making (thresholds, what to overwrite, what to
// leave alone) lives in plain code below, where it is easy to read and tune.

// ---------------------------------------------------------------------------
// State: what Jev gets to look at
// ---------------------------------------------------------------------------

export type IssueSnapshot = {
  title: string;
  description: string;
  progress: IssueProgressId;
  priority: IssuePriorityId;
  assignedTo: string;
  labels: string[];
};

type JevIssueState = {
  issue: {
    title: string;
    description: string;
  };
  current: {
    progress: string;
    priority: string;
    assignedTo: string;
    labels: string[];
  };
};

function toJevState(snapshot: IssueSnapshot): JevIssueState {
  return {
    issue: {
      title: snapshot.title,
      description: snapshot.description,
    },
    current: {
      progress: snapshot.progress,
      priority: snapshot.priority,
      assignedTo: snapshot.assignedTo,
      labels: snapshot.labels,
    },
  };
}

async function loadIssueSnapshot(roomId: string): Promise<IssueSnapshot> {
  const [storageJson, description] = await Promise.all([
    liveblocks.getStorageDocument(roomId, "json"),
    loadIssueDescriptionMarkdown(roomId),
  ]);
  // getStorageDocument returns untyped JSON; the room's storage shape is
  // declared in liveblocks.config.ts (same pattern as apply-issue-property-updates).
  const storage = storageJson as unknown as ImmutableStorage;

  return {
    title: storage.meta.title,
    description: description ?? "",
    progress: storage.properties.progress,
    priority: storage.properties.priority,
    assignedTo: storage.properties.assignedTo,
    labels: [...storage.labels],
  };
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

// Option names double as the ids stored in the issue, so `satisfies` keeps
// them in sync with `ISSUE_PRIORITY_IDS` / `ISSUE_PROGRESS_IDS` in config.
const PRIORITY_QUESTION = choice(
  "How urgent is this issue for the team, judging from the title and description?",
  {
    urgent:
      "Blocking: production is down, data is being lost, a security incident, or an imminent hard deadline. Must be handled immediately.",
    high: "Important and time-sensitive: affects many users or a core workflow, but there is a workaround or it is not a full outage.",
    medium:
      "Normal planned work: a regular bug fix, improvement, or feature with no special urgency.",
    low: "Nice to have: cosmetic polish, minor cleanup, or an idea with no deadline.",
  } satisfies Record<Exclude<IssuePriorityId, "none">, string>
);

const PROGRESS_QUESTION = choice(
  "Which workflow state does the issue text indicate the work is in?",
  {
    todo: "Not started. Nothing in the text says work is underway.",
    progress:
      "Someone is actively working on it right now (e.g. “WIP”, “working on this”, “implementing”).",
    review:
      "Work is finished and awaiting review, QA, or approval (e.g. “PR open”, “ready for review”).",
    done: "Already completed, shipped, or resolved.",
  } satisfies Record<Exclude<IssueProgressId, "none">, string>
);

// Assignee options are the demo users, built at request time. Each option
// describes what that person owns (see USER_EXPERTISE in database.ts) so Jev
// can route by area when nobody is named explicitly.
function buildAssigneeQuestion() {
  const criteria: Record<string, string> = {
    none: "Nobody on the team is a clear fit, or the issue is too vague to route.",
  };
  for (const user of getUsers()) {
    if (user.id === AI_USER_INFO.id) {
      continue;
    }
    const expertise = getUserExpertise(user.id);
    criteria[user.id] = expertise
      ? `${user.info.name} — owns: ${expertise}`
      : user.info.name;
  }
  return choice(
    "Who should own this issue? If the text names a team member, pick them. Otherwise pick the person whose area of ownership best matches the work described.",
    criteria
  );
}

function buildPropertyQuestions() {
  return {
    priority: PRIORITY_QUESTION,
    progress: PROGRESS_QUESTION,
    assignee: buildAssigneeQuestion(),
  };
}

// Labels are independent yes/no decisions (an issue can be both a bug and
// engineering), so each one is a Noul question keyed by label id.
const LABEL_QUESTIONS = {
  feature: noul(
    "Does this issue ask for new functionality, or an enhancement to existing functionality?",
    {
      true: "Adds or extends what the product can do.",
      false:
        "Fixes, cleans up, or discusses existing behavior without adding capability.",
    }
  ),
  bug: noul(
    "Does this issue describe something that is broken, incorrect, crashing, or not behaving as intended?",
    {
      true: "Existing behavior is wrong and needs fixing.",
      false:
        "Nothing is described as broken; it is a request, task, or discussion.",
    }
  ),
  engineering: noul(
    "Is the bulk of this work engineering: code, infrastructure, performance, tooling, tests, or data?"
  ),
  design: noul(
    "Does this issue involve visual design, UX, layout, interaction, or copy that a designer would own?"
  ),
  product: noul(
    "Is this a product decision: requirements, scoping, prioritization, roadmap, or research about what to build?"
  ),
} satisfies Record<IssueLabelId, NoulQuestion>;

type PropertyQuestions = ReturnType<typeof buildPropertyQuestions>;
export type PropertyAnswers = SystemOneResult<PropertyQuestions>["answers"];
export type LabelAnswers = SystemOneResult<typeof LABEL_QUESTIONS>["answers"];

// ---------------------------------------------------------------------------
// Decisions: thresholds scale with how invasive the change is
// ---------------------------------------------------------------------------

export const JEV_THRESHOLDS = {
  // Filling an empty field is low-risk, so a modest confidence is enough.
  fillPriority: 0.2,
  // Overwriting a priority a human already chose needs a clear signal.
  overridePriority: 0.85,
  // Below this we fall back to `todo` rather than guess a workflow state.
  fillProgress: 0.5,
  // Assigning work to a person is the most consequential change here. Routing
  // by area of ownership is fuzzier than matching a name, so this sits at the
  // "genuinely unsure" floor; `none` is always an option Jev can pick.
  assignee: 0.5,
  // Labels: add when clearly yes, remove an existing one only when clearly no.
  addLabel: 0.6,
  removeLabel: 0.2,
} as const;

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export type PropertyDecision = {
  updates: IssuePropertyUpdates;
  notes: string[];
};

export function decidePropertyUpdates(
  answers: PropertyAnswers,
  current: Pick<IssueSnapshot, "progress" | "priority" | "assignedTo">,
  assignableUserIds: ReadonlySet<string>
): PropertyDecision {
  const updates: IssuePropertyUpdates = {};
  const notes: string[] = [];

  const priority = answers.priority;
  if (current.priority === "none") {
    if (priority.confidence >= JEV_THRESHOLDS.fillPriority) {
      updates.priority = priority.choice;
      notes.push(
        `Priority → ${priority.choice} (confidence ${pct(priority.confidence)})`
      );
    } else {
      notes.push(
        `Priority left empty: Jev was unsure (confidence ${pct(priority.confidence)})`
      );
    }
  } else if (
    priority.choice !== current.priority &&
    priority.confidence >= JEV_THRESHOLDS.overridePriority
  ) {
    updates.priority = priority.choice;
    notes.push(
      `Priority ${current.priority} → ${priority.choice} (confidence ${pct(priority.confidence)})`
    );
  } else {
    notes.push(`Priority kept as ${current.priority}`);
  }

  const progress = answers.progress;
  if (current.progress === "none") {
    if (progress.confidence >= JEV_THRESHOLDS.fillProgress) {
      updates.progress = progress.choice;
      notes.push(
        `Progress → ${progress.choice} (confidence ${pct(progress.confidence)})`
      );
    } else {
      updates.progress = "todo";
      notes.push(
        `Progress → todo (default; confidence in “${progress.choice}” was only ${pct(progress.confidence)})`
      );
    }
  } else {
    notes.push(`Progress kept as ${current.progress}`);
  }

  const assignee = answers.assignee;
  if (current.assignedTo !== "none") {
    notes.push(`Assignee kept as ${current.assignedTo}`);
  } else if (
    assignee.choice !== "none" &&
    assignableUserIds.has(assignee.choice) &&
    assignee.confidence >= JEV_THRESHOLDS.assignee
  ) {
    updates.assignedTo = assignee.choice;
    notes.push(
      `Assignee → ${assignee.choice} (confidence ${pct(assignee.confidence)})`
    );
  } else {
    notes.push(
      `Assignee left empty: no clear owner (best guess ${assignee.choice}, confidence ${pct(assignee.confidence)})`
    );
  }

  return { updates, notes };
}

export type LabelDecision = {
  labels: IssueLabelId[];
  changed: boolean;
  notes: string[];
};

export function decideLabels(
  answers: LabelAnswers,
  currentLabels: readonly string[]
): LabelDecision {
  const current = new Set(currentLabels);
  const labels: IssueLabelId[] = [];
  const notes: string[] = [];

  for (const id of ISSUE_LABEL_IDS) {
    const probability = answers[id].noul;
    const has = current.has(id);
    const keep = has
      ? probability > JEV_THRESHOLDS.removeLabel
      : probability >= JEV_THRESHOLDS.addLabel;

    if (keep) {
      labels.push(id);
    }
    if (keep && !has) {
      notes.push(`+ ${id} (${pct(probability)})`);
    } else if (!keep && has) {
      notes.push(`− ${id} (${pct(probability)})`);
    }
  }

  const changed =
    labels.length !== current.size || labels.some((id) => !current.has(id));

  if (!changed) {
    notes.push("Labels already fit");
  }

  return { labels, changed, notes };
}

// ---------------------------------------------------------------------------
// Runners: one request to Jev, then apply the decision and report to the feed
// ---------------------------------------------------------------------------
//
// Jev answers in well under a second, so the only things awaited on the
// critical path are: loading the issue, the Jev call, and the storage
// mutation. Presence, feed status messages, and the room-metadata sync are
// handed to `background` and flushed once the fields have already updated.

type FeedTarget = { roomId: string; feedId: string };

function queueStatus(
  background: BackgroundTasks,
  target: FeedTarget,
  label: string
): void {
  background.queue(() => writeFeedStatus(target, label));
}

function queueComplete(
  background: BackgroundTasks,
  target: FeedTarget,
  notes: string[],
  startedAt: number
): void {
  queueStatus(background, target, "Done…");
  background.queue(() =>
    writeFeedComplete(target, {
      response: notes.join("\n"),
      reasoning: "",
      thinkingTime: (performance.now() - startedAt) / 1000,
    })
  );
}

export async function runJevPropertiesButton(
  target: FeedTarget,
  background: BackgroundTasks
): Promise<void> {
  const startedAt = performance.now();
  const client = getTypeSafeClient();

  const snapshot = await loadIssueSnapshot(target.roomId);
  queueStatus(background, target, "Asking Jev…");

  const { answers } = await client.systemOne({
    state: toJevState(snapshot),
    questions: buildPropertyQuestions(),
  });

  const assignableUserIds = new Set(
    getUsers()
      .filter((u) => u.id !== AI_USER_INFO.id)
      .map((u) => u.id)
  );
  const { updates, notes } = decidePropertyUpdates(
    answers,
    snapshot,
    assignableUserIds
  );

  if (updates.priority !== undefined) {
    queueStatus(background, target, "Updating priority…");
  }
  if (updates.progress !== undefined) {
    queueStatus(background, target, "Updating progress…");
  }
  if (updates.assignedTo !== undefined) {
    queueStatus(background, target, "Assigning user…");
  }
  await applyIssuePropertyUpdates(target.roomId, updates, background);

  queueComplete(background, target, notes, startedAt);
}

export async function runJevLabelsButton(
  target: FeedTarget,
  background: BackgroundTasks
): Promise<void> {
  const startedAt = performance.now();
  const client = getTypeSafeClient();

  const snapshot = await loadIssueSnapshot(target.roomId);
  queueStatus(background, target, "Asking Jev…");

  const { answers } = await client.systemOne({
    state: toJevState(snapshot),
    questions: LABEL_QUESTIONS,
  });

  const { labels, changed, notes } = decideLabels(answers, snapshot.labels);

  if (changed) {
    queueStatus(background, target, "Updating labels…");
    await applyIssuePropertyUpdates(target.roomId, { labels }, background);
  }

  queueComplete(background, target, notes, startedAt);
}
