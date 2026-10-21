import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";

import appCss from "../styles.css?url";
import { createMeta, siteJsonLd } from "@/lib/seo";
import { ThemeProvider } from "next-themes";
import { CustomCursor } from "@/components/custom-cursor";
import { ThemeToggle } from "@/components/theme-toggle";
import { DuotoneFilter, SiteFooter, SiteHeader } from "@/components/site-frame";

export const Route = createRootRoute({
  head: () => {
    // `canonical: false` — the root's own URL would otherwise be emitted alongside each leaf
    // route's, and Google throws away conflicting canonicals rather than choosing between them.
    const seo = createMeta({ canonical: false, jsonLd: [siteJsonLd()] });
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        // Browser chrome in the page's paper: stock by day, plum at night.
        { name: "theme-color", content: "#f4f3ee", media: "(prefers-color-scheme: light)" },
        { name: "theme-color", content: "#231547", media: "(prefers-color-scheme: dark)" },
        ...seo.meta,
      ],
      links: [
        // Archivo (latin), requested with the HTML instead of after the stylesheet has been parsed.
        {
          rel: "preload",
          href: "/fonts/archivo-latin.woff2",
          as: "font",
          type: "font/woff2",
          crossOrigin: "anonymous",
        },
        { rel: "stylesheet", href: appCss },
        ...seo.links,
      ],
    };
  },

  component: RootComponent,
  shellComponent: RootDocument,
});

/* Riso: a plain sheet of paper (stock on light, plum at night) with grain printed over everything,
 * the masthead at the top and the colophon at the foot. */
function RootComponent() {
  return (
    <div className="flex min-h-dvh flex-col">
      <DuotoneFilter />
      <SiteHeader />
      <main className="w-full flex-1">
        <div className="mx-auto w-full max-w-6xl overflow-x-clip">
          <Outlet />
        </div>
      </main>
      <SiteFooter />
      <div className="grain" aria-hidden />
      <ThemeToggle className="fixed right-4 bottom-4 z-40 print:hidden" />
    </div>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider attribute={"class"} enableSystem disableTransitionOnChange>
          <CustomCursor />
          {children}
        </ThemeProvider>
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{
              // Bottom-left: the theme toggle owns the bottom-right corner.
              position: "bottom-left",
            }}
            plugins={[
              {
                name: "Tanstack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  );
}
