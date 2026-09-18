# Hostinger Agent — initial prompt & MVP decisions (retain for discussion)

Captured 2026-09-17 from Gary’s Hostinger Agent chat. Retain for web-app / report design discussion. Do **not** silently overwrite later KAN Bot / Support conventions until Gary reconciles them.

## Product intent

- First region: **Auckland**; many spots with **Ideal / OK / Sketchy / No go** (not only a few beaches).
- Bot **generates a report**, posts a **brief summary to chat** with a **link to the detailed report**.
- Site features later: person’s **current + default location**, **travel time** to each spot, **session and condition preferences**.

## Report contents (MVP)

1. **Current live** (fallback to forecast if live unavailable) **and forecast** for general **wind, rain, cloud, tide** at regional reference points (see list below).
2. **Prioritised spot list** from current/forecast conditions (example framing: “15–21 kn SSW–WSW now and until 1pm”) with **recommendation + warnings** for experienced / intermediate / beginner.

Example WhatsApp summary shape:  
“Best options now: Orewa, OK for intermediate/advanced; Eastern Beach, ideal for beginners; Muriwai, sketchy due to gusts,” + link to detailed web report.

## Location model (confirmed)

**Wind reference only (not a kiting spot):**
- The Harbour Bridge — broad regional wind pattern only

**Kitesurfing spots (8):**
1. Eastern Beach  
2. Muriwai *(correct spelling; was typed “Muruwai” once)*  
3. Orewa  
4. Snells Beach  
5. Takapuna  
6. Saint Heliers  
7. Shoal Bay  
8. Point Chevalier  

Each location: own coordinates, nearby tide station, wind-direction suitability, skill thresholds, warnings.

## Hostinger-era wind ranges (initial rules)

| Rider level   | Suitable sustained wind |
|---------------|-------------------------|
| Beginner      | 12–18 knots             |
| Intermediate  | 12–25 knots             |
| Experienced   | 12–40 knots             |

Other factors (gusts, rain, tide, direction, etc.) to be added later.

## Suggested build order (Hostinger Agent)

1. Data collection (Open-Meteo hourly wind/gusts/rain/cloud/precip; NZ tides e.g. MetService Tide / LINZ)  
2. Spot / rider rules  
3. Report page  
4. WhatsApp posting  
5. Add-member detection (private notify admin)

## WhatsApp layer notes (Hostinger)

- Monitor selected group; detect “add someone”; privately notify admin; post wind-report summary into group.
- Official WhatsApp Groups API is business-group oriented; existing personal groups may need unofficial Web automation on a dedicated number (account-restriction risk). *Current production path is Grok Bot Baileys + KAN Bot — reconcile later.*

## Stack hints from that thread

- Open-Meteo for forecast variables  
- MetService Tide API / LINZ for tides  
- Recommendation engine: score Ideal / OK / Sketchy / No go per rider level  

---

## Conflicts / reconcile later (do not auto-merge)

| Topic | Hostinger MVP | Current KAN Bot / Support (post–Sep 2026) |
|-------|---------------|-------------------------------------------|
| Skill wind bands | B 12–18 · I 12–25 · Exp 12–40 | Floors white below B9 / I7 / A5; ideal B 12–16 · I 11–24 · A 8–45; blue/orange/red fills (faq/skill-icons.md) |
| Spot status labels | Ideal / OK / Sketchy / No go | Skill-circle fills + session-call chrome |
| Primary locations | Bridge + 8 spots above | Larger Auckland spot DB in spots/auckland/ (many more) |
| Delivery | WA summary + web report link | Auto session calls + #wa via KAN Bot; web at kite-bot.drim.works still nascent |
| Experienced vs Advanced | Experienced | Advanced in skill icons |

Gary to decide which wind table and status vocabulary the web report uses (or how both map).
