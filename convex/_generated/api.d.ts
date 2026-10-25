/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as files from "../files.js";
import type * as fixVerification from "../fixVerification.js";
import type * as fixVerificationDb from "../fixVerificationDb.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_geo from "../lib/geo.js";
import type * as lib_publicReport from "../lib/publicReport.js";
import type * as lib_routing from "../lib/routing.js";
import type * as lib_screening from "../lib/screening.js";
import type * as lib_transcribe from "../lib/transcribe.js";
import type * as lib_videoIntakeValidation from "../lib/videoIntakeValidation.js";
import type * as placeholder from "../placeholder.js";
import type * as screening from "../screening.js";
import type * as screeningDb from "../screeningDb.js";
import type * as videoIntake from "../videoIntake.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  files: typeof files;
  fixVerification: typeof fixVerification;
  fixVerificationDb: typeof fixVerificationDb;
  "lib/auth": typeof lib_auth;
  "lib/geo": typeof lib_geo;
  "lib/publicReport": typeof lib_publicReport;
  "lib/routing": typeof lib_routing;
  "lib/screening": typeof lib_screening;
  "lib/transcribe": typeof lib_transcribe;
  "lib/videoIntakeValidation": typeof lib_videoIntakeValidation;
  placeholder: typeof placeholder;
  screening: typeof screening;
  screeningDb: typeof screeningDb;
  videoIntake: typeof videoIntake;
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
