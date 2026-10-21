import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { KickerArrow } from "@/components/site-frame";
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
    <section className="border-t-[1.5px] border-current pt-5">
      <h2 className="display text-[28px]">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed">{children}</div>
    </section>
  );
}

function PrivacyPage() {
  return (
    <div className="px-6 pt-12 md:px-12 md:pt-16">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10">
          <div className="kicker">
            <span className="dot" />
            <KickerArrow />
            <span className="label">Last updated September 25, 2026</span>
          </div>
          <h1 className="display mt-4 text-[clamp(48px,7vw,88px)]">Privacy</h1>
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
                className="ink-link"
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
                className="ink-link"
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
                className="ink-link"
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
