import { createFileRoute } from "@tanstack/react-router";

// /m/<runId>/<nick>: that player big. The page is the parent route's (see m.$runId.tsx), so
// switching views keeps every player mounted and in sync.
export const Route = createFileRoute("/m/$runId/$nick")({
  component: () => null,
});
