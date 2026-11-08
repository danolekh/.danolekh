import { createFileRoute, redirect } from "@tanstack/react-router";

// The home page's old preview address.
export const Route = createFileRoute("/new")({
  beforeLoad: () => {
    throw redirect({ to: "/", statusCode: 301 });
  },
});
