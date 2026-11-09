// Re-export everything from TanStack Start server entry
import handler from "@tanstack/react-start/server-entry";
import { relay } from "@/lib/analytics/relay";

export * from "@tanstack/react-start/server-entry";

export default {
  fetch(request: Request, env: Env & { CAL_WEBHOOK_SECRET?: string }, ctx: ExecutionContext) {
    return relay(request, env, ctx) ?? handler.fetch(request);
  },
};

// Export Cloudflare Workflow
export { IndexBookWorkflow } from "./workflows/IndexBookWorkflow";
