import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: App });

function App() {
  return (
    <div className="max-w-3xl mx-auto [&>p+p]:mt-6 mt-6 px-4 sm:px-8">
      <p>
        My name is Daniil Olekh, I am a software enginner from Ukraine. I am
        passionate about web-development, specifically, anything related to
        designing and building apps, I love thoughtful design, animations and
        interactions that make web better. I also love tools that care about
        developer experience.
      </p>
      <p>You can find me anywhere at @danolekh</p>
      <p>This website is currently WIP</p>
    </div>
  );
}
