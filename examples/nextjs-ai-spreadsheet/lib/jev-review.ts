import {
  choice,
  noul,
  TypeSafeClient,
  type ChoiceResponse,
  type EntryType,
  type NoulQuestion,
  type NoulResponse,
} from "@typesafe-ai/sdk";
import {
  Liveblocks as LiveblocksClient,
  markdownToCommentBody,
  stringifyCommentBody,
  type CommentData,
  type ThreadData,
} from "@liveblocks/node";
import { AI_USER_ID, AI_USER_NAME } from "@/database";
import { cellKey, type CellFormat } from "@/liveblocks.config";
import { colIndexToLetters, toA1 } from "@/lib/a1";
import { parseFix, serializeFix, type Fix, type FixOp } from "@/lib/fix";
import {
  applyFix,
  CHAT_MODEL,
  mentionsAi,
  readStorage,
  replyInThread,
  snapshotText,
  threadToMessages,
  type StorageJson,
} from "@/lib/spreadsheet-server";

/**
 * A Jev-powered reviewer for the spreadsheet.
 *
 * Jev (TypeSafe's System One model) never writes text. It answers typed
 * questions — here, ~20 yes/no "Noul" checks asked in ONE request — and returns
 * a calibrated probability for each. Code thresholds those probabilities and,
 * for every check that fires, hands that check's *prompt* to the LLM, which
 * writes a single review comment on the cell. Jev routes, the LLM writes.
 *
 * Two triggers:
 *  - a human edits a cell (client → POST /api/jev-review) → `reviewCellEdit`
 *  - a human leaves a comment (`commentCreated` webhook) → `reviewComment`,
 *    where Jev additionally classifies the comment's intent ("go ahead" →
 *    apply the proposed fix, a question → answer, "leave it" → resolve).
 *
 * Every review comment carries its fix, ready to apply, in `metadata.fix`
 * (see lib/fix.ts). The "Fix it" button (POST /api/apply-fix →
 * `applyReviewFix`) writes it to Storage immediately with `mutateStorage`,
 * without another model call.
 */

// --- Tuning ------------------------------------------------------------------

// A check "fires" when Jev's probability that the issue is present is at least
// this. Noul answers are calibrated probabilities, so this reads as "80% sure".
export const FIRE_THRESHOLD = 0.8;
// A fired check is suppressed when Jev is at least this sure the thread on the
// cell *already* raises it (and it hasn't been addressed), so the reviewer
// doesn't repeat itself on every subsequent edit.
export const SUPPRESS_THRESHOLD = 0.5;
// At most this many findings make it into one comment (strongest first).
export const MAX_FINDINGS = 3;
// A paste can change hundreds of cells at once; only review this many per
// request (the most recent first) to keep the review loop cheap and quick.
export const MAX_CELLS_PER_REQUEST = 5;

// --- Check catalog -----------------------------------------------------------

export type Check = {
  id: string;
  // `cell` checks look at the changed cell; `thread` checks look at the
  // conversation on it. Both are asked in the same request when applicable.
  scope: "cell" | "thread";
  // The Noul question Jev answers. Instructions point at fields of the state
  // with backticked paths, as the TypeSafe docs recommend.
  question: NoulQuestion;
  // What the LLM is told to do when this check fires.
  prompt: string;
};

function cellCheck(
  id: string,
  question: { question: string; focus: string },
  criteria: { true: string; false: string },
  prompt: string
): Check {
  return {
    id,
    scope: "cell",
    question: noul(
      { ...question, inspect: "`cell`", compare: ["`column`", "`row`"] },
      criteria
    ),
    prompt,
  };
}

function threadCheck(
  id: string,
  question: { question: string; focus: string },
  criteria: { true: string; false: string },
  prompt: string
): Check {
  return {
    id,
    scope: "thread",
    question: noul(
      { ...question, inspect: "`thread.comments`", compare: ["`cell`"] },
      criteria
    ),
    prompt,
  };
}

