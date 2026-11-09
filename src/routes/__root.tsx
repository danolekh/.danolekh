import { HeadContent, Outlet, Scripts, createRootRoute, useMatches } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";

import appCss from "../styles.css?url";
import { createMeta, siteJsonLd } from "@/lib/seo";
import { ThemeProvider, useTheme } from "next-themes";
import { CustomCursor } from "@/components/custom-cursor";
import { ThemeToggle } from "@/components/theme-toggle";
import { SiteBackground } from "@/components/site-background";
import { Analytics } from "@/components/analytics";

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    /** The page brings its own frame: full width, no WebGL background, no floating theme toggle
     *  (the /m replay watch page, where the videos are the content and need the GPU). */
    bare?: boolean;
  }
}

export const Route = createRootRoute({
  head: () => {
    // `canonical: false` — the root's own URL would otherwise be emitted alongside each leaf
    // route's, and Google throws away conflicting canonicals rather than choosing between them.
    const seo = createMeta({ canonical: false, jsonLd: [siteJsonLd()] });
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        ...seo.meta,
      ],
      links: [
        // The body font, requested with the HTML instead of after the stylesheet has been parsed.
        {
          rel: "preload",
          href: "/fonts/nunito-sans-latin.woff2",
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

function RootComponent() {
  const bare = useMatches({ select: (matches) => matches.some((match) => match.staticData.bare) });
  // `resolvedTheme` (not `theme`, which is "system" by default with enableSystem), so the background
  // paints the colour the visitor actually sees.
  const { resolvedTheme } = useTheme();

  if (bare) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center">
      <div className="fixed inset-0 -z-10 h-full w-full bg-background transition-colors duration-300">
        <SiteBackground dark={resolvedTheme === "dark"} />
      </div>
      <main className="w-full relative flex justify-center">
        <div className="w-full max-w-6xl min-h-dvh overflow-x-clip bg-[linear-gradient(90deg,transparent_0%,#ffffffd9_15%,#ffffffd9_85%,transparent_100%)] dark:bg-[linear-gradient(90deg,transparent_0%,#0b0b0bd9_15%,#0b0b0bd9_85%,transparent_100%)]">
          <Outlet />
        </div>
      </main>
      <ThemeToggle className="fixed right-4 bottom-4 z-40 print:hidden" />
    </div>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  // Full-page routes are judged as visitors see them, so no devtools button in dev either.
  const bare = useMatches({ select: (matches) => matches.some((match) => match.staticData.bare) });
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider attribute={"class"} enableSystem disableTransitionOnChange>
          <CustomCursor />
          {children}
          <Analytics />
        </ThemeProvider>
        {import.meta.env.DEV && !bare && (
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
