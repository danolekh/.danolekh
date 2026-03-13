import { createFileRoute } from "@tanstack/react-router";
import { createMeta } from "@/lib/seo";
import { siteConfig } from "@/lib/config";
import Hero from "./_components/-hero";
import Projects from "./_components/-projects";
import Skills from "./_components/-skills";

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
    <>
      <Hero />
      <Projects />
      <Skills />
    </>
  );
}