export const CHECKS: Check[] = [
  // --- Cell checks (the changed cell, in the context of its row/column) ------
  cellCheck(
    "typo",
    {
      question: "Does `cell.value` contain a misspelled word?",
      focus:
        "Only real spelling mistakes in text. Not abbreviations, names, codes, or numbers.",
    },
    {
      true: "A word is misspelled, e.g. 'Revenu', 'Marketting', 'recieved'.",
      false: "All words are spelled correctly, or the value is not prose.",
    },
    "Point out the typo and give the corrected spelling."
  ),
  cellCheck(
    "inconsistent_label",
    {
      question:
        "Is `cell.value` the same thing as other values in `column.values` but written differently (casing, abbreviation, punctuation)?",
      focus:
        "Labels that should match their neighbours, e.g. 'usa' vs 'USA', 'N/A' vs 'n.a.'.",
    },
    {
      true: "The value duplicates an existing label with different spelling/casing/format.",
      false:
        "The value is either distinct or written the same way as its peers.",
    },
    "Say which existing spelling the column uses and recommend matching it."
  ),
  cellCheck(
    "number_stored_as_text",
    {
      question:
        "Is `cell.value` meant to be a number but written so that a spreadsheet would treat it as text?",
      focus:
        "Stray characters, letters, spaces, or symbols mixed into a number, e.g. '1,2O0', '45 usd', '12..5'. A plain number, a formula (starting with '='), or a currency/percent like '$1,200' or '12%' is fine.",
    },
    {
      true: "A number that formulas would skip because of stray characters.",
      false: "A clean number, a formula, or intentional text.",
    },
    "Explain that formulas will skip this value and give the cleaned-up number."
  ),
  cellCheck(
    "wrong_number_format",
    {
      question:
        "Does `cell.value` need a different number format (`cell.format.numberFormat`) than it has, given `column.header` and `column.values`?",
      focus:
        "Money should use 'currency', rates/ratios/shares should use 'percent', everything else 'general'. Compare with how the rest of the column is formatted.",
    },
    {
      true: "The value is money or a rate but the number format doesn't match, or vice versa.",
      false: "The number format fits the value, or the value isn't numeric.",
    },
    "Recommend the number format that fits (currency, percent, or general) and mention the column's convention."
  ),
  cellCheck(
    "inconsistent_date",
    {
      question:
        "Is `cell.value` a date written in a different style than the other dates in `column.values`?",
      focus:
        "e.g. '3/4/2024' in a column of '2024-03-04', or 'Mar 4' among full dates.",
    },
    {
      true: "A date whose style differs from the column's dates.",
      false: "Not a date, or the same style as the column.",
    },
    "Show the date rewritten in the column's style."
  ),
  cellCheck(
    "broken_formula",
    {
      question:
        "Is `cell.value` a formula (starts with '=') that is likely wrong: a range that misses rows, a reference to the wrong column, a self-reference, or a syntax error?",
      focus:
        "Compare the referenced range with the data in `sheet.cells`. A SUM over B2:B9 when data runs to B12 is wrong; a self-reference is wrong.",
    },
    {
      true: "The formula very likely computes the wrong thing or errors.",
      false: "Not a formula, or the formula looks correct.",
    },
    "Say what's wrong with the formula and give the corrected formula."
  ),
  cellCheck(
    "hardcoded_total",
    {
      question:
        "Is `cell.value` a typed-in number sitting where a formula belongs, e.g. a total/subtotal/average row or column?",
      focus:
        "Look at `row` and `column` labels like 'Total', 'Sum', 'Average', 'Subtotal'. A formula (starting with '=') is fine.",
    },
    {
      true: "A literal number in a total/derived position.",
      false: "Not a derived position, or already a formula.",
    },
    "Recommend replacing the number with the appropriate formula (e.g. =SUM(...)) and give it."
  ),
  cellCheck(
    "outlier",
    {
      question:
        "Is `cell.value` a number wildly out of scale with the other numbers in `column.values` (e.g. an extra zero, a missing decimal, wrong unit)?",
      focus:
        "Roughly 10× or more off the column's typical magnitude. Totals rows are expected to be larger.",
    },
    {
      true: "The value is implausibly large or small compared to its column.",
      false:
        "The value is in line with the column, or there's too little data to tell.",
    },
    "Flag the suspicious magnitude and ask whether the value is right, suggesting the likely intended value."
  ),
  cellCheck(
    "duplicate_entry",
    {
      question:
        "Does `cell.value` duplicate an entry that already exists elsewhere in `column.values`, in a column where entries should be unique (ids, names, emails, items)?",
      focus:
        "Only columns that look like identifiers or unique items; repeated categories or amounts are fine.",
    },
    {
      true: "An exact or near-exact duplicate in a column that should be unique.",
      false: "Unique, or the column allows repeats.",
    },
    "Point to the existing duplicate (by cell reference) and ask whether this row is redundant."
  ),
  cellCheck(
    "unit_mismatch",
    {
      question:
        "Does `cell.value` use a different unit than the rest of `column.values` (e.g. 'kg' in a column of 'lbs', '€' in a '$' column, hours vs minutes)?",
      focus: "Explicit units in the values or the header.",
    },
    {
      true: "The unit differs from the column's unit.",
      false: "Same unit, or no units involved.",
    },
    "Recommend converting to the column's unit and give the converted value if possible."
  ),
  cellCheck(
    "header_type_mismatch",
    {
      question:
        "Does the kind of data in `cell.value` contradict `column.header` (e.g. text in a 'Price' column, a number in a 'Name' column)?",
      focus: "Only clear contradictions with the header's meaning.",
    },
    {
      true: "The value's type doesn't fit what the header says the column holds.",
      false: "The value fits the header, or there's no header.",
    },
    "Explain the mismatch and ask which is intended, the header or the value."
  ),
  cellCheck(
    "missing_header",
    {
      question:
        "Does `column` contain data but no header in its first row (`column.header` is empty) while neighbouring columns do have headers?",
      focus: "Only when other columns in `sheet.cells` have headers in row 1.",
    },
    {
      true: "A data column without a header, in a sheet that uses headers.",
      false: "The column has a header, or the sheet doesn't use headers.",
    },
    "Suggest a header for the column based on its values."
  ),
  cellCheck(
    "placeholder_left",
    {
      question:
        "Is `cell.value` a placeholder rather than real data (TODO, TBD, xxx, ???, 'fill in', 'asdf')?",
      focus: "Placeholder text or keyboard mashing, not a real value.",
    },
    {
      true: "A placeholder or dummy value.",
      false: "A real value.",
    },
    "Remind the user to fill in the real value and, if the row/column makes it obvious, suggest one."
  ),
  cellCheck(
    "sign_error",
    {
      question:
        "Is `cell.value` a negative number in a column where all other numbers in `column.values` are positive, or positive where the rest are negative?",
      focus: "Only when the column clearly has one sign convention.",
    },
    {
      true: "The sign contradicts the column's convention.",
      false: "Consistent sign, or the column mixes signs.",
    },
    "Ask whether the sign is intended and suggest the flipped value."
  ),

  // --- Thread checks (the conversation on the cell) --------------------------
  threadCheck(
    "unanswered_question",
    {
      question:
        "Does `thread.comments` contain a question from a human that nobody has answered yet?",
      focus:
        "Questions directed at the team about the cell, not rhetorical ones.",
    },
    {
      true: "A human asked something and no later comment answers it.",
      false: "No open questions, or they were answered.",
    },
    "Answer the open question if the sheet makes the answer clear; otherwise say what's needed to answer it."
  ),
  threadCheck(
    "requested_change_not_applied",
    {
      question:
        "Does `thread.comments` ask for a specific change to the cell that `cell.value` still doesn't reflect?",
      focus: "Compare the requested value/format with the current `cell`.",
    },
    {
      true: "A requested change is still pending in the cell.",
      false: "No change was requested, or it has been applied.",
    },
    "Note that the requested change hasn't been applied yet and offer to apply it."
  ),
  threadCheck(
    "disagreement",
    {
      question:
        "Do commenters in `thread.comments` contradict each other about what the cell's value should be?",
      focus: "Two humans proposing different values or facts.",
    },
    {
      true: "Conflicting positions with no resolution.",
      false: "Agreement, or only one position.",
    },
    "Summarise the two positions neutrally and, if the sheet's data supports one, say which."
  ),
  threadCheck(
    "implicit_ai_request",
    {
      question:
        "Does the latest human comment in `thread.comments` ask for help the assistant could give (a lookup, a formula, a fix) without addressing anyone in particular?",
      focus:
        "Requests like 'can someone add the total?' or 'what formula should this be?'.",
    },
    {
      true: "An unaddressed request the assistant can fulfil.",
      false: "Not a request, or addressed to a specific person.",
    },
    "Offer to do it, describing exactly what you'd change."
  ),
  threadCheck(
    "thread_resolvable",
    {
      question:
        "Has the issue raised in `thread.comments` been fixed, judging by the current `cell.value` and `cell.format`?",
      focus:
        "The thread's issue is about this cell, and the cell now reflects the fix.",
    },
    {
      true: "The cell now shows the fix the thread asked for.",
      false:
        "The issue is still present, or the thread isn't about a fixable issue.",
    },
    "Confirm in one sentence that the issue looks fixed, quoting the new value."
  ),
  threadCheck(
    "decision_not_recorded",
    {
      question:
        "Did the humans in `thread.comments` agree on a value for the cell that `cell.value` still doesn't contain?",
      focus:
        "An explicit agreement ('ok let's use 42') not yet reflected in the cell.",
    },
    {
      true: "An agreed value that hasn't been entered.",
      false: "No agreement, or it's already in the cell.",
    },
    "Point out the agreed value and offer to enter it."
  ),
];

