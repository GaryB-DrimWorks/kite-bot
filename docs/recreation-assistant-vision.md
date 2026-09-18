# Recreation Assistant product vision (captured 2026-09-18)

Gary’s direction for evolving kite-bot / kite-bot.drim.works. Retain for roadmap discussion with the cloud PR (`cursor/kite-webapp-features-5a43`) and Hostinger MVP.

## Family of apps

Kitesurfing is the **first Recreation Assistant** in a set (other disciplines later). Same pattern: spot/condition intelligence + web + agent + bot.

## Product portfolio structure

**Now**
1. **Web App** — desktop + mobile, easily switchable/configurable presentation
2. **Agent** — Grok Bot / Cursor assistants (e.g. Kitesurfing Support)
3. **Bot** — WhatsApp/group bots (e.g. KAN Bot)

**Later**
4. **Native apps**
5. **Workbench**

## Commercial model

- **Freemium** subscriptions (usual DrîmWorks pattern)
- Forecasts + actuals for chosen location, chosen **language**
- Users should **not** be forced to BYOK
- Prefer **CYOS** = Connect Your Own Subscription (also heard as UYOS/BYOS — standardise on **CYOS** for now)
- Dual path:
  - DrîmWorks pays for **discounted partner API** access → included in tiered plans
  - Users **CYOS** to their own provider subscriptions
  - Clip ticket / commission on referred subscriptions
- **Groups** (WhatsApp, Facebook, other): free or paid group use; discounted + commission memberships for members/referrers
- **Brand sponsors**: sponsor subscriptions in targeted areas for specified time windows
- Long-term: referral network across Recreation Assistant apps + DrîmWorks ecosystem

## Partner / data providers (target community apps to learn from / interoperate)

Auckland kiting community favourites (presentation should be switchable to feel familiar):
1. Churcaster — https://churcaster.co.nz (confirm exact URL)
2. KiteOn — https://play.google.com/store/apps/details?id=com.kiteon.app
3. PredictWind — https://predictwind.com
4. SailFlow — https://www.sailflow.com/
5. WindFinder — https://www.windfinder.com
6. WindGuru — https://www.windguru.cz/
7. Windy.com
8. Windy.app

Partner relationships: real-time + forecast weather (and more later) — discounted API for DrîmWorks + referral commissions.

## Safety / session monitoring (later)

- Connect Surfr and other exercise apps + emergency services
- Agent monitors long sessions / danger signals; contact designated person after no user response (phones often left in cars)

## Camera mini-app (legacy HTML)

Source found by Hermes/Nemotron:  
`D:/Documents/Development/Dev 2021/prodsol.com/Visual Studio/Kiting/auckland-wind.html`

Work requested:
1. `http://` → `https://`
2. Verify each camera link; fix replaced cameras
3. Add cameras currently missing
4. Better UI that auto-selects spots from current/target window conditions + integrate into the Recreation Assistant web app

## Alignment notes (reconcile later)

| Topic | This vision | Existing pieces |
|-------|-------------|-----------------|
| Access keys | Prefer platform tiers + CYOS over BYOK-only | Cloud PR has BYOK (NIWA) + BYOS spots |
| Spots | Full Auckland + cameras | Hostinger 8 + Bridge; PR spot set; local `spots/auckland/` |
| Channels | Web + Agent + Bot first | KAN Bot WA; Support agent; PR dashboard |
| Presentation | Configurable like Churcaster/KiteOn/PredictWind/etc. | Single dashboard UI so far |
| Hosting | One backend per app unless forced; OSS users choose platform | VPS/Docker primary — see `docs/platform-portability.md` |
