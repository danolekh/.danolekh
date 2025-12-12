import { createFileRoute } from "@tanstack/react-router";
import { AcMenu } from "@/canvases/ac-menu";

export const Route = createFileRoute("/ac")({ component: AcPage, ssr: false });

function AcPage() {
  return <AcMenu />;
}
