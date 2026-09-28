import { z } from "zod";

/**
 * A video call between two users about one listing (FARM-40, FARM-24).
 *
 * LIFECYCLE. Request-then-accept; scheduling a time is deliberately not built yet.
 *
 *   requested ──callee──▶ active ──either──▶ ended
 *       └──────callee──▶ declined
 *
 * FARM-40 owns `active → ended` and the join token. FARM-24 owns `requested`, `declined` and the
 * accept that makes a call `active`. All four are listed now so the enum does not change under
 * either story.
 *
 * The media never touches our api: both phones stream through Agora. The api only decides who may
 * join, by issuing a short-lived Agora token for the call's channel.
 */
export const callStatusSchema = z.enum(["requested", "declined", "active", "ended"]);

export type CallStatus = z.infer<typeof callStatusSchema>;

export const callSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  /** The user who asked for the call (a buyer). */
  callerId: z.string(),
  callerName: z.string(),
  /** The user being called (the listing's farmer). */
  calleeId: z.string(),
  calleeName: z.string(),
  status: callStatusSchema,
  startedAt: z.iso.datetime().optional(),
  endedAt: z.iso.datetime().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
});

export type Call = z.infer<typeof callSchema>;

export const callListSchema = z.array(callSchema);

/**
 * What a participant needs to join the call's Agora channel. Channel and account are chosen by the
 * server, never sent by the app, so a user cannot join a room that is not theirs.
 */
export const callTokenSchema = z.object({
  appId: z.string(),
  channel: z.string(),
  token: z.string(),
  /** Agora user account: the caller's user id, as a string. */
  account: z.string(),
  expiresAt: z.iso.datetime()
});

export type CallToken = z.infer<typeof callTokenSchema>;
