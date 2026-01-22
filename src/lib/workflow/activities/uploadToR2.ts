import { Activity } from "@effect/workflow";
import { Effect, Schema, Context } from "effect";
import { R2UploadError } from "../errors";

export class R2Service extends Context.Tag("R2Service")<
  R2Service,
  {
    put: (
      key: string,
      data: Uint8Array,
    ) => Effect.Effect<string, R2UploadError>;
  }
>() {}

export const uploadToR2 = (key: string, data: Uint8Array) =>
  Activity.make({
    name: `UploadToR2:${key}`,
    success: Schema.String,
    error: R2UploadError,
    execute: Effect.gen(function* () {
      const r2 = yield* R2Service;
      return yield* r2.put(key, data);
    }),
  });