const CHECK_BY_ID = new Map(CHECKS.map((check) => [check.id, check]));

// What the latest human comment is asking for. Confidence-gated in code.
const INTENT_QUESTION = choice(
  {
    question:
      "What is the latest human comment (`thread.latest_comment`) asking for, in the context of the whole `thread.comments`?",
    focus:
      "Short replies like 'Fix it', 'yes', 'go ahead', 'do it' after the assistant proposed a fix mean approve_fix.",
  },
  {
    approve_fix: {
      what: "Agrees to a fix the assistant proposed earlier in the thread.",
      examples: ["Fix it", "yes please", "go ahead", "apply that"],
    },
    request_change: {
      what: "Asks for a specific change to the cell or sheet that wasn't already proposed.",
      examples: [
        "make this a percentage",
        "change the date to 2024",
        "add a total row",
      ],
    },
    question_for_assistant: {
      what: "Asks the assistant something without requesting an edit.",
      examples: ["why is this flagged?", "what does this formula do?"],
    },
    reject: {
      what: "Declines the assistant's proposal or says the value is intentional.",
      examples: ["no, leave it", "that's on purpose", "ignore this"],
    },
    discussion: {
      what: "Humans talking to each other; nothing for the assistant to do.",
      examples: ["@Anjali can you double-check this?", "thanks!"],
    },
    other: null,
  }
);

// --- Client ------------------------------------------------------------------

let client: TypeSafeClient | null | undefined;
let warned = false;

