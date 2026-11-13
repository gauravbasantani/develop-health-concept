// One made-up prior authorization. Every number on the page is computed from
// the dates below, so nothing can disagree with the chart it cites.
import { addMonths, ageOn, daysBetween, us, weeksText } from "./dates";

export const CASE = {
  patient: "Rosa Delgado",
  birth: "1982-03-14",
  plan: "Northfield Health Plan",
  clinic: "Bayview Rheumatology",
  doctor: "Dr. Lena Marsh",
  doctorFull: "Lena Marsh, MD",
  reviewer: "Tasha Reyes",
  drug: "Adalimumab 40 mg every other week",
  diagnosis: "Rheumatoid arthritis",
  icd: "M06.9",
  /** The visit where the drug was ordered; durations are counted up to here. */
  orderDate: "2026-11-10",
  /** The day the agent prepared the PA and the coordinator reviews it. */
  reviewDate: "2026-11-12",
  /** The referral letter's date. The med list copied it as a start date. */
  referralDate: "2026-08-04",
  /** The day she actually started methotrexate (the visit note). */
  trueStart: "2026-09-29",
  ruleMonths: 3,
} as const;

export function durationDays(startIso: string): number {
  return daysBetween(startIso, CASE.orderDate);
}

/** The plan's rule: at least 3 months by the order date. */
export function meetsRule(startIso: string): boolean {
  return addMonths(startIso, CASE.ruleMonths) <= CASE.orderDate;
}

/** The first day the rule is met, counting from a start date. */
export function ruleMetOn(startIso: string): string {
  return addMonths(startIso, CASE.ruleMonths);
}

export const age = ageOn(CASE.birth, CASE.reviewDate);

export interface Source {
  doc: string;
  line: string;
}

export interface Answer {
  n: number;
  question: string;
  value: string;
  sources: Source[];
}

const visitNote = `Visit note · ${us(CASE.orderDate)}`;

export const METHO_LIST_LINE = `Medications: methotrexate 15 mg once a week, start date ${us(CASE.referralDate)}`;
export const METHO_HISTORY_LINE = `History: started methotrexate 15 mg once a week at her first visit here, ${us(
  CASE.trueStart,
)} (${weeksText(durationDays(CASE.trueStart))} ago).`;

/** The answers that match their source; answer 4 lives in state. */
export const OTHER_ANSWERS: Answer[] = [
  {
    n: 1,
    question: "Diagnosis",
    value: `${CASE.diagnosis} (${CASE.icd})`,
    sources: [{ doc: visitNote, line: `Assessment: rheumatoid arthritis (${CASE.icd}), active in both hands.` }],
  },
  {
    n: 2,
    question: "Is the patient 18 or older?",
    value: `Yes · age ${age}`,
    sources: [{ doc: "Patient record", line: `Date of birth ${us(CASE.birth)}` }],
  },
  {
    n: 3,
    question: "Prescribed by or with a rheumatologist?",
    value: "Yes",
    sources: [{ doc: `Order · ${us(CASE.orderDate)}`, line: `Ordered by ${CASE.doctorFull}, Rheumatology.` }],
  },
  {
    n: 5,
    question: "Has she had 3 months of another biologic?",
    value: "No",
    sources: [{ doc: visitNote, line: "History: no biologic drugs before." }],
  },
];

export const Q4 = {
  n: 4,
  question: "Has she tried one conventional DMARD for at least 3 months?",
  doc: visitNote,
};
