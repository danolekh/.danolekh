import { Schema } from "effect"

export class OpenLibraryError extends Schema.TaggedError<OpenLibraryError>()(
  "OpenLibraryError",
  {
    message: Schema.String,
    status: Schema.optional(Schema.Number),
  },
) {}

export class RateLimitError extends Schema.TaggedError<RateLimitError>()(
  "RateLimitError",
  {
    retryAfter: Schema.optional(Schema.Number),
  },
) {}

export class R2UploadError extends Schema.TaggedError<R2UploadError>()(
  "R2UploadError",
  {
    message: Schema.String,
  },
) {}
