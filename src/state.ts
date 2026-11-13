// Review state for one prior authorization. Pure functions only, so every
// step (submit, fix, ask, undo, start over) is tested without a browser.
import { CASE, durationDays, meetsRule, ruleMetOn } from "./case";
import { parseUs, us, weeksText } from "./dates";

export type YesNo = "Yes" | "No";

export interface Q4 {
  answer: YesNo;
  start: string; // ISO
  edited: boolean;
}

export interface Draft {
  answer: YesNo;
  startText: string; // what the person typed, "09/29/2026"
}

export interface Snapshot {
  q4: Q4;
  submitted: boolean;
  editing: Draft | null;
  asking: string | null; // the reason being written
  asked: string | null; // the reason that was sent
}

export interface State {
  now: Snapshot;
  past: Snapshot[];
}

export type Action =
  | { type: "submit" }
  | { type: "undo" }
  | { type: "reset" }
  | { type: "openFix" }
  | { type: "draft"; answer?: YesNo; startText?: string }
  | { type: "saveFix" }
  | { type: "cancelFix" }
  | { type: "openAsk" }
  | { type: "askText"; text: string }
  | { type: "sendAsk" }
  | { type: "cancelAsk" };

/** What the agent filled in: the start date the med list carried over from the referral letter. */
export const AGENT_Q4: Q4 = { answer: "Yes", start: CASE.referralDate, edited: false };

export const FIRST: Snapshot = { q4: AGENT_Q4, submitted: false, editing: null, asking: null, asked: null };

export function initial(): State {
  return { now: FIRST, past: [] };
}

export interface Check {
  ok: boolean;
  /** Plain words for why it is wrong; empty when ok. */
  reason: string;
}

/** Is answer 4 what her chart supports? Start date must be the visit note's, and Yes/No must follow the 3-month rule. */
export function checkQ4(answer: YesNo, startIso: string | null): Check {
  if (!startIso) return { ok: false, reason: "Enter the start date as MM/DD/YYYY." };
  if (startIso === CASE.referralDate)
    return {
      ok: false,
      reason: `${us(CASE.referralDate)} is the referral letter's date, copied into the med list. The visit note says she started ${us(CASE.trueStart)}.`,
    };
  if (startIso !== CASE.trueStart)
    return { ok: false, reason: `No line in her chart says ${us(startIso)}. The visit note says ${us(CASE.trueStart)}.` };
  const expected: YesNo = meetsRule(startIso) ? "Yes" : "No";
  if (answer !== expected)
    return {
      ok: false,
      reason: `${weeksText(durationDays(startIso))} is ${expected === "No" ? "under" : "at least"} 3 months, so the answer is ${expected}.`,
    };
  return { ok: true, reason: "" };
}

export function q4Check(q4: Q4): Check {
  return checkQ4(q4.answer, q4.start);
}

export function draftCheck(d: Draft): Check {
  return checkQ4(d.answer, parseUs(d.startText));
}

export function defaultAsk(): string {
  return (
    `${CASE.doctor}: the med list says methotrexate since ${us(CASE.referralDate)}, a date copied from the referral letter. ` +
    `Your ${us(CASE.orderDate)} note says she started on ${us(CASE.trueStart)}. ` +
    `The plan asks for 3 months of one DMARD, which she reaches on ${us(ruleMetOn(CASE.trueStart))}. Submit now, or wait until then?`
  );
}

function push(s: State, next: Snapshot): State {
  return { now: next, past: [...s.past, s.now] };
}

export function reduce(s: State, a: Action): State {
  const n = s.now;
  switch (a.type) {
    case "undo":
      return s.past.length ? { now: s.past[s.past.length - 1], past: s.past.slice(0, -1) } : s;
    case "reset":
      return initial();
    case "submit":
      if (n.submitted) return s;
      return push(s, { ...n, submitted: true, editing: null, asking: null });
    case "openFix":
      if (n.submitted || n.editing) return s;
      // Suggest the visit note's date and the answer that date gives; the person can change both.
      return push(s, {
        ...n,
        asking: null,
        editing: { answer: meetsRule(CASE.trueStart) ? "Yes" : "No", startText: us(CASE.trueStart) },
      });
    case "draft":
      if (!n.editing) return s;
      return {
        ...s,
        now: {
          ...n,
          editing: {
            answer: a.answer ?? n.editing.answer,
            startText: a.startText ?? n.editing.startText,
          },
        },
      };
    case "saveFix": {
      if (!n.editing) return s;
      const start = parseUs(n.editing.startText);
      if (!start) return s; // Save is disabled until the date reads
      return push(s, { ...n, editing: null, q4: { answer: n.editing.answer, start, edited: true } });
    }
    case "cancelFix":
      return n.editing ? push(s, { ...n, editing: null }) : s;
    case "openAsk":
      if (n.submitted || n.asking !== null) return s;
      return push(s, { ...n, editing: null, asking: n.asked ?? defaultAsk() });
    case "askText":
      return n.asking === null ? s : { ...s, now: { ...n, asking: a.text } };
    case "sendAsk":
      if (n.asking === null || !n.asking.trim()) return s;
      return push(s, { ...n, asked: n.asking.trim(), asking: null });
    case "cancelAsk":
      return n.asking !== null ? push(s, { ...n, asking: null }) : s;
  }
}

export type Tone = "red" | "green";

/** The one "what to notice" line outside the frame. Red while answer 4 is wrong, green once it is fixed or handed to the doctor. */
export function notice(n: Snapshot): { tone: Tone; text: string } {
  const ok = q4Check(n.q4).ok;
  if (n.submitted)
    return ok
      ? { tone: "green", text: "Submitted, and every answer matches its chart line." }
      : { tone: "red", text: "Submitted with answer 4 still saying Yes. Her chart doesn't back it: undo, then fix it first." };
  if (n.editing) return { tone: "red", text: "Until you save, answer 4 is still the copied date. The note's own line sits beside the field." };
  if (n.asking !== null)
    return ok
      ? { tone: "green", text: `Fixed. Now ask ${CASE.doctor} whether to send it now; the case stays open while you wait.` }
      : { tone: "red", text: "Answer 4 is still unresolved. Say what you need; the case stays open while you wait." };
  if (ok && n.asked) return { tone: "green", text: `Fixed and asked: answer 4 matches the note, and ${CASE.doctor} decides whether to send now or wait.` };
  if (ok) return { tone: "green", text: "Fixed: answer 4 now matches the visit note. Nothing has gone to the plan yet." };
  if (n.asked) return { tone: "green", text: `Asked ${CASE.doctor}. The case stays in Review; nothing went to the plan.` };
  if (n.q4.edited) return { tone: "red", text: "Saved, but answer 4 still doesn't match her chart. The red line under it says why." };
  return {
    tone: "red",
    text: "Answer 4 looks right and cites its line, but the same note says otherwise.",
  };
}

/** Where the case sits in the real product's steps. */
export function step(n: Snapshot): "Review" | "Submitted" {
  return n.submitted ? "Submitted" : "Review";
}
