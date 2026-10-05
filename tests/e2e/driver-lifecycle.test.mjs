/**
 * FARM-49 / FARM-54 end to end: a driver takes a job and carries it to delivered.
 *
 * `open → assigned → in_transit → delivered`, driven over HTTP by the people who actually drive
 * it. The unit tests prove each use-case in isolation against in-memory repositories; what only
 * this can catch is a rule that survives a use-case and is lost in a Mongoose filter — and the
 * two rules that matter most here are both *filters*:
 *
 * - **accepting is an atomic claim**, so two drivers tapping at once produce one winner
 * - **each confirmation matches on the driver and the stage inside the update**, so "is this your
 *   job, is it at this stage" cannot drift from the write it guards
 *
 * Neither is visible to a test that mocks the store, which is why they are here.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { ObjectId } from "mongodb";

import { api, closeDb, db, signUp } from "./helpers.mjs";

const DISTRICT = "Kurunegala";

/** A driver with a vehicle, ready to work. */
async function driverWith({ capacityKg = 1500, operatingDistrict = DISTRICT, plate }) {
  const driver = await signUp("logistics", "E2E Lifecycle Driver");
  const saved = await api.put(
    "/identity/me/vehicle",
    { vehicleType: "small-lorry", registration: plate, capacityKg, operatingDistrict },
    driver.token
  );
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  return { ...driver, user: saved.body };
}

