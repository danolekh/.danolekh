import { Activity } from "@effect/workflow"
import { Effect, Schema } from "effect"
import { OpenLibraryError, RateLimitError } from "../errors"

export const SearchResultSchema = Schema.Struct({
  coverId: Schema.NullOr(Schema.Number),
  olid: Schema.NullOr(Schema.String),
})

export type SearchResult = Schema.Schema.Type<typeof SearchResultSchema>

export const searchOpenLibrary = (title: string, author: string) =>
  Activity.make({
    name: "SearchOpenLibrary",
    success: SearchResultSchema,
    error: Schema.Union(OpenLibraryError, RateLimitError),
    execute: Effect.gen(function* () {
      const url = new URL("https://openlibrary.org/search.json")
      url.searchParams.set("title", title)
      url.searchParams.set("author", author)
      url.searchParams.set("limit", "1")
      url.searchParams.set("fields", "cover_i,key")

      const response = yield* Effect.tryPromise({
        try: () => fetch(url.toString()),
        catch: (e) => new OpenLibraryError({ message: String(e) }),
      })

      if (response.status === 429) {
        return yield* new RateLimitError({
          retryAfter: Number(response.headers.get("Retry-After")) || 60,
        })
      }

      if (!response.ok) {
        return yield* new OpenLibraryError({
          message: `HTTP ${response.status}`,
          status: response.status,
        })
      }

      const data = yield* Effect.tryPromise({
        try: () =>
          response.json() as Promise<{
            docs?: Array<{ cover_i?: number; key?: string }>
          }>,
        catch: () => new OpenLibraryError({ message: "Invalid JSON" }),
      })

      const doc = data.docs?.[0]
      return {
        coverId: doc?.cover_i ?? null,
        olid: doc?.key ?? null,
      }
    }),
  }).pipe(
    Activity.retry({
      times: 5,
      while: (error) => error._tag === "RateLimitError",
    }),
  )