// Lazily create the TypeSafe client. Returns null (and warns once) when the
// reviewer isn't configured, so the rest of the example keeps working.
function getClient(): TypeSafeClient | null {
  if (client !== undefined) {
    return client;
  }
  if (!process.env.TYPESAFE_API_KEY) {
    client = null;
    if (!warned) {
      warned = true;
      console.warn(
        "[jev] TYPESAFE_API_KEY is not set — the spreadsheet reviewer is disabled."
      );
    }
    return client;
  }
  client = new TypeSafeClient();
  return client;
}

export function isReviewerEnabled(): boolean {
  if (!process.env.AI_GATEWAY_API_KEY) {
    if (!warned) {
      warned = true;
      console.warn(
        "[jev] AI_GATEWAY_API_KEY is not set — the spreadsheet reviewer is disabled."
      );
    }
    return false;
  }
  return getClient() !== null;
}

// --- State -------------------------------------------------------------------

type CellRef = { rowId: string; colId: string };

type RefValue = { ref: string; value: string };

// Non-empty cells of the sheet, A1-addressed, capped to stay well inside Jev's
// token budget. The changed cell's row and column are always included in full.
const MAX_SHEET_CELLS = 600;
const MAX_LINE_CELLS = 80;

function buildState(
  storage: StorageJson,
  cell: CellRef,
  previousValue: string | undefined,
  thread: ThreadData | null,
  threadComments: { author: string; text: string; is_latest: boolean }[],
  otherThreads: RefValue[]
): EntryType {
  const { rowIds, colIds, cells } = storage;
  const row = rowIds.indexOf(cell.rowId);
  const col = colIds.indexOf(cell.colId);
  const key = cellKey(cell.rowId, cell.colId);
  const current = cells[key];
  const value = current?.value ?? "";
  const format: CellFormat | undefined = current?.format;

  const columnValues: RefValue[] = [];
  for (
    let r = 0;
    r < rowIds.length && columnValues.length < MAX_LINE_CELLS;
    r++
  ) {
    const v = cells[cellKey(rowIds[r], cell.colId)]?.value;
    if (v) {
      columnValues.push({ ref: toA1(r, col), value: v });
    }
  }
  const rowValues: RefValue[] = [];
  for (let c = 0; c < colIds.length && rowValues.length < MAX_LINE_CELLS; c++) {
    const v = cells[cellKey(cell.rowId, colIds[c])]?.value;
    if (v) {
      rowValues.push({ ref: toA1(row, c), value: v });
    }
  }

  const sheetCells: RefValue[] = [];
  for (const [k, c] of Object.entries(cells)) {
    if (!c?.value) {
      continue;
    }
    const [rowId, colId] = k.split(":");
    const r = rowIds.indexOf(rowId);
    const cc = colIds.indexOf(colId);
    if (r === -1 || cc === -1) {
      continue;
    }
    sheetCells.push({ ref: toA1(r, cc), value: c.value });
  }
  sheetCells.sort((a, b) =>
    a.ref.localeCompare(b.ref, undefined, { numeric: true })
  );
  const truncated = sheetCells.length > MAX_SHEET_CELLS;

  return {
    note: "A shared spreadsheet. Values starting with '=' are formulas (the source, not the computed result). `cell` is the cell under review.",
    cell: {
      ref: toA1(row, col),
      value,
      previous_value: previousValue ?? null,
      format: format ? { ...format } : null,
      row_number: row + 1,
      column_letter: colIndexToLetters(col),
    },
    column: {
      letter: colIndexToLetters(col),
      header: cells[cellKey(rowIds[0], cell.colId)]?.value ?? "",
      values: columnValues.map((v) => ({ ...v })),
    },
    row: {
      number: row + 1,
      values: rowValues.map((v) => ({ ...v })),
    },
    sheet: {
      dimensions: `${rowIds.length} rows × ${colIds.length} columns`,
      cells: (truncated
        ? sheetCells.slice(0, MAX_SHEET_CELLS)
        : sheetCells
      ).map((v) => ({ ...v })),
      truncated,
    },
    thread: thread
      ? {
          comments: threadComments.map((c) => ({ ...c })),
          latest_comment: threadComments.find((c) => c.is_latest)?.text ?? null,
        }
      : null,
    other_threads: otherThreads.map((v) => ({ ...v })),
  };
}

async function describeThread(
  thread: ThreadData,
  latestCommentId?: string
): Promise<{ author: string; text: string; is_latest: boolean }[]> {
  const out: { author: string; text: string; is_latest: boolean }[] = [];
  for (const comment of thread.comments) {
    if (!comment.body) {
      continue;
    }
    out.push({
      author:
        comment.userId === AI_USER_ID ? "assistant" : `user:${comment.userId}`,
      text: (await stringifyCommentBody(comment.body)).trim(),
      is_latest: comment.id === latestCommentId,
    });
  }
  if (latestCommentId === undefined && out.length > 0) {
    out[out.length - 1].is_latest = true;
  }
  return out;
}

// A1-addressed one-liners for the *other* open threads, so the reviewer knows
// what's already being discussed elsewhere on the sheet.
async function describeOtherThreads(
  storage: StorageJson,
  threads: ThreadData[],
  exclude: string | undefined
): Promise<RefValue[]> {
  const out: RefValue[] = [];
  for (const thread of threads) {
    if (thread.resolved || thread.id === exclude) {
      continue;
    }
    const row = storage.rowIds.indexOf(thread.metadata.rowId);
    const col = storage.colIds.indexOf(thread.metadata.colId);
    const first = thread.comments.find((c) => c.body);
    if (row === -1 || col === -1 || !first?.body) {
      continue;
    }
    out.push({
      ref: toA1(row, col),
      value: (await stringifyCommentBody(first.body)).trim().slice(0, 200),
    });
  }
  return out;
}

