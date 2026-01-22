import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: App });

function App() {
  return (
    <div className="min-h-dvh flex items-center justify-center">
      <span>hi there</span>
    </div>
  );
}
