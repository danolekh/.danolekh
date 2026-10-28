import { createFileRoute } from "@tanstack/react-router";

// /m/<runId>: everyone side by side. The page is the parent route's (see m.$runId.tsx).
export const Route = createFileRoute("/m/$runId/")({
  component: () => null,
});
