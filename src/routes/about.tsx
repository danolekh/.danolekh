import { createFileRoute } from "@tanstack/react-router";
import { createMeta } from "@/lib/seo";
import { siteConfig } from "@/lib/config";
import Hero from "./_components/-hero";
import Projects from "./_components/-projects";
import Skills from "./_components/-skills";

// What used to be the home page: who I am, my projects and skills, for people checking me out.
export const Route = createFileRoute("/about")({
  component: About,
  head: () =>
    createMeta({
      title: "About Dan Olekh",
      description:
        "Dan Olekh, a software engineer in Vienna building fast web platforms in TypeScript. Projects, case studies and skills.",
      url: `${siteConfig.url}/about`,
    }),
});

function About() {
  return (
    <>
      <Hero />
      <Projects />
      <Skills />
    </>
  );
}
