#!/usr/bin/env python3
"""Wrap each sanitised app capture in a 1920x1080 Hyperframes sub-composition
with its own in-screen animation (cursor, typing, count-ups, reveals)."""
import pathlib
ROOT = pathlib.Path(__file__).parent
CAPTURES = ROOT / "captures"; OUT = ROOT / "compositions"; OUT.mkdir(exist_ok=True)

COMMON_JS = r"""
  window.__timelines = window.__timelines || {};
  const app = document.getElementById("app");
  const $ = s => app.querySelector(s); const $$ = s => [...app.querySelectorAll(s)];
  const byText = (sel, re) => $$(sel).find(e => re.test(e.textContent || ""));
  const tl = gsap.timeline({ paused: true });
  // ---- overlay: cursor + ring live inside the app layer ----
  const cur = document.createElement("div"); cur.className = "cursor";
  cur.innerHTML = '<svg width="34" height="40" viewBox="0 0 24 28"><path d="M3 2l17 12-7.2 1.2L17 24l-3.6 1.6-4.2-8.6L3 22z" fill="#0b1a48" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const rip = document.createElement("div"); rip.className = "ripple";
  const ring = document.getElementById("ring");
  app.append(ring, rip, cur);
  const rect = el => { const a = app.getBoundingClientRect(), s = a.width / 1920 || 1, r = el.getBoundingClientRect();
    return { x: (r.left - a.left) / s, y: (r.top - a.top) / s, w: r.width / s, h: r.height / s }; };
  const center = el => { const r = rect(el); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; };
  function ringOn(el, at, pad = 10) { const r = rect(el);
    tl.set(ring, { left: r.x - pad, top: r.y - pad, width: r.w + pad * 2, height: r.h + pad * 2 }, at);
    tl.fromTo(ring, { opacity: 0, scale: 1.05 }, { opacity: 1, scale: 1, duration: 0.45, ease: "power3.out" }, at); }
  function ringOff(at) { tl.to(ring, { opacity: 0, duration: 0.3 }, at); }
  function cursorTo(el, at, dur = 0.7, dx = 0, dy = 0) { const c = center(el);
    tl.to(cur, { x: c.x + dx, y: c.y + dy, duration: dur, ease: "power2.inOut" }, at); }
  function click(el, at) { const c = center(el);
    tl.to(cur, { scale: 0.85, duration: 0.08, yoyo: true, repeat: 1 }, at);
    tl.fromTo(rip, { x: c.x, y: c.y, scale: 0.2, opacity: 0.55 }, { scale: 1.6, opacity: 0, duration: 0.5, ease: "power2.out" }, at); }
  function typeInto(el, text, at, dur) { const p = { n: 0 };
    tl.to(p, { n: text.length, duration: dur, ease: "none", onUpdate: () => { el.value = text.slice(0, Math.round(p.n)); } }, at); }
  function countUp(el, from, to, fmt, at, dur = 1.2) { const p = { v: from };
    tl.to(p, { v: to, duration: dur, ease: "power2.out", onUpdate: () => { el.textContent = fmt(p.v); } }, at); }
  const gbp = v => "£" + v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const usd = v => "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  tl.set(cur, { x: 1500, y: 980, opacity: 0, transformOrigin: "10% 8%" }, 0);
  tl.set(ring, { opacity: 0 }, 0); tl.set(rip, { opacity: 0 }, 0);
"""

