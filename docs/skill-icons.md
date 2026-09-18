# Skill level icons (WhatsApp)

Three circle emojis in fixed order — **Beginner · Intermediate · Advanced** — with no letters on or before the icons.

| Position | Meaning |
|----------|---------|
| 1st circle | Beginner |
| 2nd circle | Intermediate |
| 3rd circle | Advanced |

| Fill | Meaning for that skill level |
|------|------------------------------|
| ⚪ White | Not enough wind |
| 🔵 Blue | Under-powered |
| 🟢 Grass green | Good to ideal |
| 🟠 Orange | Wind, chop, or current makes it challenging for this level |
| 🔴 Red | Too extreme for this level; kite at your own peril |

## Wind thresholds (Gary 2026-09-15)

**White (not enough)** when sustained wind is below:
- Beginner: **9 kn**
- Intermediate: **7 kn**
- Advanced: **5 kn**

**Ideal (green) bands** (general guide):
- Beginner: **12–16 kn**
- Intermediate: **11–24 kn**
- Advanced: **8–45 kn**

Between white floor and ideal → usually **blue (under-powered)**. Above ideal / punchy conditions → **orange** or **red** by skill.

## Fill key block (small-screen friendly)

Never call this a "legend". Use · not pipes between skill names:

    icon-layout: Beginner · Intermediate · Advanced
    key: ⚪ not enough · 🔵 under-powered · 🟢 good–ideal · 🟠 challenging · 🔴 extreme

Include that pair on morning call / first time in a thread.

## On a window / day line (next opportunity & by-window skill)

Put the **three skill circles inline after each time range**, before the wind — not on a separate `key:` line per day:

    M21: 9:20am-1:30pm 🔵🟢🟠 SW:14-22kn|1:30pm-5:30pm 🔵🟢🟠 WSW:18-26kn.

Pattern per window: `start-end` · three circles · `DIR:min-maxkn`, windows joined with `|`.

Do **not** prefix B/I/A. Do **not** use 🟩 or 🟡 for under-powered.
