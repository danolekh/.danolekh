import type { CallTrace } from "@danolekh/earshot/trace";
import { useEffect, useState } from "react";
import { CallInspector } from "@/components/call-inspector";
import "./call-inspector-demo.css";

/* A call from the earshot debugger's demo set, in its call-inspector block (added with the shadcn
 * CLI from https://earshot.danolekh.com/r/call-inspector.json), embedded in pitch pages via
 * ```demo:call-inspector with {"call": "<id>", "finding": "<id>"}. The trace and recording live
 * in public/calls/ and load with the page that shows them. */
export default function CallInspectorDemo({
  call,
  finding,
  title,
}: {
  call: string;
  finding?: string;
  title?: string;
}) {
  const [trace, setTrace] = useState<CallTrace>();
  useEffect(() => {
    let live = true;
    void fetch(`/calls/${call}.trace.json`)
      .then((r) => r.json() as Promise<CallTrace>)
      .then((t) => live && setTrace(t));
    return () => {
      live = false;
    };
  }, [call]);
  if (!trace) return <div className="my-8 min-h-[640px] rounded-2xl bg-muted/40" />;
  return (
    <div className="not-prose my-8">
      <CallInspector
        trace={trace}
        src={`/calls/${call}.mp3`}
        title={title}
        finding={finding}
        skin="site"
      />
    </div>
  );
}
