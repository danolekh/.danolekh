import {
  ClusterWorkflowEngine,
  Sharding,
  ShardingConfig,
  Runners,
  RunnerHealth,
  SqlMessageStorage,
  SqlRunnerStorage,
} from "@effect/cluster"
import { D1Client } from "@effect/sql-d1"
import { Layer, Effect } from "effect"
import type { D1Database, R2Bucket } from "@cloudflare/workers-types"
import { IndexBookWorkflowLayer } from "./IndexBookWorkflow"
import { R2Service } from "./activities/uploadToR2"
import { R2UploadError } from "./errors"

// Sharding configuration
const ShardingConfigLayer = ShardingConfig.layer({
  shardsPerGroup: 100,
  entityMaxIdleTime: "5 minutes",
  entityMessagePollInterval: "10 seconds",
})

// Create complete workflow layer given D1 database
export const makeWorkflowLayer = (db: D1Database) => {
  const SqlLayer = D1Client.layer({ db })

  // Build up the required layers
  const StorageLayer = SqlMessageStorage.layer.pipe(
    Layer.provide(SqlLayer),
    Layer.provide(ShardingConfigLayer),
  )

  const RunnerStorageLayer = SqlRunnerStorage.layer.pipe(
    Layer.provide(SqlLayer),
  )

  // Sharding needs Runners, RunnerHealth, RunnerStorage, ShardingConfig, MessageStorage
  const ShardingLayer = Sharding.layer.pipe(
    Layer.provide(Runners.layerNoop),
    Layer.provide(RunnerHealth.layerNoop),
    Layer.provide(RunnerStorageLayer),
    Layer.provide(ShardingConfigLayer),
    Layer.provide(StorageLayer),
  )

  // WorkflowEngine needs Sharding and MessageStorage
  const EngineLayer = ClusterWorkflowEngine.layer.pipe(
    Layer.provide(ShardingLayer),
    Layer.provide(StorageLayer),
  )

  // Workflow registration layer - merge with engine
  const WorkflowLayer = Layer.merge(EngineLayer, IndexBookWorkflowLayer).pipe(
    Layer.provide(EngineLayer),
  )

  return WorkflowLayer
}

// Helper to create R2 service from Cloudflare R2 bucket
export const makeR2Service = (
  r2Bucket: R2Bucket,
  publicUrl: string,
): R2Service["Type"] => ({
  put: (key, data) =>
    Effect.tryPromise({
      try: async () => {
        await r2Bucket.put(key, data, {
          httpMetadata: { contentType: "image/jpeg" },
        })
        return `${publicUrl}/${key}`
      },
      catch: (e) => new R2UploadError({ message: String(e) }),
    }),
})

// Export workflow and errors for use in routes
export { IndexBookWorkflow } from "./IndexBookWorkflow"
export { OpenLibraryError, RateLimitError, R2UploadError } from "./errors"
export { R2Service } from "./activities/uploadToR2"
