import { isOffshore } from "../utils/wind.js";

function skillRank(skill) {
  if (skill === "advanced") return 2;
  if (skill === "intermediate") return 1;
  return 0;
}

export function safetyAdvice({ spot, conditions, profile, tideFit }) {
  const warnings = [];
  const tips = [];
  const wind = conditions.effectiveWindKn ?? conditions.windSpeedKn;
  const gust = conditions.gustFactor;
  const waves = conditions.waveHeightM;
  const solo = Boolean(profile.solo);

  if (isOffshore(conditions.windDirection, spot.shoreFacing)) {
    warnings.push(
      `${spot.name}: wind is offshore or close to it. Do not launch here.`
    );
  }

  if (wind >= 30 && skillRank(profile.skill) < 2) {
    warnings.push(
      `${Math.round(wind)} kn effective is too much for ${profile.skill} riders.`
    );
  }

  if (gust && gust >= 1.5) {
    warnings.push(
      `Gust factor ${gust.toFixed(2)} — expect big holes and spikes. Smaller kite, or stay ashore if you are rusty.`
    );
  }

  if (spot.tideCritical && !tideFit?.ok) {
    warnings.push(`${spot.name}: ${tideFit.detail}`);
  }

  if (spot.coast === "west" && waves >= 2 && skillRank(profile.skill) < 2) {
    warnings.push(
      `West-coast sea is around ${waves.toFixed(1)} m. Pick an east-coast flat-water spot unless you are comfortable in waves.`
    );
  }

  if (solo) {
    warnings.push(
      "Solo session: tell someone, wear a leash, and carry a way to call for help. Skip remote beaches if you are unsure."
    );
    if (spot.remote) {
      warnings.push(
        `${spot.name} is a poor solo choice — long walk-out and limited immediate help.`
      );
    }
  }

  if (conditions.currentSpeedKn >= 1.5 && spot.coast === "harbour") {
    warnings.push(
      `Harbour current about ${conditions.currentSpeedKn.toFixed(1)} kn. Stay up-current of your exit.`
    );
  }

  tips.push(...spot.hazards.map((hazard) => `${spot.name}: ${hazard}`));
  tips.push(spot.launchLand);

  if (!warnings.length) {
    tips.unshift("No hard stoppers in the current numbers — still do a beach check before you rig.");
  }

  return {
    level: warnings.length ? "caution" : "ok",
    warnings,
    tips,
    general: [
      "If in doubt, don't go out.",
      "Watch the water for 10 minutes before you launch.",
      "Know your downwind exit and keep a clear landing zone.",
      "Helmet and impact vest are cheap insurance in gusty or crowded water."
    ]
  };
}

export function lostGearAdvice(spot) {
  return {
    spotId: spot?.id || null,
    steps: [
      "Mark the last-seen point and wind/current direction.",
      "Tell the group immediately — a second set of eyes beats a long swim.",
      spot?.coast === "harbour"
        ? "Harbour gear usually rides the tide. Check down-current bays and boat ramps."
        : "On the open coast, walk downwind first, then check the next beach.",
      "Do not swim after a kite in a rip. Recover from shore or with help.",
      "If it is a hazard to boats, notify the harbourmaster / Coastguard."
    ]
  };
}
