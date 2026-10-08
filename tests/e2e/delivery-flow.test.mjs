/**
 * FARM-26 end to end: a farmer pins a farm gate, a buyer names a delivery point, and the driver's
 * job carries both ends plus the distance between them.
 *
 * This is the flow that spans four domains — catalog, orders, identity and logistics — so it is
 * the one worth driving over real HTTP. The unit tests already prove each piece in isolation;
 * what only this can catch is a field that survives a use-case but is dropped by a Mongoose
 * mapper, a schema, or a controller on the way out.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { ObjectId } from "mongodb";

import { PASSWORD, api, closeDb, db, signUp } from "./helpers.mjs";

const GATE = { latitude: 7.6281, longitude: 80.2447 }; // a field near Wariyapola
const MARKET = { latitude: 7.8742, longitude: 80.6511 }; // Dambulla economic centre

describe("FARM-26 delivery flow", () => {
  let farmer, buyer, driver;

  before(async () => {
    const health = await api.get("/identity/users");
    assert.notEqual(health.status, undefined, `api unreachable — is it running?`);

    farmer = await signUp("farmer", "E2E Farmer");
    buyer = await signUp("buyer", "E2E Buyer");
    driver = await signUp("logistics", "E2E Driver");

    const vehicle = await api.put(
      "/identity/me/vehicle",
      {
        vehicleType: "small-lorry",
        registration: "NW E2E-0001",
        capacityKg: 1500,
        operatingDistrict: "Kurunegala"
      },
      driver.token
    );
    assert.equal(vehicle.status, 200, JSON.stringify(vehicle.body));
  });

  after(closeDb);

  it("refuses a farm gate outside Sri Lanka, so a transposed pair cannot be stored", async () => {
    const { status, body } = await api.post(
      "/catalog/listings",
      {
        cropId: "tomato",
        quantityKg: 100,
        pricePerKg: 180,
        harvestDate: "2026-10-05",
        district: "Kurunegala",
        pickupPoint: { latitude: GATE.longitude, longitude: GATE.latitude }
      },
      farmer.token
    );

    assert.equal(status, 400);
    assert.equal(body.code, "validation_error");
  });

  it("carries the gate, the drop-off and the distance all the way to the driver's board", async () => {
    // --- the farmer lists produce and pins the gate -------------------------------------------
    const listing = await api.post(
      "/catalog/listings",
      {
        cropId: "tomato",
        quantityKg: 300,
        pricePerKg: 180,
        harvestDate: "2026-10-05",
        district: "Kurunegala",
        town: "Wariyapola",
        farmgateNotes: "Blue gate past the tank",
        pickupPoint: GATE
      },
      farmer.token
    );
    assert.equal(listing.status, 201, JSON.stringify(listing.body));
    assert.deepEqual(listing.body.pickupPoint, GATE, "the gate survived the round trip");

    // NUDGE: coordinator approval is unbuilt (FARM-43). Delete once it exists.
    const database = await db();
    await database
      .collection("listings")
      .updateOne({ _id: new ObjectId(listing.body.id) }, { $set: { status: "verified" } });

    // --- the buyer saves a market, then orders to it -------------------------------------------
    const saved = await api.post(
      "/identity/me/locations",
      { label: "Dambulla economic centre", point: MARKET },
      buyer.token
    );
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.equal(saved.body.savedLocations.length, 1);

    const place = saved.body.savedLocations[0];
    const order = await api.post(
      "/orders",
      {
        listingId: listing.body.id,
        quantityKg: 200,
        dropOff: { label: place.label, point: place.point }
      },
      buyer.token
    );
    assert.equal(order.status, 201, JSON.stringify(order.body));
    assert.deepEqual(order.body.dropOff.point, MARKET);

    // The drop-off is a copy: renaming the saved place must not rewrite the order.
    await api.post(
      "/identity/me/locations",
      { label: "Dambulla economic centre", point: GATE },
      buyer.token
    );
    const reread = await api.get(`/orders/${order.body.id}`, buyer.token);
    assert.deepEqual(
      reread.body.dropOff.point,
      MARKET,
      "renaming a saved place rewrote a past order"
    );

    // NUDGE: farmer acceptance is unbuilt (FARM-46). Delete once it exists.
    await database
      .collection("orders")
      .updateOne({ _id: new ObjectId(order.body.id) }, { $set: { status: "open" } });

    // --- the driver sees the job, with both ends and a distance --------------------------------
    const board = await api.get("/logistics/jobs", driver.token);
    assert.equal(board.status, 200, JSON.stringify(board.body));

    const job = board.body.find((j) => j.id === order.body.id);
    assert.ok(job, "the job did not reach the board");
    assert.deepEqual(job.pickupPoint, GATE);
    assert.deepEqual(job.dropOff.point, MARKET);

    // Wariyapola to Dambulla is ~48 km straight line.
    assert.ok(
      job.distanceKm > 40 && job.distanceKm < 55,
      `distance looked wrong: ${job.distanceKm}`
    );

    // --- accepting unlocks the farmer's number, and not before ---------------------------------
    const before = await api.get(`/logistics/jobs/${job.id}`, driver.token);
    assert.equal(before.body.pickup, undefined, "an unaccepted job leaked a phone number");

    const accepted = await api.post(`/logistics/jobs/${job.id}/accept`, undefined, driver.token);
    assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
    assert.equal(accepted.body.status, "assigned");
    assert.equal(accepted.body.pickup.farmgateNotes, "Blue gate past the tank");

    // --- and the farmer can check the plate before handing over produce -------------------------
    const who = await api.get(`/logistics/orders/${job.id}/driver`, farmer.token);
    assert.equal(who.status, 200, JSON.stringify(who.body));
    assert.equal(who.body.registration, "NW E2E-0001");
    assert.equal(who.body.verification, "pending");
  });

  it("gives no distance when the buyer named no delivery point", async () => {
    const listing = await api.post(
      "/catalog/listings",
      {
        cropId: "beans",
        quantityKg: 150,
        pricePerKg: 260,
        harvestDate: "2026-10-05",
        district: "Kurunegala",
        pickupPoint: GATE
      },
      farmer.token
    );
    const database = await db();
    // NUDGE: FARM-43.
    await database
      .collection("listings")
      .updateOne({ _id: new ObjectId(listing.body.id) }, { $set: { status: "verified" } });

    const order = await api.post(
      "/orders",
      { listingId: listing.body.id, quantityKg: 100 },
      buyer.token
    );
    // NUDGE: FARM-46.
    await database
      .collection("orders")
      .updateOne({ _id: new ObjectId(order.body.id) }, { $set: { status: "open" } });

    const board = await api.get("/logistics/jobs", driver.token);
    const job = board.body.find((j) => j.id === order.body.id);

    assert.ok(job);
    assert.equal(job.distanceKm, undefined, "a distance was invented from one end only");
  });

  it("refuses to show the driver to someone who is not on the order", async () => {
    const stranger = await signUp("buyer", "E2E Stranger");
    const board = await api.get("/logistics/jobs/mine", driver.token);
    const [held] = board.body;

    const { status, body } = await api.get(`/logistics/orders/${held.id}/driver`, stranger.token);

    assert.equal(status, 403);
    assert.equal(body.code, "not_your_job");
  });
});
