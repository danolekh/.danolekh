import { createFileRoute } from "@tanstack/react-router";
import { RevealCanvas } from "@/canvases/reveal";

export const Route = createFileRoute("/")({ component: App });

function App() {
  return (
    <div className="max-w-3xl mx-auto [&>p+p]:mt-6 mt-6 px-4 sm:px-8">
      <p>
        My name is Dan, I am a software engineer from Ukraine. I am passionate
        about web-development, specifically, anything related to designing and
        building apps, I love thoughtful design, animations and interactions
        that make web better. I also love tools that care about developer
        experience.
      </p>
      <p>You can find me anywhere @danolekh</p>
      <RevealCanvas />
    </div>
  );
}
