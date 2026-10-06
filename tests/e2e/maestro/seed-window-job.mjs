/**
 * Put one open job with a collection window on the board, for `driver-promises-a-window.yaml`.
 *
 * The flow accepts a job, which consumes it — so a second run would find an empty board and fail
 * for a reason that has nothing to do with windows. A UI flow that only passes once is not a
 * regression test, so it seeds its own fixture instead of relying on whatever is lying around.
 */
import { MongoClient, ObjectId } from "mongodb";
import { readFileSync } from "node:fs";

const API = process.env.E2E_API_URL ?? "http://localhost:3100";
const DISTRICT = process.env.SEED_DISTRICT ?? "Kalutara";

const login = async (identifier) => {
  const r = await fetch(`${API}/identity/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier, password: "testpassword123" })
  });
  const j = await r.json();
  if (!j.token) throw new Error(`login ${identifier}: ${JSON.stringify(j)}`);
  return j.token;
};

const farmer = await login("0770000101");
const buyer = await login("0770000102");

const listing = await (
  await fetch(`${API}/catalog/listings`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${farmer}` },
    body: JSON.stringify({
      cropId: "carrot",
      quantityKg: 400,
      pricePerKg: 240,
      harvestDate: "2026-11-12",
      district: DISTRICT,
      town: "Matugama",
      farmgateNotes: "Blue gate past the tank",
      // 6 am to 12 pm, so the picker offers 6:00, 8:00 and 10:00 slots.
      collectionWindow: { date: "2026-11-12", from: 360, to: 720 }
    })
  })
).json();
if (!listing.id) throw new Error(JSON.stringify(listing));

/* NUDGE: listing approval (FARM-43) has no endpoint, and a buyer cannot order against a listing
   that is not yet verified — so this has to happen before the order, not after. */
const uri = readFileSync(new URL("../../../api/.env", import.meta.url), "utf8")
  .match(/^DATABASE_URI=(.+)$/m)[1]
  .trim();
const client = new MongoClient(uri);
await client.connect();
const db = client.db("test");
await db
  .collection("listings")
  .updateOne({ _id: new ObjectId(listing.id) }, { $set: { status: "verified" } });

const order = await (
  await fetch(`${API}/orders`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${buyer}` },
    body: JSON.stringify({ listingId: listing.id, quantityKg: 200 })
  })
).json();
if (!order.id) throw new Error(JSON.stringify(order));

/* NUDGE: FARM-46 is merged, so this should become the real farmer-accept + buyer-pay chain. */
await db
  .collection("orders")
  .updateOne({ _id: new ObjectId(order.id) }, { $set: { status: "open" } });

/**
 * Clear whatever the signed-in driver is still holding, so the flow starts from a known state.
 *
 * Without this the fixture is not deterministic: every run leaves another accepted job on the
 * account, the board fills with the driver's own work, and eventually the capacity check (FARM-49)
 * refuses the seeded job for a reason that has nothing to do with windows. Delivering is the
 * honest way to free it — the same path a driver takes — rather than deleting rows underneath the
 * app.
 */
const driverPhone = process.env.SEED_DRIVER_PHONE ?? "+94775124585";
const driver = await db.collection("users").findOne({ phone: driverPhone });
if (driver) {
  const cleared = await db
    .collection("orders")
    .updateMany(
      { assignedDriverId: driver._id.toString(), status: { $in: ["assigned", "in_transit"] } },
      { $set: { status: "delivered" } }
    );
  console.log(`cleared ${cleared.modifiedCount} job(s) off ${driverPhone}`);
}

console.log(`seeded open job ${order.id} in ${DISTRICT} with a 6am-12pm window`);
await client.close();
