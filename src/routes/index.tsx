import { createFileRoute, Link } from "@tanstack/react-router";
import { createMeta } from "@/lib/seo";
import { siteConfig } from "@/lib/config";

export const Route = createFileRoute("/")({
  component: App,
  head: () =>
    createMeta({
      description: "Software Engineer",
      url: siteConfig.url,
    }),
});

function App() {
  return (
    <div className="min-h-dvh flex flex-col gap-2 items-center justify-center">
      <p>hi</p>
      <p>
        you can see what I read{" "}
        <Link to="/feed" className="underline">
          here
        </Link>
      </p>
    </div>
  );
}
