import { type ComponentType, lazy, Suspense } from "react";
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
  // Demos kept off git until what they show is released: each src/private/demos/<name>.tsx
  // default-exports its component and is embedded as ```demo:<name>. They load with the page that
  // embeds them, so the other posts don't carry them.
  ...Object.fromEntries(
    Object.entries(
      import.meta.glob<{ default: ComponentType<Record<string, unknown>> }>("/src/private/demos/*.tsx"),
    ).map(([key, load]) => [key.slice(key.lastIndexOf("/") + 1, -4), lazy(load)]),
  ),
};

export function BlogComponent({ name, props }: { name: string; props: Record<string, unknown> }) {
  const Component = BLOG_COMPONENTS[name];
  if (!Component) return null;
  // `data-demo` is a handle for scripts/generate-covers.ts, which captures demos by name.
  return (
    <div data-demo={name}>
      <Suspense fallback={<div className="my-8 min-h-[640px] rounded-2xl bg-muted/40" />}>
        <Component {...props} />
      </Suspense>
    </div>
  );
}
