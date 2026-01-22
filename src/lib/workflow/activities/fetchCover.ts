import { Activity } from "@effect/workflow"
import { Effect, Schema } from "effect"
import { OpenLibraryError } from "../errors"

export type CoverSize = "S" | "M" | "L"

export const fetchCover = (coverId: number, size: CoverSize) =>
  Activity.make({
    name: `FetchCover:${size}`,
    success: Schema.Uint8ArrayFromSelf,
    error: OpenLibraryError,
    execute: Effect.gen(function* () {
      const url = `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg?default=false`

      const response = yield* Effect.tryPromise({
        try: () => fetch(url),
        catch: (e) => new OpenLibraryError({ message: String(e) }),
      })

      if (response.status === 404) {
        return yield* new OpenLibraryError({
          message: "Cover not found",
          status: 404,
        })
      }

      if (!response.ok) {
        return yield* new OpenLibraryError({
          message: `Failed to fetch cover: ${response.status}`,
          status: response.status,
        })
      }

      const buffer = yield* Effect.tryPromise({
        try: () => response.arrayBuffer(),
        catch: (e) => new OpenLibraryError({ message: String(e) }),
      })

      return new Uint8Array(buffer)
    }),
  })
