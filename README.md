# AOK9 Race Secretary

Offline web app that runs an official **R.A.C.E. AOK9 Sprint Racing** meet per Rule Book v3.0:
entries → divisions → three programs of racing (draws, post positions, results) → final standings,
championship points and the official NRD report.

## Running it

```
npm install        # first time only
npm run dev        # development server at http://localhost:5173
```

For the field laptop, build once and keep the `dist/` folder:

```
npm run build
npm run preview    # serves dist/ at http://localhost:4173
```

Everything runs in the browser — no internet needed. The meet is **autosaved to the browser's
local storage after every change**; closing the laptop or losing power does not lose the meet.
The home page shows which meet is loaded (club, meet ID, entries, programs run) with *Save Meet to
File / Open Meet from File* buttons for an extra on-disk copy you can reopen on any machine, and a
*Load sample meet* button that fills the app with a finished demo meet to explore.

## Workflow (matches the rule book)

1. **Setup** — club, meet ID, date. Upload a newer official Grading Guide xlsx at any time
   (the current guide is bundled). The ungraded threshold defaults to ¾ FTE per rule 4.4.
2. **Entries** — search the guide by call name / reg# / breed / owner and enter with one click
   (WAVEs, grades and championship titles come along). Add FTE dogs with the form
   (initial grade D, or C/B per 4.3.1.3). Record each dog's sex for High Score Opposite Sex.
3. **Divisions** — *Auto-suggest* builds breed divisions (2+ same breed; mix types are their own
   "breed") and pools the rest as mixed. Move dogs between divisions, mark a dog **L**(eftover)
   in a breed division (competes for MRC only, per 4.1.7), or flip a division to ungraded.
4. **Program 1** — draw per Figure 8.1 (graded: WAVE order; ungraded: random). Review, swap dogs
   (click two) if the committee adjusts groups, redraw posts, then **Lock** and print the program
   sheet. Enter each race's result with the big buttons: places 1–4 (tap the same place on two
   dogs for a dead heat), OC, DNF, DQ, SCR. A DQ'd dog is left out of the placements — place the
   others as if it had not run (6.1.3).
5. **Programs 2–3** — one click regroups by points per 4.3.4 with every tie decision explained
   on screen (audit trail for protests), new random posts.
6. **Results** — final standings per 4.3.5, trophies (5.1), BRC/MRC/National/TRC points
   (Chapter V) with the full calculation shown, projected new WAVEs. Championship point cells
   are editable if the secretary needs to override a corner case.
7. **Report** — *Export NRD report (.xlsx)* produces the official template layout
   (Summary + race-by-race + an unofficial WAVE-projection sheet) for emailing to the NRD
   within 48 hours (2.2). Print buttons produce paddock-ready program sheets and results.

## Updating the bundled Grading Guide

```
npm run convert-guide -- "C:\path\to\new grading guide.xlsx"
npm run build
```

(or just upload the xlsx in the app's Setup screen — no rebuild needed).

## Rule interpretations encoded

- **Figure 8.1 is encoded verbatim**, including its odd rows (9 dogs → 4/2/3; 5 dogs → 3-dog HP).
- Ungraded trigger is **¾ FTE** per rule 4.4 (a 2/3 option exists in Setup).
- Award slots: titled champions above the line don't consume High-Score slots (per the 5.2/5.7
  worked examples); ordinary ineligible dogs do. Dogs tied on race points split award values.
- A leftover dog's MRC award corresponds to its actual placement among the whole division.
- Dogs running alone: single non-HP race, no championship points, WAVE unchanged (4.2.2.4).

## Tests

`npm test` — 44 unit tests covering Figure 8.1 (all rows), points tables 8.2A/8.2B, dead-heat
splitting, DQ redistribution, WAVE formulas, rotation tie chain, and every worked example in the
rule book (TRC examples 5.7 #1–2, the eligible-entry example in 5.2), plus a report-export test
against a full meet captured from the real UI.
