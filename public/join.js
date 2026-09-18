const meStatus = document.getElementById("me-status");
const signupStatus = document.getElementById("signup-status");
const stripeStatus = document.getElementById("stripe-status");
const plansEl = document.getElementById("plans");
const tiersEl = document.getElementById("tiers");
const portalsEl = document.getElementById("portals");

const TIER_COPY = [
  ["visitor", "First look. Cookie only."],
  ["returning-visitor", "Seen you before. Still anonymous."],
  ["free-member", "Email signup. Notes, share links, instructor preview."],
  ["paid-individual", "CYOS + partner forecasts included in the paid plan."],
  ["paid-group", "Clubs / WhatsApp groups with discounted seats."]
];

async function loadMe() {
  const me = await fetch("/api/me").then((res) => res.json());
  meStatus.innerHTML = `<strong>${escapeHtml(me.tierLabel)}</strong> · visits ${escapeHtml(me.visits)} · auth ${escapeHtml(me.auth?.mode || "session")}` +
    (me.member ? `<br>Signed in as ${escapeHtml(me.member.email)} (${escapeHtml(me.member.tier)})` : "");
  stripeStatus.textContent = me.auth?.stripe
    ? "Stripe env is present. Checkout still uses the local stub until the SDK is wired."
    : "Stripe keys are not set. Checkout is a local stub — see README for STRIPE_*.";
  tiersEl.innerHTML = TIER_COPY.map(([id, copy]) => {
    const active = me.tier === id ? " active" : "";
    return `<article class="tier-card${active}"><strong>${escapeHtml(id)}</strong><p class="muted">${escapeHtml(copy)}</p></article>`;
  }).join("");
  portalsEl.innerHTML = (me.portals || [])
    .map(
      (portal) =>
        `<a class="portal-card" href="${escapeHtml(portal.path)}"><strong>${escapeHtml(portal.label)}</strong><p class="muted">${escapeHtml(portal.summary)}</p><p>${portal.allowed ? "Access" : "Preview"}</p></a>`
    )
    .join("");
  plansEl.innerHTML = (me.plans || [])
    .filter((plan) => plan.priceCents > 0)
    .map((plan) => {
      const price = `$${(plan.priceCents / 100).toFixed(0)} ${String(plan.currency || "nzd").toUpperCase()}/${plan.interval}`;
      return `<button type="button" data-plan="${escapeHtml(plan.id)}">${escapeHtml(plan.name)} — ${price}</button>`;
    })
    .join("") || `<p class="muted">No paid plans configured.</p>`;
  return me;
}

document.getElementById("signup-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target).entries());
  const response = await fetch("/api/membership/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    signupStatus.textContent = body.error || "Signup failed.";
    return;
  }
  signupStatus.textContent = "You are a Free Member.";
  await loadMe();
  bootChrome();
});

plansEl.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-plan]");
  if (!button) return;
  const checkout = await fetch("/api/membership/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId: button.dataset.plan })
  });
  const body = await checkout.json().catch(() => ({}));
  if (!checkout.ok) {
    signupStatus.textContent = body.error || "Checkout failed. Sign up first.";
    return;
  }
  const activate = await fetch("/api/membership/activate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId: button.dataset.plan })
  });
  if (!activate.ok) {
    signupStatus.textContent = "Checkout stub ran, but activation failed.";
    return;
  }
  signupStatus.textContent = body.message || "Plan activated (stub).";
  await loadMe();
  bootChrome();
});

async function maybeCompleteCheckout() {
  const params = new URLSearchParams(location.search);
  if (params.get("checkout") !== "success") return;
  const planId = params.get("plan");
  if (!planId) return;
  await fetch("/api/membership/activate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId })
  });
}

maybeCompleteCheckout().then(loadMe);
