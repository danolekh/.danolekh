import { createFileRoute } from "@tanstack/react-router";
import { redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/resume")({
  loader: () => {
    throw redirect({
      href: "https://docs.google.com/document/d/1ZsNNC0eLN5JQULCEnmjCzCFD_oKW3kbkuAahWl_RU6s/edit?usp=sharing",
    });
  },
});
