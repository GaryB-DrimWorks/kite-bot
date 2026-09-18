const portalId = document.currentScript?.dataset.portal || "instructor";
const lock = document.getElementById("lock");

fetch("/api/me")
  .then((res) => res.json())
  .then((me) => {
    const portal = (me.portals || []).find((item) => item.id === portalId);
    if (!portal) return;
    if (!portal.allowed) {
      lock.hidden = false;
      lock.innerHTML = `This is a <strong>preview</strong>. ${escapeHtml(portal.label)} is meant for ${escapeHtml(portal.minTier)} and up. <a href="/join">Join</a> to unlock the real workflow.`;
    }
  })
  .catch(() => {
    if (!lock) return;
    lock.hidden = false;
    lock.textContent = "Could not read membership; showing the stub anyway.";
  });
