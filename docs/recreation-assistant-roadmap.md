# Recreation Assistant roadmap (kitesurfing = #1)

Living backlog for [https://kite-bot.drim.works](https://kite-bot.drim.works). Channel-agnostic core first: web, agent, and bot all deep-link the same reports. WhatsApp teasers should stay thin.

## Shipped in this slice

- Live | Forecast camera UI with Windsurf stills/charts, skill **circles** (no B/I/A letters), map + send-to-phone
- Notes/advice capture (general + spot) tagged Beginner / Intermediate / Advanced/Expert / New to this spot
- Membership scaffold: Visitor · Returning Visitor · Free Member · Paid Individual · Paid Group
- Portals (stubs): Instructor, weather provider (CYOS), Sponsor
- Share URLs: `/live?dir=SW`, `/forecast?skill=beginner&spot=takapuna` plus OG/meta

## Next (discussion + build)

### Virtual / remote kite instructors

- Session discussion (text) bound to a spot + skill circles + window
- Video analysis intake: student uploads or shares a clip; instructor marks launch, body position, kite path
- Deep links from WhatsApp teasers into an instructor thread, not a new silo

### Kite repair

- Expand the existing Repairs mode: bladder, one-pump, line, canopy
- Shop/sponsor referrals with clip-ticket later

### Tips & tricks + step-by-step guides

- Same notes store, richer `type` (`guide`, `drill`)
- Skill-circle gating so beginners are not served advanced wave drills

### Gear buy/sell + deal alerts

- Lost-gear log already exists; add listings + watch conditions (“alert me when Orewa is 14 kn E”)
- Commission / sponsor slots reuse the sponsor portal

### Knowledgebase

- **Taxonomy first**, ontology later
- Gary will add taxonomy building blocks via the DrîmWorks site after lunch — do not invent a parallel ontology here
- Map notes, cameras, spots, and skills onto those blocks when they land

### Session-call shrink

- Morning / midday / evening WhatsApp posts become teasers
- Link shape to freeze after this UI is bedded down (`/forecast?skill=&spot=`, `/live?dir=`)

### Safety / session monitoring (later)

- Surfr + emergency contact if a long session goes quiet (phones often left in cars)

## Architecture guardrails

- Keep scoring, notes, membership, and cameras in `src/` so agents/bots can call JSON without scraping HTML
- Prefer CYOS (Connect Your Own Subscription) + discounted partner APIs over forcing BYOK
- Clerk for production identity, Stripe for paid plans; local stubs must keep working without keys
- Presentation should stay switchable (Churcaster / KiteOn / PredictWind-style) without forking the core
