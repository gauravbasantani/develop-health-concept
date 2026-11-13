import { describe, expect, it } from "vitest";
import { CASE, age, durationDays, meetsRule, ruleMetOn } from "./case";
import { addMonths, daysBetween, parseUs, us, weeksText } from "./dates";
import { AGENT_Q4, checkQ4, defaultAsk, initial, notice, q4Check, reduce, step, type Action, type State } from "./state";

const run = (...actions: Action[]): State => actions.reduce(reduce, initial());

describe("dates and the numbers on the page", () => {
  it("counts 14 weeks from the copied date and 6 weeks from the real one", () => {
    expect(daysBetween(CASE.referralDate, CASE.orderDate)).toBe(98);
    expect(weeksText(durationDays(CASE.referralDate))).toBe("14 weeks");
    expect(daysBetween(CASE.trueStart, CASE.orderDate)).toBe(42);
    expect(weeksText(durationDays(CASE.trueStart))).toBe("6 weeks");
  });
  it("applies the 3-month rule by calendar month", () => {
    expect(meetsRule(CASE.referralDate)).toBe(true); // 08/04 + 3 months = 11/04, before 11/10
    expect(meetsRule(CASE.trueStart)).toBe(false);
    expect(ruleMetOn(CASE.trueStart)).toBe("2026-12-29");
    expect(addMonths("2026-11-30", 3)).toBe("2027-02-28");
  });
  it("gives her age on the review day", () => {
    expect(age).toBe(44);
  });
  it("reads and writes MM/DD/YYYY", () => {
    expect(us("2026-09-29")).toBe("09/29/2026");
    expect(parseUs("9/29/2026")).toBe("2026-09-29");
    expect(parseUs("02/30/2026")).toBeNull();
    expect(parseUs("soon")).toBeNull();
  });
  it("writes weeks and days in plain words", () => {
    expect(weeksText(1)).toBe("1 day");
    expect(weeksText(8)).toBe("1 week and 1 day");
    expect(weeksText(44)).toBe("6 weeks and 2 days");
  });
});

describe("answer 4", () => {
  it("starts as the agent filled it, which the chart does not support", () => {
    expect(AGENT_Q4).toEqual({ answer: "Yes", start: CASE.referralDate, edited: false });
    const c = q4Check(AGENT_Q4);
    expect(c.ok).toBe(false);
    expect(c.reason).toContain("referral letter");
  });
  it("is right only with the note's date and No", () => {
    expect(checkQ4("No", CASE.trueStart).ok).toBe(true);
    expect(checkQ4("Yes", CASE.trueStart)).toEqual({ ok: false, reason: "6 weeks is under 3 months, so the answer is No." });
    expect(checkQ4("No", "2026-07-01").reason).toContain("No line in her chart");
    expect(checkQ4("No", null).ok).toBe(false);
  });
});

describe("review flow", () => {
  it("opens on review with a red notice", () => {
    const s = initial();
    expect(step(s.now)).toBe("Review");
    expect(notice(s.now).tone).toBe("red");
  });
  it("submitting the wrong answer warns, and undo brings it back", () => {
    const s = run({ type: "submit" });
    expect(s.now.submitted).toBe(true);
    expect(step(s.now)).toBe("Submitted");
    expect(notice(s.now)).toMatchObject({ tone: "red" });
    const u = reduce(s, { type: "undo" });
    expect(u.now.submitted).toBe(false);
    expect(u.past).toHaveLength(0);
  });
  it("Fix answer suggests the note's date and No, editable, and saving fixes it", () => {
    let s = run({ type: "openFix" });
    expect(s.now.editing).toEqual({ answer: "No", startText: "09/29/2026" });
    s = reduce(s, { type: "draft", startText: "08/04/2026" });
    s = reduce(s, { type: "draft", startText: "09/29/2026" });
    expect(s.past).toHaveLength(1); // typing is not an undo step
    s = reduce(s, { type: "saveFix" });
    expect(s.now.q4).toEqual({ answer: "No", start: CASE.trueStart, edited: true });
    expect(notice(s.now).tone).toBe("green");
  });
  it("saving a still-wrong answer stays red and says why", () => {
    const s = run({ type: "openFix" }, { type: "draft", answer: "Yes" }, { type: "saveFix" });
    expect(q4Check(s.now.q4).ok).toBe(false);
    expect(notice(s.now).tone).toBe("red");
    expect(q4Check(s.now.q4).reason).toContain("so the answer is No");
  });
  it("Save does nothing until the date reads", () => {
    const s = run({ type: "openFix" }, { type: "draft", startText: "next week" }, { type: "saveFix" });
    expect(s.now.editing).not.toBeNull();
  });
  it("Cancel closes the field without changing the answer", () => {
    const s = run({ type: "openFix" }, { type: "draft", answer: "Yes" }, { type: "cancelFix" });
    expect(s.now.editing).toBeNull();
    expect(s.now.q4).toEqual(AGENT_Q4);
  });
  it("Ask the provider opens an editable reason, needs text, and keeps the case open", () => {
    let s = run({ type: "openAsk" });
    expect(s.now.asking).toBe(defaultAsk());
    s = reduce(s, { type: "askText", text: "   " });
    expect(reduce(s, { type: "sendAsk" }).now.asked).toBeNull();
    s = reduce(s, { type: "askText", text: "Dr. Marsh, when did she start methotrexate?" });
    s = reduce(s, { type: "sendAsk" });
    expect(s.now.asked).toBe("Dr. Marsh, when did she start methotrexate?");
    expect(s.now.submitted).toBe(false);
    expect(step(s.now)).toBe("Review");
    expect(notice(s.now).tone).toBe("green");
  });
  it("the default reason states the dates the page shows", () => {
    const t = defaultAsk();
    for (const d of ["08/04/2026", "11/10/2026", "09/29/2026", "12/29/2026"]) expect(t).toContain(d);
  });
  it("submitting after the fix is green", () => {
    const s = run({ type: "openFix" }, { type: "saveFix" }, { type: "submit" });
    expect(notice(s.now)).toMatchObject({ tone: "green" });
  });
  it("undo walks back each step and start over clears everything", () => {
    let s = run({ type: "openFix" }, { type: "saveFix" }, { type: "openAsk" }, { type: "sendAsk" });
    expect(s.past).toHaveLength(4);
    s = reduce(s, { type: "undo" });
    expect(s.now.asking).not.toBeNull();
    s = reduce(s, { type: "reset" });
    expect(s).toEqual(initial());
  });
  it("cannot fix or ask after submitting", () => {
    const s = run({ type: "submit" }, { type: "openFix" }, { type: "openAsk" });
    expect(s.now.editing).toBeNull();
    expect(s.now.asking).toBeNull();
  });
});

describe("notice while asking", () => {
  it("is green when answer 4 is already fixed", () => {
    const s = run({ type: "openFix" }, { type: "saveFix" }, { type: "openAsk" });
    expect(notice(s.now).tone).toBe("green");
  });
  it("is red when answer 4 is still the copied date", () => {
    expect(notice(run({ type: "openAsk" }).now).tone).toBe("red");
  });
});