SCREENS = {
"dashboard": r"""
  const cards = $$('main .rounded-lg.border');
  const debt = $('[class*="AgentDebtCard_value"]');
  const stats = $$('[class^="StatCard_value"]');
  tl.fromTo($('main h1'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, 0.1);
  tl.fromTo(cards, { opacity: 0, y: 28, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "power3.out", stagger: 0.07 }, 0.25);
  countUp(debt, 0, 18533.33, gbp, 0.9, 1.5);
  countUp(stats[2], 0, 2500, gbp, 1.1, 1.2);
  countUp(stats[3], 0, 60, v => v.toFixed(1) + "%", 1.2, 1.2);
  ringOn($('[class*="AgentDebtCard_card"]'), 2.5, 12);
  tl.to(cur, { opacity: 1, duration: 0.2 }, 3.4);
  const viewAgents = byText('[class*="QuickActions_actions"] button', /View Agents/);
  cursorTo(viewAgents, 3.5, 1.0, 40, 4);
  ringOff(4.4);
  click(viewAgents, 4.8);
  tl.to(viewAgents, { backgroundColor: "#e9eef0", duration: 0.15, yoyo: true, repeat: 1 }, 4.8);
""",
"agents": r"""
  const rows = $$('table tbody tr');
  const sums = $$('[class*="agents_summaryValue"]');
  tl.fromTo($('main h1'), { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5, ease: "power3.out" }, 0.1);
  countUp(sums[0], 0, 27800, usd, 0.4, 1.3);
  tl.fromTo($('table thead'), { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.5);
  tl.fromTo(rows, { opacity: 0, x: -36 }, { opacity: 1, x: 0, duration: 0.5, ease: "power3.out", stagger: 0.11 }, 0.7);
  const fartun = rows[2];
  tl.to(cur, { opacity: 1, duration: 0.2 }, 2.0);
  cursorTo(fartun, 2.1, 0.9, -280, 0);
  tl.to(fartun, { backgroundColor: "#fbf4e3", duration: 0.35 }, 2.6);
  ringOn(fartun, 2.8, 6);
  const more = fartun.querySelector('button');
  cursorTo(more, 3.7, 0.7);
  ringOff(4.2);
  click(more, 4.5);
  tl.to(more, { backgroundColor: "#0b1a48", color: "#fff", duration: 0.15 }, 4.5);
""",
"deposit": r"""
  const trig = $('#agent-trigger span');
  const received = $('#received'), receipt = $('#receipt');
  const rowsP = $$('[class*="ConversionPreviewCard_row"]');
  const val = re => rowsP.find(r => re.test(r.textContent)).lastElementChild;
  const vCash = val(/Cash received/), vUsd = val(/USD equivalent/), vOwes = val(/Agent owes/), vRem = val(/Remaining after/);
  // scene start state (must equal t=0)
  trig.textContent = "Select an agent…"; received.value = ""; receipt.value = "";
  vCash.textContent = "£0.00"; vUsd.textContent = "$0.00"; vOwes.textContent = "$0.00"; vRem.textContent = "$0.00";
  tl.fromTo($('main h1'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, 0.1);
  tl.fromTo([$('form'), $('[class*="ConversionPreviewCard_card"]')], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", stagger: 0.12 }, 0.2);
  tl.to(cur, { opacity: 1, duration: 0.2 }, 0.7);
  const trigBtn = $('#agent-trigger');
  cursorTo(trigBtn, 0.8, 0.7, -200, 0); click(trigBtn, 1.4);
  const pT = { n: 0 }; const name = "Fartun Abdi — owes $15,200.00";
  tl.to(pT, { n: 1, duration: 0.01, onUpdate: () => { trig.textContent = pT.n > 0.5 ? name : "Select an agent…"; vOwes.textContent = pT.n > 0.5 ? "$15,200.00" : "$0.00"; } }, 1.55);
  tl.fromTo(trig, { color: "#9a6f14" }, { color: "#0b1a48", duration: 0.5 }, 1.55);
  cursorTo(received, 1.9, 0.6, -220, 0); click(received, 2.4);
  tl.to(received, { boxShadow: "0 0 0 3px rgba(217,168,56,0.45)", duration: 0.2 }, 2.4);
  typeInto(received, "5000", 2.6, 0.7);
  countUp(vCash, 0, 5000, gbp, 2.7, 0.9);
  countUp(vUsd, 0, 7500, usd, 2.8, 1.0);
  countUp(vRem, 15200, 7700, usd, 2.9, 1.1);
  tl.fromTo(vUsd, { scale: 1.12, color: "#9a6f14" }, { scale: 1, color: "#0b1a48", duration: 0.6 }, 3.6);
  ringOn($('[class*="ConversionPreviewCard_card"]'), 3.8, 12);
  cursorTo(receipt, 4.0, 0.6, -220, 0); click(receipt, 4.5);
  tl.to(received, { boxShadow: "0 0 0 0 rgba(217,168,56,0)", duration: 0.2 }, 4.5);
  typeInto(receipt, "R-2026-0042", 4.7, 0.9);
  ringOff(5.6);
  const submit = $('[class*="AgentDepositForm_submit"]');
  cursorTo(submit, 5.8, 0.7); click(submit, 6.5);
  tl.to(submit, { scale: 0.96, duration: 0.1, yoyo: true, repeat: 1, transformOrigin: "50% 50%" }, 6.5);
""",
"endofday": r"""
  const rowsS = $$('[class*="EODSummaryPanel_row"]');
  const formula = $('[class*="EODSummaryPanel_formula"]');
  const input = $('#physical-count');
  const wrap = $('[class*="ReconciliationResult_wrap"]');
  const banner = $('[class*="ReconciliationResult_banner"]');
  const reason = $('#discrepancy-reason') || $('textarea');
  const closeBtn = byText('main button', /Close day/i);
  input.value = ""; if (reason) reason.value = "";
  tl.set(wrap, { opacity: 0, y: 12 }, 0);
  tl.fromTo($('main h1'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, 0.1);
  tl.fromTo(rowsS, { opacity: 0, x: -18 }, { opacity: 1, x: 0, duration: 0.45, ease: "power3.out", stagger: 0.14 }, 0.3);
  tl.fromTo(formula, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 1.1);
  tl.to(cur, { opacity: 1, duration: 0.2 }, 1.5);
  cursorTo(input, 1.6, 0.7, -300, 0); click(input, 2.2);
  tl.to(input, { boxShadow: "0 0 0 3px rgba(217,168,56,0.45)", duration: 0.2 }, 2.2);
  typeInto(input, "13926.67", 2.4, 1.0);
  // the reveal: banner slams in, count turns red, brief shake
  tl.to(wrap, { opacity: 1, y: 0, duration: 0.01 }, 3.7);
  tl.fromTo(banner, { scale: 0.92, y: 14, opacity: 0 }, { scale: 1, y: 0, opacity: 1, duration: 0.45, ease: "back.out(2.2)", transformOrigin: "50% 50%" }, 3.7);
  tl.fromTo(banner, { x: 0 }, { x: 6, duration: 0.05, yoyo: true, repeat: 5 }, 4.1);
  tl.to(input, { color: "#8a1f1f", boxShadow: "0 0 0 3px rgba(138,31,31,0.35)", duration: 0.3 }, 3.75);
  ringOn(banner, 4.0, 10);
  if (reason) { cursorTo(reason, 5.0, 0.7, -300, 0); click(reason, 5.6);
    typeInto(reason, "Till miscount — recounted, supervisor informed", 5.8, 1.2); }
  ringOff(6.4);
  if (closeBtn) { cursorTo(closeBtn, 6.5, 0.6); tl.to(closeBtn, { opacity: 1, backgroundColor: "#0b1a48", color: "#fff", duration: 0.3 }, 6.9); }
""",
}
FILES = {"dashboard": "dashboard.html", "agents": "agents.html", "deposit": "agent-deposits.html", "endofday": "end-of-day.html"}

