import { createFileRoute } from "@tanstack/react-router";
import { AcMenu } from "@/canvases/ac-menu";
import "./ac.css";

export const Route = createFileRoute("/ac")({ component: AcPage, ssr: false });

function AcPage() {
  return <AcMenu />;
}
