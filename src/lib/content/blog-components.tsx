import type { ComponentType } from "react";
import { FlowContentsDemo } from "@/components/demos/flow-contents-demo";

// Registry of interactive components embeddable in markdown via a ```demo:<name> fenced block.
const BLOG_COMPONENTS: Record<string, ComponentType<Record<string, unknown>>> = {
  "flow-contents": FlowContentsDemo,
};

export function BlogComponent({ name, props }: { name: string; props: Record<string, unknown> }) {
  const Component = BLOG_COMPONENTS[name];
  if (!Component) return null;
  return <Component {...props} />;
}
