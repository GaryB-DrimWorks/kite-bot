import { listRecords, addRecord } from "../database/client.js";

const STARTER = [
  {
    title: "Self-sufficient beginner checklist",
    topic: "coach",
    body: "Know how to self-rescue, body-drag upwind, and land with a helper or a solid sand anchor. Stay on east-coast beaches with people around. Cap yourself at 20 kn until kite loops and downwind recoveries are boring."
  },
  {
    title: "Takapuna crowd etiquette",
    topic: "spot",
    spotId: "takapuna",
    body: "Launch north of the flags. Give swimmers a wide berth. If it is packed, walk. A 10-minute walk beats a tangle."
  },
  {
    title: "Harbour tide rule",
    topic: "safety",
    spotId: "point-chev",
    body: "Meola / Point Chev is incoming-to-high only. The outgoing Waitemata will take you toward the bridge. Confirm an official tide, not a phone guess."
  },
  {
    title: "Bladder puncture on the beach",
    topic: "repairs",
    body: "Find the leak with soapy water. Dry, then patch with a bladder patch kit, not gaffer tape. Roll the bladder rather than stuffing it. If the one-pump hose is the leak, spare valves live in most Auckland kite shops."
  },
  {
    title: "Line tangle triage",
    topic: "repairs",
    body: "Unhook, secure the kite, and walk the lines from the chicken loop out. Do not relaunch a four-line mess. If a line is blown, replace the set — stretching one line wrecks the kite’s trim."
  },
  {
    title: "Lost board on the west coast",
    topic: "safety",
    body: "The board usually beaches downwind of the last jump. Walk the high-tide line. If you lose the kite too, treat it as a Coastguard problem once it is in the rips."
  }
];

export async function seedKnowledge() {
  const existing = await listRecords("knowledge");
  if (existing.length) return;
  for (const item of STARTER) {
    await addRecord("knowledge", item);
  }
}
