import { useEffect, useReducer, useRef, type ReactNode } from "react";
import { CASE, METHO_HISTORY_LINE, METHO_LIST_LINE, OTHER_ANSWERS, Q4 as Q4INFO, durationDays, ruleMetOn, type Answer } from "./case";
import { parseUs, us, weeksText } from "./dates";
import { draftCheck, initial, notice, q4Check, reduce, step, type Snapshot, type YesNo } from "./state";

/** Length of walkthrough.mp4, written after recording it. */
const WALKTHROUGH_SECONDS = 44;

export default function App() {
  const [state, dispatch] = useReducer(reduce, undefined, initial);
  const n = state.now;
  const note = notice(n);
  const canUndo = state.past.length > 0;

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-10 pt-5 sm:px-6 sm:pt-8">
      <div className="flex items-center justify-between gap-3">
        <p className="page-muted text-[12px] sm:text-[13px]">
          <span className="hidden sm:inline">Design concept for </span>
          <span className="sm:hidden">Concept for </span>Develop Health · unofficial · made-up data
        </p>
        <div className="hidden shrink-0 gap-2 sm:flex">
          <PageButton onClick={() => dispatch({ type: "undo" })} disabled={!canUndo} data-undo>Undo</PageButton>
          <PageButton onClick={() => { dispatch({ type: "reset" }); window.scrollTo(0, 0); }} disabled={!canUndo && state.now === initial().now} data-reset>Start over</PageButton>
        </div>
      </div>
      <h1 className="mt-1 text-[21px] font-semibold leading-tight tracking-[-0.01em] sm:text-[28px]">
        One answer matches its chart line, and the line is wrong.
      </h1>
      <p className="page-muted mt-1 hidden text-[15px] leading-snug sm:block">
        The agent filled a prior authorization from a made-up patient's chart. {CASE.reviewer}, the clinic's PA coordinator, checks it before it goes to the plan.
      </p>

      <p aria-live="polite" data-notice={note.tone} className={`mt-2 flex items-start gap-2 text-[14px] font-medium leading-snug sm:mt-3 ${note.tone === "red" ? "notice-red" : "notice-green"}`}>
        <span aria-hidden className="mt-[6px] inline-block h-2 w-2 shrink-0 rounded-full bg-current" />
        <span>What to notice: {note.text}</span>
      </p>

      <Window n={n} dispatch={dispatch} />
      <div className="mt-3 flex gap-2 sm:hidden">
        <PageButton onClick={() => dispatch({ type: "undo" })} disabled={!canUndo} data-undo-m>Undo</PageButton>
        <PageButton onClick={() => { dispatch({ type: "reset" }); window.scrollTo(0, 0); }} disabled={!canUndo && state.now === initial().now} data-reset-m>Start over</PageButton>
      </div>

      <footer className="page-muted mt-5 space-y-1 text-[13px] leading-relaxed">
        <p>Made-up data · unofficial · Not medical or coverage advice. The patient, clinic, plan and people are made up; the plan rule is modeled on a published commercial PA policy.</p>
        <p>
          Gaurav Basantani · I designed it and directed Claude Code, which wrote the code. ·{" "}
          <a className="underline underline-offset-2" href="walkthrough.mp4">Watch the {WALKTHROUGH_SECONDS}-second walkthrough</a>
        </p>
      </footer>
    </div>
  );
}

type Dispatch = (a: Parameters<typeof reduce>[1]) => void;

function PageButton(props: { onClick: () => void; disabled?: boolean; children: ReactNode; [k: `data-${string}`]: unknown }) {
  const { children, ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      className="rounded-md border border-current/25 px-2.5 py-1 text-[13px] font-medium disabled:opacity-40"
      style={{ color: "var(--page-ink)" }}
    >
      {children}
    </button>
  );
}

