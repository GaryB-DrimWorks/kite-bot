import assert from "node:assert/strict";
import test from "node:test";
import { canAccessPortal, classifyVisitor, publicPlans, tierRank } from "../src/membership/tiers.js";
import { parseCookies } from "../src/membership/session.js";
import { stripeStatus } from "../src/membership/stripe.js";

test("visitor becomes returning on a second visit", () => {
  assert.equal(classifyVisitor({ visits: 1 }), "visitor");
  assert.equal(classifyVisitor({ visits: 2 }), "returning-visitor");
  assert.equal(
    classifyVisitor({ member: { tier: "free-member" }, visits: 1 }),
    "free-member"
  );
});

test("portals are gated by tier but remain listed", () => {
  assert.equal(canAccessPortal("visitor", "instructor"), false);
  assert.equal(canAccessPortal("free-member", "instructor"), true);
  assert.equal(canAccessPortal("paid-individual", "provider"), true);
  assert.equal(canAccessPortal("paid-individual", "sponsor"), false);
  assert.equal(canAccessPortal("paid-group", "sponsor"), true);
  assert.ok(tierRank("paid-group") > tierRank("visitor"));
});

test("plans are configurable and stripe can be a stub", () => {
  const plans = publicPlans([{ id: "individual-month", priceCents: 1200 }]);
  assert.equal(plans.find((plan) => plan.id === "individual-month").priceCents, 1200);
  assert.equal(stripeStatus().configured, Boolean(process.env.STRIPE_SECRET_KEY));
});

test("session cookies parse", () => {
  const cookies = parseCookies("kb_session=%7B%22v%22%3A%22abc%22%7D; other=1");
  assert.ok(cookies.kb_session.includes("abc"));
  assert.equal(cookies.other, "1");
});
