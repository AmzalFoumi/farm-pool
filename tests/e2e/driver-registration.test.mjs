/**
 * FARM-45 end to end: a delivery partner creates an account, then puts their vehicle on it.
 *
 * The thing worth testing over HTTP rather than in a unit test is the **two-step shape**. Vehicle
 * detail is deliberately not in `registerSchema` (LP-09) — that object is shared by all four roles
 * and by both the form and the api pipe, so a required vehicle field there would break buyer,
 * farmer and coordinator sign-up. These tests pin that separation: an account exists first and is
 * usable, and the vehicle arrives on its own endpoint afterwards.
 *
 * They also pin the plate normalisation, because it is the one piece of this a farmer reads off a
 * lorry at a gate (LP-04). "nw cab-4821" and "NW  CAB-4821" must be the same vehicle.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PASSWORD, api, nextPhone, signUp } from "./helpers.mjs";

const VEHICLE = {
  vehicleType: "small-lorry",
  registration: "NW CAB-4821",
  capacityKg: 1500,
  operatingDistrict: "Kurunegala"
};

describe("FARM-45 driver registration", () => {
  it("creates a logistics account with no vehicle on it yet", async () => {
    const driver = await signUp("logistics", "E2E Reg Driver");

    assert.equal(driver.user.role, "logistics");
    assert.equal(driver.user.status, "active");
    assert.equal(
      driver.user.driver,
      undefined,
      "a new driver must have no vehicle — the wizard has not run"
    );
  });

  /* LP-10: a driver with no vehicle has nothing to be shown, so the board refuses rather than
     returning an empty list. An empty board would read as "no work today" and be a dead end. */
  it("refuses the job board until a vehicle exists, and says why", async () => {
    const driver = await signUp("logistics", "E2E No Vehicle");

    const { status, body } = await api.get("/logistics/jobs", driver.token);

    assert.equal(status, 409);
    assert.equal(body.code, "no_vehicle");
  });

  it("stores the vehicle and starts its check at pending", async () => {
    const driver = await signUp("logistics", "E2E Vehicle Driver");

    const saved = await api.put("/identity/me/vehicle", VEHICLE, driver.token);

    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.deepEqual(saved.body.driver, {
      ...VEHICLE,
      verification: "pending",
      updatedAt: saved.body.driver.updatedAt
    });

    // And it is on the account from then on, not just in that one response.
    const me = await api.get("/identity/me", driver.token);
    assert.equal(me.body.driver.registration, "NW CAB-4821");
  });

  /* The plate is what a farmer checks against the lorry in front of them, so the same plate typed
     two ways has to land as one value — upper-cased, single-spaced. */
  it("normalises the plate however the driver typed it", async () => {
    for (const typed of ["nw cab-4821", "  NW   CAB-4821  ", "Nw Cab-4821"]) {
      const driver = await signUp("logistics", "E2E Plate Driver");
      const saved = await api.put(
        "/identity/me/vehicle",
        { ...VEHICLE, registration: typed },
        driver.token
      );

      assert.equal(saved.status, 200, JSON.stringify(saved.body));
      assert.equal(saved.body.driver.registration, "NW CAB-4821", `typed as "${typed}"`);
    }
  });

  it("refuses a plate with no digits, and a capacity no vehicle has", async () => {
    const driver = await signUp("logistics", "E2E Bad Vehicle");

    const noDigits = await api.put(
      "/identity/me/vehicle",
      { ...VEHICLE, registration: "ABCDEF" },
      driver.token
    );
    assert.equal(noDigits.status, 400);
    assert.equal(noDigits.body.code, "validation_error");

    const tooHeavy = await api.put(
      "/identity/me/vehicle",
      { ...VEHICLE, capacityKg: 50_000 },
      driver.token
    );
    assert.equal(tooHeavy.status, 400);

    const tooLight = await api.put(
      "/identity/me/vehicle",
      { ...VEHICLE, capacityKg: 10 },
      driver.token
    );
    assert.equal(tooLight.status, 400);
  });

  /**
   * The one rule about a resubmitted vehicle: a different vehicle is a different thing to check,
   * so the plate or the type changing sends the driver back to `pending`. Capacity and district
   * are their own working details and keep whatever state the vehicle already had.
   *
   * Only `pending` is ever written today (nothing moves a driver to `verified` — open question 3),
   * so this asserts the field is *present and pending* rather than that it was reset from
   * `verified`. When verification is built, this test is where that gap closes.
   */
  it("keeps the check pending when the vehicle itself changes", async () => {
    const driver = await signUp("logistics", "E2E Change Vehicle");
    await api.put("/identity/me/vehicle", VEHICLE, driver.token);

    const newPlate = await api.put(
      "/identity/me/vehicle",
      { ...VEHICLE, registration: "NW XY-7733" },
      driver.token
    );
    assert.equal(newPlate.body.driver.verification, "pending");
    assert.equal(newPlate.body.driver.registration, "NW XY-7733");

    const sameVehicleNewDistrict = await api.put(
      "/identity/me/vehicle",
      { ...VEHICLE, registration: "NW XY-7733", operatingDistrict: "Gampaha" },
      driver.token
    );
    assert.equal(sameVehicleNewDistrict.body.driver.operatingDistrict, "Gampaha");
    assert.equal(sameVehicleNewDistrict.body.driver.verification, "pending");
  });

  /* `driver:update-vehicle` is logistics-only. A buyer reaching this endpoint would be writing a
     vehicle onto an account no board will ever read. */
  it("lets only a logistics account save a vehicle", async () => {
    const buyer = await signUp("buyer", "E2E Buyer NoVehicle");

    const { status, body } = await api.put("/identity/me/vehicle", VEHICLE, buyer.token);

    assert.equal(status, 403);
    assert.equal(body.code, "forbidden");
  });

  it("signs the driver in again with the vehicle still attached", async () => {
    const phone = nextPhone();
    const registered = await api.post("/identity/register", {
      displayName: "E2E Relogin Driver",
      phone,
      password: PASSWORD,
      role: "logistics"
    });
    await api.put("/identity/me/vehicle", VEHICLE, registered.body.token);

    const again = await api.post("/identity/login", { identifier: phone, password: PASSWORD });

    assert.equal(again.status, 200, JSON.stringify(again.body));
    assert.equal(again.body.user.driver.registration, "NW CAB-4821");
  });
});
