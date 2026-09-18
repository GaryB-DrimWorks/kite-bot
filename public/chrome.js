function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function markCurrentNav() {
  const path = location.pathname.replace(/\/$/, "") || "/";
  document.querySelectorAll(".chrome nav a").forEach((link) => {
    const href = link.getAttribute("href");
    const current =
      href === path ||
      (href === "/" && (path === "/live" || path === "/forecast")) ||
      (href === "/join" && path === "/membership") ||
      (href.startsWith("/portals/") && path.startsWith("/portals/"));
    link.setAttribute("aria-current", current ? "page" : "false");
  });
}

async function bootChrome() {
  markCurrentNav();
  const chip = document.getElementById("tier-chip");
  if (!chip) return;
  try {
    const me = await fetch("/api/me").then((res) => res.json());
    chip.textContent = me.tierLabel || "Visitor";
    chip.href = "/join";
    chip.dataset.tier = me.tier;
  } catch {
    chip.textContent = "Visitor";
  }
}

document.addEventListener("DOMContentLoaded", bootChrome);