TEMPLATE = """<!doctype html>
<html lang="en"><head><meta charset="UTF-8" />
<link rel="stylesheet" href="captures/app.css" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
  html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #f7f4ef; }
  #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: #f7f4ef; }
  .app { position: absolute; inset: 0; width: 1920px; height: 1080px; overflow: hidden; }
  .app [class*="layout_shell"] { min-height: 1080px; }
  .app input, .app textarea { color: #0b1a48; }
  .ring { position: absolute; border: 4px solid #d9a838; border-radius: 14px; opacity: 0; pointer-events: none;
    box-shadow: 0 0 0 8px rgba(217,168,56,0.16), 0 24px 70px -24px rgba(11,26,72,0.45); }
  .cursor { position: absolute; left: 0; top: 0; opacity: 0; pointer-events: none; z-index: 50; filter: drop-shadow(0 4px 10px rgba(11,26,72,0.35)); }
  .ripple { position: absolute; left: -22px; top: -22px; width: 44px; height: 44px; border-radius: 50%; background: rgba(217,168,56,0.55); opacity: 0; pointer-events: none; z-index: 49; }
</style></head>
<body>
<div id="root" data-composition-id="@@ID@@" data-width="1920" data-height="1080">
  <div class="app" id="app">@@SNAPSHOT@@</div>
  <div class="ring" id="ring"></div>
</div>
<script>
@@COMMON@@
@@SCENE@@
  window.__timelines["@@ID@@"] = tl;
  tl.seek(0);
</script>
</body></html>
"""
for sid, js in SCREENS.items():
    html = (TEMPLATE.replace("@@ID@@", sid).replace("@@SNAPSHOT@@", (CAPTURES / FILES[sid]).read_text())
            .replace("@@COMMON@@", COMMON_JS).replace("@@SCENE@@", js))
    (OUT / f"{sid}.html").write_text(html); print(f"wrote compositions/{sid}.html ({len(html)//1024} KB)")
