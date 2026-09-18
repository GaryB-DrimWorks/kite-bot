export const MEMBER_TIERS = [
  { id: "visitor", label: "Visitor", rank: 0 },
  { id: "returning-visitor", label: "Returning Visitor", rank: 1 },
  { id: "free-member", label: "Free Member", rank: 2 },
  { id: "paid-individual", label: "Paid Individual", rank: 3 },
  { id: "paid-group", label: "Paid Group", rank: 4 }
];

export const PORTALS = [
  {
    id: "instructor",
    path: "/portals/instructor",
    label: "Instructor portal",
    minTier: "free-member",
    summary: "Session plans, student skill circles, and video-analysis intake (stub)."
  },
  {
    id: "provider",
    path: "/portals/provider",
    label: "Weather provider portal",
    minTier: "paid-individual",
    summary: "CYOS / partner live+forecast feeds, attribution, and clip-ticket referrals (stub)."
  },
  {
    id: "sponsor",
    path: "/portals/sponsor",
    label: "Sponsor portal",
    minTier: "paid-group",
    summary: "Area-and-window sponsorships, group discounts, and campaign slots (stub)."
  }
];

export const DEFAULT_PLANS = [
  {
    id: "free",
    tier: "free-member",
    name: "Free Member",
    priceCents: 0,
    currency: "nzd",
    interval: "month",
    group: false,
    stripePriceEnv: ""
  },
  {
    id: "individual-month",
    tier: "paid-individual",
    name: "Paid Individual",
    priceCents: 900,
    currency: "nzd",
    interval: "month",
    group: false,
    stripePriceEnv: "STRIPE_PRICE_INDIVIDUAL"
  },
  {
    id: "individual-year",
    tier: "paid-individual",
    name: "Paid Individual (year)",
    priceCents: 9000,
    currency: "nzd",
    interval: "year",
    group: false,
    stripePriceEnv: "STRIPE_PRICE_INDIVIDUAL"
  },
  {
    id: "group-month",
    tier: "paid-group",
    name: "Paid Group",
    priceCents: 2900,
    currency: "nzd",
    interval: "month",
    group: true,
    seats: 20,
    stripePriceEnv: "STRIPE_PRICE_GROUP"
  }
];

export function tierById(id) {
  return MEMBER_TIERS.find((tier) => tier.id === id) || MEMBER_TIERS[0];
}

export function tierRank(id) {
  return tierById(id).rank;
}

export function classifyVisitor({ visits = 1, firstSeen, member } = {}) {
  if (member?.tier) return member.tier;
  const first = firstSeen ? new Date(firstSeen).getTime() : Date.now();
  const returning = visits >= 2 || Date.now() - first > 12 * 60 * 60 * 1000;
  return returning ? "returning-visitor" : "visitor";
}

export function canAccessPortal(tierId, portalId, roles = []) {
  const portal = PORTALS.find((item) => item.id === portalId);
  if (!portal) return false;
  if (roles.includes(portalId) || roles.includes("admin")) return true;
  return tierRank(tierId) >= tierRank(portal.minTier);
}

export function publicPlans(overrides = []) {
  const byId = new Map(DEFAULT_PLANS.map((plan) => [plan.id, plan]));
  for (const plan of overrides) {
    if (plan?.id) byId.set(plan.id, { ...byId.get(plan.id), ...plan });
  }
  return [...byId.values()];
}