function openThreadOnCell(
  threads: ThreadData[],
  cell: CellRef
): ThreadData | null {
  // Newest open thread on the cell (mirrors CellThreadContext on the client).
  let found: ThreadData | null = null;
  for (const thread of threads) {
    if (
      !thread.resolved &&
      thread.metadata.rowId === cell.rowId &&
      thread.metadata.colId === cell.colId
    ) {
      found = thread;
    }
  }
  return found;
}

// --- Asking Jev --------------------------------------------------------------

type Finding = { check: Check; probability: number };

function gateId(checkId: string): string {
  return `already_raised__${checkId}`;
}

// Build the question set: every applicable check, plus (when there's a thread
// on the cell) a companion "already raised?" gate per check.
function buildQuestions(
  checks: Check[],
  hasThread: boolean
): Record<string, NoulQuestion> {
  const questions: Record<string, NoulQuestion> = {};
  for (const check of checks) {
    questions[check.id] = check.question;
    if (hasThread) {
      questions[gateId(check.id)] = noul(
        {
          question:
            "Does `thread.comments` already raise the following issue about `cell`, without it having been addressed since?",
          issue: check.question.instructions ?? null,
        },
        {
          true: "The thread already points this out and it's still open.",
          false:
            "The thread doesn't mention it, or it was addressed afterwards.",
        }
      );
    }
  }
  return questions;
}

type Answer = NoulResponse | ChoiceResponse;
type Answers = Record<string, Answer>;

// Probability for a Noul question, 0 when the question wasn't asked.
function noulOf(answers: Answers, id: string): number {
  const answer = answers[id];
  return answer?.type === "noul" ? answer.noul : 0;
}

// Turn Jev's answers into a ranked, deduped list of findings.
function collectFindings(
  answers: Answers,
  checks: Check[],
  hasThread: boolean
): Finding[] {
  const findings: Finding[] = [];
  for (const check of checks) {
    const probability = noulOf(answers, check.id);
    if (probability < FIRE_THRESHOLD) {
      continue;
    }
    if (hasThread && noulOf(answers, gateId(check.id)) >= SUPPRESS_THRESHOLD) {
      continue;
    }
    findings.push({ check, probability });
  }
  findings.sort((a, b) => b.probability - a.probability);
  return findings.slice(0, MAX_FINDINGS);
}

function logAnswers(label: string, answers: Answers) {
  const lines = Object.entries(answers)
    .filter(([id]) => !id.startsWith("already_raised__"))
    .map(([id, a]) =>
      a.type === "noul"
        ? `  ${id.padEnd(30)} ${a.noul.toFixed(2)}${a.noul >= FIRE_THRESHOLD ? "  ← fires" : ""}`
        : `  ${id.padEnd(30)} ${a.choice} (confidence ${a.confidence.toFixed(2)})`
    );
  console.log(`[jev] ${label}\n${lines.join("\n")}`);
}

// --- Writing the comment -----------------------------------------------------

type Review = { text: string; fix: Fix | null };

