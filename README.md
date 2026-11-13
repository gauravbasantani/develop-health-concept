# Prior auth review: a design concept for Develop Health (unofficial)

Live: https://gauravbasantani.github.io/develop-health-concept/ · Walkthrough: [walkthrough.mp4](public/walkthrough.mp4) (44 seconds, no sound)

I designed it and directed Claude Code, which wrote the code.

## What it shows

An agent filled a prior authorization for a made-up patient with rheumatoid arthritis who needs adalimumab. Each answer shows the chart line it came from. Answer 4 ("tried one conventional DMARD for at least 3 months?") says Yes, and it matches the line it cites: the med list's start date. But that date was copied from a referral letter, where methotrexate was only planned. The same visit note says she started 6 weeks ago. The agent read its line right; the input was wrong.

A clinic's PA coordinator can:

- **Submit** (with the wrong answer you get a heads-up and Undo)
- **Fix answer** (the field opens with the note's lines beside it; date and Yes/No are editable, and the weeks update as you type)
- **Ask the provider** (an editable reason; the case stays open in Review)
- **Undo** any step and **Start over**

## Made-up data

The patient, clinic, plan, doctor and coordinator are made up. The plan rule is modeled on a published commercial prior authorization policy. This is not Develop Health's product, not affiliated with it, and not medical or coverage advice.

## Run it

```
npm install
npm run dev      # local preview
npm test         # Vitest: the review state and the date math
npm run build    # static site in dist/
```

The state logic (submit, fix, ask, undo, start over, and the 3-month rule) lives in `src/state.ts` and `src/case.ts`, with tests in `src/state.test.ts`. Every number on the page is computed from four dates in `src/case.ts`.

Pushing to `main` runs the tests and publishes `dist/` to GitHub Pages (`.github/workflows/pages.yml`).
