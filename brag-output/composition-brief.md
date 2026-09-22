# Hyperframes Composition Brief: Kayd

## Objective
Create a short launch-style brag video for Kayd, a multi-tenant hawala/remittance head-office SaaS.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 21 seconds

## Source Material
- Project root: `/Users/abs.jama/Desktop/kayd`
- Primary files read: `README.md`, `styles/theme.css`, `app/(dashboard)/dashboard/page.tsx`, `components/eod/ReconciliationResult.tsx`, `components/agent-deposits/ConversionPreviewCard.tsx`, `components/dashboard/{StatCard,QuickActions,DailyRateBadge}.tsx`
- Product name: Kayd
- Tagline / strongest claim: "The ledger that closes itself." — reconciliation that catches cash discrepancies before a human does.
- Key UI to recreate: the End-of-Day `ReconciliationResult` banner (rose "Discrepancy of £40 detected" → green "Day balanced"), the `ConversionPreviewCard` live preview, the `DailyRateBadge`, and the `QuickActions` row.
- Copy that must appear verbatim (real product strings):
  - "Discrepancy of £40 detected"
  - "Day balanced"
  - "Record Agent Deposit" / "View Agents" / "Close Day"
  - "Live preview"

## Creative Direction
- Tone preset: app-store
- Creative direction: quiet fintech confidence — a clean product film where the reconciliation reveal is the drama.
- Interpretation: smooth feature-card reveals, generous holds, restrained motion; the single energy spike is the red discrepancy banner.
- Angle: Hawala has moved money on trust and paper ledgers for over a thousand years. Kayd doesn't replace the trust — it gives the ledger a Close Day button, and catches the £40 discrepancy nobody would have noticed.
- Hook: "Money that moved on trust for 1,200 years." on Kayd night-teal.
- Outro / punchline: Kayd wordmark + "The ledger that closes itself."
- Avoid: generic SaaS language, abstract filler visuals, unrelated redesign.

## Visual Identity
- Background: `#ffffff` (app frames) / `#12343b` night-teal (hero + outro)
- Text: `#12343b` on light; `#ffffff` on dark
- Accent: `#e1b382` (Kayd sand), shadow `#c89666`; secondary teal `#2d545e`
- Tint cards: green `#e1f5ee→#f0faf5` border `#9fe1cb`; rose `#fce4e4→#fdf0f0` border `#f5a3a3`
- Display font: system sans-serif heavy (ui-sans-serif / system-ui) — matches the app
- Body font: system sans-serif regular
- Visual references: rounded shadcn cards, lucide-style check/alert glyphs, the sand-on-teal brand pairing

## Storyboard
Use `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. Hook — 3.5s — "Money that moved on trust for 1,200 years." white on night-teal, sand underline sweep.
2. Daily rate set — 3s — DailyRateBadge, "£1 = $1.2650" counts up, "Daily Setup · locked in".
3. Agent deposit live preview — 4s — ConversionPreviewCard, rows arrive: Received £8,000 → Converted $10,120.00 → Agent balance $2,340.00.
4. Reconciliation: discrepancy — 4.5s — Expected £12,340.00, Counted £12,300.00 typed, rose banner slams "Discrepancy of £40 detected".
5. Day balanced — 3s — reason logs, banner flips green "Day balanced", "Closing balance £12,300.00".
6. Outro — 3s — QuickActions chips settle (Close Day highlighted sand), Kayd wordmark + "The ledger that closes itself."

## Audio
- Audio role: warm professional bed with motion-matched accents.
- Audio arc: fade in low under hero → lift under the flow → duck under the discrepancy impact → soft chime resolve → fade out under wordmark.
- Music: `happy-beats-business-moves-vol-9-by-ende-dot-app.mp3` at ~0.32 volume.
- Music treatment: fade-in ~0.4s, fade-out under outro; low posture throughout.
- Music cue guidance: bundled preset read (`assets/music/cues/...vol-9...music-cues.json`, 114.84 BPM). Strong cues to bias toward: 6.34s (rate reveal), 10.54s (conversion result row), 12.65s (discrepancy banner). Beat grid ~0.53s spacing for sequential rows/chips; hold full sets after.
- Audio-reactive treatment: subtle — hero glow / card presence may breathe with RMS/bass. No waveform/equalizer visuals. If extraction (ffmpeg/helper) is unavailable, skip and note it — do not block render.
- Audio-coupled moments:
  - Scene 1 hook underline — soft swell.
  - Scene 2 rate count-up — soft UI tick on settle.
  - Scene 3 deposit rows — gentle drop per row (beat grid), result row emphasized.
  - Scene 4 typed count — keyboard tick; one low impact on the rose banner (beat-lock ~12.65s).
  - Scene 5 green flip — soft positive bell/chime.
  - Scene 6 chips — soft tick per chip; music fades under wordmark.
- SFX selection guidance: app-store energy — `interface/drop_*` or `ui/click*` for card/row/chip pop-ins at 0.65–0.75; one low `impact/impactSoft_medium_*` or soft plate on the discrepancy banner; `impact/impactBell_heavy_000` (soft) on "Day balanced". Keep it sparse and coherent.
- SFX analysis guidance: read `<skill-dir>/assets/sfx/sfx-analysis.md`; prefer low HF-risk files for the repeated row/chip ticks.
- Exact SFX choice: choose filenames, timestamps, density, and volume against the implemented animation.
- Audio files: copy the chosen music and SFX into `brag-output/composition/assets/`.

## Hyperframes Instructions
This is the `/brag` workflow — not the generic hyperframes intent interview. Follow the native composition contract: root `data-composition-id`, timed `.clip` elements keyed on `data-start`/`data-duration`, a single paused GSAP timeline registered on `window.__timelines["<id>"]`, seek-safe keyframes. Requirements:
- Show at least one real Kayd UI/copy element (the reconciliation banner is mandatory).
- Keep all text readable (respect reading-time floors; hook holds longest).
- Total duration 15–25s (target 21s).
- Include the music + sparse SFX layer.
- Beat-lock 1–3 major reveals within ±0.15s; snap sequential rows/chips to the beat grid within ±0.10s, marked in comments; use natural timing where a cue would hurt readability.
- Run `hyperframes check` before render — brag's single gate.