// The LLM writes ONE comment from the fired checks: one sentence per finding,
// in order, each with a concrete recommendation — and, in the same call, the
// concrete edits that recommendation amounts to (`fix`). The fix is saved on
// the comment so "Fix it" can apply it instantly (see applyReviewFix); the
// comment itself only recommends. The LLM always gets the *whole* spreadsheet
// (`snapshotText`), unlike Jev, whose `state.sheet` is capped to fit its token
// budget.
async function writeReviewComment(
  a1: string,
  findings: Finding[],
  state: EntryType,
  storage: StorageJson,
  thread: ThreadData | null
): Promise<Review | null> {
  const { generateText, Output } = await import("ai");
  const { z } = await import("zod");
  const messages = thread ? await threadToMessages(thread) : [];
  // Drop Jev's truncated `sheet` from the context — the full sheet is passed
  // separately below.
  const context = JSON.stringify(state, (key, value) =>
    key === "sheet" ? undefined : value
  );
  const { output } = await generateText({
    model: CHAT_MODEL,
    output: Output.object({
      schema: z.object({
        comment: z
          .string()
          .describe("The review comment to post on the cell's thread."),
        // One flat shape for both kinds of edit: OpenAI's structured outputs
        // reject `oneOf`/unions, and every field must be present (hence
        // `nullable`, not `optional`).
        fix: z
          .array(
            z.object({
              op: z
                .enum(["setValue", "format"])
                .describe("`setValue` writes a cell; `format` styles a range."),
              cell: z
                .string()
                .describe(
                  'A1 reference: a single cell for setValue (e.g. "B2"), a cell or range for format (e.g. "B2:B9").'
                ),
              value: z
                .string()
                .nullable()
                .describe(
                  "setValue only: the new cell value (a formula starts with '='). null for format."
                ),
              numberFormat: z
                .enum(["general", "currency", "percent"])
                .nullable()
                .describe("format only; null to leave unchanged."),
              bold: z.boolean().nullable().describe("format only."),
              italic: z.boolean().nullable().describe("format only."),
              align: z
                .enum(["left", "center", "right"])
                .nullable()
                .describe("format only."),
            })
          )
          .describe(
            "The exact edits that apply every recommendation in `comment`, in " +
              "order. Empty when the findings can't be fixed by setting values " +
              "or formats (e.g. an open question, or a duplicate to discuss)."
          ),
      }),
    }),
    system:
      `You are ${AI_USER_NAME}, reviewing a shared spreadsheet. A reviewer ` +
      `flagged the findings below on cell ${a1}. Write ONE short comment for ` +
      `the thread on that cell: exactly one sentence per finding, in the given ` +
      `order, each ending in a concrete recommendation (the corrected value, ` +
      `formula, or format). Do not merge findings, do not add findings, do not ` +
      `add a greeting or sign-off. Light Markdown (bold, italics, inline code) ` +
      `only — no headings, lists, or tables. Do not prefix with your name. You ` +
      `are only recommending: do not claim to have changed anything. The user ` +
      `can accept with a "Fix it" button under your comment, which applies ` +
      `\`fix\` exactly as you return it — so \`fix\` must match what the ` +
      `comment recommends, use A1 references, and only touch cells the ` +
      `recommendation is about.` +
      (thread
        ? ` The existing conversation on this cell is given as prior messages; don't repeat what's already been said.`
        : ""),
    messages: [
      ...messages,
      {
        role: "user",
        content: `Findings (strongest first):\n${JSON.stringify(
          findings.map((f) => ({
            check: f.check.id,
            probability: Number(f.probability.toFixed(2)),
            instruction: f.check.prompt,
          })),
          null,
          2
        )}\n\nCell, row, column and thread context:\n${context}\n\n${snapshotText(storage)}`,
      },
    ],
  });
  const text = output.comment.trim();
  if (!text) {
    return null;
  }
  const ops: FixOp[] = [];
  for (const raw of output.fix) {
    if (raw.op === "setValue") {
      if (raw.value !== null) {
        ops.push({ op: "setValue", cell: raw.cell, value: raw.value });
      }
      continue;
    }
    const format: CellFormat = {};
    if (raw.numberFormat !== null) format.numberFormat = raw.numberFormat;
    if (raw.bold !== null) format.bold = raw.bold;
    if (raw.italic !== null) format.italic = raw.italic;
    if (raw.align !== null) format.align = raw.align;
    if (Object.keys(format).length > 0) {
      ops.push({ op: "format", range: raw.cell, format });
    }
  }
  return { text, fix: ops.length > 0 ? { ops } : null };
}

// Post the review as the AI user, tagged `review: "pending"` so the UI shows
// "Fix it" / "Ignore" under it, with the ready-to-apply fix saved alongside.
// Appends to the cell's open thread if any.
async function postReview(
  liveblocks: LiveblocksClient,
  roomId: string,
  cell: CellRef,
  thread: ThreadData | null,
  review: Review
): Promise<void> {
  const body = markdownToCommentBody(review.text);
  const fix = review.fix ? serializeFix(review.fix) : null;
  const metadata: Liveblocks["CommentMetadata"] = fix
    ? { review: "pending", fix }
    : { review: "pending" };
  if (thread) {
    await liveblocks.createComment({
      roomId,
      threadId: thread.id,
      data: { userId: AI_USER_ID, body, metadata },
    });
  } else {
    await liveblocks.createThread({
      roomId,
      data: {
        comment: { userId: AI_USER_ID, body, metadata },
        metadata: { rowId: cell.rowId, colId: cell.colId },
      },
    });
  }
}

// Flip every pending review comment in the thread to `status`, hiding the
// buttons for everyone, and drop any saved fix so it can't be applied twice.
async function settlePendingReviews(
  liveblocks: LiveblocksClient,
  roomId: string,
  thread: ThreadData,
  status: "accepted" | "ignored"
): Promise<void> {
  for (const comment of thread.comments) {
    if (comment.metadata?.review === "pending" || comment.metadata?.fix) {
      await liveblocks
        .editCommentMetadata({
          roomId,
          threadId: thread.id,
          commentId: comment.id,
          data: { metadata: { review: status, fix: null }, userId: AI_USER_ID },
        })
        .catch((error) => console.error("[jev] editCommentMetadata", error));
    }
  }
}

// --- Applying a saved fix ----------------------------------------------------

// The newest review comment in the thread that still carries a saved fix.
function pendingFix(
  thread: ThreadData
): { commentId: string; fix: Fix } | null {
  for (let i = thread.comments.length - 1; i >= 0; i--) {
    const comment = thread.comments[i];
    if (comment.userId !== AI_USER_ID || comment.deletedAt) {
      continue;
    }
    const fix = parseFix(comment.metadata?.fix);
    if (fix) {
      return { commentId: comment.id, fix };
    }
  }
  return null;
}

