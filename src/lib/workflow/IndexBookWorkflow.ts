import { Workflow } from "@effect/workflow"
import { Effect, Schema } from "effect"
import { searchOpenLibrary } from "./activities/searchOpenLibrary"
import { fetchCover, type CoverSize } from "./activities/fetchCover"
import { uploadToR2 } from "./activities/uploadToR2"
import { OpenLibraryError, RateLimitError, R2UploadError } from "./errors"

const IndexBookResultSchema = Schema.Struct({
  coverUrls: Schema.Struct({
    S: Schema.NullOr(Schema.String),
    M: Schema.NullOr(Schema.String),
    L: Schema.NullOr(Schema.String),
  }),
})

export type IndexBookResult = Schema.Schema.Type<typeof IndexBookResultSchema>

export const IndexBookWorkflow = Workflow.make({
  name: "IndexBookWorkflow",
  payload: {
    bookId: Schema.Number,
    title: Schema.String,
    author: Schema.String,
  },
  success: IndexBookResultSchema,
  error: Schema.Union(OpenLibraryError, RateLimitError, R2UploadError),
  idempotencyKey: (payload) => `index-book-${payload.bookId}`,
})

export const IndexBookWorkflowLayer = IndexBookWorkflow.toLayer(
  (payload, _executionId) =>
    Effect.gen(function* () {
      // Step 1: Search OpenLibrary for cover ID
      const searchResult = yield* searchOpenLibrary(payload.title, payload.author)

      if (!searchResult.coverId) {
        return { coverUrls: { S: null, M: null, L: null } }
      }

      // Step 2: Fetch all cover sizes in parallel
      const sizes: CoverSize[] = ["S", "M", "L"]
      const coverUrls: Record<CoverSize, string | null> = {
        S: null,
        M: null,
        L: null,
      }

      yield* Effect.forEach(
        sizes,
        (size) =>
          Effect.gen(function* () {
            const imageData = yield* fetchCover(searchResult.coverId!, size).pipe(
              Effect.catchTag("OpenLibraryError", (e) =>
                e.status === 404 ? Effect.succeed(null) : Effect.fail(e),
              ),
            )

            if (!imageData) return

            const key = `books/${payload.bookId}/covers/${size}.jpg`
            const url = yield* uploadToR2(key, imageData)
            coverUrls[size] = url
          }),
        { concurrency: 3 },
      )

      return {
        coverUrls: {
          S: coverUrls.S,
          M: coverUrls.M,
          L: coverUrls.L,
        },
      }
    }),
)

export type IndexBookWorkflowType = typeof IndexBookWorkflow
