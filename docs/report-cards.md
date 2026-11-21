# Report cards: design, fitting and printing

Files: `source/13-reports.js` (HTML + fit engine + print), `styles.css` (the
`Report card / print` and `Report card themes` sections). `app.js` is generated
(`npm run build`) - never edit it by hand.

## What changed
* **One A4 sheet per student.** `.report-card` is a fixed 210 x 296.6 mm box
  (`@page { size:A4 portrait; margin:0 }`). Nothing can spill onto a second page.
* **Fit engine** (`fitReportCards`): measures the real rendered sheet in the
  user's own browser and picks the largest readable font size (12.6px down to
  9.4px; a compact layout to 7.6px for ~20+ subjects). Spare height is spent on
  roomier rows and comment boxes, the rest is spread evenly between sections, so
  a 5-subject card fills the page instead of leaving the bottom empty.
  Last resort for 35+ subjects: a gentle uniform scale-down.
* **Print isolation:** the app is hidden with `display:none` (was
  `visibility:hidden`, which left the whole app laid out and produced blank
  pages); backgrounds are forced to print (`print-color-adjust:exact`, table
  headers used to print white-on-white); no separator `<div>`s between cards.
* **Preview = print:** the modal shows the true A4 sheet scaled to the window.
  Ctrl+P with a preview open prints that card on one A4 sheet.
* **Content:** admission no., form teacher, section/department, total score,
  position, attendance tiles (with absent), grading key table, rating key, grade
  colours, red below-pass-mark totals, signatures with names, school stamp,
  fees strip, footer. Nursery's single-score scheme drops the repeated score
  column and a Remark column that merely repeats the grade. Mismatched
  per-subject assessment schemes can no longer misalign columns. The
  Skills/Behaviours grid follows the school's own number of rating levels.
* The settings name of a template is no longer printed in the card title.

## Not touched
Database/state shape, template ids/names/flags, grading and ranking maths (all
numbers come from `computeStudentOverall`, `computeClassOverview`,
`getSubjectStatForStudent`), permissions and workflows.

## Themes (`template.style`, unchanged)
classic-navy, modern-teal, royal-purple, crimson-gold, corporate-slate,
elegant-serif, sunburst-orange, forest-green, minimal-mono,
double-frame-formal. Each only sets variables and decoration on the shared
structure, so a new theme is one CSS block (add it to `RC_THEMES` too).

## Testing
* `npm test` - includes `tests/reportcards.test.js` (structure, 10 templates kept).
* `npm run test:print` - real-browser check that every template, for 5-30
  subjects in all four sections, prints as exactly one A4 portrait page. Needs
  `npm i -D playwright pdf-lib && npx playwright install chromium`.

## Printing tips
Choose paper **A4**, margins **None/Default**, scale **100%**, and tick
"Background graphics" if the browser offers it (colours are also forced on).