// Apply the fix saved on a review comment straight to Storage — no LLM
// involved — then confirm in the thread and resolve it. Returns false when the
// comment has no (remaining) fix, so callers can fall back to asking the AI.
async function applySavedFix(
  liveblocks: LiveblocksClient,
  roomId: string,
  thread: ThreadData,
  commentId?: string
): Promise<boolean> {
  const pending = pendingFix(thread);
  if (!pending || (commentId && pending.commentId !== commentId)) {
    return false;
  }
  // Claim the fix first so a second press (or a concurrent webhook) doesn't
  // apply it again.
  await liveblocks.editCommentMetadata({
    roomId,
    threadId: thread.id,
    commentId: pending.commentId,
    data: { metadata: { review: "accepted", fix: null }, userId: AI_USER_ID },
  });
  const summary = await applyFix(liveblocks, roomId, pending.fix);
  if (summary) {
    await liveblocks.createComment({
      roomId,
      threadId: thread.id,
      data: {
        userId: AI_USER_ID,
        body: markdownToCommentBody(`Done — ${summary}.`),
      },
    });
    await resolveThread(liveblocks, roomId, thread, "accepted");
  } else {
    await liveblocks.createComment({
      roomId,
      threadId: thread.id,
      data: {
        userId: AI_USER_ID,
        body: markdownToCommentBody(
          "I couldn't apply that fix — the cell it targeted no longer exists."
        ),
      },
    });
  }
  return true;
}

/**
 * Entry point for the "Fix it" button (POST /api/apply-fix): applies the fix
 * the reviewer saved on `commentId` when it wrote the comment. Returns whether
 * a saved fix was found and applied.
 */
export async function applyReviewFix(
  liveblocks: LiveblocksClient,
  roomId: string,
  threadId: string,
  commentId: string
): Promise<boolean> {
  const thread = await liveblocks.getThread({ roomId, threadId });
  return applySavedFix(liveblocks, roomId, thread, commentId);
}

async function resolveThread(
  liveblocks: LiveblocksClient,
  roomId: string,
  thread: ThreadData,
  status: "accepted" | "ignored"
): Promise<void> {
  await settlePendingReviews(liveblocks, roomId, thread, status);
  await liveblocks.markThreadAsResolved({
    roomId,
    threadId: thread.id,
    data: { userId: AI_USER_ID },
  });
}

// --- Trigger 1: a human edited a cell ----------------------------------------

// Serialize reviews per cell: if an edit arrives while that cell is being
// reviewed, run one more review afterwards (against the then-current value)
// instead of overlapping.
const inFlight = new Map<string, Promise<void>>();
const rerun = new Set<string>();

export type ChangedCell = CellRef & { previousValue?: string };

export async function reviewCellEdits(
  liveblocks: LiveblocksClient,
  roomId: string,
  changed: ChangedCell[]
): Promise<void> {
  if (!isReviewerEnabled()) {
    return;
  }
  // Most recent first, then cap.
  const cells = [...changed].reverse().slice(0, MAX_CELLS_PER_REQUEST);
  await Promise.all(
    cells.map((cell) => scheduleCellReview(liveblocks, roomId, cell))
  );
}

function scheduleCellReview(
  liveblocks: LiveblocksClient,
  roomId: string,
  cell: ChangedCell
): Promise<void> {
  const key = `${roomId}/${cellKey(cell.rowId, cell.colId)}`;
  const running = inFlight.get(key);
  if (running) {
    rerun.add(key);
    return running;
  }
  const run = (async () => {
    try {
      await reviewCellEdit(liveblocks, roomId, cell);
    } catch (error) {
      console.error("[jev] cell review failed", error);
    } finally {
      inFlight.delete(key);
    }
    if (rerun.delete(key)) {
      await scheduleCellReview(liveblocks, roomId, {
        rowId: cell.rowId,
        colId: cell.colId,
      });
    }
  })();
  inFlight.set(key, run);
  return run;
}

async function reviewCellEdit(
  liveblocks: LiveblocksClient,
  roomId: string,
  cell: ChangedCell
): Promise<void> {
  const jev = getClient();
  if (!jev) {
    return;
  }

  const [storage, { data: threads }] = await Promise.all([
    readStorage(liveblocks, roomId),
    liveblocks.getThreads({ roomId }),
  ]);
  const row = storage.rowIds.indexOf(cell.rowId);
  const col = storage.colIds.indexOf(cell.colId);
  if (row === -1 || col === -1) {
    return; // row/column was deleted in the meantime
  }
  const a1 = toA1(row, col);
  const value = storage.cells[cellKey(cell.rowId, cell.colId)]?.value ?? "";
  const thread = openThreadOnCell(threads, cell);

  // Clearing a cell isn't worth a review — unless a thread on it might now be
  // resolvable.
  if (!value && !thread) {
    return;
  }

  const state = buildState(
    storage,
    cell,
    cell.previousValue,
    thread,
    thread ? await describeThread(thread) : [],
    await describeOtherThreads(storage, threads, thread?.id)
  );
  const checks = CHECKS.filter((c) => c.scope === "cell" || thread !== null);
  const questions = buildQuestions(checks, thread !== null);

  const { answers } = await jev.systemOne({ state, questions });
  logAnswers(`cell edit on ${a1} (${value || "cleared"})`, answers);

  // The edit fixed what the thread was about → say so and resolve.
  const resolvable = noulOf(answers, "thread_resolvable");
  if (thread && resolvable >= FIRE_THRESHOLD) {
    const review = await writeReviewComment(
      a1,
      [
        {
          check: CHECK_BY_ID.get("thread_resolvable")!,
          probability: resolvable,
        },
      ],
      state,
      storage,
      thread
    );
    if (review) {
      // Nothing left to fix here, so the comment is posted without a fix.
      await liveblocks.createComment({
        roomId,
        threadId: thread.id,
        data: { userId: AI_USER_ID, body: markdownToCommentBody(review.text) },
      });
    }
    await resolveThread(liveblocks, roomId, thread, "accepted");
    return;
  }

  const findings = collectFindings(
    answers,
    checks.filter((c) => c.id !== "thread_resolvable"),
    thread !== null
  );
  if (findings.length === 0) {
    return;
  }

  const review = await writeReviewComment(a1, findings, state, storage, thread);
  if (review) {
    await postReview(liveblocks, roomId, cell, thread, review);
  }
}

