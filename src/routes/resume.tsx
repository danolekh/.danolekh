import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

const RESUME_URL =
  "https://docs.google.com/document/d/1ZsNNC0eLN5JQULCEnmjCzCFD_oKW3kbkuAahWl_RU6s/edit?usp=sharing";

export const Route = createFileRoute("/resume")({
  component: ResumeRedirect,
  // Static-friendly redirect: a meta-refresh (works without JS, baked into the prerendered HTML)
  // plus a client-side `replace` for instant navigation. Was a server 302; now a static 200 + bounce.
  head: () => ({
    meta: [
      { title: "Resume | Dan Olekh" },
      { httpEquiv: "refresh", content: `0; url=${RESUME_URL}` },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: RESUME_URL }],
  }),
});

function ResumeRedirect() {
  useEffect(() => {
    window.location.replace(RESUME_URL);
  }, []);

  return (
    <div className="min-h-dvh grid place-items-center px-6 text-center">
      <p className="text-muted-foreground">
        Redirecting to my resume…{" "}
        <a className="text-primary underline underline-offset-4" href={RESUME_URL}>
          click here
        </a>{" "}
        if it doesn’t open.
      </p>
    </div>
  );
}
