# Brag Plan: Kayd — v2 (real app captures)

## What is this app?
Kayd is a multi-tenant SaaS that runs a hawala / remittance head office — daily rates, agent settlements, and end-of-day reconciliation that catches cash discrepancies before sign-off.

## The angle
Hawala moved money on trust and paper for 1,200 years. Kayd gives the head office one screen for its cash position, live agent balances, rate-applied deposits, and a reconciliation step that refuses to close the day while £40 is unexplained. The film shows the *real product* doing each of those, with one USP line per screen.

## Hook (first 3 seconds)
Kayd logo on cream, then: **"Money that moved on trust for 1,200 years."** / *Now the day closes on time.*

## Key moments (one per real screen, gold ring on the USP element)
1. **Dashboard** — "Your whole cash position. One screen." Ring: Total Agent Debt card (£18,533.33).
2. **Agents** — "Every agent's balance, live." Ring: Total Outstanding $27,800 / Agents Settled Today.
3. **Record Agent Deposit** — "Today's rate, applied automatically." Ring: Live preview (£5,000 → $7,500, remaining $7,700).
4. **End of Day** — "Discrepancies caught before sign-off." Ring: **Discrepancy of £40.00 detected** banner.

## Outro
Logo + **"The ledger that closes itself."** + kayd.live

## User flow worth showing
Dashboard → Agents → Record deposit (live preview) → End of Day reconciliation. All four scenes are the working app.

## Source material & data note
- Screens are DOM+CSS snapshots of the running app (`brag-output/composition/captures/`), rendered natively by Hyperframes at 1920×1080 — no scaled screenshots.
- Dummy data is the org's seeded data. Sanitised for public use: bank sort code/account masked, "Dahabshiil Express" (a real company) → fictional "Sahan Express", logo swapped for the local asset.
- End of Day figures are illustrative: the dummy org has no opening balance (expected closing was −£18,533.33), so the summary uses opening £30,000 + collections £2,500 − agent debt £18,533.33 = £13,966.67, counted £13,926.67 → the real `ReconciliationResult` markup shows "Discrepancy of £40.00 detected". Agent debt matches the dashboard.

## Tone
- Preset: app-store · Direction: quiet fintech confidence, product-first.
- Interpretation: cream brand backdrop, rounded frames with soft shadow, 0.6s eases, slow symmetric push-in, no overlapping fades (fixes v1 glitches).

## Format: landscape — 1920x1080 · Duration: 26.5s

## Visual identity (from the logo + app)
- Navy `#0b1a48`, gold `#d9a838` (text-safe gold `#9a6f14`), cream `#f7f4ef` (the app shell background), app header teal `#12343b`.
- Font: system sans (matches app).

## Storyboard
| # | Scene | In | Out | Notes |
|---|---|---|---|---|
| 1 | Intro | 0.0 | 3.2 | logo → hook → sub |
| 2 | Dashboard | 3.2 | 7.8 | ring at +1.1s, drop SFX on arrival, click on ring |
| 3 | Agents | 8.4 | 12.2 | same pattern |
| 4 | Deposit | 12.8 | 17.0 | same pattern |
| 5 | End of Day | 17.6 | 22.6 | ring gets the single low impact |
| 6 | Outro | 23.0 | 26.5 | logo, tagline, url; bell; music fades |

## Audio
Music: `happy-beats-business-moves-vol-9` at 0.30, fade in 0.6s / out 2.0s. SFX sparse: `interface/drop_001` on each screen arrival, `ui/click2` on ring lands, `impact/impactSoft_medium_001` on the discrepancy ring, `impactBell_heavy_000` on the outro logo.

## Share copy
See `share-copy.txt`.
