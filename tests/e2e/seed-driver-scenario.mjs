/**
 * A board you can test the driver rules against by hand.
 *
 * Six jobs, each of which exists to prove exactly one rule — so when you tap through on a device
 * you can tell *which* rule fired rather than guessing. Two of them deliberately never appear at
 * all, because "the board hid it" is as much a behaviour as a refusal is.
 *
 * Every window is sized so the picker offers exactly **one** slot. That is on purpose: a manual
 * test where you also have to pick the right slot is a test you can fail by accident.
 *
 * Run:
 *   node tests/e2e/seed-driver-scenario.mjs
 *   SEED_DRIVER_PHONE=+94770000103 node tests/e2e/seed-driver-scenario.mjs   # a different driver
 *
 * It clears whatever the driver is already holding first, so the scenario starts from a known
 * state and can be re-run as often as you like.
 */
import { MongoClient, ObjectId } from "mongodb";
import { readFileSync } from "node:fs";

const API = process.env.E2E_API_URL ?? "http://localhost:3100";
const DRIVER_PHONE = process.env.SEED_DRIVER_PHONE ?? "+94775124585";
const DAY = process.env.SEED_DAY ?? "2026-11-12";

/** Minutes from midnight — how a collection window is stored (FARM-61). */
const at = (hour) => hour * 60;

/**
 * The scenario. Weights are chosen against a **1500 kg** vehicle; `expect` is what you should see,
 * and is printed at the end so the table is in front of you while you tap.
 */
const JOBS = [
  {
    ref: "A",
    crop: "tomato",
    kg: 300,
    town: "Matugama",
    district: "Kalutara",
    window: { from: at(6), to: at(8) },
    expect: "ACCEPTS. The baseline — take this one first, promising 6:00–8:00 am."
  },
  {
    ref: "B",
    crop: "beans",
    kg: 200,
    town: "Horana",
    district: "Kalutara",
    window: { from: at(7), to: at(9) },
    expect:
      "REFUSED after A, with 'window_clash'. 7–9 overlaps the 6–8 you already promised, and one lorry cannot be at two gates at once. A's promise must be untouched afterwards — that is the whole point of FARM-61."
  },
  {
    ref: "C",
    crop: "brinjal",
    kg: 250,
    town: "Panadura",
    district: "Kalutara",
    window: { from: at(10), to: at(12) },
    expect:
      "ACCEPTS after A. 10–12 does not overlap 6–8, so holding one job does not block the next — the rule refuses clashes, not work."
  },
  {
    ref: "D",
    crop: "rice",
    kg: 2000,
    town: "Beruwala",
    district: "Kalutara",
    window: { from: at(14), to: at(16) },
    expect:
      "NEVER APPEARS on the board. 2000 kg is more than the lorry can ever carry, so it is filtered out rather than offered and refused (LP-23) — a driver should not read about work they cannot take."
  },
  {
    ref: "E",
    crop: "pumpkin",
    kg: 1200,
    town: "Aluthgama",
    district: "Kalutara",
    window: { from: at(14), to: at(16) },
    expect:
      "APPEARS, then REFUSED once you hold A and C, with 'vehicle_full'. 1200 kg fits an empty lorry, so it is on the board; it stops fitting after 300 + 250. Its window clashes with nothing, so the refusal is unambiguously about weight. Deliver A and C and it becomes acceptable again."
  },
  {
    ref: "F",
    crop: "carrot",
    kg: 300,
    town: "Kelaniya",
    district: "Colombo",
    window: { from: at(6), to: at(8) },
    expect:
      "NEVER APPEARS. Wrong district — a Kalutara driver is not shown Colombo work, however light it is."
  }
];

const login = async (identifier) => {
  const res = await fetch(`${API}/identity/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier, password: "testpassword123" })
  });
  const body = await res.json();
  if (!body.token) throw new Error(`login ${identifier}: ${JSON.stringify(body)}`);
  return body.token;
};

const farmer = await login("0770000101");
const buyer = await login("0770000102");

const uri = readFileSync(new URL("../../api/.env", import.meta.url), "utf8")
  .match(/^DATABASE_URI=(.+)$/m)[1]
  .trim();
const client = new MongoClient(uri);
await client.connect();
const db = client.db("test");

/* Start from a known board. Delivering rather than deleting, because that is the path a driver
   actually takes and it leaves the history intact. */
const driver = await db.collection("users").findOne({ phone: DRIVER_PHONE });
if (!driver) throw new Error(`No driver ${DRIVER_PHONE}`);
if (!driver.driver) throw new Error(`${DRIVER_PHONE} has no vehicle — finish the wizard first`);

const cleared = await db.collection("orders").updateMany(
  {
    assignedDriverId: driver._id.toString(),
    status: { $in: ["assigned", "in_transit"] }
  },
  { $set: { status: "delivered" } }
);

for (const job of JOBS) {
  const listing = await (
    await fetch(`${API}/catalog/listings`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${farmer}` },
      body: JSON.stringify({
        cropId: job.crop,
        quantityKg: Math.max(job.kg, 100),
        pricePerKg: 180,
        harvestDate: DAY,
        district: job.district,
        town: job.town,
        farmgateNotes: `Scenario ${job.ref} — ${job.expect.split(".")[0]}`,
        collectionWindow: { date: DAY, ...job.window }
      })
    })
  ).json();
  if (!listing.id) throw new Error(`listing ${job.ref}: ${JSON.stringify(listing)}`);

  // NUDGE: coordinator approval is unbuilt (FARM-43), and a buyer cannot order an unverified listing.
  await db
    .collection("listings")
    .updateOne({ _id: new ObjectId(listing.id) }, { $set: { status: "verified" } });

  const order = await (
    await fetch(`${API}/orders`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${buyer}` },
      body: JSON.stringify({ listingId: listing.id, quantityKg: job.kg })
    })
  ).json();
  if (!order.id) throw new Error(`order ${job.ref}: ${JSON.stringify(order)}`);

  // NUDGE: FARM-46 is merged — this should become the real farmer-accept + buyer-pay chain.
  await db
    .collection("orders")
    .updateOne({ _id: new ObjectId(order.id) }, { $set: { status: "open" } });

  job.orderId = order.id;
}

await client.close();

const hhmm = (m) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

console.log(`\nDriver  ${driver.displayName}  ${DRIVER_PHONE}`);
console.log(`Vehicle ${driver.driver.capacityKg} kg, ${driver.driver.operatingDistrict}`);
console.log(`Cleared ${cleared.modifiedCount} job(s) they were still holding.\n`);
console.log(`Seeded ${JOBS.length} jobs for ${DAY}. Take them in order A → B → C → E:\n`);

for (const job of JOBS) {
  console.log(
    `  ${job.ref}  ${String(job.kg).padStart(4)} kg  ${job.crop.padEnd(8)} ${job.town.padEnd(10)} ${job.district.padEnd(9)} ${hhmm(job.window.from)}–${hhmm(job.window.to)}`
  );
  console.log(`     ${job.expect}\n`);
}
