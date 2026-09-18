import { config } from "../config/index.js";
import { publicPlans } from "./tiers.js";

export function stripeStatus() {
  return {
    configured: Boolean(config.stripeSecretKey),
    publishable: Boolean(config.stripePublishableKey),
    webhook: Boolean(config.stripeWebhookSecret),
    prices: {
      individual: Boolean(config.stripePriceIndividual),
      group: Boolean(config.stripePriceGroup)
    }
  };
}

export function planById(planId, overrides = []) {
  return publicPlans(overrides).find((plan) => plan.id === planId) || null;
}

export async function createCheckout({ plan, origin, member }) {
  const status = stripeStatus();
  const success = `${origin}/join?checkout=success&plan=${encodeURIComponent(plan.id)}`;
  if (!status.configured) {
    return {
      stub: true,
      provider: "stub",
      checkoutUrl: success,
      message:
        "Stripe is not configured. Set STRIPE_SECRET_KEY (and STRIPE_PRICE_INDIVIDUAL / STRIPE_PRICE_GROUP) to enable live Checkout. This stub marks the selected plan locally."
    };
  }
  return {
    stub: true,
    provider: "stripe-env",
    checkoutUrl: success,
    customerEmail: member?.email || "",
    message:
      "STRIPE_SECRET_KEY is set but the Stripe SDK is not bundled in this Express slice. Checkout still completes locally so membership can be tested. Wire @stripe/stripe-js + stripe when going live."
  };
}
