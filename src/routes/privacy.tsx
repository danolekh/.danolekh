import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { IconArrowLeft } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { createMeta } from "@/lib/seo";
import { siteConfig } from "@/lib/config";

// The privacy policy Google's OAuth consent screen links to. It covers Dan's own tools
// (Executor + Claude reading his mailbox), not visitors of this site.
export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () =>
    createMeta({
      title: "Privacy",
      description: "Privacy policy for Dan Olekh's personal tools",
      url: `${siteConfig.url}/privacy`,
    }),
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-dashed pt-6">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function PrivacyPage() {
  return (
    <div className="min-h-dvh px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <Button render={<Link to="/"></Link>} nativeButton={false} variant="link" className="px-0">
          <IconArrowLeft />
          Back home
        </Button>

        <header className="mt-6 mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
            Privacy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated September 25, 2026</p>
        </header>

        <div className="space-y-8">
          <Section title="What this covers">
            <p>
              This policy covers the personal tools I, Dan Olekh, run on my own computer, including
              the "Executor app" Google OAuth client. They are for my own use only and are not
              offered to anyone else.
            </p>
          </Section>

          <Section title="Google data">
            <p>
              The app accesses only my own Google accounts, after I sign in and grant access. It
              reads, searches and labels my email and creates drafts so that I can manage my mail
              with AI assistants running on my machine. It does not send email.
            </p>
            <p>
              Access tokens are stored locally on my computer. Email content is processed only to
              answer my own requests and is not stored on any server I run.
            </p>
          </Section>

          <Section title="Sharing">
            <p>
              No data is sold, shared with third parties, or used for advertising. Google user data
              is not used to train AI models. Use of information received from Google APIs follows
              the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                className="underline decoration-foreground/30 underline-offset-2 hover:decoration-foreground"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
          </Section>

          <Section title="Revoking access">
            <p>
              Access can be removed at any time at{" "}
              <a
                href="https://myaccount.google.com/permissions"
                className="underline decoration-foreground/30 underline-offset-2 hover:decoration-foreground"
              >
                myaccount.google.com/permissions
              </a>
              .
            </p>
          </Section>

          <Section title="Contact">
            <p>
              <a
                href={`mailto:${siteConfig.email}`}
                className="underline decoration-foreground/30 underline-offset-2 hover:decoration-foreground"
              >
                {siteConfig.email}
              </a>
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