function Window({ n, dispatch }: { n: Snapshot; dispatch: Dispatch }) {
  const check = q4Check(n.q4);
  return (
    <section aria-label="Prior authorization review (concept)" className="window mt-2.5 flex sm:mt-3 overflow-hidden rounded-2xl border border-line bg-canvas text-ink shadow-[0_1px_2px_rgba(11,32,60,.06)]">
      <Rail />
      <div className="min-w-0 flex-1 p-2.5 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[19px] font-normal leading-tight text-navy sm:text-[28px]">Prior Authorization</h2>
            <p className="mt-1 text-[13px] leading-snug text-muted">
              <span className="hidden sm:inline">{CASE.patient} · {CASE.drug} · {CASE.plan} · {CASE.clinic}</span>
              <span className="sm:hidden">Adalimumab for {CASE.patient} · {CASE.reviewer} reviewing</span>
            </p>
          </div>
          <button
            type="button"
            data-submit
            disabled={n.submitted}
            onClick={() => dispatch({ type: "submit" })}
            className="shrink-0 rounded-md bg-blue px-4 py-2 text-[14px] font-medium text-white disabled:bg-[#b9c3cd]"
          >
            Submit
          </button>
        </div>
        <Steps current={step(n)} />

        {n.submitted && <Submitted ok={check.ok} dispatch={dispatch} />}

        <div className="mt-2.5 grid gap-3 sm:mt-3 lg:grid-cols-[1.45fr_1fr]">
          <Q4Card n={n} dispatch={dispatch} />
          <div>
            <p className="mb-2 px-1 text-[12px] font-medium text-muted">Other answers, each matching its chart line</p>
            <ul className="space-y-2">
              {OTHER_ANSWERS.map((a) => (
                <OtherAnswer key={a.n} a={a} />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Decorative icon rail like the real app's; flat grey so it reads as quiet, not clickable. */
function Rail() {
  return (
    <div aria-hidden className="hidden w-14 shrink-0 flex-col items-center gap-5 border-r border-line bg-white py-4 md:flex">
      <span className="h-6 w-6 rounded-[6px] bg-[#c9d1da]" />
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="h-4 w-4 rounded-[4px] border-[1.5px] border-[#c3cad2]" />
      ))}
    </div>
  );
}

function Steps({ current }: { current: "Review" | "Submitted" }) {
  const steps = ["Processing", "Review", "Submitted", "Completed"] as const;
  const at = steps.indexOf(current);
  return (
    <ol aria-label="Steps" className="mt-2 hidden flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-muted sm:mt-3 sm:flex sm:gap-x-2">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-1.5 sm:gap-2" aria-current={i === at ? "step" : undefined}>
          <span
            className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
              i < at ? "bg-navy text-white" : i === at ? "border-2 border-navy" : "border border-[#c3cad2]"
            }`}
          >
            {i < at ? "✓" : ""}
          </span>
          <span className={i === at ? "font-medium text-navy" : ""}>{s}</span>
          {i < steps.length - 1 && <span aria-hidden className="h-px w-2 bg-[#c3cad2] sm:w-8" />}
        </li>
      ))}
    </ol>
  );
}

function Submitted({ ok, dispatch }: { ok: boolean; dispatch: Dispatch }) {
  return (
    <div
      role="status"
      data-headsup={ok ? "ok" : "wrong"}
      className={`mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 ${ok ? "bg-white ring-1 ring-line" : "bg-red-soft"}`}
    >
      <div className="min-w-0 basis-[240px] flex-1">
        <p className={`text-[15px] font-medium ${ok ? "text-navy" : "text-red"}`}>Sent to {CASE.plan}</p>
        <p className={`text-[13px] leading-snug ${ok ? "text-muted" : "text-[#7a1d14]"}`}>
          {ok
            ? "Every answer went with the chart line it came from."
            : "Answer 4 went as Yes, and the visit note sent with it says otherwise."}
        </p>
      </div>
      <button
        type="button"
        data-undo-banner
        onClick={() => dispatch({ type: "undo" })}
        className={`rounded-md px-4 py-2 text-[14px] font-medium ${ok ? "border border-line bg-white text-navy" : "bg-red text-white"}`}
      >
        Undo
      </button>
    </div>
  );
}

function Toggle({ value, onChange }: { value: YesNo; onChange?: (v: YesNo) => void }) {
  return (
    <div role={onChange ? "radiogroup" : undefined} aria-label="Answer" className="inline-flex shrink-0 rounded-full bg-[#e9ecef] p-[3px] text-[13px]">
      {(["No", "Yes"] as const).map((v) => {
        const on = v === value;
        const cls = `rounded-full px-3 py-[3px] ${on ? "bg-blue font-medium text-white" : "text-muted"}`;
        return onChange ? (
          <button key={v} type="button" role="radio" aria-checked={on} data-pick={v} onClick={() => onChange(v)} className={cls}>
            {v}
          </button>
        ) : (
          <span key={v} className={cls}>
            {v}
          </span>
        );
      })}
    </div>
  );
}

function SourceBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg bg-green-soft px-2.5 py-2 sm:px-3">
      <div className="border-l-2 border-green-line pl-2.5 sm:pl-3">
        <p className="text-[12px] font-medium text-green">{title}</p>
        <div className="mt-1 space-y-1.5 text-[13px] leading-snug text-[#24452a]">{children}</div>
      </div>
    </div>
  );
}

function Line({ text, tag, mark }: { text: string; tag: string; mark?: "red" | "green" }) {
  const markCls = mark === "red" ? "decoration-red" : mark === "green" ? "decoration-green" : "decoration-transparent";
  return (
    <p data-line={tag}>
      <span className={`underline decoration-2 underline-offset-[3px] ${markCls}`}>{text}</span>{" "}
      <span className="whitespace-nowrap text-[11px] font-medium text-muted">({tag})</span>
    </p>
  );
}

function Q4Card({ n, dispatch }: { n: Snapshot; dispatch: Dispatch }) {
  const check = q4Check(n.q4);
  const days = durationDays(n.q4.start);
  const fromCopy = n.q4.start === CASE.referralDate;
  const metOn = us(ruleMetOn(CASE.trueStart));
  return (
    <article data-q4 className={`rounded-xl bg-white p-2.5 ring-1 sm:p-4 ${check.ok ? "ring-line" : "ring-red/40"}`}>
      {n.asked && <p className="mb-1"><span data-chip className="rounded-full bg-[#eef0f3] px-2 py-[2px] text-[12px] text-muted">Waiting on {CASE.doctor}</span></p>}
      <h3 className="text-[15px] font-medium leading-snug text-navy">
        <span className="font-normal text-muted">{Q4INFO.n} · </span>
        {Q4INFO.question}
      </h3>

      {n.editing ? (
        <Editor n={n} dispatch={dispatch} />
      ) : (
        <>
          <div className="mt-2 flex items-start gap-3">
            <Toggle value={n.q4.answer} />
            <p data-answer className="pt-[2px] text-[14px] leading-snug">
              Since {us(n.q4.start)}: {weeksText(days)} by {us(CASE.orderDate)}.
            </p>
          </div>
          <div className="mt-2">
            <SourceBlock title={Q4INFO.doc}>
              {fromCopy ? (
                <>
                  <Line text={METHO_LIST_LINE} tag="cited" mark="red" />
                  <Line text={METHO_HISTORY_LINE} tag="same note" mark="green" />
                </>
              ) : (
                <Line text={METHO_HISTORY_LINE} tag="cited" mark={check.ok ? "green" : undefined} />
              )}
            </SourceBlock>
          </div>
          {!check.ok && (
            <p data-why className="mt-2 text-[13px] leading-snug text-red">
              {fromCopy
                ? "The agent read its line right; the line is wrong. That date is the referral letter's, where methotrexate was planned, not started."
                : check.reason}
            </p>
          )}
        </>
      )}

      <p data-rule className="mt-2 rounded-lg bg-[#f4f6f8] px-2.5 py-2 sm:px-3 text-[13px] leading-snug text-ink">
        <span className="font-medium">Plan rule:</span> 3 months of one conventional DMARD (a standard RA drug), or 3 months of another biologic.{" "}
        <span data-lesson4>
          Nothing else rescues it: methotrexate is her only DMARD, answer 5 says no biologic, and from the note's date she reaches 3 months on {metOn}.
        </span>
      </p>

      {n.asking !== null && <AskBox text={n.asking} dispatch={dispatch} />}
      {n.asked && n.asking === null && (
        <div data-asked className="mt-2 rounded-lg border border-line px-3 py-2 text-[13px] leading-snug">
          <p className="text-[12px] font-medium text-muted">
            Asked {CASE.doctor} · {us(CASE.reviewDate)}
          </p>
          <p className="mt-0.5 whitespace-pre-wrap">{n.asked}</p>
        </div>
      )}

      {!n.editing && n.asking === null && (
        <div className="mt-2.5 flex flex-wrap gap-2 sm:mt-3">
          <ActionButton onClick={() => dispatch({ type: "openFix" })} disabled={n.submitted} data-fix>
            Fix answer
          </ActionButton>
          <ActionButton onClick={() => dispatch({ type: "openAsk" })} disabled={n.submitted} data-ask>
            Ask the provider
          </ActionButton>
        </div>
      )}
    </article>
  );
}

function ActionButton(props: { onClick: () => void; disabled?: boolean; children: ReactNode; primary?: boolean; [k: `data-${string}`]: unknown }) {
  const { children, primary, ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      className={`rounded-md px-3.5 py-2 text-[14px] font-medium disabled:opacity-40 ${
        primary ? "bg-blue text-white disabled:bg-[#b9c3cd] disabled:opacity-100" : "border border-[#cfd5db] bg-white text-navy"
      }`}
    >
      {children}
    </button>
  );
}

function Editor({ n, dispatch }: { n: Snapshot; dispatch: Dispatch }) {
  const d = n.editing!;
  const start = parseUs(d.startText);
  const check = draftCheck(d);
  const ref = useReveal<HTMLDivElement>();
  return (
    <div data-editor ref={ref} className="mt-2 grid scroll-mb-4 gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-muted">Answer</span>
          <Toggle value={d.answer} onChange={(v) => dispatch({ type: "draft", answer: v })} />
        </div>
        <label className="block text-[13px] text-muted">
          Started methotrexate on
          <input
            data-start
            value={d.startText}
            inputMode="numeric"
            onChange={(e) => dispatch({ type: "draft", startText: e.target.value })}
            className="mt-1 block w-full rounded-md border border-[#cfd5db] bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-blue"
          />
        </label>
        <p data-live className="text-[13px] text-ink">
          {start ? `${weeksText(durationDays(start))} by ${us(CASE.orderDate)}` : "MM/DD/YYYY"}
        </p>
        {!check.ok && start && (
          <p data-draft-why className="text-[13px] leading-snug text-red">
            {check.reason}
          </p>
        )}
        <div className="flex gap-2">
          <ActionButton primary disabled={!start} onClick={() => dispatch({ type: "saveFix" })} data-save>
            Save
          </ActionButton>
          <ActionButton onClick={() => dispatch({ type: "cancelFix" })} data-cancel>
            Cancel
          </ActionButton>
        </div>
      </div>
      <SourceBlock title={Q4INFO.doc}>
        <Line text={METHO_HISTORY_LINE} tag="what she started" mark="green" />
        <Line text={METHO_LIST_LINE} tag="copied from the referral letter" mark="red" />
      </SourceBlock>
    </div>
  );
}

/** Brings a just-opened box into view, so on a phone the field isn't hidden below the fold. */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest" });
  }, []);
  return ref;
}

function AskBox({ text, dispatch }: { text: string; dispatch: Dispatch }) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div data-askbox ref={ref} className="mt-2 scroll-mb-4">
      <label className="block text-[13px] text-muted">
        Ask {CASE.doctor} (the case stays open)
        <textarea
          data-reason
          value={text}
          rows={4}
          onChange={(e) => dispatch({ type: "askText", text: e.target.value })}
          className="mt-1 block w-full rounded-md border border-[#cfd5db] bg-white px-3 py-2 text-[14px] leading-snug text-ink outline-none focus:border-blue"
        />
      </label>
      <div className="mt-2 flex gap-2">
        <ActionButton primary disabled={!text.trim()} onClick={() => dispatch({ type: "sendAsk" })} data-send>
          Send
        </ActionButton>
        <ActionButton onClick={() => dispatch({ type: "cancelAsk" })} data-cancel-ask>
          Cancel
        </ActionButton>
      </div>
    </div>
  );
}

function OtherAnswer({ a }: { a: Answer }) {
  return (
    <li className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-line">
      <p className="text-[12px] text-muted">
        {a.n} · {a.question}
      </p>
      <p className="text-[14px] font-medium text-navy">{a.value}</p>
      {a.sources.map((s) => (
        <p key={s.doc + s.line} className="mt-0.5 text-[12px] leading-snug text-muted">
          <span className="font-medium">{s.doc}:</span> “{s.line}”
        </p>
      ))}
    </li>
  );
}
