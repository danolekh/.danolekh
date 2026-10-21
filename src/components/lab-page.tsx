import { Link } from "@tanstack/react-router";
import { IconBrandGithub } from "@tabler/icons-react";
import { KickerArrow } from "@/components/site-frame";
import { BlogComponent } from "@/lib/content/blog-components";
import { labInstall, labSource, type LabItem } from "@/data/lab";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

/** A lab item's page: the demo in its own look, or in another one it has (`looks`). */
export function LabPage({ item, look }: { item: LabItem; look?: string }) {
  return (
    <div className="px-6 pt-12 md:px-12 md:pt-16">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10">
          <div className="kicker">
            <span className="dot" />
            <KickerArrow />
            <span className="label">
              <Link to="/lab" className="hover:text-signal">
                Lab
              </Link>{" "}
              · {formatDate(item.date)}
            </span>
          </div>
          <h1 className="display mt-5 text-balance text-[clamp(40px,6vw,72px)]">{item.title}</h1>
          {item.for ? (
            <p className="mt-4 text-lg">
              For{" "}
              <a href={item.for.url} className="ink-link" rel="noopener noreferrer" target="_blank">
                {item.for.name}
              </a>
            </p>
          ) : item.after ? (
            <p className="mt-4 text-lg">
              After{" "}
              <a href={item.after.url} className="ink-link" rel="noopener noreferrer" target="_blank">
                {item.after.name}&apos;s write-up
              </a>
            </p>
          ) : null}
        </header>

        <BlogComponent name={item.demo} props={look ? { look } : {}} />

        {item.code === false ? null : (
          <div className="mt-10 space-y-3">
            <p className="label">Get the code</p>
            <pre className="overflow-x-auto border-l-4 border-current bg-muted px-4 py-3 text-sm">
              <code>{labInstall(item.slug)}</code>
            </pre>
            <a
              href={labSource(item.slug)}
              rel="noopener noreferrer"
              target="_blank"
              className="ink-link inline-flex items-center gap-1.5"
            >
              <IconBrandGithub className="size-4" />
              Source on GitHub
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
