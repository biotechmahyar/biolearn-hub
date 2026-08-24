/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as classEnroll from "../classEnroll.js";
import type * as collab from "../collab.js";
import type * as comments from "../comments.js";
import type * as content from "../content.js";
import type * as courseStudio from "../courseStudio.js";
import type * as enroll from "../enroll.js";
import type * as examReports from "../examReports.js";
import type * as http from "../http.js";
import type * as inbox from "../inbox.js";
import type * as mentor from "../mentor.js";
import type * as notifications from "../notifications.js";
import type * as offlinePayments from "../offlinePayments.js";
import type * as profiles from "../profiles.js";
import type * as seed from "../seed.js";
import type * as tests from "../tests.js";
import type * as tickets from "../tickets.js";
import type * as upload from "../upload.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  ai: typeof ai;
  auth: typeof auth;
  "auth/emailOtp": typeof auth_emailOtp;
  classEnroll: typeof classEnroll;
  collab: typeof collab;
  comments: typeof comments;
  content: typeof content;
  courseStudio: typeof courseStudio;
  enroll: typeof enroll;
  examReports: typeof examReports;
  http: typeof http;
  inbox: typeof inbox;
  mentor: typeof mentor;
  notifications: typeof notifications;
  offlinePayments: typeof offlinePayments;
  profiles: typeof profiles;
  seed: typeof seed;
  tests: typeof tests;
  tickets: typeof tickets;
  upload: typeof upload;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
