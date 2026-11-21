# UI design system (premium layer)

Everything lives in `styles.css` (top ~480 lines, "Design tokens" onward). It is
**visual only**: class names, markup and behaviour are unchanged. The report-card
and print sections further down are separate and must not depend on these tokens.

## Tokens (`:root`)
* Midnight/navy: `--midnight-950/900`, `--navy-800/700/600`
* Royal blue: `--royal-700…400`, `--royal-100/50`
* Gold: `--gold-200…600`, `--gold-gradient`
* Neutrals: `--bg`, `--surface(-2/-3)`, `--line(-strong)`, `--text(-soft/-muted)`
* Status: `--success/-bg`, `--warning/-bg`, `--danger/-bg`
* Depth: `--shadow-xs/sm/md/lg`, `--ring` (focus), `--ease`
* Legacy names (`--navy`, `--teal`, `--card`, `--border` …) are aliases, kept so
  older rules and inline styles still resolve.

## Components
Top bar (glass), sidebar (midnight panel, gold active marker, icon chips, mobile
drawer with scrim), floating mobile nav, cards, stat cards (layered/3D slab, tone
variants `tone-warn|good|info`), tables (`.data-table` inside `.table-wrap`),
forms (all native inputs/selects share one look via zero-specificity `:where()`),
buttons, tabs, chips/status badges, banners, bar charts, modals (blur overlay,
bottom-sheet on phones), dropdown, login, toast (colours in `toast()` in
`source/02-state.js`).

## Responsive breakpoints
1100px (tablet), 880px (mobile shell), 700px (single-column forms), 560px
(small phones). Inputs are 16px on phones so iOS does not zoom on focus.
`prefers-reduced-motion` disables animations.

## Changing the look
Edit the tokens first (e.g. swap the gold or royal blue); components follow.
