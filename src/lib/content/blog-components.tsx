import type { ComponentType } from "react";
import { FlowContentsDemo } from "@/components/demos/flow-contents-demo";
import { DocIndexDemo } from "@/components/demos/doc-index-demo";
import { LinkPreviewDemo } from "@/components/demos/link-preview-demo";
import { RaiffeisenCardDemo } from "@/components/demos/raiffeisen-card-demo";

// Registry of interactive components embeddable in markdown via a ```demo:<name> fenced block.
const BLOG_COMPONENTS: Record<string, ComponentType<Record<string, unknown>>> = {
  "flow-contents": FlowContentsDemo,
  "doc-index": DocIndexDemo,
  "link-preview": LinkPreviewDemo as ComponentType<Record<string, unknown>>,
  "raiffeisen-card": RaiffeisenCardDemo,
};

export function BlogComponent({ name, props }: { name: string; props: Record<string, unknown> }) {
  const Component = BLOG_COMPONENTS[name];
  if (!Component) return null;
  // `data-demo` is a handle for scripts/generate-covers.ts, which captures demos by name.
  return (
    <div data-demo={name}>
      <Component {...props} />
    </div>
  );
}
