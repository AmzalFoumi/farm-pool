/**
 * FARM-61 end to end: the collection time a farmer is given is a promise, not a prediction.
 *
 * The failure this exists to prevent: a driver keeps accepting work, every ETA is recomputed from
 * their queue, and the farmer who was told 2 pm — and harvested that morning for it — is standing
 * at a gate at 4 pm with produce in the sun.
 *
 * Over HTTP rather than only in a unit test because the promise has to survive the whole stack:
 * the window is written in the same Mongo operation as the claim, and a window that reached the
 * database but not the response would be a promise nobody can see.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { ObjectId } from "mongodb";

import { api, closeDb, db, signUp } from "./helpers.mjs";

const DAY = "2026-11-12";
const at = (h) => h * 60;
/** The farmer can be ready all morning. */
const OFFERED = { date: DAY, from: at(6), to: at(12) };

describe("FARM-61 committed collection windows", () => {
  let farmer, buyer, database;

  before(async () => {
    farmer = await signUp("farmer", "E2E Window Farmer");
    buyer = await signUp("buyer", "E2E Window Buyer");
    database = await db();
  });

  after(closeDb);

  const driverWith = async (plate) => {
    const driver = await signUp("logistics", "E2E Window Driver");
    await api.put(
      "/identity/me/vehicle",
      {
        vehicleType: "small-lorry",
        registration: plate,
        capacityKg: 1500,
        operatingDistrict: "Kurunegala"
      },
      driver.token
    );
    return driver;
  };

  /** An open job whose listing offers `window` (or none at all). */
  const openJob = async (window = OFFERED) => {
    const listing = await api.post(
      "/catalog/listings",
      {
        cropId: "tomato",
        quantityKg: 500,
        pricePerKg: 180,
        harvestDate: "2026-11-12",
        district: "Kurunegala",
        town: "Wariyapola",
        ...(window ? { collectionWindow: window } : {})
      },
      farmer.token
    );
    assert.equal(listing.status, 201, JSON.stringify(listing.body));
    // NUDGE: coordinator approval is unbuilt (FARM-43).
    await database
      .collection("listings")
      .updateOne({ _id: new ObjectId(listing.body.id) }, { $set: { status: "verified" } });

    const order = await api.post(
      "/orders",
      { listingId: listing.body.id, quantityKg: 50 },
      buyer.token
    );
    assert.equal(order.status, 201, JSON.stringify(order.body));
    // NUDGE: FARM-46 is merged; this should move to the real accept + pay chain.
    await database
      .collection("orders")
      .updateOne({ _id: new ObjectId(order.body.id) }, { $set: { status: "open" } });

    return order.body.id;
  };

  it("carries the farmer's offered window onto the job the driver sees", async () => {
    const jobId = await openJob();
    const driver = await driverWith("NW WIN-E01");

    const board = await api.get("/logistics/jobs", driver.token);
    const job = board.body.find((j) => j.id === jobId);

    assert.ok(job, "the job did not reach the board");
    assert.deepEqual(job.collectionWindow, OFFERED);
  });

  it("stores the promised slot and shows it back to the driver", async () => {
    const jobId = await openJob();
    const driver = await driverWith("NW WIN-E02");
    const slot = { date: DAY, from: at(8), to: at(9) };

    const accepted = await api.post(
      `/logistics/jobs/${jobId}/accept`,
      { committedWindow: slot },
      driver.token
    );

    assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
    assert.deepEqual(accepted.body.committedWindow, slot);

    // And it survives a re-read, which is what proves it reached Mongo rather than just the response.
    const reread = await api.get(`/logistics/jobs/${jobId}`, driver.token);
    assert.deepEqual(reread.body.committedWindow, slot);
  });

  /* The promise reaches the people it was made to. A farmer who cannot see the time cannot plan
     a harvest around it, which is the entire point. */
  it("shows the promised time on the farmer's and the buyer's order", async () => {
    const jobId = await openJob();
    const driver = await driverWith("NW WIN-E03");
    const slot = { date: DAY, from: at(10), to: at(11) };
    await api.post(`/logistics/jobs/${jobId}/accept`, { committedWindow: slot }, driver.token);

    const asFarmer = await api.get(`/orders/${jobId}`, farmer.token);
    const asBuyer = await api.get(`/orders/${jobId}`, buyer.token);

    assert.deepEqual(asFarmer.body.committedWindow, slot);
    assert.deepEqual(asBuyer.body.committedWindow, slot);
  });

  /**
   * The heart of the story. A driver who has promised 8–9 cannot also promise 8:30–10, because one
   * lorry cannot be at two gates at once — and the way that must fail is a refusal now, not a
   * silent shift of the first farmer's time.
   */
  it("refuses a second promise that clashes, and leaves the first untouched", async () => {
    const first = await openJob();
    const driver = await driverWith("NW WIN-E04");
    const kept = { date: DAY, from: at(8), to: at(9) };
    await api.post(`/logistics/jobs/${first}/accept`, { committedWindow: kept }, driver.token);

    const second = await openJob();
    const clash = await api.post(
      `/logistics/jobs/${second}/accept`,
      { committedWindow: { date: DAY, from: at(8) + 30, to: at(10) } },
      driver.token
    );

    assert.equal(clash.status, 409);
    assert.equal(clash.body.code, "window_clash");

    const firstStill = await api.get(`/logistics/jobs/${first}`, driver.token);
    assert.deepEqual(
      firstStill.body.committedWindow,
      kept,
      "accepting more work moved a promise already made"
    );

    // The refused job is still open for a driver who is free then.
    const other = await driverWith("NW WIN-E05");
    const board = await api.get("/logistics/jobs", other.token);
    assert.ok(
      board.body.find((j) => j.id === second),
      "the refused job left the board"
    );
  });

  it("allows a second job in the gap between promises", async () => {
    const driver = await driverWith("NW WIN-E06");
    await api.post(
      `/logistics/jobs/${await openJob()}/accept`,
      { committedWindow: { date: DAY, from: at(6), to: at(7) } },
      driver.token
    );

    const later = await api.post(
      `/logistics/jobs/${await openJob()}/accept`,
      { committedWindow: { date: DAY, from: at(10), to: at(11) } },
      driver.token
    );

    assert.equal(later.status, 200, JSON.stringify(later.body));
  });

  /* A slot outside what the farmer offered is a time they never said they could be ready for. */
  it("refuses a promise outside the farmer's window and names the right one", async () => {
    const jobId = await openJob();
    const driver = await driverWith("NW WIN-E07");

    const { status, body } = await api.post(
      `/logistics/jobs/${jobId}/accept`,
      { committedWindow: { date: DAY, from: at(14), to: at(15) } },
      driver.token
    );

    assert.equal(status, 409);
    assert.equal(body.code, "window_outside_offer");
    assert.match(body.message, /6:00 am/);
  });

  it("refuses a promise too narrow for a rural road to keep", async () => {
    const jobId = await openJob();
    const driver = await driverWith("NW WIN-E08");

    const { status, body } = await api.post(
      `/logistics/jobs/${jobId}/accept`,
      { committedWindow: { date: DAY, from: at(8), to: at(8) + 5 } },
      driver.token
    );

    assert.equal(status, 400);
    assert.equal(body.code, "validation_error");
  });

  /* Listings made before windows existed offer none, and a driver taking one agrees a time by
     phone as they always did. Requiring a window would make every old listing unacceptable. */
  it("still accepts a job on a listing that offers no window", async () => {
    const jobId = await openJob(null);
    const driver = await driverWith("NW WIN-E09");

    const accepted = await api.post(`/logistics/jobs/${jobId}/accept`, {}, driver.token);

    assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
    assert.equal(accepted.body.committedWindow, undefined);
  });
});