// --- Trigger 2: a human left a comment ---------------------------------------

// Webhooks can be retried; don't review the same comment twice.
const reviewedComments = new Map<string, number>();
const REVIEWED_TTL_MS = 5 * 60 * 1000;

function alreadyReviewed(commentId: string): boolean {
  const now = Date.now();
  for (const [id, at] of reviewedComments) {
    if (now - at > REVIEWED_TTL_MS) {
      reviewedComments.delete(id);
    }
  }
  if (reviewedComments.has(commentId)) {
    return true;
  }
  reviewedComments.set(commentId, now);
  return false;
}

export async function reviewComment(
  liveblocks: LiveblocksClient,
  roomId: string,
  threadId: string,
  commentId: string
): Promise<void> {
  if (alreadyReviewed(commentId)) {
    return;
  }
  const thread = await liveblocks.getThread({ roomId, threadId });
  const trigger: CommentData | undefined = thread.comments.find(
    (c) => c.id === commentId
  );
  // Ignore deleted comments and the AI's own comments (avoids review loops).
  if (!trigger?.body || trigger.userId === AI_USER_ID) {
    return;
  }

  // An explicit @mention is an unambiguous instruction: reply directly, with
  // tools, no classification needed.
  if (mentionsAi(trigger)) {
    await replyInThread(liveblocks, roomId, thread, { tools: true });
    return;
  }

  const jev = getClient();
  if (!jev || !isReviewerEnabled()) {
    return;
  }

  const [storage, { data: threads }] = await Promise.all([
    readStorage(liveblocks, roomId),
    liveblocks.getThreads({ roomId }),
  ]);
  const cell: CellRef = thread.metadata;
  const row = storage.rowIds.indexOf(cell.rowId);
  const col = storage.colIds.indexOf(cell.colId);
  if (row === -1 || col === -1) {
    return;
  }
  const a1 = toA1(row, col);

  const state = buildState(
    storage,
    cell,
    undefined,
    thread,
    await describeThread(thread, commentId),
    await describeOtherThreads(storage, threads, thread.id)
  );
  const questions = {
    ...buildQuestions(CHECKS, true),
    latest_comment_intent: INTENT_QUESTION,
  };

  const { answers } = await jev.systemOne({ state, questions });
  logAnswers(`comment on ${a1}`, answers);

  // Route on the comment's intent when Jev is confident enough.
  const intent = answers.latest_comment_intent;
  if (intent.confidence >= FIRE_THRESHOLD) {
    switch (intent.choice) {
      case "approve_fix": {
        // "yes, go ahead" typed by hand: prefer the fix the reviewer saved
        // with its comment; only ask the LLM when there isn't one.
        if (await applySavedFix(liveblocks, roomId, thread)) {
          return;
        }
        await replyInThread(liveblocks, roomId, thread, {
          tools: true,
          instruction:
            "The user has approved the fix you recommended earlier in this thread. Apply exactly that fix now with your tools, then confirm what you changed in one sentence.",
        });
        await settlePendingReviews(liveblocks, roomId, thread, "accepted");
        return;
      }
      case "request_change": {
        await replyInThread(liveblocks, roomId, thread, {
          tools: true,
          instruction:
            "The latest comment asks for a specific change. Make it with your tools, then confirm what you changed in one sentence.",
        });
        return;
      }
      case "question_for_assistant": {
        await replyInThread(liveblocks, roomId, thread, { tools: false });
        return;
      }
      case "reject": {
        await resolveThread(liveblocks, roomId, thread, "ignored");
        return;
      }
      default:
        break; // discussion / other: fall through to the checks
    }
  }

  // Nothing to act on in the comment itself; see whether the checks found
  // anything new about the cell or the conversation.
  const findings = collectFindings(
    answers,
    CHECKS.filter((c) => c.id !== "thread_resolvable"),
    true
  );
  if (findings.length === 0) {
    return;
  }
  const review = await writeReviewComment(a1, findings, state, storage, thread);
  if (review) {
    await postReview(liveblocks, roomId, cell, thread, review);
  }
}
