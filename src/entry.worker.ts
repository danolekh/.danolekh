import type {
  MessageBatch,
  ExecutionContext,
  R2Bucket,
} from "@cloudflare/workers-types";
import { handleIndexBookQueue } from "./lib/workflow/indexBook";
import baseWorker from "@tanstack/react-start/server-entry";

export * from "@tanstack/react-start/server-entry";

interface IndexBookMessage {
  bookId: number;
  title: string;
  author: string;
}

interface QueueEnv {
  r2: R2Bucket;
}

export default {
  ...baseWorker,
  async queue(
    batch: MessageBatch<IndexBookMessage>,
    env: QueueEnv,
    ctx: ExecutionContext,
  ) {
    await handleIndexBookQueue(batch, env, ctx);
  },
};
