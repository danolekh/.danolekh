import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { IconArrowLeft } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { createMeta } from "@/lib/seo";
import { siteConfig } from "@/lib/config";

// The privacy policy Google's OAuth consent screen links to, covering Dan's own tools (Executor +
// Claude reading his mailbox), and what this site records about its visitors.
export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () =>
    createMeta({
      title: "Privacy",
      description: "What this site records about visitors, and how Dan Olekh's personal tools use Google data",
      url: `${siteConfig.url}/privacy`,
    }),
});

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-dashed pt-6">
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
          <p className="mt-2 text-sm text-muted-foreground">Last updated November 9, 2026</p>
        </header>

        <div className="space-y-8">
          <Section id="website" title="Visitors to this website">
            <p>
              I use PostHog, hosted in the EU, to understand how this site is used. It stores an
              identifier in a first-party cookie and local storage for up to a year, so a return
              visit counts as the same visitor, and records your session as a replay of the page.
              Anything typed into a field is masked.
            </p>
            <p>
              I see the pages you open, what you click, how long you read each section, your device
              and browser, the site you came from, and your country, region, city and network
              provider or company as Cloudflare derives them from your IP address. Your IP address
              itself is not kept.
            </p>
            <p>
              <strong className="font-medium text-foreground">If you book a call:</strong> Cal.com
              takes your booking and passes your name, email and timezone to my analytics, linked to
              your visit.
            </p>
            <p>
              To opt out, block cookies for this site or use a tracker blocker, or write to me and I
              will delete what I hold about you.
            </p>
            <p>
              Analytics data is kept for as long as my PostHog plan retains it. You can also ask what I hold about you, or complain to the Austrian
              data protection authority (dsb.gv.at). Nothing here is sold or used for advertising.
            </p>
          </Section>

          <Section title="My personal tools">
            <p>
              The rest of this page covers the personal tools I, Dan Olekh, run on my own computer,
              including the "Executor app" Google OAuth client. They are for my own use only and are
              not offered to anyone else.
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