describe("FARM-49/54 driver lifecycle", () => {
  let farmer, buyer;
  let database;

  before(async () => {
    farmer = await signUp("farmer", "E2E Lifecycle Farmer");
    buyer = await signUp("buyer", "E2E Lifecycle Buyer");
    database = await db();
  });

  after(closeDb);

  /**
   * One job on the board, ready to be taken.
   *
   * Both status nudges are NUDGE: — listing approval (FARM-43) and farmer acceptance (FARM-46)
   * have no endpoint yet. They are the only two places these tests reach past the api.
   */
  async function openJob({ quantityKg = 120, district = DISTRICT } = {}) {
    const listing = await api.post(
      "/catalog/listings",
      {
        cropId: "tomato",
        quantityKg: Math.max(quantityKg, 300),
        pricePerKg: 180,
        harvestDate: "2026-10-05",
        district,
        town: "Wariyapola",
        farmgateNotes: "Blue gate past the tank"
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
      { listingId: listing.body.id, quantityKg },
      buyer.token
    );
    assert.equal(order.status, 201, JSON.stringify(order.body));
    // NUDGE: farmer acceptance is unbuilt (FARM-46).
    await database
      .collection("orders")
      .updateOne({ _id: new ObjectId(order.body.id) }, { $set: { status: "open" } });

    return order.body.id;
  }

  describe("the board", () => {
    it("offers a job in the driver's district that their vehicle can carry", async () => {
      const jobId = await openJob();
      const driver = await driverWith({ plate: "NW BOARD-01" });

      const board = await api.get("/logistics/jobs", driver.token);

      assert.equal(board.status, 200, JSON.stringify(board.body));
      const job = board.body.find((j) => j.id === jobId);
      assert.ok(job, "the job did not reach the board");
      assert.equal(job.status, "open");
      assert.equal(job.district, DISTRICT);
    });

    /* LP-23: a job heavier than the vehicle is not an offer, it is a mistake waiting to happen at
       a farm gate. Hiding it costs less than a driver discovering it on arrival. */
    it("hides a load heavier than the vehicle", async () => {
      const jobId = await openJob({ quantityKg: 900 });
      const small = await driverWith({ capacityKg: 400, plate: "NW SMALL-01" });

      const board = await api.get("/logistics/jobs", small.token);

      assert.equal(
        board.body.find((j) => j.id === jobId),
        undefined
      );
    });

    it("hides a job in another district", async () => {
      const jobId = await openJob();
      const elsewhere = await driverWith({ operatingDistrict: "Jaffna", plate: "NP FAR-01" });

      const board = await api.get("/logistics/jobs", elsewhere.token);

      assert.equal(
        board.body.find((j) => j.id === jobId),
        undefined
      );
    });

    /* The board is readable by every driver, so it must carry nothing personal. A driver who can
       scroll it must not be able to collect farmers' phone numbers from it. */
    it("carries no phone number anywhere on it", async () => {
      await openJob();
      const driver = await driverWith({ plate: "NW PRIV-01" });

      const board = await api.get("/logistics/jobs", driver.token);

      assert.doesNotMatch(
        JSON.stringify(board.body),
        /\+94\d{9}/,
        "a phone number reached the open board"
      );
    });
  });

  describe("accepting", () => {
    it("assigns the job and unlocks the farmer's number", async () => {
      const jobId = await openJob();
      const driver = await driverWith({ plate: "NW TAKE-01" });

      const before = await api.get(`/logistics/jobs/${jobId}`, driver.token);
      assert.equal(before.body.pickup, undefined, "an unaccepted job leaked a contact");

      const accepted = await api.post(`/logistics/jobs/${jobId}/accept`, undefined, driver.token);

      assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
      assert.equal(accepted.body.status, "assigned");
      assert.match(accepted.body.pickup.farmerPhone, /^\+94\d{9}$/);
      assert.equal(accepted.body.pickup.farmgateNotes, "Blue gate past the tank");
    });

    /**
     * The race this is engineered against: two drivers tap Accept within the same second. One must
     * win and the other must be told — being quietly handed work another driver is already
     * driving to is the outcome worth preventing. Fired concurrently on purpose; a sequential
     * version would pass even if the claim were read-then-write.
     */
    it("gives the job to exactly one of two drivers racing for it", async () => {
      const jobId = await openJob();
      const first = await driverWith({ plate: "NW RACE-01" });
      const second = await driverWith({ plate: "NW RACE-02" });

      const [a, b] = await Promise.all([
        api.post(`/logistics/jobs/${jobId}/accept`, undefined, first.token),
        api.post(`/logistics/jobs/${jobId}/accept`, undefined, second.token)
      ]);

      const won = [a, b].filter((r) => r.status === 200);
      const lost = [a, b].filter((r) => r.status !== 200);
      assert.equal(won.length, 1, "both drivers were given the same job");
      assert.equal(lost.length, 1);
      assert.equal(lost[0].body.code, "job_taken");
    });

    it("takes the job off every other driver's board and onto the winner's own list", async () => {
      const jobId = await openJob();
      const mine = await driverWith({ plate: "NW MINE-01" });
      const other = await driverWith({ plate: "NW OTHR-01" });

      await api.post(`/logistics/jobs/${jobId}/accept`, undefined, mine.token);

      const otherBoard = await api.get("/logistics/jobs", other.token);
      assert.equal(
        otherBoard.body.find((j) => j.id === jobId),
        undefined
      );

      const ownList = await api.get("/logistics/jobs/mine", mine.token);
      assert.ok(
        ownList.body.find((j) => j.id === jobId),
        "the job left the winner's own list"
      );
    });

    it("refuses a load heavier than the vehicle, with its own code", async () => {
      const jobId = await openJob({ quantityKg: 900 });
      const small = await driverWith({ capacityKg: 400, plate: "NW HEAVY-01" });

      const { status, body } = await api.post(
        `/logistics/jobs/${jobId}/accept`,
        undefined,
        small.token
      );

      assert.equal(status, 409);
      assert.equal(body.code, "load_too_heavy");
    });

    it("refuses a job another driver already holds", async () => {
      const jobId = await openJob();
      const holder = await driverWith({ plate: "NW HOLD-01" });
      const nosy = await driverWith({ plate: "NW NOSY-01" });
      await api.post(`/logistics/jobs/${jobId}/accept`, undefined, holder.token);

      const { status, body } = await api.get(`/logistics/jobs/${jobId}`, nosy.token);

      assert.equal(status, 403);
      assert.equal(body.code, "not_your_job");
    });
  });

  describe("fulfilment", () => {
    /** A job already accepted by a fresh driver. */
    async function accepted(plate) {
      const jobId = await openJob();
      const driver = await driverWith({ plate });
      const res = await api.post(`/logistics/jobs/${jobId}/accept`, undefined, driver.token);
      assert.equal(res.status, 200, JSON.stringify(res.body));
      return { jobId, driver };
    }

    it("runs pickup to delivered, recording what was actually loaded", async () => {
      const { jobId, driver } = await accepted("NW FULL-01");

      const pickedUp = await api.post(
        `/logistics/jobs/${jobId}/pickup`,
        { collectedKg: 95 },
        driver.token
      );
      assert.equal(pickedUp.status, 200, JSON.stringify(pickedUp.body));
      assert.equal(pickedUp.body.status, "in_transit");
      assert.equal(pickedUp.body.collectedKg, 95);

      const delivered = await api.post(`/logistics/jobs/${jobId}/deliver`, undefined, driver.token);
      assert.equal(delivered.status, 200, JSON.stringify(delivered.body));
      assert.equal(delivered.body.status, "delivered");
      assert.equal(delivered.body.collectedKg, 95, "the collected weight was lost on delivery");
    });

    /* LP-50: the load on the lorry regularly is not the load on the order — a short harvest,
       produce rejected at the gate, a farmer sending the extra rather than keeping it. Both
       directions are stored as typed; an api that refused either would push a driver to lie. */
    it("stores a short load and an over-collection exactly as typed", async () => {
      const short = await accepted("NW SHORT-01");
      const shortRes = await api.post(
        `/logistics/jobs/${short.jobId}/pickup`,
        { collectedKg: 1 },
        short.driver.token
      );
      assert.equal(shortRes.body.collectedKg, 1);

      const over = await accepted("NW OVER-01");
      const overRes = await api.post(
        `/logistics/jobs/${over.jobId}/pickup`,
        { collectedKg: 400 },
        over.driver.token
      );
      assert.equal(overRes.body.collectedKg, 400);
    });

    it("refuses a drop-off before the pickup, and names the missing step", async () => {
      const { jobId, driver } = await accepted("NW ORDER-01");

      const { status, body } = await api.post(
        `/logistics/jobs/${jobId}/deliver`,
        undefined,
        driver.token
      );

      assert.equal(status, 409);
      assert.equal(body.code, "wrong_stage");
      assert.match(body.message, /pickup/i);
    });

    it("refuses to confirm the same step twice", async () => {
      const { jobId, driver } = await accepted("NW TWICE-01");
      await api.post(`/logistics/jobs/${jobId}/pickup`, { collectedKg: 120 }, driver.token);
      await api.post(`/logistics/jobs/${jobId}/deliver`, undefined, driver.token);

      const again = await api.post(`/logistics/jobs/${jobId}/deliver`, undefined, driver.token);

      assert.equal(again.status, 409);
      assert.equal(again.body.code, "wrong_stage");
      assert.match(again.body.message, /finished/i);
    });

    /* The guard is the repository filter, so this is the test that it actually guards. */
    it("refuses a driver who does not hold the job, and leaves it untouched", async () => {
      const { jobId, driver } = await accepted("NW GUARD-01");
      const stranger = await driverWith({ plate: "NW THIEF-01" });

      const stolen = await api.post(
        `/logistics/jobs/${jobId}/pickup`,
        { collectedKg: 120 },
        stranger.token
      );
      assert.equal(stolen.status, 403);
      assert.equal(stolen.body.code, "not_your_job");

      const still = await api.get(`/logistics/jobs/${jobId}`, driver.token);
      assert.equal(still.body.status, "assigned", "a stranger moved someone else's job");
    });

    it("rejects a collected weight that is not a whole positive number", async () => {
      const { jobId, driver } = await accepted("NW WEIGHT-01");

      for (const collectedKg of [0, -5, 12.5]) {
        const res = await api.post(
          `/logistics/jobs/${jobId}/pickup`,
          { collectedKg },
          driver.token
        );
        assert.equal(res.status, 400, `accepted collectedKg=${collectedKg}`);
      }
    });
  });

  describe("what the farmer sees at the gate", () => {
    /* LP-04 — the requirement driver verification exists for. A farmer reads this with the lorry
       in front of them and checks the plate before handing over produce. */
    it("shows the farmer the plate, the vehicle and the check state", async () => {
      const jobId = await openJob();
      const driver = await driverWith({ plate: "NW GATE-01" });
      await api.post(`/logistics/jobs/${jobId}/accept`, undefined, driver.token);

      const { status, body } = await api.get(`/logistics/orders/${jobId}/driver`, farmer.token);

      assert.equal(status, 200, JSON.stringify(body));
      assert.equal(body.registration, "NW GATE-01");
      assert.equal(body.vehicleType, "small-lorry");
      assert.equal(body.verification, "pending");
      assert.match(body.phone, /^\+94\d{9}$/);
    });

    it("says so while no driver has taken the order", async () => {
      const jobId = await openJob();

      const { status, body } = await api.get(`/logistics/orders/${jobId}/driver`, farmer.token);

      assert.equal(status, 404);
      assert.equal(body.code, "no_driver_assigned");
    });

    it("refuses anyone who is not on the order", async () => {
      const jobId = await openJob();
      const driver = await driverWith({ plate: "NW SEEN-01" });
      await api.post(`/logistics/jobs/${jobId}/accept`, undefined, driver.token);
      const stranger = await signUp("buyer", "E2E Stranger");

      const { status, body } = await api.get(`/logistics/orders/${jobId}/driver`, stranger.token);

      assert.equal(status, 403);
      assert.equal(body.code, "not_your_job");
    });
  });
});
