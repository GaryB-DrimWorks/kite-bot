# Session calls → webapp deep links (roadmap)

Captured 2026-09-18 from Gary.

## Direction

1. **Integrate first:** fold `docs/cameras/auckland-wind.html` behaviour (Windsurf / KAN live / KAN forecast report cards, shared feeds, hover notes) into the kite-bot web app served at `https://kite-bot.drim.works` (cloud branch `cursor/kite-webapp-features-5a43` / PR #1).
2. **Then shrink posts:** morning / midday / evening WhatsApp (and chat) calls become **much smaller teasers**. Tapping/clicking opens the webapp for the comprehensive report (what we currently post in full, plus more).

## Not yet

- Exact teaser copy / link format (`#cams?dir=SW`, `/report/today`, etc.)
- Whether next-opportunity posts also shrink or stay separate

## Related docs

- `docs/cameras/` — camera UI + audit
- `docs/recreation-assistant-vision.md` — portfolio / CYOS
- `docs/hostinger-mvp-prompt.md` — WA summary + report link (same pattern)

## Webapp integrate backlog (from HTML prototype)

When porting `docs/cameras/auckland-wind.html` into `https://kite-bot.drim.works` / PR `cursor/kite-webapp-features-5a43`:

- [ ] Cams Live | Forecast modes, skill filter, map View/Send to phone, source attribution
- [ ] Forecast verdict: show Beginner · Intermediate · Advanced **skill circles** (same fills as WhatsApp: ⚪🔵🟢🟠🔴 — circles only, no B/I/A letters per `faq/skill-icons.md`), with All/Beginner/Intermediate/Advanced toggle filtering spots + advice/comments
- [ ] Equal-height still + chart panels; chart container bg matched to ~10% darker paper; click-through to source
- [ ] Then shrink thrice-daily WA posts to teasers deep-linking the webapp
- [ ] **Still/chart equal-height sizing** — HTML prototype never got this right; solve properly in the webapp CSS (not more prototype churn).
